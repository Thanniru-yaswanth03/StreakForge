import { SyncManager, dispatchBackgroundNotification } from './sync-manager';
import { StorageManager, DEFAULT_SERVER_URL } from '../shared/storage';
import { fetchAndSyncCanonicalState } from '../shared/backendSync';
import type { ExtensionMessage } from '../shared/types';

console.log('[StreakForge Worker] Service worker registered (Manifest V3).');

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
  return fetchAndSyncCanonicalState(authToken, serverUrl, {
    webAppUrl,
    fetchHistory: true,
    allowRefresh: true
  });
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
          metrics: undefined,
          lastSyncedSubmission: null,
          lastBackendSyncAt: undefined
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
        await updateActionBadge();
        sendResponse(result);
        // Retry queued submissions asynchronously without delaying popup state hydration
        if (result.success) {
          SyncManager.processPendingQueue()
            .then(() => updateActionBadge())
            .catch(() => {});
        }
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
        await updateActionBadge();
        sendResponse({ success: true, config: updated });
        return;
      }

      if (message.type === 'CLEAR_PENDING_QUEUE') {
        if (sender?.tab) {
          sendResponse({ success: false, error: 'Unauthorized context' });
          return;
        }
        const targetId = message.payload?.submissionId;
        if (targetId) {
          const queue = await StorageManager.getPendingQueue();
          await StorageManager.setPendingQueue(
            queue.filter((q) => String(q.submissionId) !== String(targetId))
          );
        } else {
          await StorageManager.setPendingQueue([]);
        }
        await updateActionBadge();
        sendResponse({ success: true });
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
    (async () => {
      const cfg = await StorageManager.getConfig();
      if (cfg.authToken) {
        await syncWithBackend(cfg.authToken, cfg.serverUrl);
      }
      await updateActionBadge();
    })();
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    (async () => {
      const cfg = await StorageManager.getConfig();
      if (cfg.authToken) {
        await syncWithBackend(cfg.authToken, cfg.serverUrl);
        await SyncManager.processPendingQueue();
      }
      await updateActionBadge();
    })();
  });
}
