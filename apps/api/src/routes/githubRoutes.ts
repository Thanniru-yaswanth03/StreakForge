import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  DiagnoseCommitInputSchema,
  DiagnoseRepoInputSchema
} from '@streakforge/validation';
import {
  getGitHubActivity,
  diagnoseCommitAttribution,
  diagnoseRepositoryHealth,
  handleGitHubWebhook
} from '../services/githubService.js';
import { RepositoryConnection } from '../models/RepositoryConnection.js';
import { Types } from 'mongoose';
import { logAuditEvent } from '../services/auditService.js';

export const githubRouter: Router = Router();

/**
 * GET /api/v1/github/activity
 * Fetch unified GitHub activity across connected repositories
 */
githubRouter.get('/activity', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const feed = await getGitHubActivity(req.userId!, page, limit);

    res.json({
      success: true,
      data: feed
    });
  } catch (error: any) {
    if (error.message?.includes('GITHUB_NOT_CONNECTED')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'GITHUB_NOT_CONNECTED',
          message: 'GitHub account is not connected. Please connect via OAuth first.'
        }
      });
      return;
    }
    next(error);
  }
});

/**
 * POST /api/v1/github/diagnose-commit
 * Run commit attribution diagnostics
 */
githubRouter.post(
  '/diagnose-commit',
  requireAuth,
  validateBody(DiagnoseCommitInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await diagnoseCommitAttribution(req.userId!, req.body);

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'COMMIT_ATTRIBUTION_DIAGNOSED',
        status: result.isEligible ? 'SUCCESS' : 'WARNING',
        description: `Diagnosed commit ${req.body.commitSha.slice(0, 7)} for ${req.body.repoFullName}: ${result.status}`
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.status === 404) {
        res.status(404).json({
          success: false,
          error: {
            code: 'COMMIT_NOT_FOUND',
            message: `Commit ${req.body.commitSha} not found in ${req.body.repoFullName}`
          }
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/github/diagnose-repo
 * Run repository health diagnostics
 */
githubRouter.post(
  '/diagnose-repo',
  requireAuth,
  validateBody(DiagnoseRepoInputSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const result = await diagnoseRepositoryHealth(req.userId!, req.body.repoFullName);

      await logAuditEvent({
        userId: req.userId!,
        component: 'API',
        action: 'REPO_HEALTH_DIAGNOSED',
        status: 'SUCCESS',
        description: `Diagnosed repository health for ${req.body.repoFullName} (score: ${result.healthScore}/100)`
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.status === 404) {
        res.status(404).json({
          success: false,
          error: {
            code: 'REPO_NOT_FOUND',
            message: `Repository ${req.body.repoFullName} not found on GitHub`
          }
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/v1/github/sync
 * Manually trigger activity sync cursor refresh across connected repositories
 */
githubRouter.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const repos = await RepositoryConnection.find({
      userId: new Types.ObjectId(req.userId)
    });

    const now = new Date();
    await RepositoryConnection.updateMany(
      { userId: new Types.ObjectId(req.userId) },
      { $set: { lastSyncedAt: now } }
    );

    await logAuditEvent({
      userId: req.userId!,
      component: 'API',
      action: 'GITHUB_SYNC_TRIGGERED',
      status: 'SUCCESS',
      description: `Manual GitHub activity sync triggered for ${repos.length} connected repositories`
    });

    res.json({
      success: true,
      data: {
        message: `Synchronized ${repos.length} repositories`,
        syncedAt: now.toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/github/webhook
 * GitHub Webhook listener with HMAC-SHA256 signature verification & deduplication
 */
githubRouter.post('/webhook', async (req: Request, res: Response, next) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const deliveryId = req.headers['x-github-delivery'] as string;
  const event = (req.headers['x-github-event'] as string) || 'ping';

  // Use rawBody buffer attached by express.json({ verify })
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  try {
    const result = await handleGitHubWebhook(
      deliveryId,
      event,
      signature,
      rawBody,
      req.body
    );

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error.message?.includes('INVALID_WEBHOOK_SIGNATURE')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature validation failed. Verify your GITHUB_WEBHOOK_SECRET.'
        }
      });
      return;
    }
    next(error);
  }
});

