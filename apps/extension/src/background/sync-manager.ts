import { SubmissionStateMachine } from '../shared/stateMachine';
import { DuplicateRegistry, generateSubmissionKey } from '../shared/duplicateRegistry';
import { StorageManager } from '../shared/storage';
import { resolveSolutionPath } from '../shared/templateResolver';
import type {
  DetectedSubmission,
  FailedSubmission,
  ExtensionConfig
} from '../shared/types';

export class SyncManager {
  /**
   * Dispatches an HTTP export request to the StreakForge backend API
   */
  public static async exportToBackend(
    submission: DetectedSubmission,
    config: ExtensionConfig
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!config.authToken) {
      return {
        success: false,
        error: 'StreakForge authentication token is missing. Please configure token in extension popup or settings.'
      };
    }

    const serverUrl = config.serverUrl || 'http://localhost:4000';
    const endpoint = `${serverUrl.replace(/\/+$/, '')}/api/v1/sync/leetcode/submission`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`
        },
        body: JSON.stringify({
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
          submittedAt: submission.submittedAt
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json.error?.message || `Export failed with status ${res.status}`
        };
      }

      return { success: true, data: json.data };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network connection failed while reaching StreakForge API.'
      };
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

      // Optionally archive failed attempt locally
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
        console.log(`[StreakForge] Archived failed attempt locally: ${current.questionTitle} (${current.verdict})`);
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

    // 4. ACCEPTED -> SOURCE_RETRIEVAL_PENDING
    const tSrcPending = SubmissionStateMachine.transition(
      current,
      'SOURCE_RETRIEVAL_PENDING',
      'Verifying source-code extraction integrity'
    );
    current = tSrcPending.submission;
    await SubmissionStateMachine.recordLog(tSrcPending.log);

    // Guard: Check source code presence
    if (!current.code || current.code.trim().length === 0) {
      const tFail = SubmissionStateMachine.transition(
        current,
        'FAILED',
        'Source code was inaccessible from the DOM. Open problem editor or use manual sync.'
      );
      current = tFail.submission;
      await SubmissionStateMachine.recordLog(tFail.log);
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

    // 6. Check Duplicate Prevention Registry
    const userId = config.userProfile?.username || 'user';
    const repo = config.targetRepoFullName || 'leetcode-solutions';
    const subKey = generateSubmissionKey(userId, current.submissionId, repo);
    const dupCheck = await DuplicateRegistry.isDuplicate(subKey);

    if (dupCheck.isDuplicate) {
      // Idempotent: Transition to EXPORT_PENDING then directly to SYNCED
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
        'Idempotent duplicate: already exported and verified'
      );
      current = tSyncedDup.submission;
      current.commitSha = dupCheck.record?.commitSha;
      current.commitUrl = dupCheck.record?.commitUrl;
      current.filePath = dupCheck.record?.filePath;
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

    // If auto-sync is paused or not authenticated, queue in pending list
    if (!config.autoSyncEnabled || !config.authToken) {
      const queue = await StorageManager.getPendingQueue();
      queue.unshift(current);
      await StorageManager.setPendingQueue(queue);
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

    const exportRes = await this.exportToBackend(current, config);

    if (exportRes.success) {
      // 9. EXPORTING -> SYNCED
      const tSynced = SubmissionStateMachine.transition(
        current,
        'SYNCED',
        `Successfully committed solution to GitHub: ${exportRes.data?.commitSha?.slice(0, 7) || 'verified'}`
      );
      current = tSynced.submission;
      current.commitSha = exportRes.data?.commitSha;
      current.commitUrl = exportRes.data?.commitUrl;
      current.filePath = exportRes.data?.filePath;
      await SubmissionStateMachine.recordLog(tSynced.log);

      // Register in duplicate registry
      await DuplicateRegistry.register(subKey, {
        commitSha: current.commitSha,
        commitUrl: current.commitUrl,
        filePath: current.filePath
      });

      // Append to synced history
      await StorageManager.appendSyncedHistory(current);

      // Send browser notification if enabled
      if (config.notifyOnSuccess && typeof chrome !== 'undefined' && chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'StreakForge LeetCode Sync',
          message: `Exported: ${current.questionTitle} (${current.language})`
        });
      }
    } else {
      // Transition to RETRY_PENDING or FAILED
      const isNetworkError =
        exportRes.error?.includes('Network') ||
        exportRes.error?.includes('fetch') ||
        exportRes.error?.includes('Failed to fetch');

      const targetFailState = isNetworkError ? 'RETRY_PENDING' : 'FAILED';
      const tFail = SubmissionStateMachine.transition(
        current,
        targetFailState,
        exportRes.error || 'Export request failed'
      );
      current = tFail.submission;
      await SubmissionStateMachine.recordLog(tFail.log);

      // Store in pending queue for background retry
      const queue = await StorageManager.getPendingQueue();
      const filtered = queue.filter((q) => q.submissionId !== current.submissionId);
      filtered.unshift(current);
      await StorageManager.setPendingQueue(filtered);
    }

    return current;
  }

  /**
   * Processes all queued pending submissions (e.g. on manual sync or alarm)
   */
  public static async processPendingQueue(): Promise<void> {
    const queue = await StorageManager.getPendingQueue();
    if (queue.length === 0) return;

    const config = await StorageManager.getConfig();
    if (!config.authToken) return;

    const remaining: DetectedSubmission[] = [];

    for (const sub of queue) {
      if (sub.state === 'SYNCED') continue;

      let current = { ...sub };
      if (current.state === 'RETRY_PENDING' || current.state === 'EXPORT_PENDING') {
        try {
          const tExp = SubmissionStateMachine.transition(
            current,
            'EXPORTING',
            'Retrying queued export'
          );
          current = tExp.submission;
          await SubmissionStateMachine.recordLog(tExp.log);

          const exportRes = await this.exportToBackend(current, config);
          if (exportRes.success) {
            const tSync = SubmissionStateMachine.transition(
              current,
              'SYNCED',
              `Retried export succeeded: ${exportRes.data?.commitSha?.slice(0, 7) || 'verified'}`
            );
            current = tSync.submission;
            current.commitSha = exportRes.data?.commitSha;
            current.commitUrl = exportRes.data?.commitUrl;
            current.filePath = exportRes.data?.filePath;
            await SubmissionStateMachine.recordLog(tSync.log);

            const userId = config.userProfile?.username || 'user';
            const repo = config.targetRepoFullName || 'leetcode-solutions';
            const subKey = generateSubmissionKey(userId, current.submissionId, repo);
            await DuplicateRegistry.register(subKey, {
              commitSha: current.commitSha,
              commitUrl: current.commitUrl,
              filePath: current.filePath
            });
            await StorageManager.appendSyncedHistory(current);
          } else {
            current.retryCount = (current.retryCount || 0) + 1;
            current.errorMessage = exportRes.error;
            remaining.push(current);
          }
        } catch {
          remaining.push(current);
        }
      } else {
        remaining.push(current);
      }
    }

    await StorageManager.setPendingQueue(remaining);
  }
}

