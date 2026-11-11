import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager, dispatchBackgroundNotification } from '../src/background/sync-manager';
import { StorageManager, DEFAULT_SERVER_URL } from '../src/shared/storage';
import { fetchAndSyncCanonicalState } from '../src/shared/backendSync';
import { LeetCodeDomExtractor } from '../src/content/dom-extractor';
import type { DetectedSubmission } from '../src/shared/types';

function createChromeStorageMock(initial: Record<string, any> = {}) {
  let store: Record<string, any> = { ...initial };
  const notifCreateSpy = vi.fn();

  (globalThis as any).chrome = {
    storage: {
      local: {
        get: vi.fn(async (key?: string | string[] | null) => {
          if (typeof key === 'string') return { [key]: store[key] };
          return { ...store };
        }),
        set: vi.fn(async (obj: Record<string, any>) => {
          store = { ...store, ...obj };
        }),
        clear: vi.fn(async () => {
          store = {};
        })
      }
    },
    notifications: {
      create: notifCreateSpy,
      getPermissionLevel: vi.fn((cb: (level: string) => void) => cb('granted'))
    },
    runtime: {
      getURL: vi.fn((p: string) => `chrome-extension://mock-id/${p}`)
    },
    tabs: {
      query: vi.fn((_q: any, cb: (tabs: any[]) => void) => cb([]))
    }
  };

  return { store: () => store, notifCreateSpy };
}

function makeAcceptedSub(overrides: Partial<DetectedSubmission> = {}): DetectedSubmission {
  return {
    submissionId: 'sub_v4_100',
    questionId: '1',
    questionTitle: 'Two Sum',
    questionSlug: 'two-sum',
    difficulty: 'Easy',
    language: 'java',
    code: 'class Solution { public int[] twoSum(int[] a, int t) { return new int[]{}; } }',
    runtimeMs: 2,
    runtimePercentile: 95,
    memoryBytes: 42000000,
    memoryPercentile: 80,
    verdict: 'Accepted',
    topicTags: ['Array', 'Hash Table'],
    submittedAt: '2026-11-10T10:00:00.000Z',
    state: 'DETECTED',
    ...overrides
  };
}

describe('StreakForge V4.0 Extension Reliability & Notifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('self-heals polluted Vercel frontend serverUrl back to Render API backend', async () => {
    createChromeStorageMock({
      config: {
        authToken: 'jwt_123',
        serverUrl: 'https://streak-forge-six.vercel.app'
      }
    });

    const cfg = await StorageManager.getConfig();
    expect(cfg.serverUrl).toBe(DEFAULT_SERVER_URL);
  });

  it('NEVER marks PENDING (no target repo) backend responses as SYNCED and retains in queue', async () => {
    createChromeStorageMock({
      config: {
        authToken: 'jwt_123',
        serverUrl: 'https://streakforge-api-5uhs.onrender.com',
        autoSyncEnabled: true,
        notifyOnSolved: true,
        notifyOnSuccess: true
      }
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          submissionId: 'sub_v4_100',
          syncStatus: 'PENDING',
          message: 'Saved submission. Connect a target GitHub repository to enable automatic commit.'
        }
      })
    } as any);

    const result = await SyncManager.processSubmission(makeAcceptedSub());
    expect(result.state).toBe('RETRY_PENDING');
    expect(result.commitSha).toBeUndefined();

    const queue = await StorageManager.getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].submissionId).toBe('sub_v4_100');
  });

  it('recovers previously FAILED items in processPendingQueue once GitHub commit SHA is verified', async () => {
    createChromeStorageMock({
      config: {
        authToken: 'jwt_123',
        serverUrl: 'https://streakforge-api-5uhs.onrender.com',
        targetRepoFullName: 'testuser/algo-repo'
      },
      pendingQueue: [
        makeAcceptedSub({
          submissionId: 'sub_failed_prev',
          state: 'FAILED',
          retryCount: 1,
          errorMessage: 'Temporary 503 error'
        })
      ]
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          syncStatus: 'SYNCED',
          commitSha: 'verified999sha',
          commitUrl: 'https://github.com/testuser/algo-repo/commit/verified999sha',
          filePath: 'Easy/0001-two-sum/solution.java'
        }
      })
    } as any);

    await SyncManager.processPendingQueue(true);

    const queueAfter = await StorageManager.getPendingQueue();
    expect(queueAfter.length).toBe(0);

    const history = await StorageManager.getSyncedHistory();
    expect(history[0].state).toBe('SYNCED');
    expect(history[0].commitSha).toBe('verified999sha');
  });

  it('delivers background Chrome notifications respecting category toggles and deduplicates bursts', async () => {
    const { notifCreateSpy } = createChromeStorageMock({
      config: {
        notifyOnSolved: true,
        notifyOnSuccess: true,
        notifyOnSyncFailure: false
      }
    });

    // Should fire solved notification once (second call within window deduplicated)
    await dispatchBackgroundNotification({
      category: 'PROBLEM_SOLVED',
      title: 'Solved: Two Sum',
      message: 'Accepted (java)',
      dedupeKey: 'solved:sub_1'
    });
    await dispatchBackgroundNotification({
      category: 'PROBLEM_SOLVED',
      title: 'Solved: Two Sum',
      message: 'Accepted (java)',
      dedupeKey: 'solved:sub_1'
    });

    // Disabled category should NOT fire
    await dispatchBackgroundNotification({
      category: 'SYNC_FAILURE',
      title: 'Sync Failed',
      message: 'Should be suppressed',
      dedupeKey: 'fail:sub_1'
    });

    expect(notifCreateSpy).toHaveBeenCalledTimes(1);
    const notifArgs = notifCreateSpy.mock.calls[0][1];
    expect(notifArgs.iconUrl).toBe('chrome-extension://mock-id/icons/icon-48.png');

    const storedNotifs = await StorageManager.getNotificationHistory();
    expect(storedNotifs.length).toBe(1);
  });

  it('rejects problem-statement Input:/Example testcase blocks from being mistaken for submitted code', () => {
    expect(
      LeetCodeDomExtractor.isLikelyNonCodeSnippet('Input: strs = ["flower","flow","flight"]')
    ).toBe(true);
    expect(LeetCodeDomExtractor.isLikelyNonCodeSnippet('Output: "fl"')).toBe(true);
    expect(LeetCodeDomExtractor.isLikelyNonCodeSnippet('Example 1: nums = [2,7,11,15]')).toBe(true);
    expect(
      LeetCodeDomExtractor.isLikelyNonCodeSnippet(
        'class Solution { public String longestCommonPrefix(String[] strs) { return ""; } }'
      )
    ).toBe(false);
  });

  it('self-heals legacy V3 config authState and hydrates streak, exportedCount, and pruned queue from /sync/state', async () => {
    createChromeStorageMock({
      config: {
        authToken: 'legacy_v3_jwt',
        userProfile: { username: 'octodev', email: 'o@example.com', avatarUrl: '' },
        targetRepoFullName: 'octodev/LeetCodeHustle'
      },
      pendingQueue: [
        makeAcceptedSub({ submissionId: 'sub_already_done', state: 'FAILED' }),
        makeAcceptedSub({
          submissionId: 'sub_bad_snippet',
          code: 'Input: strs = ["flower","flow","flight"]',
          state: 'FAILED'
        })
      ]
    });

    const initialCfg = await StorageManager.getConfig();
    expect(initialCfg.authState).toBe('AUTHENTICATED');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes('/api/v1/sync/state')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              user: {
                username: 'octodev',
                email: 'o@example.com',
                avatarUrl: '',
                leetcodeUsername: 'lc_octo',
                sessionExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                notificationPreferences: { problemSolved: true, syncSuccess: true, syncFailure: true }
              },
              githubTokenHealth: { status: 'VALID' },
              targetRepo: { repoFullName: 'octodev/LeetCodeHustle', defaultBranch: 'main' },
              syncPreferences: { autoSyncEnabled: true, exportPolicy: 'NEW_ONLY', includeHeader: true },
              metrics: { uniqueProblemsSolved: 35, acceptedSubmissions: 35, exportedCount: 4, pendingCount: 0, failedCount: 0 },
              streak: { currentStreak: 3, longestStreak: 18 },
              lastSyncedSubmission: {
                submissionId: 'sub_already_done',
                questionId: '14',
                questionTitle: 'Longest Common Prefix',
                language: 'java',
                githubCommitSha: 'abc1234',
                githubCommitUrl: 'https://github.com/octodev/LeetCodeHustle/commit/abc1234'
              }
            }
          })
        } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            items: [
              {
                submissionId: 'sub_already_done',
                questionId: '14',
                questionTitle: 'Longest Common Prefix',
                questionSlug: 'longest-common-prefix',
                difficulty: 'Easy',
                language: 'java',
                code: 'class Solution {}',
                syncStatus: 'SYNCED',
                githubCommitSha: 'abc1234',
                githubCommitUrl: 'https://github.com/octodev/LeetCodeHustle/commit/abc1234'
              }
            ]
          }
        })
      } as any;
    });

    const syncRes = await fetchAndSyncCanonicalState('legacy_v3_jwt', DEFAULT_SERVER_URL);
    expect(syncRes.success).toBe(true);

    const updatedCfg = await StorageManager.getConfig();
    expect(updatedCfg.authState).toBe('AUTHENTICATED');
    expect(updatedCfg.metrics?.currentStreak).toBe(3);
    expect(updatedCfg.metrics?.exportedCount).toBe(4);
    expect(updatedCfg.lastSyncedSubmission?.commitSha).toBe('abc1234');

    const remainingQueue = await StorageManager.getPendingQueue();
    expect(remainingQueue.length).toBe(0);
  });

  it('prunes SKIPPED (NEW_ONLY) items cleanly in processPendingQueue without keeping them stuck', async () => {
    createChromeStorageMock({
      config: {
        authToken: 'jwt_123',
        serverUrl: 'https://streakforge-api-5uhs.onrender.com',
        targetRepoFullName: 'testuser/algo-repo'
      },
      pendingQueue: [
        makeAcceptedSub({
          submissionId: 'sub_skipped_retry',
          state: 'FAILED',
          retryCount: 1
        })
      ]
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          syncStatus: 'SKIPPED',
          message: 'Skipped per NEW_ONLY export policy'
        }
      })
    } as any);

    await SyncManager.processPendingQueue(true);
    const queueAfter = await StorageManager.getPendingQueue();
    expect(queueAfter.length).toBe(0);
  });
});

