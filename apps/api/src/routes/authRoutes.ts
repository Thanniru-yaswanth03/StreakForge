import { Router, Response } from 'express';
import { ENV } from '../config/env.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { UserUpdatePreferencesSchema } from '@streakforge/validation';
import { exchangeGitHubCode } from '../services/authService.js';
import { User } from '../models/User.js';

export const authRouter: Router = Router();

authRouter.get('/github', (_req, res: Response) => {
  const scopes = ['repo', 'read:user', 'user:email'].join(' ');
  const state = Math.random().toString(36).substring(7);
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${ENV.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    ENV.GITHUB_CALLBACK_URL
  )}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  res.redirect(githubAuthUrl);
});

authRouter.get('/github/callback', async (req, res: Response, next) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_CODE', message: 'GitHub authorization code is required' }
    });
    return;
  }

  try {
    const { token, user } = await exchangeGitHubCode(code);
    // If request accepts HTML (direct browser redirect), redirect to frontend with token
    if (req.headers.accept?.includes('text/html')) {
      res.redirect(`${ENV.WEB_APP_URL}/auth/callback?token=${token}`);
      return;
    }

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          timezone: user.timezone
        }
      }
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
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
        streakGoalPerDay: user.streakGoalPerDay,
        notificationPreferences: user.notificationPreferences,
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
