import { StorageManager, DEFAULT_SERVER_URL } from './storage';
import type { DetectedSubmission, ExtensionConfig, SubmissionState } from './types';

export function mapDbSyncStatusToExtensionState(syncStatus?: string): SubmissionState {
  switch (syncStatus) {
    case 'SYNCED':
      return 'SYNCED';
    case 'FAILED':
      return 'FAILED';
    case 'PENDING':
      return 'EXPORT_PENDING';
    case 'SKIPPED':
      return 'REJECTED';
    default:
      return 'EXPORT_PENDING';
  }
}

export function isInvalidSubmissionSnippet(code?: string): boolean {
  const trimmed = (code || '').trim();
  if (!trimmed) return true;
  return /^(Input|Output|Explanation|Example\s*\d*|Constraints)\s*:/i.test(trimmed);
}

export interface CanonicalBackendSyncResult {
  success: boolean;
  authExpired?: boolean;
  config?: ExtensionConfig;
  historyCount?: number;
  error?: string;
}

/**
 * Fetches canonical /api/v1/sync/state (and optionally /sync/leetcode/history),
 * immediately persists updated streak, metrics, lastSyncedSubmission, and authState,
 * and reconciles stale/already-synced items out of local pendingQueue.
 */
export async function fetchAndSyncCanonicalState(
  authToken: string,
  serverUrl: string = DEFAULT_SERVER_URL,
  options: {
    webAppUrl?: string;
    fetchHistory?: boolean;
    allowRefresh?: boolean;
  } = {}
): Promise<CanonicalBackendSyncResult> {
  const cleanServer =
    serverUrl && !serverUrl.includes('.vercel.app')
      ? serverUrl.replace(/\/+$/, '')
      : DEFAULT_SERVER_URL;
  let activeToken = authToken;

  try {
    const stateRes = await fetch(`${cleanServer}/api/v1/sync/state`, {
      headers: { Authorization: `Bearer ${activeToken}` },
      signal: AbortSignal.timeout(20000)
    });

    if (stateRes.status === 401) {
      await StorageManager.updateConfig({
        authState: 'EXPIRED',
        authErrorReason: 'Session expired or signed out. Open dashboard to re-authenticate.',
        tokenHealthStatus: 'EXPIRED'
      });
      return { success: false, authExpired: true, error: 'Session expired (401).' };
    }

    if (!stateRes.ok) {
      await StorageManager.updateConfig({
        authState: 'NETWORK_ERROR',
        authErrorReason: `Backend returned HTTP ${stateRes.status}. Retaining session and will retry.`
      });
      return { success: false, error: `Backend status ${stateRes.status}` };
    }

    const stateJson = await stateRes.json();
    const s = stateJson.data;
    if (!s || !s.user) {
      return { success: false, error: 'Invalid sync state response' };
    }

    const sp = s.syncPreferences || {};
    const np = s.user.notificationPreferences || {};
    const ls = s.lastSyncedSubmission;

    // Persist canonical state immediately so popup never blocks waiting on secondary history fetch
    let updatedCfg = await StorageManager.updateConfig({
      authToken: activeToken,
      serverUrl: cleanServer,
      ...(options.webAppUrl ? { webAppUrl: options.webAppUrl.replace(/\/+$/, '') } : {}),
      authState: 'AUTHENTICATED',
      authErrorReason: undefined,
      sessionExpiresAt: s.user.sessionExpiresAt,
      tokenHealthStatus: s.githubTokenHealth?.status || 'UNKNOWN',
      userProfile: {
        username: s.user.username,
        email: s.user.email,
        avatarUrl: s.user.avatarUrl
      },
      leetcodeUsername: s.user.leetcodeUsername || undefined,
      targetRepoFullName: s.targetRepo?.repoFullName || '',
      targetBranch: s.targetRepo?.defaultBranch || 'main',
      autoSyncEnabled: sp.autoSyncEnabled ?? true,
      exportPolicy: sp.exportPolicy ?? 'ALLOW_MULTIPLE',
      exportNewOnly: sp.exportPolicy === 'NEW_ONLY',
      allowMultipleSubmissions: (sp.exportPolicy ?? 'ALLOW_MULTIPLE') === 'ALLOW_MULTIPLE',
      addSolutionComments: sp.includeHeader ?? true,
      includeMetrics: sp.includeMetrics ?? true,
      folderStructureTemplate:
        sp.folderPattern || s.targetRepo?.solutionPathPattern || 'solutions/{difficulty}/{id}-{slug}',
      fileNamingPattern: sp.fileNamingPattern || '{slug}{ext}',
      zeroPadId: sp.zeroPadId ?? 0,
      notifyOnSolved: np.problemSolved ?? true,
      notifyOnSuccess: np.syncSuccess ?? true,
      notifyOnSyncFailure: np.syncFailure ?? true,
      metrics: {
        uniqueProblemsSolved: s.metrics?.uniqueProblemsSolved ?? 0,
        acceptedSubmissions: s.metrics?.acceptedSubmissions ?? 0,
        exportedCount: s.metrics?.exportedCount ?? 0,
        pendingCount: s.metrics?.pendingCount ?? 0,
        failedCount: s.metrics?.failedCount ?? 0,
        currentStreak: s.streak?.currentStreak ?? 0,
        longestStreak: s.streak?.longestStreak ?? 0
      },
      lastSyncedSubmission: ls
        ? {
            submissionId: ls.submissionId,
            questionId: ls.questionId ? String(ls.questionId) : undefined,
            questionTitle: ls.questionTitle,
            language: ls.language,
            commitSha: ls.githubCommitSha,
            commitUrl: ls.githubCommitUrl,
            filePath: ls.filePath,
            syncedAt: ls.syncedAt || ls.submittedAt
          }
        : null,
      lastBackendSyncAt: new Date().toISOString()
    });

    // Silent JWT refresh if session expires within 48 hours
    if (options.allowRefresh !== false && s.user.sessionExpiresAt) {
      const msLeft = new Date(s.user.sessionExpiresAt).getTime() - Date.now();
      if (msLeft > 0 && msLeft < 48 * 60 * 60 * 1000) {
        try {
          const refRes = await fetch(`${cleanServer}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${activeToken}` },
            signal: AbortSignal.timeout(10000)
          });
          if (refRes.ok) {
            const refJson = await refRes.json();
            if (refJson.data?.token) {
              activeToken = refJson.data.token;
              updatedCfg = await StorageManager.updateConfig({ authToken: activeToken });
            }
          }
        } catch {
          // Keep current token on transient refresh error
        }
      }
    }

    let mappedHistory: DetectedSubmission[] = [];
    if (options.fetchHistory !== false) {
      try {
        const histRes = await fetch(`${cleanServer}/api/v1/sync/leetcode/history?limit=100`, {
          headers: { Authorization: `Bearer ${activeToken}` },
          signal: AbortSignal.timeout(15000)
        });
        if (histRes.ok) {
          const hJson = await histRes.json();
          const submissions = Array.isArray(hJson.data) ? hJson.data : hJson.data?.items || [];
          mappedHistory = submissions.map((sub: any) => ({
            submissionId: sub.submissionId || String(sub._id),
            questionId: String(sub.questionId),
            questionTitle: sub.questionTitle,
            questionSlug: sub.questionSlug,
            difficulty: sub.difficulty,
            language: sub.language,
            code: sub.code || '',
            runtimeMs: sub.runtimeMs || 0,
            runtimePercentile: sub.runtimePercentile || 0,
            memoryBytes: sub.memoryBytes || 0,
            memoryPercentile: sub.memoryPercentile || 0,
            verdict: 'Accepted',
            topicTags: sub.topicTags || [],
            submittedAt: sub.submittedAt || new Date().toISOString(),
            state: mapDbSyncStatusToExtensionState(sub.syncStatus),
            commitSha: sub.githubCommitSha,
            commitUrl: sub.githubCommitUrl,
            filePath: sub.filePath,
            errorMessage: sub.syncErrorMessage
          }));
          await StorageManager.setSyncedHistory(mappedHistory);

          // Prune items from local pendingQueue that backend confirms SYNCED or SKIPPED (REJECTED),
          // or legacy malformed items lacking real source code
          const settledIds = new Set(
            mappedHistory
              .filter((h) => (h.state === 'SYNCED' && Boolean(h.commitSha)) || h.state === 'REJECTED')
              .map((h) => String(h.submissionId))
          );
          const localQueue = await StorageManager.getPendingQueue();
          if (localQueue.length > 0) {
            const cleanedQueue: DetectedSubmission[] = [];
            for (const q of localQueue) {
              if (settledIds.has(String(q.submissionId))) {
                continue;
              }
              if (isInvalidSubmissionSnippet(q.code)) {
                await StorageManager.archiveFailedSubmission({
                  id: `invalid-${Date.now()}-${q.submissionId}`,
                  questionId: q.questionId,
                  questionTitle: q.questionTitle,
                  questionSlug: q.questionSlug,
                  verdict: q.verdict,
                  language: q.language,
                  runtimeMs: q.runtimeMs,
                  memoryBytes: q.memoryBytes,
                  submittedAt: q.submittedAt,
                  notes: 'Removed stale entry with missing/non-code snippet.'
                });
                continue;
              }
              cleanedQueue.push(q);
            }
            if (cleanedQueue.length !== localQueue.length) {
              await StorageManager.setPendingQueue(cleanedQueue);
            }
          }
        }
      } catch {
        mappedHistory = await StorageManager.getSyncedHistory();
      }
    }

    return {
      success: true,
      config: updatedCfg,
      historyCount: mappedHistory.length
    };
  } catch (err: any) {
    await StorageManager.updateConfig({
      authState: 'NETWORK_ERROR',
      authErrorReason:
        err?.name === 'TimeoutError'
          ? 'Backend waking up from idle sleep. Session retained locally.'
          : err?.message || 'Temporary network error contacting backend.'
    });
    return { success: false, error: err?.message || 'Network failure' };
  }
}

