import { Router, Response } from 'express';
import { ENV } from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { UserUpdatePreferencesSchema } from '@streakforge/validation';
import {
  generateOAuthState,
  verifyOAuthState,
  exchangeGitHubCode,
  revokeSessionToken,
  disconnectGitHubAccount,
  getOrCreateDevUser,
  connectGitHubWithPAT
} from '../services/authService.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const authRouter: Router = Router();

authRouter.get('/github', async (_req, res: Response, next) => {
  // If GitHub OAuth credentials are dummy placeholders in development, use dev bypass
  const isDummyClient =
    !ENV.GITHUB_CLIENT_ID ||
    ENV.GITHUB_CLIENT_ID === 'dummy_client_id' ||
    ENV.GITHUB_CLIENT_ID === 'your_github_client_id_here';

  if (isDummyClient && ENV.NODE_ENV !== 'production') {
    logger.info('[Auth] GITHUB_CLIENT_ID not configured; entering Developer Bypass mode');
    try {
      const { token } = await getOrCreateDevUser();
      res.cookie('streakforge_token', token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        sameSite: 'lax'
      });
      res.redirect(`${ENV.WEB_APP_URL}/auth/callback?token=${token}`);
      return;
    } catch (err) {
      next(err);
      return;
    }
  }

  const scopes = ['repo', 'read:user', 'user:email'].join(' ');
  const state = generateOAuthState();
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${ENV.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    ENV.GITHUB_CALLBACK_URL
  )}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  res.redirect(githubAuthUrl);
});

authRouter.get('/github/callback', async (req, res: Response, next) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

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

  try {
    const { token, user } = await exchangeGitHubCode(code, state);

    res.cookie('streakforge_token', token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      sameSite: 'lax'
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

    res.redirect(`${ENV.WEB_APP_URL}/auth/callback?token=${token}`);
    return;
  } catch (error) {
    next(error);
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
      sameSite: 'lax'
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
    res.json({
      success: true,
      data: { message: 'GitHub account disconnected and credentials safely purged' }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        githubId: user.githubId,
        username: user.username,
        name: user.name,
        email: user.email,
        verifiedEmails: user.verifiedEmails || [user.email],
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        streakGoalPerDay: user.streakGoalPerDay,
        notificationPreferences: user.notificationPreferences,
        leetcodeUsername: user.leetcodeUsername || 'yash1th03',
        leetcodeStats: user.leetcodeStats,
        createdAt: user.createdAt
      }
    }
  });
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
          ...user.notificationPreferences,
          ...req.body.notificationPreferences
        };
      }

      await user.save();

      res.json({
        success: true,
        data: {
          timezone: user.timezone,
          streakGoalPerDay: user.streakGoalPerDay,
          notificationPreferences: user.notificationPreferences
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
