import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { DEFAULT_CONFIG } from '../src/shared/storage';
import { SyncManager } from '../src/background/sync-manager';
import type { DetectedSubmission } from '../src/shared/types';

function makeSubmission(overrides: Partial<DetectedSubmission> = {}): DetectedSubmission {
  return {
    submissionId: 'sub_audit_100',
    questionId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    difficulty: 'Easy',
    language: 'python3',
    code: 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]',
    runtimeMs: 42,
    runtimePercentile: 85.4,
    memoryBytes: 17000000,
    memoryPercentile: 60.2,
    verdict: 'Accepted',
    topicTags: ['Array', 'Hash Table'],
    submittedAt: '2026-11-10T10:00:00.000Z',
    state: 'DETECTED',
    ...overrides
  };
}

describe('Phase 15 — Chrome Extension Security & Verdict Integrity', () => {
  let memoryStore: Record<string, any> = {};

  beforeEach(() => {
    memoryStore = {
      config: {
        ...DEFAULT_CONFIG,
        authToken: 'test-jwt-token',
        autoSyncEnabled: true
      }
    };

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: memoryStore[key] })),
          set: vi.fn(async (obj: Record<string, any>) => {
            Object.assign(memoryStore, obj);
          })
        }
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  it('configures production API and Vercel web URLs as defaults', () => {
    expect(DEFAULT_CONFIG.serverUrl).toBe('https://streakforge-api-5uhs.onrender.com');
    expect(DEFAULT_CONFIG.webAppUrl).toBe('https://streak-forge-six.vercel.app');
  });

  it('strictly blocks non-Accepted verdicts without calling backend commit/sync API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await SyncManager.processSubmission(
      makeSubmission({
        submissionId: 'sub_wrong_answer',
        verdict: 'Wrong Answer'
      })
    );

    expect(result.state).toBe('REJECTED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails cleanly when Accepted submission has empty source code instead of fabricating commit', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = await SyncManager.processSubmission(
      makeSubmission({
        submissionId: 'sub_empty_code',
        code: '   '
      })
    );

    expect(result.state).toBe('FAILED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('exports valid Accepted submission with non-empty source code to authenticated backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          commitSha: 'deadbeef1234',
          commitUrl: 'https://github.com/octocat/lc/commit/deadbeef1234',
          filePath: 'solutions/easy/1-two-sum/solution.py'
        }
      })
    } as any);

    const result = await SyncManager.processSubmission(makeSubmission());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/api/v1/sync/leetcode/submission');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer test-jwt-token');
    expect(result.state).toBe('SYNCED');
    expect(result.commitSha).toBe('deadbeef1234');
  });
});

