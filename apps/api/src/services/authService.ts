import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { Account } from '../models/Account.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { RevokedToken } from '../models/RevokedToken.js';
import { encryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

// Revoked tokens blacklist (in-memory cache for fast revocation check)
const revokedTokenIds = new Set<string>();

/**
 * Generate a signed, tamper-proof CSRF state nonce for OAuth authorization
 */
export function generateOAuthState(returnTo?: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { nonce, purpose: 'oauth_csrf', returnTo },
    ENV.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Validate incoming OAuth CSRF state parameter
 */
export function verifyOAuthState(state: string): boolean {
  try {
    const payload = jwt.verify(state, ENV.JWT_SECRET) as { purpose?: string };
    return payload.purpose === 'oauth_csrf';
  } catch {
    return false;
  }
}

/**
 * Extract safe return URL encoded in OAuth state token
 */
export function extractOAuthReturnTo(state: string): string | undefined {
  try {
    const payload = jwt.verify(state, ENV.JWT_SECRET) as { purpose?: string; returnTo?: string };
    return payload.purpose === 'oauth_csrf' ? payload.returnTo : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Sign a session JWT for an authenticated user
 */
export function generateAuthToken(user: IUserDocument): string {
  const tokenId = crypto.randomUUID();
  return jwt.sign(
    {
      jti: tokenId,
      userId: user._id.toString(),
      githubId: user.githubId,
      username: user.username
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Check if a token has been revoked (synchronous check against in-memory blacklist cache)
 */
export function isTokenRevoked(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { jti?: string };
    if (!decoded?.jti) return false;
    return revokedTokenIds.has(decoded.jti);
  } catch {
    return false;
  }
}

/**
 * Revoke session token and persist to durable MongoDB blacklist with TTL auto-expiration
 */
export function revokeSessionToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as { jti?: string; exp?: number };
    if (decoded?.jti) {
      revokedTokenIds.add(decoded.jti);
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        RevokedToken.findOneAndUpdate(
          { jti: decoded.jti },
          { jti: decoded.jti, revokedAt: new Date(), expiresAt },
          { upsert: true }
        ).catch(() => {});
      }
    }
  } catch {
    // Ignore decode error
  }
}

/**
 * Hydrate revoked token IDs from durable MongoDB storage on startup
 */
export async function hydrateRevokedTokens(): Promise<void> {
  try {
    const records = await RevokedToken.find({ expiresAt: { $gt: new Date() } }).select('jti').lean();
    for (const r of records) {
      if (r.jti) revokedTokenIds.add(r.jti);
    }
  } catch {
    // MongoDB might not be connected yet during isolated tests
  }
}

/**
 * Creates or retrieves a local developer user for seamless local development
 * when GitHub OAuth App credentials have not yet been provisioned.
 */
export async function getOrCreateDevUser(): Promise<{ token: string; user: IUserDocument }> {
  let user = await User.findOne({ username: 'streakforge-dev' });
  if (!user) {
    user = new User({
      githubId: 99999999,
      username: 'streakforge-dev',
      name: 'StreakForge Developer',
      email: 'developer@streakforge.local',
      verifiedEmails: ['developer@streakforge.local'],
      avatarUrl: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4',
      timezone: 'UTC',
      streakGoalPerDay: 1
    });
    await user.save();
  }

  let account = await Account.findOne({ userId: user._id, provider: 'github' });
  if (!account) {
    account = new Account({
      userId: user._id,
      provider: 'github',
      providerAccountId: '99999999',
      accessTokenEncrypted: encryptToken('gho_dummy_token_for_local_development_mode'),
      scope: ['repo', 'read:user', 'user:email']
    });
    await account.save();
  }

  const token = generateAuthToken(user);
  return { token, user };
}

/**
 * Exchange temporary authorization code with GitHub for an access token
 */
export async function exchangeGitHubCode(
  code: string,
  state?: string
): Promise<{ token: string; user: IUserDocument }> {
  // 1. Verify CSRF state parameter if provided
  if (state && !verifyOAuthState(state)) {
    throw new Error('Invalid or expired OAuth state parameter (CSRF protection failed)');
  }

  // 2. Request access token from GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: ENV.GITHUB_CLIENT_ID,
      client_secret: ENV.GITHUB_CLIENT_SECRET,
      code
    })
  });

  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) {
    logger.error('GitHub OAuth token exchange failed', { error: tokenData });
    throw new Error(tokenData.error_description || 'Failed to exchange GitHub authorization code');
  }

  const accessToken = tokenData.access_token;
  const scopes = (tokenData.scope || '').split(',').map((s: string) => s.trim());

  // 3. Fetch authenticated user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'StreakForge-App'
    }
  });

  if (!userRes.ok) {
    throw new Error('Failed to retrieve GitHub user profile');
  }

  const ghUser = (await userRes.json()) as any;

  // 4. Fetch all verified user emails
  const verifiedEmails: string[] = [];
  let primaryEmail = ghUser.email;

  try {
    const emailsRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'StreakForge-App'
      }
    });

    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;

      for (const e of emails) {
        if (e.verified) {
          verifiedEmails.push(e.email.toLowerCase());
        }
        if (e.primary && e.verified) {
          primaryEmail = e.email;
        }
      }
    }
  } catch (err) {
    logger.warn('Failed to retrieve secondary verified emails from GitHub', { err });
  }

  if (!primaryEmail) {
    primaryEmail = `${ghUser.login}@users.noreply.github.com`;
  }
  if (!verifiedEmails.includes(primaryEmail.toLowerCase())) {
    verifiedEmails.push(primaryEmail.toLowerCase());
  }

  // 5. Upsert User
  let user = await User.findOne({ githubId: ghUser.id.toString() });
  if (!user) {
    user = new User({
      githubId: ghUser.id.toString(),
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      email: primaryEmail,
      verifiedEmails,
      avatarUrl: ghUser.avatar_url || '',
      timezone: 'UTC'
    });
  } else {
    user.username = ghUser.login;
    user.name = ghUser.name || user.name;
    user.avatarUrl = ghUser.avatar_url || user.avatarUrl;
    user.verifiedEmails = verifiedEmails;
  }
  await user.save();

  // 6. Encrypt token using AES-256-GCM and store in Account
  const encryptedToken = encryptToken(accessToken);
  await Account.findOneAndUpdate(
    { userId: user._id, provider: 'github' },
    {
      providerAccountId: ghUser.id.toString(),
      accessTokenEncrypted: encryptedToken,
      scopes
    },
    { upsert: true, new: true }
  );

  // Auto-discover repositories for smooth onboarding
  try {
    const octokit = new Octokit({ auth: accessToken });
    const reposRes = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 30
    });

    for (const r of reposRes.data) {
      const existing = await RepositoryConnection.findOne({
        userId: user._id,
        githubRepoId: r.id
      });
      if (!existing) {
        await RepositoryConnection.create({
          userId: user._id,
          githubRepoId: r.id,
          repoFullName: r.full_name,
          description: r.description || undefined,
          primaryLanguage: r.language || undefined,
          defaultBranch: r.default_branch || 'main',
          isTargetForLeetCode:
            r.name.toLowerCase().includes('leetcode') || r.name.toLowerCase().includes('solution'),
          autoCommitEnabled: false,
          category: 'Personal'
        });
      }
    }
  } catch (err) {
    logger.warn('Failed to auto-discover repos on OAuth connect', { err });
  }

  // 7. Record immutable audit event
  await logAuditEvent({
    userId: user._id,
    component: 'API',
    action: 'OAUTH_LOGIN',
    status: 'SUCCESS',
    description: `User @${user.username} successfully authenticated with scopes: ${scopes.join(', ')}`
  });

  const sessionToken = generateAuthToken(user);
  return { token: sessionToken, user };
}

/**
 * Completely disconnect GitHub account credentials and purge stored tokens
 */
export async function disconnectGitHubAccount(userId: string): Promise<void> {
  await Account.deleteMany({ userId, provider: 'github' });
  await RepositoryConnection.deleteMany({ userId });

  await logAuditEvent({
    userId,
    component: 'API',
    action: 'GITHUB_ACCOUNT_DISCONNECTED',
    status: 'WARNING',
    description: 'Disconnected GitHub OAuth account and purged all encrypted access tokens'
  });
}

/**
 * Authenticate or connect a real GitHub account using a Personal Access Token (PAT).
 * Automatically pulls genuine GitHub profile info, verified emails, and repositories.
 */
export async function connectGitHubWithPAT(
  patToken: string
): Promise<{ token: string; user: IUserDocument }> {
  const cleanToken = patToken.trim();
  if (!cleanToken) {
    throw new Error('Personal Access Token cannot be empty');
  }

  const octokit = new Octokit({ auth: cleanToken });

  let ghUser;
  try {
    const userRes = await octokit.rest.users.getAuthenticated();
    ghUser = userRes.data;
  } catch (err: any) {
    throw new Error(`GitHub Authentication Failed: ${err.message || 'Invalid or expired token'}`);
  }

  let emails: string[] = [];
  try {
    const emailsRes = await octokit.rest.users.listEmailsForAuthenticatedUser();
    emails = emailsRes.data.filter((e) => e.verified).map((e) => e.email);
  } catch {
    if (ghUser.email) emails = [ghUser.email];
  }

  const primaryEmail = emails[0] || ghUser.email || `${ghUser.login}@users.noreply.github.com`;

  let user = await User.findOne({ githubId: ghUser.id.toString() });
  if (!user) {
    user = await User.findOne({ username: ghUser.login });
  }

  if (!user) {
    user = new User({
      githubId: ghUser.id.toString(),
      username: ghUser.login,
      name: ghUser.name || ghUser.login,
      email: primaryEmail,
      verifiedEmails: emails.length > 0 ? emails : [primaryEmail],
      avatarUrl: ghUser.avatar_url || '',
      timezone: 'UTC',
      streakGoalPerDay: 1
    });
  } else {
    user.githubId = ghUser.id.toString();
    user.name = ghUser.name || user.name;
    user.email = primaryEmail;
    user.avatarUrl = ghUser.avatar_url || user.avatarUrl;
    user.verifiedEmails = emails.length > 0 ? emails : user.verifiedEmails;
  }
  await user.save();

  const encryptedToken = encryptToken(cleanToken);
  await Account.findOneAndUpdate(
    { userId: user._id, provider: 'github' },
    {
      providerAccountId: ghUser.id.toString(),
      accessTokenEncrypted: encryptedToken,
      scopes: ['repo', 'read:user', 'user:email']
    },
    { upsert: true, new: true }
  );

  // Auto-discover repositories
  try {
    const reposRes = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 30
    });

    for (const r of reposRes.data) {
      const existing = await RepositoryConnection.findOne({
        userId: user._id,
        githubRepoId: r.id
      });
      if (!existing) {
        await RepositoryConnection.create({
          userId: user._id,
          githubRepoId: r.id,
          repoFullName: r.full_name,
          description: r.description || undefined,
          primaryLanguage: r.language || undefined,
          defaultBranch: r.default_branch || 'main',
          isTargetForLeetCode:
            r.name.toLowerCase().includes('leetcode') || r.name.toLowerCase().includes('solution'),
          autoCommitEnabled: false,
          category: 'Personal'
        });
      }
    }
  } catch (err) {
    logger.warn('Failed to auto-discover repos on PAT connect', { err });
  }

  await logAuditEvent({
    userId: user._id.toString(),
    component: 'API',
    action: 'GITHUB_PAT_LOGIN',
    status: 'SUCCESS',
    description: `User @${user.username} successfully connected via GitHub Personal Access Token`
  });

  const sessionToken = generateAuthToken(user);
  return { token: sessionToken, user };
}
