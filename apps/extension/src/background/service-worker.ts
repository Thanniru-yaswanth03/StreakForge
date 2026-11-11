import { SyncManager, dispatchBackgroundNotification } from './sync-manager';
import { StorageManager, DEFAULT_SERVER_URL } from '../shared/storage';
import type { ExtensionMessage, SubmissionState } from '../shared/types';

console.log('[StreakForge Worker] Service worker registered (Manifest V3).');

function mapDbSyncStatusToExtensionState(syncStatus?: string): SubmissionState {
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

/**
 * Updates extension action badge count based on pending/failed queue
 */
async function updateActionBadge(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.action) return;
  try {
    const queue = await StorageManager.getPendingQueue();
    const cfg = await StorageManager.getConfig();
    const count = queue.filter((q) => q.state !== 'SYNCED').length;

    if (cfg.authState === 'EXPIRED') {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#f85149' });
    } else if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' });
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    // Best effort badge update
  }
}

/**
 * Synchronizes user profile, token health, preferences, target repository, and accurate submission history
 * via canonical GET /api/v1/sync/state + GET /api/v1/sync/leetcode/history.
 */
async function syncWithBackend(
  authToken: string,
  serverUrl: string = DEFAULT_SERVER_URL,
  webAppUrl?: string
) {
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

    // Silent JWT refresh if session expires within 48 hours
    if (s.user.sessionExpiresAt) {
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
            }
          }
        } catch {
          // Keep current token on transient refresh error
        }
      }
    }

    // Fetch latest 100 submission records with true per-row syncStatus
    let mappedHistory: any[] = [];
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
      }
    } catch {
      // Retain existing cached history if secondary fetch failed
      mappedHistory = await StorageManager.getSyncedHistory();
    }

    const sp = s.syncPreferences || {};
    const np = s.user.notificationPreferences || {};

    const updatedCfg = await StorageManager.updateConfig({
      authToken: activeToken,
      serverUrl: cleanServer,
      ...(webAppUrl ? { webAppUrl: webAppUrl.replace(/\/+$/, '') } : {}),
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
      lastBackendSyncAt: new Date().toISOString()
    });

    await StorageManager.setSyncedHistory(mappedHistory);
    return { success: true, config: updatedCfg, historyCount: mappedHistory.length };
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

/**
 * Queries the user's authenticated browser session on leetcode.com to backfill historical Accepted solutions.
 */
async function importLeetCodeHistoryViaBrowserSession(
  limit: number = 100,
  autoExportToGitHub: boolean = false
) {
  const cfg = await StorageManager.getConfig();
  if (!cfg.authToken) {
    return { success: false, error: 'Authenticate with StreakForge first before importing.' };
  }

  const cleanServer = (cfg.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
  const maxItems = Math.min(200, Math.max(10, limit));

  // Verify user is logged into leetcode.com via browser session cookies
  const statusRes = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
    body: JSON.stringify({
      query: `query { userStatus { isSignedIn username } }`
    })
  });

  if (!statusRes.ok) {
    return {
      success: false,
      error: `Unable to reach leetcode.com (${statusRes.status}). Open leetcode.com in Chrome and try again.`
    };
  }
  const statusJson = await statusRes.json();
  if (!statusJson?.data?.userStatus?.isSignedIn) {
    return {
      success: false,
      error: 'You are not signed into leetcode.com in this browser. Sign into leetcode.com and retry, or use Public Recent Import on the dashboard.'
    };
  }

  // Collect accepted submissions across paginated LeetCode submissionList
  const collectedMeta: any[] = [];
  const seenSlugs = new Set<string>();
  let offset = 0;
  const pageSize = 20;

  while (collectedMeta.length < maxItems && offset < 600) {
    const listRes = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({
        query: `
          query submissionList($offset: Int!, $limit: Int!) {
            submissionList(offset: $offset, limit: $limit) {
              hasNext
              submissions {
                id
                title
                titleSlug
                statusDisplay
                lang
                timestamp
                runtime
                memory
              }
            }
          }
        `,
        variables: { offset, limit: pageSize }
      })
    });

    if (!listRes.ok) break;
    const listJson = await listRes.json();
    const listData = listJson?.data?.submissionList;
    const items = listData?.submissions || [];
    if (items.length === 0) break;

    for (const s of items) {
      if (s.statusDisplay === 'Accepted') {
        collectedMeta.push(s);
        seenSlugs.add(s.titleSlug);
        if (collectedMeta.length >= maxItems) break;
      }
    }

    if (!listData?.hasNext) break;
    offset += pageSize;
    await new Promise((r) => setTimeout(r, 150));
  }

  if (collectedMeta.length === 0) {
    return {
      success: true,
      data: { importedCount: 0, skippedDuplicates: 0, exportedCount: 0, missingCodeCount: 0, errors: [] }
    };
  }

  // Enrich with authentic submissionDetails (source code + questionFrontendId + difficulty + topicTags)
  const detailedSubmissions: any[] = [];
  for (const s of collectedMeta) {
    try {
      const detRes = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
        body: JSON.stringify({
          query: `
            query submissionDetails($submissionId: Int!) {
              submissionDetails(submissionId: $submissionId) {
                code
                runtime
                runtimePercentile
                memory
                memoryPercentile
                question {
                  questionFrontendId
                  title
                  titleSlug
                  difficulty
                  topicTags { name }
                }
              }
            }
          `,
          variables: { submissionId: Number(s.id) }
        })
      });

      if (detRes.ok) {
        const detJson = await detRes.json();
        const det = detJson?.data?.submissionDetails;
        const runtimeMs = parseFloat(String(det?.runtime || s.runtime || '').replace(/[^0-9.]/g, ''));
        const memoryMb = parseFloat(String(det?.memory || s.memory || '').replace(/[^0-9.]/g, ''));
        detailedSubmissions.push({
          submissionId: String(s.id),
          questionId: String(det?.question?.questionFrontendId || '0'),
          questionTitle: det?.question?.title || s.title,
          questionSlug: det?.question?.titleSlug || s.titleSlug,
          difficulty:
            det?.question?.difficulty === 'Medium' || det?.question?.difficulty === 'Hard'
              ? det.question.difficulty
              : 'Easy',
          language: s.lang || 'javascript',
          code: det?.code || '',
          runtimeMs: Number.isFinite(runtimeMs) ? runtimeMs : 0,
          runtimePercentile: Number.isFinite(det?.runtimePercentile) ? det.runtimePercentile : 0,
          memoryBytes: Number.isFinite(memoryMb) ? Math.round(memoryMb * 1024 * 1024) : 0,
          memoryPercentile: Number.isFinite(det?.memoryPercentile) ? det.memoryPercentile : 0,
          topicTags: Array.isArray(det?.question?.topicTags)
            ? det.question.topicTags.map((t: any) => t.name)
            : [],
          submittedAt: new Date(Number(s.timestamp) * 1000).toISOString()
        });
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      // Skip single transient failure gracefully
    }
  }

  // Send in chunks of 25 to backend
  let totalImported = 0;
  let totalSkipped = 0;
  let totalExported = 0;
  let totalMissingCode = 0;
  const allErrors: any[] = [];

  for (let i = 0; i < detailedSubmissions.length; i += 25) {
    const chunk = detailedSubmissions.slice(i, i + 25);
    const impRes = await fetch(`${cleanServer}/api/v1/sync/leetcode/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.authToken}`
      },
      body: JSON.stringify({
        submissions: chunk,
        autoExportToGitHub,
        importSource: 'HISTORY_IMPORT'
      }),
      signal: AbortSignal.timeout(45000)
    });

    if (impRes.ok) {
      const impJson = await impRes.json();
      const d = impJson.data || {};
      totalImported += d.importedCount || 0;
      totalSkipped += d.skippedDuplicates || 0;
      totalExported += d.exportedCount || 0;
      totalMissingCode += d.missingCodeCount || 0;
      if (Array.isArray(d.errors)) allErrors.push(...d.errors);
    }
  }

  await syncWithBackend(cfg.authToken, cleanServer);

  return {
    success: true,
    data: {
      fetchedCount: detailedSubmissions.length,
      importedCount: totalImported,
      skippedDuplicates: totalSkipped,
      exportedCount: totalExported,
      missingCodeCount: totalMissingCode,
      errors: allErrors
    }
  };
}

function isTrustedWebBridgeSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender?.tab) return true;
  const tabUrl = sender.tab.url || '';
  return (
    tabUrl.startsWith('http://localhost:') ||
    tabUrl.startsWith('http://127.0.0.1:') ||
    tabUrl.startsWith('https://streak-forge-six.vercel.app')
  );
}

// 1. Message Dispatcher
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'AUTO_PAIR_TOKEN') {
        if (!isTrustedWebBridgeSender(sender)) {
          sendResponse({ success: false, error: 'Untrusted pairing origin' });
          return;
        }
        const result = await syncWithBackend(
          message.payload.token,
          message.payload.serverUrl,
          message.payload.webAppUrl
        );
        await updateActionBadge();
        sendResponse(result);
        return;
      }

      if (message.type === 'CLEAR_AUTH_TOKEN') {
        if (!isTrustedWebBridgeSender(sender)) {
          sendResponse({ success: false, error: 'Untrusted origin' });
          return;
        }
        await StorageManager.updateConfig({
          authToken: '',
          authState: 'UNAUTHENTICATED',
          authErrorReason: undefined,
          tokenHealthStatus: undefined,
          userProfile: undefined,
          targetRepoFullName: '',
          metrics: undefined
        });
        await StorageManager.setSyncedHistory([]);
        await updateActionBadge();
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'SYNC_FROM_BACKEND') {
        const cfg = await StorageManager.getConfig();
        if (!cfg.authToken) {
          sendResponse({ success: false, error: 'Not authenticated with StreakForge.' });
          return;
        }
        const result = await syncWithBackend(cfg.authToken, cfg.serverUrl);
        await SyncManager.processPendingQueue();
        await updateActionBadge();
        sendResponse(result);
        return;
      }

      if (message.type === 'LEETCODE_SUBMISSION_DETECTED') {
        const result = await SyncManager.processSubmission(message.payload);
        // Immediately refresh canonical backend state after processing submission
        const cfg = await StorageManager.getConfig();
        if (cfg.authToken) {
          await syncWithBackend(cfg.authToken, cfg.serverUrl);
        }
        await updateActionBadge();
        sendResponse({ success: true, result });
        return;
      }

      if (message.type === 'PROBLEM_VIEWED') {
        await StorageManager.setActiveProblem(message.payload);
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'FORCE_SYNC_PENDING') {
        const cfg = await StorageManager.getConfig();
        if (cfg.authToken) {
          await syncWithBackend(cfg.authToken, cfg.serverUrl);
        }
        await SyncManager.processPendingQueue(true);
        if (cfg.authToken) {
          await syncWithBackend(cfg.authToken, cfg.serverUrl);
        }
        await updateActionBadge();
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'IMPORT_LEETCODE_HISTORY') {
        if (sender?.tab && !isTrustedWebBridgeSender(sender)) {
          sendResponse({ success: false, error: 'Untrusted origin' });
          return;
        }
        const res = await importLeetCodeHistoryViaBrowserSession(
          message.payload?.limit ?? 100,
          Boolean(message.payload?.autoExportToGitHub)
        );
        await updateActionBadge();
        sendResponse(res);
        return;
      }

      if (message.type === 'PUSH_PREFERENCES_TO_BACKEND') {
        if (sender?.tab) {
          sendResponse({ success: false, error: 'Unauthorized context' });
          return;
        }
        const cfg = await StorageManager.getConfig();
        if (!cfg.authToken) {
          sendResponse({ success: false, error: 'Not authenticated' });
          return;
        }
        const cleanServer = (cfg.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
        const res = await fetch(`${cleanServer}/api/v1/auth/preferences`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.authToken}`
          },
          body: JSON.stringify(message.payload),
          signal: AbortSignal.timeout(10000)
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          sendResponse({ success: false, error: json?.error?.message || 'Preference update failed' });
          return;
        }
        await syncWithBackend(cfg.authToken, cleanServer);
        sendResponse({ success: true, data: json.data });
        return;
      }

      if (message.type === 'TEST_NOTIFICATION') {
        if (sender?.tab) {
          sendResponse({ success: false, error: 'Unauthorized context' });
          return;
        }
        await dispatchBackgroundNotification({
          category: 'SYSTEM',
          title: 'StreakForge Notifications Working',
          message: 'Background Chrome notifications are active for solves and GitHub commits.',
          dedupeKey: `test:${Math.floor(Date.now() / 5000)}`
        });
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'UPDATE_CONFIG') {
        if (sender?.tab) {
          sendResponse({
            success: false,
            error: 'SECURITY_ERROR: Content scripts are not permitted to modify extension settings.'
          });
          return;
        }

        const updated = await StorageManager.updateConfig(message.payload);
        sendResponse({ success: true, config: updated });
        return;
      }

      if (message.type === 'GET_SYNC_STATUS') {
        const config = await StorageManager.getConfig();
        const safeConfig = sender?.tab
          ? { ...config, authToken: config.authToken ? '••••••••' : '' }
          : config;

        const pending = await StorageManager.getPendingQueue();
        const history = await StorageManager.getSyncedHistory();
        const activeProblem = await StorageManager.getActiveProblem();
        const failedArchive = await StorageManager.getFailedArchive();
        const notifications = await StorageManager.getNotificationHistory();
        sendResponse({
          success: true,
          config: safeConfig,
          pending,
          history,
          activeProblem,
          failedArchive,
          notifications
        });
        return;
      }

      sendResponse({ success: false, error: 'Unknown message type' });
    } catch (err: any) {
      console.error('[StreakForge Worker] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});

// 2. Notification click handler -> opens commit URL or Web Dashboard
if (typeof chrome !== 'undefined' && chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {
      const cfg = await StorageManager.getConfig();
      const res = await chrome.storage.local.get('notificationLinks');
      const links: Record<string, string> = res.notificationLinks || {};
      const targetUrl = links[notificationId] || cfg.webAppUrl || 'https://streak-forge-six.vercel.app';
      chrome.tabs?.create?.({ url: targetUrl });
      chrome.notifications.clear(notificationId);
    } catch {
      // Ignore
    }
  });
}

// 3. Alarms: Periodic Queue Synchronization & Session Refresh
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.create('streakforge_retry_sync', { periodInMinutes: 5 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'streakforge_retry_sync') {
      (async () => {
        await SyncManager.processPendingQueue();
        const cfg = await StorageManager.getConfig();
        if (cfg.authToken) {
          await syncWithBackend(cfg.authToken, cfg.serverUrl);
        }
        await updateActionBadge();
      })();
    }
  });
}

// 4. Lifecycle Initialization
if (typeof chrome !== 'undefined' && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('[StreakForge] Extension V4.0 installed or updated.');
    updateActionBadge();
  });
}
