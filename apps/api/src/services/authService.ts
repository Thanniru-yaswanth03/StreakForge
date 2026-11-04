import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { Account } from '../models/Account.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { encryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

// Revoked tokens blacklist (in-memory cache for fast revocation check)
const revokedTokenIds = new Set<string>();

/**
 * Generate a signed, tamper-proof CSRF state nonce for OAuth authorization
 */
export function generateOAuthState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { nonce, purpose: 'oauth_csrf' },
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
 * Check if a token has been revoked
 */
export function isTokenRevoked(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as { jti?: string };
    return Boolean(decoded?.jti && revokedTokenIds.has(decoded.jti));
  } catch {
    return true;
  }
}

/**
 * Revoke session token
 */
export function revokeSessionToken(token: string): void {
  try {
    const decoded = jwt.decode(token) as { jti?: string };
    if (decoded?.jti) {
      revokedTokenIds.add(decoded.jti);
    }
  } catch {
    // Ignore decode error
  }
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
