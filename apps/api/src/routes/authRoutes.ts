import { Router, Request, Response } from 'express';
import { ENV } from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { UserUpdatePreferencesSchema } from '@streakforge/validation';
import {
  generateOAuthState,
  verifyOAuthState,
  extractOAuthReturnTo,
  exchangeGitHubCode,
  revokeSessionToken,
  refreshSessionToken,
  verifyGitHubTokenHealth,
  formatUserResponse,
  getDefaultNotificationPreferences,
  getDefaultSyncPreferences,
  getDefaultUiPreferences,
  disconnectGitHubAccount,
  deleteUserAccount,
  getOrCreateDevUser,
  connectGitHubWithPAT
} from '../services/authService.js';
import { User } from '../models/User.js';
import { syncLeetCodeUserStats } from '../services/leetcodeService.js';
import { logger } from '../utils/logger.js';

export const authRouter: Router = Router();

// Guard against concurrent/duplicate OAuth authorization code replay
const consumedOAuthCodes = new Map<string, number>();

function isAndMarkCodeConsumed(code: string): boolean {
  const now = Date.now();
  for (const [k, ts] of consumedOAuthCodes.entries()) {
    if (now - ts > 5 * 60 * 1000) consumedOAuthCodes.delete(k);
  }
  if (consumedOAuthCodes.has(code)) {
    return true;
  }
  consumedOAuthCodes.set(code, now);
  if (consumedOAuthCodes.size > 500) {
    const oldestKey = consumedOAuthCodes.keys().next().value;
    if (oldestKey) consumedOAuthCodes.delete(oldestKey);
  }
  return false;
}

/**
 * Resolve canonical OAuth callback URL taking into account reverse proxy headers
 */
export function resolveOAuthCallbackUrl(req: Request): string {
  let callbackUrl = (ENV.GITHUB_CALLBACK_URL || '').trim().replace(/\/+$/, '');
  const forwardedHost = ((req.headers['x-forwarded-host'] as string) || req.get('host') || '').trim();
  const forwardedProto = ((req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http')).trim();

  if (forwardedHost) {
    if (forwardedHost.includes('onrender.com')) {
      // If deployed on Render (*.onrender.com), align host with the active reverse-proxy host
      if (callbackUrl.includes('onrender.com') && !callbackUrl.includes(forwardedHost)) {
        callbackUrl = callbackUrl.replace(/https?:\/\/[^/]+/, `https://${forwardedHost}`);
      } else if (callbackUrl.includes('localhost') || !callbackUrl) {
        callbackUrl = `https://${forwardedHost}/api/v1/auth/github/callback`;
      }
    } else if (ENV.NODE_ENV === 'production' && (callbackUrl.includes('localhost') || !callbackUrl)) {
      callbackUrl = `${forwardedProto}://${forwardedHost}/api/v1/auth/github/callback`;
    }
  }

  if (!callbackUrl) {
    callbackUrl = 'http://localhost:4000/api/v1/auth/github/callback';
  } else if (!callbackUrl.includes('/auth/github/callback')) {
    callbackUrl = `${callbackUrl}/api/v1/auth/github/callback`;
  }

  return callbackUrl.replace(/([^:]\/)\/+/g, '$1');
}

function getSafeRedirectUrl(returnTo: string | undefined): string {
  if (returnTo) {
    try {
      const parsed = new URL(returnTo);
      const isAllowed =
        parsed.hostname === 'localhost' ||
        parsed.hostname.endsWith('.vercel.app') ||
        parsed.hostname === new URL(ENV.WEB_APP_URL).hostname;
      if (isAllowed) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // Fallback
    }
  }
  return ENV.WEB_APP_URL;
}

/**
 * Diagnostic status endpoint for OAuth setup verification
 */
authRouter.get('/config-status', (req: Request, res: Response) => {
  const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.get('host');
  const activeCallback = resolveOAuthCallbackUrl(req);
  res.json({
    success: true,
    data: {
      githubClientIdConfigured: Boolean(ENV.GITHUB_CLIENT_ID && ENV.GITHUB_CLIENT_ID !== 'dummy_client_id'),
      githubClientIdPreview: ENV.GITHUB_CLIENT_ID ? `${ENV.GITHUB_CLIENT_ID.slice(0, 6)}...` : 'not_set',
      detectedHost: forwardedHost || 'unknown',
      activeCallbackUrl: activeCallback,
      configuredCallbackUrl: ENV.GITHUB_CALLBACK_URL,
      webAppUrl: ENV.WEB_APP_URL,
      nodeEnv: ENV.NODE_ENV
    }
  });
});

authRouter.get('/github', async (req: Request, res: Response, next) => {
  // If GitHub OAuth credentials are dummy placeholders in development, use dev bypass
  const isDummyClient =
    !ENV.GITHUB_CLIENT_ID ||
    ENV.GITHUB_CLIENT_ID === 'dummy_client_id' ||
    ENV.GITHUB_CLIENT_ID === 'dummy-client-id' ||
    ENV.GITHUB_CLIENT_ID === 'your_github_client_id_here';

  if (isDummyClient && ENV.NODE_ENV !== 'production') {
    logger.info('[Auth] GITHUB_CLIENT_ID not configured; entering Developer Bypass mode');
    try {
      const { token } = await getOrCreateDevUser();
      res.cookie('streakforge_token', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      });
      res.redirect(`${ENV.WEB_APP_URL}/auth/callback?token=${token}`);
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  if (isDummyClient && ENV.NODE_ENV === 'production') {
    const returnToParam = (req.query.return_to as string) || (req.headers.referer as string);
    const targetBaseUrl = getSafeRedirectUrl(returnToParam);
    res.redirect(
      `${targetBaseUrl}/auth/callback?error=OAUTH_NOT_CONFIGURED&error_description=${encodeURIComponent(
        'GitHub OAuth Client ID is not configured on the backend server.'
      )}`
    );
    return;
  }

  const scopes = ['repo', 'read:user', 'user:email'].join(' ');

  // Capture return URL if caller requested one
  const returnToParam = (req.query.return_to as string) || (req.headers.referer as string);
  const state = generateOAuthState(returnToParam);

  const callbackUrl = resolveOAuthCallbackUrl(req);

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${ENV.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    callbackUrl
  )}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  res.redirect(githubAuthUrl);
});

authRouter.get('/github/callback', async (req: Request, res: Response, next) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const oauthError = req.query.error as string;
  const oauthErrorDesc = req.query.error_description as string;

  // Handle GitHub OAuth authorization errors (e.g. user clicked cancel or denied access)
  if (oauthError) {
    logger.warn('[Auth] GitHub OAuth returned error', { error: oauthError, description: oauthErrorDesc });
    const returnTo = state ? extractOAuthReturnTo(state) : undefined;
    const targetBaseUrl = getSafeRedirectUrl(returnTo);

    if (req.headers.accept?.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: { code: oauthError.toUpperCase(), message: oauthErrorDesc || 'GitHub authorization was denied' }
      });
      return;
    }

    res.redirect(
      `${targetBaseUrl}/auth/callback?error=${encodeURIComponent(oauthError)}&error_description=${encodeURIComponent(
        oauthErrorDesc || 'Authorization was cancelled by user'
      )}`
    );
    return;
  }

  if (!code) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_CODE', message: 'GitHub authorization code is required' }
    });
    return;
  }

  if (!state || !verifyOAuthState(state)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_STATE_INVALID',
        message: 'Invalid or expired OAuth state parameter (CSRF verification failed)'
      }
    });
    return;
  }

  if (isAndMarkCodeConsumed(code)) {
    const returnTo = extractOAuthReturnTo(state);
    const targetBaseUrl = getSafeRedirectUrl(returnTo);
    res.redirect(
      `${targetBaseUrl}/auth/callback?error=CODE_ALREADY_USED&error_description=${encodeURIComponent(
        'This authorization code was already used. Please start a fresh GitHub sign-in if needed.'
      )}`
    );
    return;
  }

  try {
    const { token, user } = await exchangeGitHubCode(code, state);

    res.cookie('streakforge_token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: ENV.NODE_ENV === 'production'
    });

    if (req.headers.accept === 'application/json') {
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            verifiedEmails: user.verifiedEmails,
            avatarUrl: user.avatarUrl,
            timezone: user.timezone
          }
        }
      });
      return;
    }

    const returnTo = extractOAuthReturnTo(state);
    const targetBaseUrl = getSafeRedirectUrl(returnTo);
    res.redirect(`${targetBaseUrl}/auth/callback?token=${token}`);
    return;
  } catch (error: any) {
    logger.error('[Auth] GitHub code exchange failed', { error: error?.message });
    if (req.headers.accept === 'application/json') {
      res.status(400).json({
        success: false,
        error: { code: 'AUTH_FAILED', message: error?.message || 'Failed to authenticate with GitHub' }
      });
      return;
    }
    const returnTo = state ? extractOAuthReturnTo(state) : undefined;
    const targetBaseUrl = getSafeRedirectUrl(returnTo);
    res.redirect(
      `${targetBaseUrl}/auth/callback?error=AUTH_FAILED&error_description=${encodeURIComponent(
        error?.message || 'Failed to authenticate with GitHub'
      )}`
    );
  }
});

authRouter.post('/github/pat', async (req: AuthenticatedRequest, res: Response, next) => {
  const { pat } = req.body;
  if (!pat || typeof pat !== 'string') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'GitHub Personal Access Token is required' }
    });
    return;
  }

  try {
    const { token, user } = await connectGitHubWithPAT(pat);
    res.cookie('streakforge_token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: ENV.NODE_ENV === 'production'
    });
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          verifiedEmails: user.verifiedEmails,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone
        }
      }
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: error.message || 'GitHub Authentication failed' }
    });
  }
});

authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    await revokeSessionToken(req.token);
  }
  res.clearCookie('streakforge_token', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: ENV.NODE_ENV === 'production'
  });
  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
});

authRouter.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await disconnectGitHubAccount(req.userId!);
    if (req.token) {
      await revokeSessionToken(req.token);
    }
    res.clearCookie('streakforge_token', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: ENV.NODE_ENV === 'production'
    });
    res.json({
      success: true,
      data: { message: 'GitHub account disconnected and credentials safely purged' }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.delete('/account', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (req.token) {
      await revokeSessionToken(req.token);
    }
    await deleteUserAccount(req.userId!);
    res.clearCookie('streakforge_token', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: ENV.NODE_ENV === 'production'
    });
    res.json({
      success: true,
      data: { message: 'Account and all associated data permanently deleted' }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const githubTokenHealth = await verifyGitHubTokenHealth(req.userId!, false);
  res.json({
    success: true,
    data: {
      user: formatUserResponse(user, githubTokenHealth, req.token)
    }
  });
});

authRouter.post('/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await refreshSessionToken(req.token!);
    const githubTokenHealth = await verifyGitHubTokenHealth(req.userId!, false);
    res.cookie('streakforge_token', result.token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: ENV.NODE_ENV === 'production'
    });
    res.json({
      success: true,
      data: {
        token: result.token,
        expiresAt: result.expiresAt,
        user: formatUserResponse(result.user, githubTokenHealth, result.token)
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/github/verify', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const health = await verifyGitHubTokenHealth(req.userId!, true);
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/leetcode', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const rawUsername = req.body?.leetcodeUsername ?? req.body?.username;
    if (!rawUsername || typeof rawUsername !== 'string' || !rawUsername.trim()) {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Valid LeetCode username is required' } });
      return;
    }
    const cleanUsername = rawUsername.trim();
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(cleanUsername)) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'LeetCode username may only contain letters, numbers, hyphens, and underscores.' }
      });
      return;
    }
    try {
      const stats = await syncLeetCodeUserStats(req.userId!, cleanUsername);
      const updatedUser = await User.findById(req.userId);
      res.json({
        success: true,
        data: {
          leetcodeUsername: updatedUser?.leetcodeUsername,
          leetcodeStats: stats
        }
      });
    } catch (syncErr: any) {
      const msg = syncErr?.message || 'Failed to fetch LeetCode profile';
      if (msg.includes('not exist') || msg.includes('not found') || msg.includes('private')) {
        res.status(404).json({
          success: false,
          error: { code: 'LEETCODE_USER_NOT_FOUND', message: msg }
        });
        return;
      }
      if (msg.includes('HTTP 429') || msg.includes('rate')) {
        res.status(429).json({
          success: false,
          error: { code: 'LEETCODE_RATE_LIMITED', message: msg }
        });
        return;
      }
      throw syncErr;
    }
  } catch (err: any) {
    next(err);
  }
});

authRouter.delete('/leetcode', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      leetcodeUsername: null,
      leetcodeStats: null
    });
    res.json({
      success: true,
      data: { message: 'LeetCode profile disconnected successfully' }
    });
  } catch (err: any) {
    next(err);
  }
});

authRouter.patch(
  '/preferences',
  requireAuth,
  validateBody(UserUpdatePreferencesSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
        return;
      }

      if (req.body.timezone) user.timezone = req.body.timezone;
      if (req.body.streakGoalPerDay) user.streakGoalPerDay = req.body.streakGoalPerDay;
      if (req.body.notificationPreferences) {
        user.notificationPreferences = {
          ...getDefaultNotificationPreferences(),
          ...(user.notificationPreferences || {}),
          ...req.body.notificationPreferences
        };
      }
      if (req.body.syncPreferences) {
        user.syncPreferences = {
          ...getDefaultSyncPreferences(),
          ...(user.syncPreferences || {}),
          ...req.body.syncPreferences
        };
      }
      if (req.body.uiPreferences) {
        user.uiPreferences = {
          ...getDefaultUiPreferences(),
          ...(user.uiPreferences || {}),
          ...req.body.uiPreferences
        };
      }

      await user.save();

      res.json({
        success: true,
        data: {
          timezone: user.timezone,
          streakGoalPerDay: user.streakGoalPerDay,
          notificationPreferences: user.notificationPreferences,
          syncPreferences: user.syncPreferences,
          uiPreferences: user.uiPreferences
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

authRouter.post('/preferences/reset', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    user.timezone = 'UTC';
    user.streakGoalPerDay = 1;
    user.notificationPreferences = getDefaultNotificationPreferences();
    user.syncPreferences = getDefaultSyncPreferences();
    user.uiPreferences = getDefaultUiPreferences();
    await user.save();

    res.json({
      success: true,
      data: {
        timezone: user.timezone,
        streakGoalPerDay: user.streakGoalPerDay,
        notificationPreferences: user.notificationPreferences,
        syncPreferences: user.syncPreferences,
        uiPreferences: user.uiPreferences
      }
    });
  } catch (error) {
    next(error);
  }
});
