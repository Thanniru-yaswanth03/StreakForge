import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { SchedulerService } from '../services/schedulerService.js';
import { JobQueueService } from '../services/jobQueueService.js';
import { JobRecord } from '../models/JobRecord.js';
import { Types } from 'mongoose';

const router = Router();
router.use(requireAuth);

const CreateRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'LEETCODE_EXPORT',
    'GITHUB_SYNC_CHANGES',
    'LOCAL_BACKUP',
    'REPO_HEALTH_CHECK',
    'GITHUB_ACTIVITY_SYNC',
    'LEETCODE_HISTORY_SYNC',
    'DAILY_REMINDERS',
    'WEEKLY_ANALYTICS'
  ]),
  triggerType: z.enum(['CRON', 'EVENT', 'MANUAL', 'WEBHOOK']).optional(),
  schedule: z.string().min(1),
  timezone: z.string().optional(),
  repositoryScope: z.union([z.enum(['ALL', 'DEFAULT']), z.array(z.string())]).optional(),
  executionPolicy: z
    .object({
      timeoutSeconds: z.number().min(10).max(3600).optional(),
      concurrency: z.enum(['FORBID', 'ALLOW']).optional(),
      retryLimit: z.number().min(0).max(10).optional(),
      backoffInitialSeconds: z.number().min(1).max(300).optional()
    })
    .optional(),
  failurePolicy: z
    .object({
      maxRetries: z.number().min(0).max(10).optional(),
      backoffMultiplier: z.number().min(1).max(5).optional(),
      deadLetter: z.boolean().optional(),
      notifyOnFailure: z.boolean().optional()
    })
    .optional()
});

/**
 * GET /api/v1/automations/rules
 * List all configured automation rules.
 */
router.get('/rules', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rules = await SchedulerService.getRules(req.userId!);
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/automations/rules
 * Create a new automation rule.
 */
router.post('/rules', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const validated = CreateRuleSchema.parse(req.body);
    const rule = await SchedulerService.createRule(req.userId!, validated as any);
    res.status(201).json({
      success: true,
      data: {
        id: rule._id.toString(),
        name: rule.name,
        type: rule.type,
        schedule: rule.schedule,
        nextExecution: rule.nextExecution?.toISOString()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v1/automations/rules/:id
 * Update an existing automation rule.
 */
router.patch('/rules/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await SchedulerService.updateRule(
      req.userId!,
      id,
      req.body
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/automations/rules/:id/toggle
 * Pause or resume an automation rule.
 */
router.post('/rules/:id/toggle', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const toggled = await SchedulerService.toggleRule(req.userId!, id);
    if (!toggled) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, data: { id: toggled._id.toString(), enabled: toggled.enabled } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/automations/rules/:id/trigger
 * Manually trigger an automation rule right now.
 */
router.post('/rules/:id/trigger', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await SchedulerService.triggerRuleNow(req.userId!, id);
    res.json({
      success: true,
      data: {
        jobId: result.job.jobId,
        jobType: result.job.jobType,
        status: result.job.status,
        isDuplicate: result.isDuplicate
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/v1/automations/rules/:id
 * Delete an automation rule.
 */
router.delete('/rules/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = await SchedulerService.deleteRule(req.userId!, id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, message: 'Automation rule deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/automations/jobs
 * List jobs with status and pagination.
 */
router.get('/jobs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = (req.query.status as any) || 'ALL';
    const jobType = (req.query.jobType as any) || 'ALL';

    const result = await JobQueueService.getJobs(req.userId!, {
      page,
      limit,
      status,
      jobType
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/automations/jobs/:id
 * Get single job details.
 */
router.get('/jobs/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = await JobRecord.findOne({
      jobId: id,
      userId: new Types.ObjectId(req.userId!)
    }).lean();

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/automations/jobs/:id/cancel
 * Cancel a queued or running job.
 */
router.post('/jobs/:id/cancel', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const cancelled = await JobQueueService.cancelJob(req.userId!, id);
    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: 'Job not found or cannot be cancelled in its current state'
      });
    }
    res.json({ success: true, message: 'Job cancelled' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/automations/jobs/:id/retry
 * Manually retry a failed/dead-letter job.
 */
router.post('/jobs/:id/retry', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const retried = await JobQueueService.retryJob(req.userId!, id);
    if (!retried) {
      return res.status(400).json({
        success: false,
        error: 'Job not found or only failed/cancelled jobs can be retried'
      });
    }
    res.json({
      success: true,
      data: { jobId: retried.jobId, status: retried.status }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/v1/automations/jobs
 * Clear completed/failed/cancelled automation job logs (never deletes active running jobs).
 */
router.delete('/jobs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const scope = (req.query.scope as string) || 'finished';
    const statuses =
      scope === 'queue'
        ? ['QUEUED', 'RETRYING', 'FAILED']
        : ['COMPLETED', 'FAILED', 'CANCELLED'];
    const result = await JobRecord.deleteMany({
      userId: new Types.ObjectId(req.userId!),
      status: { $in: statuses }
    });
    res.json({
      success: true,
      data: { deletedCount: result.deletedCount }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/automations/stats
 * Queue statistics and success rate.
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await JobQueueService.getQueueStats(req.userId!);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

export const automationRoutes = router;
