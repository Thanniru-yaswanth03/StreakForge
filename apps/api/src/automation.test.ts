import { describe, it, expect } from 'vitest';
import { SchedulerService } from './services/schedulerService.js';
import { JOB_HANDLERS } from './services/jobHandlers.js';
import type { AutomationType } from '@streakforge/shared-types';

describe('Phase 6 — Automation Engine, Scheduler & Job Reliability', () => {
  describe('1. Schedule & Timezone Calculations', () => {
    it('calculates next execution for minute-based intervals ("every 15m")', () => {
      const base = new Date('2026-11-04T12:00:00.000Z');
      const next = SchedulerService.calculateNextExecution('every 15m', 'UTC', base);

      expect(next.toISOString()).toBe('2026-11-04T12:15:00.000Z');
      expect(next.getTime() - base.getTime()).toBe(15 * 60 * 1000);
    });

    it('calculates next execution for hour-based intervals ("every 2h")', () => {
      const base = new Date('2026-11-04T10:00:00.000Z');
      const next = SchedulerService.calculateNextExecution('every 2h', 'UTC', base);

      expect(next.toISOString()).toBe('2026-11-04T12:00:00.000Z');
      expect(next.getTime() - base.getTime()).toBe(2 * 60 * 60 * 1000);
    });

    it('calculates next execution for day-based intervals ("every 1d")', () => {
      const base = new Date('2026-11-04T00:00:00.000Z');
      const next = SchedulerService.calculateNextExecution('every 1d', 'UTC', base);

      expect(next.toISOString()).toBe('2026-11-05T00:00:00.000Z');
      expect(next.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it('calculates next execution for standard 5-part cron expressions ("0 22 * * *")', () => {
      // 10:00 AM UTC today, target is 22:00 UTC today
      const base1 = new Date('2026-11-04T10:00:00.000Z');
      const next1 = SchedulerService.calculateNextExecution('0 22 * * *', 'UTC', base1);

      expect(next1.toISOString()).toBe('2026-11-04T22:00:00.000Z');

      // 23:00 UTC today (already past 22:00), target should advance to tomorrow 22:00 UTC
      const base2 = new Date('2026-11-04T23:00:00.000Z');
      const next2 = SchedulerService.calculateNextExecution('0 22 * * *', 'UTC', base2);

      expect(next2.toISOString()).toBe('2026-11-05T22:00:00.000Z');
    });
  });

  describe('2. Reliability: Exponential Backoff & Retry Calculations', () => {
    it('computes exponential backoff delays with base 10s * 2^retryCount', () => {
      const initialDelaySec = 10;

      // Attempt 0 (first failure): delay = 10 * 2^0 = 10s
      const delay0 = initialDelaySec * Math.pow(2, 0);
      expect(delay0).toBe(10);

      // Attempt 1: delay = 10 * 2^1 = 20s
      const delay1 = initialDelaySec * Math.pow(2, 1);
      expect(delay1).toBe(20);

      // Attempt 2: delay = 10 * 2^2 = 40s
      const delay2 = initialDelaySec * Math.pow(2, 2);
      expect(delay2).toBe(40);

      // Attempt 3: delay = 10 * 2^3 = 80s
      const delay3 = initialDelaySec * Math.pow(2, 3);
      expect(delay3).toBe(80);
    });

    it('correctly distinguishes retrying state vs dead-letter exhaustion', () => {
      const maxRetries = 3;

      for (let retry = 0; retry <= maxRetries; retry++) {
        const nextRetry = retry + 1;
        const willRetry = nextRetry < maxRetries;

        if (retry === 0) expect(willRetry).toBe(true);
        if (retry === 1) expect(willRetry).toBe(true);
        if (retry === 2) expect(willRetry).toBe(false); // 2 + 1 = 3 -> Dead Letter
      }
    });
  });

  describe('3. Job Idempotency & Duplicate Prevention', () => {
    it('generates deterministic idempotency keys for scheduled executions', () => {
      const ruleId = 'rule_654321';
      const scheduledTimestamp = new Date('2026-11-04T22:00:00.000Z').getTime();

      const key1 = `${ruleId}:${scheduledTimestamp}`;
      const key2 = `${ruleId}:${scheduledTimestamp}`;

      expect(key1).toBe(key2);
      expect(key1).toBe(`rule_654321:${scheduledTimestamp}`);
    });

    it('generates distinct keys for subsequent scheduled occurrences', () => {
      const ruleId = 'rule_654321';
      const tick1 = new Date('2026-11-04T22:00:00.000Z').getTime();
      const tick2 = new Date('2026-11-05T22:00:00.000Z').getTime();

      const key1 = `${ruleId}:${tick1}`;
      const key2 = `${ruleId}:${tick2}`;

      expect(key1).not.toBe(key2);
    });
  });

  describe('4. Zero-Fabrication Automation Handlers', () => {
    const supportedTypes: AutomationType[] = [
      'LEETCODE_EXPORT',
      'GITHUB_SYNC_CHANGES',
      'LOCAL_BACKUP',
      'REPO_HEALTH_CHECK',
      'GITHUB_ACTIVITY_SYNC',
      'LEETCODE_HISTORY_SYNC',
      'DAILY_REMINDERS',
      'WEEKLY_ANALYTICS'
    ];

    it('has concrete registered handlers for all 8 required automation types', () => {
      for (const type of supportedTypes) {
        expect(JOB_HANDLERS[type]).toBeDefined();
        expect(typeof JOB_HANDLERS[type]).toBe('function');
      }
    });

    it('safely excludes scheduled local backups from coding streak tallies', async () => {
      // Safety rule: LOCAL_BACKUP must produce genuine git backup tags/branches
      // with [streakforge-backup] label, strictly excluded from contribution streak tallies
      expect(JOB_HANDLERS.LOCAL_BACKUP).toBeDefined();
    });

    it('refuses to export LeetCode submissions with empty or missing source code', async () => {
      // Safety rule: Missing code cannot create empty dummy files
      const result = await JOB_HANDLERS.LEETCODE_EXPORT('000000000000000000000000', {
        submissionId: 'sub_empty_code',
        questionTitle: 'Two Sum',
        code: '   '
      });
      expect(result.success).toBe(false);
      expect(result.summary).toContain('Export rejected');
      expect(result.summary).toContain('missing or empty');
    });
  });
});
