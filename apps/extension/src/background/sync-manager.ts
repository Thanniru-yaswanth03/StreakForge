import { SubmissionStateMachine } from '../shared/stateMachine';
import { DuplicateRegistry, generateSubmissionKey } from '../shared/duplicateRegistry';
import { StorageManager, DEFAULT_SERVER_URL } from '../shared/storage';
import { isInvalidSubmissionSnippet } from '../shared/backendSync';
import type {
  DetectedSubmission,
  FailedSubmission,
  ExtensionConfig,
  ExtensionNotificationCategory
} from '../shared/types';

// Persist deduplication keys across SW restarts inside chrome.storage.local (120s cooldown)
const DEDUPE_WINDOW_MS = 120_000;

async function wasRecentlyNotified(dedupeKey: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return false;
  try {
    const res = await chrome.storage.local.get('notificationDedupe');
    const map: Record<string, number> = res.notificationDedupe || {};
    const prev = map[dedupeKey];
    if (prev && Date.now() - prev < DEDUPE_WINDOW_MS) {
      return true;
    }
    const now = Date.now();
    const cleaned: Record<string, number> = { [dedupeKey]: now };
    for (const [k, ts] of Object.entries(map)) {
      if (now - ts < DEDUPE_WINDOW_MS && k !== dedupeKey) {
        cleaned[k] = ts;
      }
    }
    await chrome.storage.local.set({ notificationDedupe: cleaned });
  } catch {
    // Best-effort dedupe
  }
  return false;
}

export async function dispatchBackgroundNotification(params: {
  category: ExtensionNotificationCategory;
  title: string;
  message: string;
  url?: string;
  dedupeKey: string;
}): Promise<void> {
  const config = await StorageManager.getConfig();
  if (params.category === 'PROBLEM_SOLVED' && config.notifyOnSolved === false) return;
  if (params.category === 'SYNC_SUCCESS' && config.notifyOnSuccess === false) return;
  if (params.category === 'SYNC_FAILURE' && config.notifyOnSyncFailure === false) return;

  if (await wasRecentlyNotified(params.dedupeKey)) return;

  await StorageManager.appendNotification({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: params.category,
    title: params.title,
    message: params.message,
    url: params.url,
    timestamp: new Date().toISOString(),
    dedupeKey: params.dedupeKey
  });

  if (typeof chrome === 'undefined' || !chrome.notifications?.create) return;

  const canNotify = await new Promise<boolean>((resolve) => {
    if (!chrome.notifications.getPermissionLevel) return resolve(true);
    chrome.notifications.getPermissionLevel((level) => resolve(level === 'granted'));
  });
  if (!canNotify) return;

  const iconUrl =
    typeof chrome.runtime?.getURL === 'function'
      ? chrome.runtime.getURL('icons/icon-48.png')
      : 'icons/icon-48.png';

  const notifId = `${params.dedupeKey}::${Date.now()}`;
  if (params.url && chrome.storage?.local) {
    chrome.storage.local
      .get('notificationLinks')
      .then((r) => {
        const links: Record<string, string> = r.notificationLinks || {};
        links[notifId] = params.url!;
        // Retain recent 40 links
        const keys = Object.keys(links);
        if (keys.length > 40) delete links[keys[0]];
        return chrome.storage.local.set({ notificationLinks: links });
      })
      .catch(() => {});
  }

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl,
    title: params.title,
    message: params.message,
    priority: params.category === 'SYNC_FAILURE' ? 2 : 1
  });
}

function broadcastTabToast(
  type: 'SHOW_ON_SCREEN_SYNC_TOAST' | 'SYNC_FAILED' | 'SYNC_IN_PROGRESS',
  payload?: Record<string, any>
): void {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, { type, payload })
          .catch(() => {});
      }
    }
  });
}

export class SyncManager {
  /**
   * Dispatches an HTTP export request to the StreakForge backend API with cold-start tolerance
   */
  public static async exportToBackend(
    submission: DetectedSubmission,
    config: ExtensionConfig
  ): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
    if (!config.authToken) {
      return {
        success: false,
        status: 401,
        error: 'StreakForge session missing. Sign in on the dashboard to sync solutions.'
      };
    }

    const serverUrl = (config.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
    const endpoint = `${serverUrl}/api/v1/sync/leetcode/submission`;

    const requestBody = JSON.stringify({
      submissionId: submission.submissionId,
      questionId: submission.questionId,
      questionTitle: submission.questionTitle,
      questionSlug: submission.questionSlug,
      difficulty: submission.difficulty,
      language: submission.language,
      code: submission.code,
      runtimeMs: submission.runtimeMs,
      runtimePercentile: submission.runtimePercentile,
      memoryBytes: submission.memoryBytes,
      memoryPercentile: submission.memoryPercentile,
      submittedAt: submission.submittedAt,
      topicTags: submission.topicTags,
      problemUrl: `https://leetcode.com/problems/${submission.questionSlug}/`
    });

    const MAX_ATTEMPTS = 2;
    let lastError = 'Network connection failed while reaching StreakForge API.';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.authToken}`
          },
          body: requestBody,
          signal: AbortSignal.timeout(25000)
        });

        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
          await StorageManager.updateConfig({
            authState: 'EXPIRED',
            authErrorReason: 'Your StreakForge session expired. Open Web Dashboard to refresh sign-in.'
          });
          return {
            success: false,
            status: 401,
            error: json?.error?.message || 'Session expired (401). Please sign in again.'
          };
        }

        // Retry once cleanly if backend hits transient Render 502/503/504 waking up
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 2500));
          continue;
        }

        if (!res.ok || !json.success) {
          return {
            success: false,
            status: res.status,
            error: json?.error?.message || `Export failed with status ${res.status}`
          };
        }

        return { success: true, status: res.status, data: json.data };
      } catch (err: any) {
        lastError =
          err?.name === 'TimeoutError'
            ? 'Backend server timed out (Render cold start). Retrying automatically.'
            : err?.message || 'Network connection failed while reaching StreakForge API.';
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    return { success: false, error: lastError };
  }

  private static async enqueueForRetry(sub: DetectedSubmission): Promise<void> {
    const queue = await StorageManager.getPendingQueue();
    const filtered = queue.filter((q) => q.submissionId !== sub.submissionId);
    filtered.unshift({ ...sub, lastAttemptAt: Date.now() });
    await StorageManager.setPendingQueue(filtered);
  }

  private static async removeFromQueue(submissionId: string): Promise<void> {
    const queue = await StorageManager.getPendingQueue();
    const filtered = queue.filter((q) => q.submissionId !== submissionId);
    if (filtered.length !== queue.length) {
      await StorageManager.setPendingQueue(filtered);
    }
  }

  /**
   * Processes an incoming detected submission through the 11-state state machine
   */
  public static async processSubmission(
    raw: DetectedSubmission
  ): Promise<DetectedSubmission> {
    const config = await StorageManager.getConfig();
    let current = { ...raw };

    // 1. DETECTED -> VALIDATING
    try {
      const t1 = SubmissionStateMachine.transition(
        current,
        'VALIDATING',
        'Validating submission verdict and ownership'
      );
      current = t1.submission;
      await SubmissionStateMachine.recordLog(t1.log);
    } catch (err: any) {
      console.warn('[StreakForge] State transition error:', err);
      return current;
    }

    // 2. Handle Non-Accepted Verdicts
    if (current.verdict !== 'Accepted') {
      const tReject = SubmissionStateMachine.transition(
        current,
        'REJECTED',
        `Non-accepted verdict: ${current.verdict}`
      );
      current = tReject.submission;
      await SubmissionStateMachine.recordLog(tReject.log);

      if (config.archiveFailedSubmissionsLocally) {
        const failedRecord: FailedSubmission = {
          id: `failed-${Date.now()}-${current.submissionId}`,
          questionId: current.questionId,
          questionTitle: current.questionTitle,
          questionSlug: current.questionSlug,
          verdict: current.verdict,
          language: current.language,
          runtimeMs: current.runtimeMs,
          memoryBytes: current.memoryBytes,
          submittedAt: current.submittedAt,
          codeSnippet: current.code ? current.code.slice(0, 500) : undefined
        };
        await StorageManager.archiveFailedSubmission(failedRecord);
      }

      return current;
    }

    // 3. VALIDATING -> ACCEPTED
    const tAccept = SubmissionStateMachine.transition(
      current,
      'ACCEPTED',
      'Verified authentic Accepted submission'
    );
    current = tAccept.submission;
    await SubmissionStateMachine.recordLog(tAccept.log);

    // Notify on authentic Accepted solve immediately
    await dispatchBackgroundNotification({
      category: 'PROBLEM_SOLVED',
      title: `Solved: ${current.questionId}. ${current.questionTitle}`,
      message: `Accepted (${current.language}) — preparing sync to ${config.targetRepoFullName || 'StreakForge'}.`,
      url: `https://leetcode.com/problems/${current.questionSlug}/`,
      dedupeKey: `solved:${current.submissionId}`
    });

    // 4. ACCEPTED -> SOURCE_RETRIEVAL_PENDING
    const tSrcPending = SubmissionStateMachine.transition(
      current,
      'SOURCE_RETRIEVAL_PENDING',
      'Verifying source-code extraction integrity'
    );
    current = tSrcPending.submission;
    await SubmissionStateMachine.recordLog(tSrcPending.log);

    if (isInvalidSubmissionSnippet(current.code)) {
      const tFail = SubmissionStateMachine.transition(
        current,
        'FAILED',
        'Source code was inaccessible from the editor/GraphQL. Open problem editor or retry manually.'
      );
      current = tFail.submission;
      await SubmissionStateMachine.recordLog(tFail.log);
      await this.removeFromQueue(current.submissionId);
      await dispatchBackgroundNotification({
        category: 'SYNC_FAILURE',
        title: `Sync Failed: ${current.questionTitle}`,
        message: current.errorMessage || 'Source code missing',
        dedupeKey: `fail:${current.submissionId}`
      });
      return current;
    }

    // 5. SOURCE_RETRIEVAL_PENDING -> SOURCE_RETRIEVED
    const tSrcRetrieved = SubmissionStateMachine.transition(
      current,
      'SOURCE_RETRIEVED',
      `Extracted ${current.code.length} characters of ${current.language} code`
    );
    current = tSrcRetrieved.submission;
    await SubmissionStateMachine.recordLog(tSrcRetrieved.log);

    // 6. Check Duplicate Prevention Registry (only skip if verified commit SHA exists)
    const userId = config.userProfile?.username || 'user';
    const repo = config.targetRepoFullName || 'unassigned';
    const subKey = generateSubmissionKey(userId, current.submissionId, repo);
    const dupCheck = await DuplicateRegistry.isDuplicate(subKey);

    if (dupCheck.isDuplicate && dupCheck.record?.commitSha && !config.allowMultipleSubmissions) {
      const tExpPending = SubmissionStateMachine.transition(
        current,
        'EXPORT_PENDING',
        'Pre-export duplicate inspection'
      );
      current = tExpPending.submission;
      await SubmissionStateMachine.recordLog(tExpPending.log);

      const tSyncedDup = SubmissionStateMachine.transition(
        current,
        'SYNCED',
        'Idempotent duplicate: already exported and verified on GitHub'
      );
      current = tSyncedDup.submission;
      current.commitSha = dupCheck.record.commitSha;
      current.commitUrl = dupCheck.record.commitUrl;
      current.filePath = dupCheck.record.filePath;
      await SubmissionStateMachine.recordLog(tSyncedDup.log);
      await StorageManager.appendSyncedHistory(current);
      return current;
    }

    // 7. SOURCE_RETRIEVED -> EXPORT_PENDING
    const tExpPending = SubmissionStateMachine.transition(
      current,
      'EXPORT_PENDING',
      'Prepared payload for GitHub synchronization'
    );
    current = tExpPending.submission;
    await SubmissionStateMachine.recordLog(tExpPending.log);

    if (!config.autoSyncEnabled || !config.authToken) {
      current.errorMessage = !config.authToken
        ? 'Waiting for StreakForge authentication.'
        : 'Auto-sync paused by user.';
      await this.enqueueForRetry(current);
      return current;
    }

    // 8. EXPORT_PENDING -> EXPORTING
    const tExporting = SubmissionStateMachine.transition(
      current,
      'EXPORTING',
      'Sending solution to StreakForge GitHub sync engine'
    );
    current = tExporting.submission;
    await SubmissionStateMachine.recordLog(tExporting.log);
    broadcastTabToast('SYNC_IN_PROGRESS', { questionTitle: current.questionTitle });

    const exportRes = await this.exportToBackend(current, config);
    const backendStatus = exportRes.data?.syncStatus;
    const isVerifiedSync =
      exportRes.success &&
      Boolean(exportRes.data?.commitSha) &&
      (backendStatus === 'SYNCED' || backendStatus === undefined);

    // Strictly verify GitHub commit SHA before marking SYNCED!
    if (isVerifiedSync) {
      const tSynced = SubmissionStateMachine.transition(
        current,
        'SYNCED',
        `Committed solution to GitHub: ${String(exportRes.data.commitSha).slice(0, 7)}`
      );
      current = tSynced.submission;
      current.commitSha = exportRes.data.commitSha;
      current.commitUrl = exportRes.data.commitUrl;
      current.filePath = exportRes.data.filePath;
      await SubmissionStateMachine.recordLog(tSynced.log);

      await DuplicateRegistry.register(subKey, {
        commitSha: current.commitSha,
        commitUrl: current.commitUrl,
        filePath: current.filePath
      });
      await this.removeFromQueue(current.submissionId);
      await StorageManager.appendSyncedHistory(current);

      const repoLabel = exportRes.data.targetRepoFullName || config.targetRepoFullName || 'GitHub';
      broadcastTabToast('SHOW_ON_SCREEN_SYNC_TOAST', {
        title: current.questionTitle,
        language: current.language,
        difficulty: current.difficulty,
        commitSha: current.commitSha,
        commitUrl: current.commitUrl,
        repo: repoLabel,
        filePath: current.filePath
      });

      await dispatchBackgroundNotification({
        category: 'SYNC_SUCCESS',
        title: `Synced to GitHub: ${current.questionId}. ${current.questionTitle}`,
        message: `Committed ${current.filePath || current.questionSlug} to ${repoLabel}.`,
        url: current.commitUrl,
        dedupeKey: `synced:${current.submissionId}`
      });
    } else if (exportRes.success && backendStatus === 'SKIPPED' && exportRes.data?.alreadySynced && exportRes.data?.commitSha) {
      const tSynced = SubmissionStateMachine.transition(
        current,
        'SYNCED',
        'Submission already verified on GitHub'
      );
      current = tSynced.submission;
      current.commitSha = exportRes.data.commitSha;
      current.commitUrl = exportRes.data.commitUrl;
      current.filePath = exportRes.data.filePath;
      await SubmissionStateMachine.recordLog(tSynced.log);
      await this.removeFromQueue(current.submissionId);
      await StorageManager.appendSyncedHistory(current);
    } else if (exportRes.success && backendStatus === 'PENDING') {
      // Saved on backend awaiting target repo selection or manual approval — keep pending!
      const tRequeue = SubmissionStateMachine.transition(
        current,
        'RETRY_PENDING',
        exportRes.data?.message || 'Pending target repository or manual approval'
      );
      current = tRequeue.submission;
      current.errorMessage = exportRes.data?.message;
      await SubmissionStateMachine.recordLog(tRequeue.log);
      await this.enqueueForRetry(current);
      await StorageManager.appendSyncedHistory(current);
    } else if (exportRes.success && backendStatus === 'SKIPPED') {
      // Skipped per NEW_ONLY policy — mark REJECTED locally so Exported counter stays honest!
      const tSkipped = SubmissionStateMachine.transition(
        current,
        'FAILED',
        exportRes.data?.message || 'Skipped per export policy'
      );
      current = tSkipped.submission;
      await SubmissionStateMachine.recordLog(tSkipped.log);
      await this.removeFromQueue(current.submissionId);
      await StorageManager.appendSyncedHistory(current);
    } else {
      const errMsg = exportRes.error || 'GitHub export failed.';
      const isTransient =
        errMsg.includes('Network') ||
        errMsg.includes('timed out') ||
        errMsg.includes('fetch') ||
        exportRes.status === 502 ||
        exportRes.status === 503;

      const tFail = SubmissionStateMachine.transition(
        current,
        isTransient ? 'RETRY_PENDING' : 'FAILED',
        errMsg
      );
      current = tFail.submission;
      current.errorMessage = errMsg;
      current.retryCount = (current.retryCount || 0) + 1;
      await SubmissionStateMachine.recordLog(tFail.log);
      await this.enqueueForRetry(current);
      await StorageManager.appendSyncedHistory(current);

      broadcastTabToast('SYNC_FAILED', { title: current.questionTitle, error: errMsg });

      await dispatchBackgroundNotification({
        category: 'SYNC_FAILURE',
        title: `GitHub Sync Failed: ${current.questionTitle}`,
        message: errMsg,
        url: config.webAppUrl ? `${config.webAppUrl}/?tab=leetcode` : undefined,
        dedupeKey: `fail:${current.submissionId}`
      });
    }

    return current;
  }

  /**
   * Processes queued/failed submissions with exponential backoff (never discards retryable FAILED items silently)
   */
  public static async processPendingQueue(forceAll: boolean = false): Promise<void> {
    const queue = await StorageManager.getPendingQueue();
    if (queue.length === 0) return;

    const config = await StorageManager.getConfig();
    if (!config.authToken || config.authState === 'EXPIRED') return;

    const remaining: DetectedSubmission[] = [];
    const now = Date.now();

    for (const sub of queue) {
      if (sub.state === 'SYNCED' && sub.commitSha) continue;

      const retryCount = sub.retryCount || 0;
      const hasInvalidCode = isInvalidSubmissionSnippet(sub.code);
      const isPermanentError =
        hasInvalidCode ||
        sub.errorMessage?.includes('empty') ||
        sub.errorMessage?.includes('Source code was inaccessible');

      // Prune permanently non-retryable / invalid-code items into failedArchive instead of blocking queue forever
      if (isPermanentError) {
        await StorageManager.archiveFailedSubmission({
          id: `perm-fail-${Date.now()}-${sub.submissionId}`,
          questionId: sub.questionId,
          questionTitle: sub.questionTitle,
          questionSlug: sub.questionSlug,
          verdict: sub.verdict,
          language: sub.language,
          runtimeMs: sub.runtimeMs,
          memoryBytes: sub.memoryBytes,
          submittedAt: sub.submittedAt,
          notes: sub.errorMessage || 'Missing or invalid source code snippet.'
        });
        continue;
      }

      if (!forceAll && retryCount >= 5) {
        remaining.push(sub);
        continue;
      }

      // Exponential backoff (15s, 30s, 60s, 120s, max 5m) unless manually triggered
      if (!forceAll && sub.lastAttemptAt) {
        const backoffMs = Math.min(300_000, 15_000 * Math.pow(2, retryCount));
        if (now - sub.lastAttemptAt < backoffMs) {
          remaining.push(sub);
          continue;
        }
      }

      let current = { ...sub };
      if (
        current.state === 'RETRY_PENDING' ||
        current.state === 'EXPORT_PENDING' ||
        current.state === 'FAILED'
      ) {
        try {
          if (current.state === 'FAILED') {
            const tRetry = SubmissionStateMachine.transition(
              current,
              'RETRY_PENDING',
              'Recovering previously failed export'
            );
            current = tRetry.submission;
            await SubmissionStateMachine.recordLog(tRetry.log);
          }

          const tExp = SubmissionStateMachine.transition(
            current,
            'EXPORTING',
            'Retrying queued export'
          );
          current = tExp.submission;
          await SubmissionStateMachine.recordLog(tExp.log);

          const exportRes = await this.exportToBackend(current, config);
          const qStatus = exportRes.data?.syncStatus;
          if (
            exportRes.success &&
            Boolean(exportRes.data?.commitSha) &&
            (qStatus === 'SYNCED' ||
              qStatus === undefined ||
              (qStatus === 'SKIPPED' && exportRes.data?.alreadySynced))
          ) {
            const tSync = SubmissionStateMachine.transition(
              current,
              'SYNCED',
              `Retried export succeeded: ${String(exportRes.data.commitSha).slice(0, 7)}`
            );
            current = tSync.submission;
            current.commitSha = exportRes.data.commitSha;
            current.commitUrl = exportRes.data.commitUrl;
            current.filePath = exportRes.data.filePath;
            await SubmissionStateMachine.recordLog(tSync.log);

            const userId = config.userProfile?.username || 'user';
            const repo = config.targetRepoFullName || 'unassigned';
            const subKey = generateSubmissionKey(userId, current.submissionId, repo);
            await DuplicateRegistry.register(subKey, {
              commitSha: current.commitSha,
              commitUrl: current.commitUrl,
              filePath: current.filePath
            });
            await StorageManager.appendSyncedHistory(current);

            await dispatchBackgroundNotification({
              category: 'SYNC_SUCCESS',
              title: `Recovered Sync: ${current.questionTitle}`,
              message: `Successfully pushed queued solution to ${repo}.`,
              url: current.commitUrl,
              dedupeKey: `synced:${current.submissionId}`
            });
          } else if (exportRes.success && qStatus === 'SKIPPED') {
            // Skipped per NEW_ONLY export policy — remove cleanly from retry queue
            const skipMsg = exportRes.data?.message || 'Skipped per export policy';
            const tSkipped = SubmissionStateMachine.transition(current, 'FAILED', skipMsg);
            await SubmissionStateMachine.recordLog(tSkipped.log);
            await StorageManager.appendSyncedHistory(tSkipped.submission);
          } else {
            const errMsg = exportRes.data?.message || exportRes.error || 'Retry export failed';
            const tRequeue = SubmissionStateMachine.transition(
              current,
              exportRes.data?.syncStatus === 'PENDING' ? 'RETRY_PENDING' : 'FAILED',
              errMsg
            );
            remaining.push({
              ...tRequeue.submission,
              retryCount: retryCount + 1,
              lastAttemptAt: Date.now(),
              errorMessage: errMsg
            });
          }
        } catch (err: any) {
          remaining.push({
            ...current,
            state: 'FAILED',
            retryCount: retryCount + 1,
            lastAttemptAt: Date.now(),
            errorMessage: err?.message || 'Unexpected retry error'
          });
        }
      } else {
        remaining.push(current);
      }
    }

    await StorageManager.setPendingQueue(remaining);
  }
}
