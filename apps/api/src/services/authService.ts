import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { Account } from '../models/Account.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { RevokedToken } from '../models/RevokedToken.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';
import {
  DEFAULT_CONFIG,
  DEFAULT_UI_ENABLED_MODULES,
  DEFAULT_SIDEBAR_ORDER
} from '@streakforge/config';
import type {
  GitHubTokenHealth,
  UserSyncPreferences,
  UserUiPreferences
} from '@streakforge/shared-types';

// Revoked tokens blacklist (in-memory cache for fast revocation check)
const revokedTokenIds = new Set<string>();

// Short-lived cache for GitHub token health checks to avoid redundant API hits on every /me call
const tokenHealthCache = new Map<string, { health: GitHubTokenHealth; expiresAt: number }>();
const TOKEN_HEALTH_TTL_MS = 5 * 60 * 1000;

export function invalidateTokenHealthCache(userId: string): void {
  for (const k of tokenHealthCache.keys()) {
    if (k === userId || k.startsWith(`${userId}:`)) {
      tokenHealthCache.delete(k);
    }
  }
}

export function getDefaultSyncPreferences(): UserSyncPreferences {
  return {
    autoSyncEnabled: true,
    exportPolicy: 'ALLOW_MULTIPLE',
    autoCommit: true,
    folderPattern: DEFAULT_CONFIG.DEFAULT_SOLUTION_PATH,
    fileNamingPattern: DEFAULT_CONFIG.DEFAULT_FILE_NAMING_PATTERN,
    zeroPadId: 0,
    includeHeader: true,
    includeMetrics: true,
    includeReadme: true,
    preserveOriginalCode: false
  };
}

export function getDefaultUiPreferences(): UserUiPreferences {
  return {
    enabledModules: [...DEFAULT_UI_ENABLED_MODULES],
    sidebarOrder: [...DEFAULT_SIDEBAR_ORDER],
    compactSidebar: false,
    theme: 'dark',
    customized: false
  };
}

/**
 * Unwraps Mongoose subdocuments safely into plain JS objects before spreading.
 */
export function toPlainObject<T>(val: T): T {
  if (val && typeof (val as any).toObject === 'function') {
    return (val as any).toObject();
  }
  return val;
}

/**
 * Resolves UI preferences while restoring all default modules for users who have
 * not explicitly customized their sidebar layout.
 */
export function resolveUserUiPreferences(raw?: Partial<UserUiPreferences> | null): UserUiPreferences {
  const plainRaw = toPlainObject(raw);
  const defaults = getDefaultUiPreferences();
  if (!plainRaw?.customized) {
    return {
      ...defaults,
      compactSidebar: plainRaw?.compactSidebar ?? defaults.compactSidebar,
      theme: plainRaw?.theme ?? defaults.theme,
      customized: false
    };
  }
  return {
    ...defaults,
    ...plainRaw,
    enabledModules: plainRaw.enabledModules?.length ? plainRaw.enabledModules : defaults.enabledModules,
    sidebarOrder: plainRaw.sidebarOrder?.length ? plainRaw.sidebarOrder : defaults.sidebarOrder,
    customized: true
  };
}

export function getDefaultNotificationPreferences() {
  return {
    inApp: true,
    email: false,
    browser: true,
    problemSolved: true,
    syncSuccess: true,
    syncFailure: true,
    dailySummary: true,
    weeklyReport: true,
    streakWarning: true,
    streakWarningHoursBefore: 3
  };
}

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
 * Check if a token has been revoked against both memory cache and durable MongoDB blacklist
 */
export async function isTokenRevokedAsync(token: string): Promise<boolean> {
  try {
    const decoded = jwt.decode(token) as { jti?: string };
    if (!decoded?.jti) return false;
    if (revokedTokenIds.has(decoded.jti)) return true;

    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const exists = await RevokedToken.exists({ jti: decoded.jti });
      if (exists) {
        revokedTokenIds.add(decoded.jti);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Revoke session token and persist to durable MongoDB blacklist with TTL auto-expiration
 */
export async function revokeSessionToken(token: string): Promise<void> {
  try {
    const decoded = jwt.decode(token) as { jti?: string; exp?: number };
    if (decoded?.jti) {
      revokedTokenIds.add(decoded.jti);
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await RevokedToken.findOneAndUpdate(
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

  // 2. Request access token from GitHub (with network timeout)
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
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!tokenRes.ok) {
    throw new Error(`GitHub OAuth token endpoint returned HTTP ${tokenRes.status}`);
  }

  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) {
    logger.error('GitHub OAuth token exchange failed', { error: tokenData });
    throw new Error(tokenData.error_description || 'Failed to exchange GitHub authorization code');
  }

  const accessToken = tokenData.access_token;
  const scopes = (tokenData.scope || '').split(',').map((s: string) => s.trim()).filter(Boolean);

  // 3. Fetch authenticated user profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'StreakForge-App'
    },
    signal: AbortSignal.timeout(10000)
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
      },
      signal: AbortSignal.timeout(10000)
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

  // 5. Upsert User strictly by immutable GitHub numeric ID
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
    if (primaryEmail && user.email !== primaryEmail) {
      const conflict = await User.exists({ email: primaryEmail, _id: { $ne: user._id } });
      if (!conflict) {
        user.email = primaryEmail;
      }
    }
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

  // Auto-discover repositories for smooth onboarding (at most one auto-designated LeetCode target)
  try {
    invalidateTokenHealthCache(user._id.toString());
    const octokit = new Octokit({ auth: accessToken });
    await discoverUserRepositories(user._id, octokit);
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
 * Shared helper to discover and sync user's GitHub repositories without duplicating code
 */
async function discoverUserRepositories(
  userId: mongoose.Types.ObjectId,
  octokit: Octokit
): Promise<void> {
  let hasTargetRepo = Boolean(
    await RepositoryConnection.exists({ userId, isTargetForLeetCode: true })
  );
  const reposRes = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 30
  });

  for (const r of reposRes.data) {
    const existing = await RepositoryConnection.findOne({
      userId,
      githubRepoId: r.id
    });
    if (!existing) {
      const lower = r.name.toLowerCase();
      const matchesTargetName =
        lower.includes('leetcode') ||
        lower.includes('solution') ||
        lower.includes('dsa');
      const assignTarget = !hasTargetRepo && matchesTargetName;
      if (assignTarget) hasTargetRepo = true;

      await RepositoryConnection.create({
        userId,
        githubRepoId: r.id,
        repoFullName: r.full_name,
        description: r.description || undefined,
        primaryLanguage: r.language || undefined,
        defaultBranch: r.default_branch || 'main',
        isPrivate: Boolean(r.private),
        isTargetForLeetCode: assignTarget,
        autoCommitEnabled: assignTarget,
        category: assignTarget ? 'LeetCode Solutions' : 'Personal'
      });
    }
  }
}

/**
 * Verify live GitHub OAuth/PAT token validity & scopes (cached 5m unless forced)
 * Accurately categorizes state into:
 * CONNECTED, DISCONNECTED, TOKEN_INVALID, AUTHORIZATION_REVOKED, INSUFFICIENT_PERMISSIONS, CONNECTION_ERROR, RATE_LIMITED
 */
export async function verifyGitHubTokenHealth(
  userId: string,
  forceRefresh: boolean = false,
  targetRepoFullName?: string
): Promise<GitHubTokenHealth> {
  const cacheKey = `${userId}:${targetRepoFullName || 'default'}`;
  if (!forceRefresh) {
    const cached = tokenHealthCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.health;
    }
  }

  const nowIso = new Date().toISOString();
  const account = await Account.findOne({ userId, provider: 'github' });
  if (!account || !account.accessTokenEncrypted) {
    const health: GitHubTokenHealth = {
      valid: false,
      status: 'MISSING',
      connectionStatus: 'DISCONNECTED',
      checkedAt: nowIso,
      message: 'No GitHub account linked. Connect GitHub to enable automatic synchronization.'
    };
    tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 30_000 });
    return health;
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(account.accessTokenEncrypted);
  } catch {
    const health: GitHubTokenHealth = {
      valid: false,
      status: 'TOKEN_INVALID',
      connectionStatus: 'TOKEN_INVALID',
      checkedAt: nowIso,
      message: 'Stored GitHub credentials could not be decrypted. Reconnecting GitHub will restore access.'
    };
    tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 60_000 });
    return health;
  }

  try {
    const octokit = new Octokit({ auth: accessToken });
    const res = await octokit.rest.users.getAuthenticated();
    const headerScopes = (res.headers['x-oauth-scopes'] as string | undefined)
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const rateRemainingRaw = res.headers['x-ratelimit-remaining'];
    const rateResetRaw = res.headers['x-ratelimit-reset'];
    const rateLimitRemaining =
      typeof rateRemainingRaw === 'string' ? parseInt(rateRemainingRaw, 10) : undefined;
    const rateLimitReset =
      typeof rateResetRaw === 'string'
        ? new Date(parseInt(rateResetRaw, 10) * 1000).toISOString()
        : undefined;

    let hasPushAccess: boolean | undefined;
    let repoToCheck = targetRepoFullName;
    if (!repoToCheck) {
      const activeRepo = await RepositoryConnection.findOne({
        userId,
        isTargetForLeetCode: true
      });
      if (activeRepo?.repoFullName) {
        repoToCheck = activeRepo.repoFullName;
      }
    }

    if (repoToCheck && repoToCheck.includes('/')) {
      try {
        const [owner, repo] = repoToCheck.split('/');
        const repoRes = await octokit.rest.repos.get({ owner, repo });
        hasPushAccess = Boolean(repoRes.data.permissions?.push || repoRes.data.permissions?.admin);
      } catch {
        hasPushAccess = false;
      }
    }

    const health: GitHubTokenHealth = {
      valid: true,
      status: 'VALID',
      connectionStatus: 'CONNECTED',
      username: res.data.login,
      scopes: headerScopes && headerScopes.length > 0 ? headerScopes : account.scopes,
      checkedAt: nowIso,
      rateLimitRemaining,
      rateLimitReset,
      hasPushAccess
    };
    tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + TOKEN_HEALTH_TTL_MS });
    return health;
  } catch (err: any) {
    const status = err?.status || err?.response?.status;
    const errMsg = String(err?.message || '').toLowerCase();
    const rateRemainingRaw = err?.response?.headers?.['x-ratelimit-remaining'];
    const rateLimitRemaining =
      typeof rateRemainingRaw === 'string' ? parseInt(rateRemainingRaw, 10) : undefined;
    const rateResetRaw = err?.response?.headers?.['x-ratelimit-reset'];
    const rateLimitReset =
      typeof rateResetRaw === 'string'
        ? new Date(parseInt(rateResetRaw, 10) * 1000).toISOString()
        : undefined;

    const isRateLimit =
      status === 403 &&
      (rateLimitRemaining === 0 || errMsg.includes('rate limit') || errMsg.includes('secondary rate'));
    const isScopeError =
      status === 403 &&
      (errMsg.includes('scope') || errMsg.includes('permission') || errMsg.includes('resource not accessible'));
    const isRevoked =
      status === 401 ||
      (status === 403 && (errMsg.includes('bad credentials') || errMsg.includes('revoked')));
    const isNetwork =
      !status ||
      status >= 500 ||
      err?.code === 'ENOTFOUND' ||
      err?.code === 'ETIMEDOUT' ||
      errMsg.includes('fetch') ||
      errMsg.includes('network');

    if (isRateLimit) {
      const health: GitHubTokenHealth = {
        valid: true, // Do not invalidate user session or trigger scary REVOKED banner on temporary rate limit
        status: 'RATE_LIMITED',
        connectionStatus: 'RATE_LIMITED',
        scopes: account.scopes,
        checkedAt: nowIso,
        rateLimitRemaining: 0,
        rateLimitReset,
        message: 'GitHub API rate limit reached. Automatically retrying once the window resets.'
      };
      tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 20_000 });
      return health;
    }

    if (isScopeError) {
      const health: GitHubTokenHealth = {
        valid: false,
        status: 'INSUFFICIENT_PERMISSIONS',
        connectionStatus: 'INSUFFICIENT_PERMISSIONS',
        scopes: account.scopes,
        checkedAt: nowIso,
        message: 'GitHub token lacks repository write permissions. Reconnect GitHub with repo scope.'
      };
      tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 60_000 });
      return health;
    }

    if (isRevoked) {
      const health: GitHubTokenHealth = {
        valid: false,
        status: 'REVOKED',
        connectionStatus: 'AUTHORIZATION_REVOKED',
        scopes: account.scopes,
        checkedAt: nowIso,
        message: 'GitHub authorization expired or was revoked. Reconnect GitHub to resume syncing.'
      };
      tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 60_000 });
      return health;
    }

    if (isNetwork) {
      const health: GitHubTokenHealth = {
        valid: true, // Preserve session continuity on transient network hiccup
        status: 'UNKNOWN',
        connectionStatus: 'CONNECTION_ERROR',
        scopes: account.scopes,
        checkedAt: nowIso,
        message: `Temporary connection issue verifying GitHub (${err?.message || 'offline'}). Retrying shortly.`
      };
      tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 10_000 });
      return health;
    }

    // Default catch-all
    const health: GitHubTokenHealth = {
      valid: false,
      status: 'UNKNOWN',
      connectionStatus: 'CONNECTION_ERROR',
      scopes: account.scopes,
      checkedAt: nowIso,
      message: `GitHub check failed (${err?.message || 'unknown error'}).`
    };
    tokenHealthCache.set(cacheKey, { health, expiresAt: Date.now() + 15_000 });
    return health;
  }
}

export function formatUserResponse(
  user: IUserDocument,
  githubTokenHealth?: GitHubTokenHealth,
  token?: string
) {
  let sessionExpiresAt: string | undefined;
  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        sessionExpiresAt = new Date(decoded.exp * 1000).toISOString();
      }
    } catch {
      // Ignore decode error
    }
  }

  return {
    id: user._id.toString(),
    githubId: user.githubId,
    username: user.username,
    name: user.name,
    email: user.email,
    verifiedEmails: user.verifiedEmails || [user.email],
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    streakGoalPerDay: user.streakGoalPerDay,
    notificationPreferences: {
      ...getDefaultNotificationPreferences(),
      ...(toPlainObject(user.notificationPreferences) || {})
    },
    syncPreferences: {
      ...getDefaultSyncPreferences(),
      ...(toPlainObject(user.syncPreferences) || {})
    },
    uiPreferences: resolveUserUiPreferences(user.uiPreferences),
    leetcodeUsername: user.leetcodeUsername || null,
    leetcodeStats: user.leetcodeStats || null,
    githubTokenHealth,
    sessionExpiresAt,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Extend/refresh a valid session JWT seamlessly without prompting GitHub OAuth again
 */
export async function refreshSessionToken(
  currentToken: string
): Promise<{ token: string; user: IUserDocument; expiresAt: string }> {
  const payload = jwt.verify(currentToken, ENV.JWT_SECRET) as { userId: string };
  if (await isTokenRevokedAsync(currentToken)) {
    throw new Error('Session token has been revoked');
  }
  const user = await User.findById(payload.userId);
  if (!user || !user.isActive) {
    throw new Error('User account not found or inactive');
  }
  const newToken = generateAuthToken(user);
  const decoded = jwt.decode(newToken) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return { token: newToken, user, expiresAt };
}

/**
 * Completely disconnect GitHub account credentials and purge stored tokens
 */
export async function disconnectGitHubAccount(userId: string): Promise<void> {
  await Account.deleteMany({ userId, provider: 'github' });
  await RepositoryConnection.deleteMany({ userId });
  invalidateTokenHealthCache(userId);

  await logAuditEvent({
    userId,
    component: 'API',
    action: 'GITHUB_ACCOUNT_DISCONNECTED',
    status: 'WARNING',
    description: 'Disconnected GitHub OAuth account and purged all encrypted access tokens'
  });
}

/**
 * Permanently delete a StreakForge user account and all tenant-isolated records
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const [
    { ActivityRecord },
    { AuditLog },
    { AutomationRule },
    { CodingGoal },
    { DailyActivitySnapshot },
    { JobRecord },
    { JournalEntry },
    { KnowledgeNote },
    { LeetCodeSubmission },
    { LocalAgentInstance },
    { MockInterviewSession },
    { Notification },
    { ProblemSolutionRecord },
    { StudyProgress },
    { UserAchievement }
  ] = await Promise.all([
    import('../models/ActivityRecord.js'),
    import('../models/AuditLog.js'),
    import('../models/AutomationRule.js'),
    import('../models/CodingGoal.js'),
    import('../models/DailyActivitySnapshot.js'),
    import('../models/JobRecord.js'),
    import('../models/JournalEntry.js'),
    import('../models/KnowledgeNote.js'),
    import('../models/LeetCodeSubmission.js'),
    import('../models/LocalAgentInstance.js'),
    import('../models/MockInterviewSession.js'),
    import('../models/Notification.js'),
    import('../models/ProblemSolutionRecord.js'),
    import('../models/StudyProgress.js'),
    import('../models/UserAchievement.js')
  ]);

  await Promise.all([
    Account.deleteMany({ userId }),
    RepositoryConnection.deleteMany({ userId }),
    ActivityRecord.deleteMany({ userId }),
    AuditLog.deleteMany({ userId }),
    AutomationRule.deleteMany({ userId }),
    CodingGoal.deleteMany({ userId }),
    DailyActivitySnapshot.deleteMany({ userId }),
    JobRecord.deleteMany({ userId }),
    JournalEntry.deleteMany({ userId }),
    KnowledgeNote.deleteMany({ userId }),
    LeetCodeSubmission.deleteMany({ userId }),
    LocalAgentInstance.deleteMany({ userId }),
    MockInterviewSession.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    ProblemSolutionRecord.deleteMany({ userId }),
    StudyProgress.deleteMany({ userId }),
    UserAchievement.deleteMany({ userId })
  ]);

  await User.deleteOne({ _id: userId });
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
    emails = emailsRes.data.filter((e) => e.verified).map((e) => e.email.toLowerCase());
  } catch {
    if (ghUser.email) emails = [ghUser.email.toLowerCase()];
  }

  const primaryEmail = emails[0] || ghUser.email || `${ghUser.login}@users.noreply.github.com`;

  // Strictly match by immutable numeric GitHub user ID (never match by mutable username)
  let user = await User.findOne({ githubId: ghUser.id.toString() });

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
    user.username = ghUser.login;
    user.name = ghUser.name || user.name;
    if (primaryEmail && user.email !== primaryEmail) {
      const conflict = await User.exists({ email: primaryEmail, _id: { $ne: user._id } });
      if (!conflict) user.email = primaryEmail;
    }
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

  // Auto-discover repositories (at most one auto-designated target repo)
  try {
    invalidateTokenHealthCache(user._id.toString());
    await discoverUserRepositories(user._id, octokit);
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
