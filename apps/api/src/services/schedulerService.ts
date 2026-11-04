import { Types } from 'mongoose';
import { randomUUID } from 'crypto';
import type {
  AutomationRule as IAutomationRule,
  AutomationType,
  AutomationTriggerType,
  AutomationExecutionPolicy,
  AutomationFailurePolicy
} from '@streakforge/shared-types';
import { AutomationRule, IAutomationRuleDoc } from '../models/AutomationRule.js';
import { SchedulerLock } from '../models/SchedulerLock.js';
import { JobQueueService } from './jobQueueService.js';
import { logAuditEvent } from './auditService.js';
import { logger } from '../utils/logger.js';

export interface CreateRuleInput {
  name: string;
  description?: string;
  type: AutomationType;
  triggerType?: AutomationTriggerType;
  schedule: string;
  timezone?: string;
  repositoryScope?: 'ALL' | 'DEFAULT' | string[];
  executionPolicy?: Partial<AutomationExecutionPolicy>;
  failurePolicy?: Partial<AutomationFailurePolicy>;
}

export class SchedulerService {
  private static tickerTimer: NodeJS.Timeout | null = null;
  private static workerTimer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static instanceId = `scheduler_${process.pid}_${Math.random().toString(36).substring(2, 7)}`;

  /**
   * Calculates the next execution timestamp based on schedule and timezone.
   * Supports:
   * - 'every Xm' / 'every Xh' / 'every Xd'
   * - Cron expressions like '0 22 * * *' (minute, hour, dom, month, dow)
   */
  public static calculateNextExecution(
    schedule: string,
    timezone: string = 'UTC',
    fromDate: Date = new Date()
  ): Date {
    const trimmed = schedule.trim().toLowerCase();

    // 1. Interval matching
    const intervalMatch = trimmed.match(/^every\s+(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)?$/);
    if (intervalMatch) {
      const value = parseInt(intervalMatch[1], 10);
      const unit = intervalMatch[2] || 'm';

      let addMs = value * 60 * 1000;
      if (unit.startsWith('h')) addMs = value * 60 * 60 * 1000;
      if (unit.startsWith('d')) addMs = value * 24 * 60 * 60 * 1000;

      return new Date(fromDate.getTime() + addMs);
    }

    // 2. Cron parsing (5-part: min hour dom month dow)
    const parts = schedule.trim().split(/\s+/);
    if (parts.length === 5) {
      const [targetMinStr, targetHourStr] = parts;
      const targetMin = targetMinStr === '*' ? fromDate.getUTCMinutes() : parseInt(targetMinStr, 10);
      const targetHour = targetHourStr === '*' ? fromDate.getUTCHours() : parseInt(targetHourStr, 10);

      const next = new Date(fromDate);
      next.setUTCMinutes(isNaN(targetMin) ? 0 : targetMin);
      next.setUTCSeconds(0);
      next.setUTCMilliseconds(0);

      if (!isNaN(targetHour)) {
        next.setUTCHours(targetHour);
      }

      // If the target time today is already passed, advance to tomorrow
      if (next.getTime() <= fromDate.getTime()) {
        next.setUTCDate(next.getUTCDate() + 1);
      }

      return next;
    }

    // Fallback: 1 hour in future
    return new Date(fromDate.getTime() + 60 * 60 * 1000);
  }

  /**
   * Creates a new automation rule with calculated initial nextExecution.
   */
  public static async createRule(
    userId: string,
    input: CreateRuleInput
  ): Promise<IAutomationRuleDoc> {
    const timezone = input.timezone || 'UTC';
    const nextExecution = SchedulerService.calculateNextExecution(input.schedule, timezone);

    const rule = new AutomationRule({
      userId: new Types.ObjectId(userId),
      name: input.name,
      description: input.description || '',
      type: input.type,
      enabled: true,
      triggerType: input.triggerType || 'CRON',
      schedule: input.schedule,
      timezone,
      repositoryScope: input.repositoryScope || 'DEFAULT',
      executionPolicy: {
        timeoutSeconds: input.executionPolicy?.timeoutSeconds ?? 300,
        concurrency: input.executionPolicy?.concurrency ?? 'FORBID',
        retryLimit: input.executionPolicy?.retryLimit ?? 3,
        backoffInitialSeconds: input.executionPolicy?.backoffInitialSeconds ?? 10
      },
      failurePolicy: {
        maxRetries: input.failurePolicy?.maxRetries ?? 3,
        backoffMultiplier: input.failurePolicy?.backoffMultiplier ?? 2,
        deadLetter: input.failurePolicy?.deadLetter ?? true,
        notifyOnFailure: input.failurePolicy?.notifyOnFailure ?? true
      },
      nextExecution
    });

    await rule.save();

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'AUTOMATION_RULE_CREATED',
      status: 'SUCCESS',
      description: `Created automation rule "${rule.name}" (${rule.type}) on schedule ${rule.schedule}`,
      metadata: { ruleId: rule._id.toString(), type: rule.type }
    });

    return rule;
  }

  /**
   * Updates an existing automation rule.
   */
  public static async updateRule(
    userId: string,
    ruleId: string,
    updates: Partial<CreateRuleInput> & { enabled?: boolean }
  ): Promise<IAutomationRuleDoc | null> {
    const rule = await AutomationRule.findOne({
      _id: new Types.ObjectId(ruleId),
      userId: new Types.ObjectId(userId)
    });

    if (!rule) return null;

    if (updates.name !== undefined) rule.name = updates.name;
    if (updates.description !== undefined) rule.description = updates.description;
    if (updates.enabled !== undefined) rule.enabled = updates.enabled;
    if (updates.schedule !== undefined) rule.schedule = updates.schedule;
    if (updates.timezone !== undefined) rule.timezone = updates.timezone;
    if (updates.repositoryScope !== undefined) rule.repositoryScope = updates.repositoryScope;
    if (updates.executionPolicy) {
      rule.executionPolicy = { ...rule.executionPolicy, ...updates.executionPolicy };
    }
    if (updates.failurePolicy) {
      rule.failurePolicy = { ...rule.failurePolicy, ...updates.failurePolicy };
    }

    if (rule.enabled) {
      rule.nextExecution = SchedulerService.calculateNextExecution(rule.schedule, rule.timezone);
    } else {
      rule.nextExecution = undefined;
    }

    await rule.save();
    return rule;
  }

  /**
   * Toggles enabled state of an automation rule.
   */
  public static async toggleRule(userId: string, ruleId: string): Promise<IAutomationRuleDoc | null> {
    const rule = await AutomationRule.findOne({
      _id: new Types.ObjectId(ruleId),
      userId: new Types.ObjectId(userId)
    });

    if (!rule) return null;

    rule.enabled = !rule.enabled;
    if (rule.enabled) {
      rule.nextExecution = SchedulerService.calculateNextExecution(rule.schedule, rule.timezone);
    } else {
      rule.nextExecution = undefined;
    }

    await rule.save();

    await logAuditEvent({
      userId,
      component: 'API',
      action: rule.enabled ? 'AUTOMATION_RULE_RESUMED' : 'AUTOMATION_RULE_PAUSED',
      status: 'INFO',
      description: `${rule.enabled ? 'Resumed' : 'Paused'} automation rule "${rule.name}"`,
      metadata: { ruleId }
    });

    return rule;
  }

  /**
   * Manually triggers an automation rule immediately.
   */
  public static async triggerRuleNow(userId: string, ruleId: string) {
    const rule = await AutomationRule.findOne({
      _id: new Types.ObjectId(ruleId),
      userId: new Types.ObjectId(userId)
    });

    if (!rule) throw new Error('Automation rule not found');

    const idempotencyKey = `${rule._id.toString()}:manual:${Date.now()}`;
    const { job, isDuplicate } = await JobQueueService.enqueueJob(
      userId,
      rule.type,
      {
        ruleName: rule.name,
        repositoryScope: rule.repositoryScope,
        manualTrigger: true
      },
      {
        automationRuleId: rule._id.toString(),
        idempotencyKey,
        maxRetries: rule.failurePolicy.maxRetries
      }
    );

    await logAuditEvent({
      userId,
      component: 'API',
      action: 'AUTOMATION_MANUALLY_TRIGGERED',
      status: 'INFO',
      description: `Manually triggered automation rule "${rule.name}" (Job: ${job.jobId})`,
      metadata: { ruleId, jobId: job.jobId }
    });

    return { job, isDuplicate };
  }

  /**
   * Deletes an automation rule.
   */
  public static async deleteRule(userId: string, ruleId: string): Promise<boolean> {
    const result = await AutomationRule.deleteOne({
      _id: new Types.ObjectId(ruleId),
      userId: new Types.ObjectId(userId)
    });

    if (result.deletedCount > 0) {
      await logAuditEvent({
        userId,
        component: 'API',
        action: 'AUTOMATION_RULE_DELETED',
        status: 'INFO',
        description: `Deleted automation rule ${ruleId}`,
        metadata: { ruleId }
      });
      return true;
    }

    return false;
  }

  /**
   * Lists all automation rules for user.
   */
  public static async getRules(userId: string) {
    const rules = await AutomationRule.find({
      userId: new Types.ObjectId(userId)
    })
      .sort({ createdAt: -1 })
      .lean();

    return rules.map((r) => ({
      id: (r as any)._id.toString(),
      userId: r.userId.toString(),
      name: r.name,
      description: r.description,
      type: r.type,
      enabled: r.enabled,
      triggerType: r.triggerType,
      schedule: r.schedule,
      timezone: r.timezone,
      repositoryScope: r.repositoryScope,
      executionPolicy: r.executionPolicy,
      lastExecution: r.lastExecution
        ? {
            timestamp:
              typeof r.lastExecution.timestamp === 'string'
                ? r.lastExecution.timestamp
                : (r.lastExecution.timestamp as any)?.toISOString?.() ||
                  new Date(r.lastExecution.timestamp as any).toISOString(),
            status: r.lastExecution.status,
            durationMs: r.lastExecution.durationMs,
            summary: r.lastExecution.summary,
            jobId: r.lastExecution.jobId
          }
        : undefined,
      nextExecution: r.nextExecution?.toISOString(),
      failurePolicy: r.failurePolicy,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString()
    }));
  }

  /**
   * Distributed scheduler tick:
   * Scans due automation rules, claims atomic tick lock, and enqueues jobs with idempotency keys.
   */
  public static async tick(): Promise<number> {
    // 1. Acquire distributed lease lock (30s TTL)
    const lockKey = 'scheduler_tick_lock';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 1000);

    let lockAcquired = false;
    try {
      await SchedulerLock.findOneAndUpdate(
        { lockKey, expiresAt: { $lt: now } },
        { lockKey, owner: this.instanceId, expiresAt, acquiredAt: now },
        { upsert: true, new: true }
      );
      lockAcquired = true;
    } catch {
      // Lock held by another instance
      return 0;
    }

    if (!lockAcquired) return 0;

    let enqueuedCount = 0;
    try {
      // 2. Find due rules
      const dueRules = await AutomationRule.find({
        enabled: true,
        nextExecution: { $lte: now }
      }).limit(50);

      for (const rule of dueRules) {
        const nextExec = rule.nextExecution || now;
        const idempotencyKey = `${rule._id.toString()}:${nextExec.getTime()}`;

        // Advance rule nextExecution immediately to avoid double-tick
        const calculatedNext = SchedulerService.calculateNextExecution(
          rule.schedule,
          rule.timezone,
          now
        );
        rule.nextExecution = calculatedNext;
        await rule.save();

        // Enqueue the job persistently
        await JobQueueService.enqueueJob(
          rule.userId.toString(),
          rule.type,
          {
            ruleName: rule.name,
            repositoryScope: rule.repositoryScope,
            scheduledTime: nextExec.toISOString()
          },
          {
            automationRuleId: rule._id.toString(),
            idempotencyKey,
            maxRetries: rule.failurePolicy.maxRetries
          }
        );

        enqueuedCount++;
      }
    } catch (err: any) {
      logger.error('[Scheduler] Error during scheduler tick', { error: err.message });
    }

    return enqueuedCount;
  }

  /**
   * Starts background scheduler and worker polling loops.
   */
  public static start(intervalMs: number = 10000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[Scheduler] Starting scheduler & worker loop (interval: ${intervalMs}ms)`);

    // Scheduler ticker
    this.tickerTimer = setInterval(async () => {
      try {
        await SchedulerService.tick();
        await JobQueueService.reapStalledJobs();
      } catch (err) {
        logger.error('[Scheduler] Ticker error', { err });
      }
    }, intervalMs);

    // Worker executor loop (polls more frequently for low latency)
    this.workerTimer = setInterval(async () => {
      try {
        const job = await JobQueueService.claimNextJob();
        if (job) {
          await JobQueueService.processJob(job);
        }
      } catch (err) {
        logger.error('[Scheduler] Worker processing error', { err });
      }
    }, Math.max(2000, Math.floor(intervalMs / 3)));
  }

  /**
   * Stops background loops.
   */
  public static stop() {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
    this.isRunning = false;
    logger.info('[Scheduler] Stopped scheduler & worker loops');
  }
}
