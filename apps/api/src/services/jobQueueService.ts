import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import type { AutomationType, JobStatus, QueueStats } from '@streakforge/shared-types';
import { JobRecord, IJobRecordDoc } from '../models/JobRecord.js';
import { AutomationRule } from '../models/AutomationRule.js';
import { JOB_HANDLERS } from './jobHandlers.js';
import { createNotification } from './notificationService.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

export interface EnqueueOptions {
  automationRuleId?: string;
  idempotencyKey?: string;
  maxRetries?: number;
  delaySeconds?: number;
}

export class JobQueueService {
  private static workerId = `worker_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;

  /**
   * Enqueues a persistent job.
   * Duplicate Prevention: If a non-terminal job exists with the same idempotency key,
   * returns the existing job.
   */
  public static async enqueueJob(
    userId: string,
    jobType: AutomationType,
    payload: Record<string, any> = {},
    options: EnqueueOptions = {}
  ): Promise<{ job: IJobRecordDoc; isDuplicate: boolean }> {
    const idempotencyKey =
      options.idempotencyKey || `${userId}:${jobType}:${randomUUID()}`;

    // 1. Idempotency Check
    const activeExisting = await JobRecord.findOne({
      userId: new Types.ObjectId(userId),
      idempotencyKey,
      status: { $in: ['QUEUED', 'RUNNING', 'RETRYING'] }
    });

    if (activeExisting) {
      logger.info(
        `[JobQueue] Duplicate job suppressed for idempotency key "${idempotencyKey}" (existing ID: ${activeExisting.jobId})`
      );
      return { job: activeExisting, isDuplicate: true };
    }

    // 2. Schedule next run time
    const nextRunAt = options.delaySeconds
      ? new Date(Date.now() + options.delaySeconds * 1000)
      : new Date();

    const jobId = `job_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const newJob = new JobRecord({
      jobId,
      userId: new Types.ObjectId(userId),
      automationRuleId: options.automationRuleId
        ? new Types.ObjectId(options.automationRuleId)
        : undefined,
      jobType,
      payload,
      status: 'QUEUED',
      maxRetries: options.maxRetries ?? 3,
      retryCount: 0,
      nextRunAt,
      idempotencyKey,
      progress: 0
    });

    await newJob.save();
    logger.info(`[JobQueue] Enqueued job ${jobId} (${jobType}) for user ${userId}`);

    return { job: newJob, isDuplicate: false };
  }

  /**
   * Atomically claims the next eligible job for execution by this worker.
   */
  public static async claimNextJob(): Promise<IJobRecordDoc | null> {
    const now = new Date();
    const job = await JobRecord.findOneAndUpdate(
      {
        status: { $in: ['QUEUED', 'RETRYING'] },
        nextRunAt: { $lte: now }
      },
      {
        $set: {
          status: 'RUNNING',
          startedAt: now,
          workerId: this.workerId,
          lockedAt: now
        }
      },
      { new: true, sort: { nextRunAt: 1 } }
    );

    return job;
  }

  /**
   * Executes a claimed job using the appropriate domain handler.
   * Handles exponential backoff on retries and dead-lettering on exhaustion.
   */
  public static async processJob(job: IJobRecordDoc): Promise<boolean> {
    const handler = JOB_HANDLERS[job.jobType];
    if (!handler) {
      logger.error(`[JobQueue] No handler registered for jobType ${job.jobType}`);
      await this.markJobFailed(job, new Error(`Unregistered job type: ${job.jobType}`));
      return false;
    }

    const startTime = Date.now();
    try {
      logger.info(`[JobQueue] Worker ${this.workerId} executing ${job.jobId} (${job.jobType})`);

      const result = await handler(
        job.userId.toString(),
        job.payload || {},
        job.automationRuleId?.toString()
      );

      const durationMs = Date.now() - startTime;

      // Mark COMPLETED
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.durationMs = durationMs;
      job.progress = 100;
      job.result = { summary: result.summary, data: result.data };
      await job.save();

      // Update parent rule if present
      if (job.automationRuleId) {
        await AutomationRule.findByIdAndUpdate(job.automationRuleId, {
          lastExecution: {
            timestamp: new Date(),
            status: 'SUCCESS',
            durationMs,
            summary: result.summary,
            jobId: job.jobId
          }
        });
      }

      await logAuditEvent({
        userId: job.userId.toString(),
        component: 'API',
        action: 'JOB_COMPLETED',
        status: 'SUCCESS',
        description: `Completed ${job.jobType} [${job.jobId}]: ${result.summary}`,
        metadata: { jobId: job.jobId, jobType: job.jobType, durationMs }
      });

      return true;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      job.durationMs = durationMs;
      await this.handleJobError(job, err);
      return false;
    }
  }

  /**
   * Handles job error, calculates exponential backoff, or moves to Dead-Letter state.
   */
  private static async handleJobError(job: IJobRecordDoc, err: any) {
    const errorInfo = {
      message: err.message || 'Unknown execution error',
      stack: err.stack,
      code: err.code || 'JOB_EXEC_ERROR',
      failedAt: new Date()
    };

    job.error = errorInfo;

    const nextRetry = job.retryCount + 1;
    if (nextRetry < job.maxRetries) {
      // Exponential backoff: base 10s * 2^retry + jitter
      const initialDelaySec = 10;
      const backoffSec = initialDelaySec * Math.pow(2, job.retryCount);
      const jitterMs = Math.floor(Math.random() * 1000);
      const delayMs = backoffSec * 1000 + jitterMs;

      job.status = 'RETRYING';
      job.retryCount = nextRetry;
      job.nextRunAt = new Date(Date.now() + delayMs);
      await job.save();

      logger.warn(
        `[JobQueue] Job ${job.jobId} failed (attempt ${job.retryCount}/${job.maxRetries}). Retrying in ${backoffSec}s. Error: ${err.message}`
      );

      await logAuditEvent({
        userId: job.userId.toString(),
        component: 'API',
        action: 'JOB_RETRY_SCHEDULED',
        status: 'WARNING',
        description: `Job ${job.jobId} failed, scheduled retry ${nextRetry}/${job.maxRetries} in ${backoffSec}s`,
        metadata: { jobId: job.jobId, error: err.message }
      });
    } else {
      // Dead-Letter Handling
      job.status = 'FAILED';
      job.completedAt = new Date();
      job.retryCount = nextRetry;
      await job.save();

      logger.error(
        `[JobQueue] Dead-Letter: Job ${job.jobId} exhausted all ${job.maxRetries} retries. Marked as FAILED.`
      );

      if (job.automationRuleId) {
        await AutomationRule.findByIdAndUpdate(job.automationRuleId, {
          lastExecution: {
            timestamp: new Date(),
            status: 'FAILURE',
            durationMs: job.durationMs || 0,
            summary: `Failed after ${job.maxRetries} attempts: ${err.message}`,
            jobId: job.jobId
          }
        });
      }

      await logAuditEvent({
        userId: job.userId.toString(),
        component: 'API',
        action: 'JOB_DEAD_LETTER',
        status: 'FAILURE',
        description: `Job ${job.jobType} [${job.jobId}] exhausted all retries and was moved to Dead-Letter`,
        metadata: { jobId: job.jobId, error: err.message }
      });

      // Send failure notification
      await createNotification({
        userId: job.userId.toString(),
        category: 'GENERAL',
        severity: 'ERROR',
        title: `Automation Failed: ${job.jobType}`,
        message: `Job ${job.jobId} failed after ${job.maxRetries} attempts: ${err.message}`,
        link: '/automations'
      });
    }
  }

  private static async markJobFailed(job: IJobRecordDoc, err: any) {
    job.status = 'FAILED';
    job.completedAt = new Date();
    job.error = {
      message: err.message,
      stack: err.stack,
      code: 'FATAL_ERROR',
      failedAt: new Date()
    };
    await job.save();
  }

  /**
   * Cancels a queued, retrying, or running job.
   */
  public static async cancelJob(userId: string, jobId: string): Promise<boolean> {
    const job = await JobRecord.findOne({
      jobId,
      userId: new Types.ObjectId(userId)
    });

    if (!job) return false;
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      return false;
    }

    job.status = 'CANCELLED';
    job.completedAt = new Date();
    await job.save();

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'JOB_CANCELLED',
      status: 'INFO',
      description: `Cancelled job ${jobId} (${job.jobType})`,
      metadata: { jobId }
    });

    return true;
  }

  /**
   * Manually retries a failed or cancelled job.
   */
  public static async retryJob(userId: string, jobId: string): Promise<IJobRecordDoc | null> {
    const job = await JobRecord.findOne({
      jobId,
      userId: new Types.ObjectId(userId)
    });

    if (!job) return null;
    if (!['FAILED', 'CANCELLED'].includes(job.status)) {
      return null;
    }

    job.status = 'QUEUED';
    job.retryCount = 0;
    job.nextRunAt = new Date();
    job.error = undefined;
    job.completedAt = undefined;
    await job.save();

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'JOB_MANUAL_RETRY',
      status: 'INFO',
      description: `Manually re-queued job ${jobId} (${job.jobType})`,
      metadata: { jobId }
    });

    return job;
  }

  /**
   * Reaps stalled jobs that timed out or whose workers crashed.
   */
  public static async reapStalledJobs(timeoutSeconds: number = 300): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
    const stalled = await JobRecord.find({
      status: 'RUNNING',
      lockedAt: { $lt: cutoff }
    });

    for (const job of stalled) {
      logger.warn(
        `[JobQueue] Reaping stalled job ${job.jobId} (running since ${job.lockedAt?.toISOString()})`
      );
      await this.handleJobError(
        job,
        new Error(`Execution timed out after ${timeoutSeconds}s or worker became unresponsive`)
      );
    }

    return stalled.length;
  }

  /**
   * Retrieves overall queue statistics.
   */
  public static async getQueueStats(userId?: string): Promise<QueueStats> {
    const match = userId ? { userId: new Types.ObjectId(userId) } : {};

    const [statusCounts, avgDuration] = await Promise.all([
      JobRecord.aggregate([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      JobRecord.aggregate([
        { $match: { ...match, status: 'COMPLETED', durationMs: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$durationMs' } } }
      ])
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row._id] = row.count;
    }

    const queued = counts['QUEUED'] || 0;
    const running = counts['RUNNING'] || 0;
    const completed = counts['COMPLETED'] || 0;
    const failed = counts['FAILED'] || 0;
    const retrying = counts['RETRYING'] || 0;
    const cancelled = counts['CANCELLED'] || 0;
    const totalJobs = queued + running + completed + failed + retrying + cancelled;
    const successRate = completed + failed > 0 ? (completed / (completed + failed)) * 100 : 100;
    const avgDurationMs = avgDuration[0]?.avgDuration ? Math.round(avgDuration[0].avgDuration) : 0;

    return {
      queued,
      running,
      completed,
      failed,
      retrying,
      cancelled,
      totalJobs,
      successRate: Math.round(successRate * 10) / 10,
      avgDurationMs
    };
  }

  /**
   * Retrieves paginated jobs.
   */
  public static async getJobs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: JobStatus | 'ALL';
      jobType?: AutomationType | 'ALL';
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = { userId: new Types.ObjectId(userId) };
    if (options.status && options.status !== 'ALL') {
      query.status = options.status;
    }
    if (options.jobType && options.jobType !== 'ALL') {
      query.jobType = options.jobType;
    }

    const [items, total] = await Promise.all([
      JobRecord.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      JobRecord.countDocuments(query)
    ]);

    return {
      jobs: items.map((j) => ({
        id: j.jobId,
        userId: j.userId.toString(),
        automationRuleId: j.automationRuleId?.toString(),
        jobType: j.jobType,
        payload: j.payload,
        status: j.status,
        createdAt: j.createdAt.toISOString(),
        startedAt: j.startedAt?.toISOString(),
        completedAt: j.completedAt?.toISOString(),
        durationMs: j.durationMs,
        retryCount: j.retryCount,
        maxRetries: j.maxRetries,
        nextRunAt: j.nextRunAt?.toISOString(),
        error: j.error
          ? {
              message: j.error.message,
              stack: j.error.stack,
              code: j.error.code,
              failedAt: j.error.failedAt?.toISOString()
            }
          : undefined,
        idempotencyKey: j.idempotencyKey,
        workerId: j.workerId,
        progress: j.progress,
        result: j.result
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}

