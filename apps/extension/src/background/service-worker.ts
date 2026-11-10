import { SyncManager } from './sync-manager';
import { StorageManager } from '../shared/storage';
import type { ExtensionMessage } from '../shared/types';

console.log('[StreakForge Worker] Service worker registered (Manifest V3).');

/**
 * Updates extension action badge count based on pending queue
 */
async function updateActionBadge(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.action) return;
  try {
    const queue = await StorageManager.getPendingQueue();
    const count = queue.length;
    if (count > 0) {
      await chrome.action.setBadgeText({ text: String(count) });
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Amber
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch {
    // Best effort badge update
  }
}

/**
 * Synchronizes user authentication profile, target repository, and submission history from StreakForge API
 */
async function syncWithBackend(
  authToken: string,
  serverUrl: string = 'https://streakforge-api-5uhs.onrender.com',
  webAppUrl?: string
) {
  const base = serverUrl.replace(/\/+$/, '');

  // 1. Fetch user profile
  let userProfile = undefined;
  try {
    const userRes = await fetch(`${base}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(10000)
    });
    if (userRes.ok) {
      const uJson = await userRes.json();
      if (uJson.data?.user) {
        userProfile = {
          username: uJson.data.user.username,
          email: uJson.data.user.email,
          avatarUrl: uJson.data.user.avatarUrl
        };
      }
    }
  } catch (err) {
    console.warn('[StreakForge Worker] Failed to fetch user profile:', err);
  }

  // 2. Fetch connected repositories to find LeetCode target
  let targetRepoFullName: string | undefined = undefined;
  try {
    const reposRes = await fetch(`${base}/api/v1/repos`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(10000)
    });
    if (reposRes.ok) {
      const rJson = await reposRes.json();
      const connected: any[] = rJson.data?.connected || [];
      const target = connected.find((r) => r.isTargetForLeetCode);
      if (target) {
        targetRepoFullName = target.repoFullName;
      } else {
        targetRepoFullName = '';
      }
    }
  } catch (err) {
    console.warn('[StreakForge Worker] Failed to fetch repositories:', err);
  }

  // 3. Fetch submissions history
  let mappedHistory: any[] = [];
  try {
    const histRes = await fetch(`${base}/api/v1/sync/leetcode/history?limit=100`, {
      headers: { Authorization: `Bearer ${authToken}` },
      signal: AbortSignal.timeout(10000)
    });
    if (histRes.ok) {
      const hJson = await histRes.json();
      const submissions = Array.isArray(hJson.data) ? hJson.data : (hJson.data?.items || []);
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
        state: 'SYNCED',
        commitSha: sub.githubCommitSha,
        commitUrl: sub.githubCommitUrl,
        filePath: sub.filePath
      }));
    }
  } catch (err) {
    console.warn('[StreakForge Worker] Failed to fetch submissions history:', err);
  }

  // 4. Update configuration and storage
  const updatePayload: Partial<import('../shared/types').ExtensionConfig> = {
    authToken,
    serverUrl: base
  };
  if (webAppUrl) updatePayload.webAppUrl = webAppUrl.replace(/\/+$/, '');
  if (userProfile) updatePayload.userProfile = userProfile;
  if (targetRepoFullName !== undefined) updatePayload.targetRepoFullName = targetRepoFullName;

  const updatedCfg = await StorageManager.updateConfig(updatePayload);

  // Always replace synced history with authentic backend records
  await StorageManager.setSyncedHistory(mappedHistory);

  return { config: updatedCfg, historyCount: mappedHistory.length };
}

function isTrustedWebBridgeSender(sender: chrome.runtime.MessageSender): boolean {
  if (!sender?.tab) return true; // Internal extension popup/options
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
        sendResponse({ success: true, ...result });
        return;
      }

      if (message.type === 'CLEAR_AUTH_TOKEN') {
        if (!isTrustedWebBridgeSender(sender)) {
          sendResponse({ success: false, error: 'Untrusted origin' });
          return;
        }
        await StorageManager.updateConfig({
          authToken: '',
          userProfile: undefined,
          targetRepoFullName: ''
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
        sendResponse({ success: true, ...result });
        return;
      }

      if (message.type === 'LEETCODE_SUBMISSION_DETECTED') {
        const result = await SyncManager.processSubmission(message.payload);
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
        await SyncManager.processPendingQueue();
        await updateActionBadge();
        sendResponse({ success: true });
        return;
      }

      if (message.type === 'UPDATE_CONFIG') {
        // Enforce privilege separation: Only internal extension pages (popup/options) can update configuration
        // In Chrome MV3, sender.tab is populated for content scripts injected into web pages.
        if (sender?.tab) {
          sendResponse({
            success: false,
            error: 'SECURITY_ERROR: Content scripts are not permitted to modify extension settings or authentication tokens.'
          });
          return;
        }

        const updated = await StorageManager.updateConfig(message.payload);
        sendResponse({ success: true, config: updated });
        return;
      }

      if (message.type === 'GET_SYNC_STATUS') {
        const config = await StorageManager.getConfig();
        // Redact auth token for injected content scripts to prevent token leakage into DOM context
        const safeConfig = sender?.tab
          ? { ...config, authToken: config.authToken ? '••••••••' : '' }
          : config;

        const pending = await StorageManager.getPendingQueue();
        const history = await StorageManager.getSyncedHistory();
        const activeProblem = await StorageManager.getActiveProblem();
        const failedArchive = await StorageManager.getFailedArchive();
        sendResponse({
          success: true,
          config: safeConfig,
          pending,
          history,
          activeProblem,
          failedArchive
        });
        return;
      }

      sendResponse({ success: false, error: 'Unknown message type' });
    } catch (err: any) {
      console.error('[StreakForge Worker] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});

// 2. Alarms: Periodic Queue Synchronization
chrome.alarms.create('streakforge_retry_sync', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'streakforge_retry_sync') {
    (async () => {
      await SyncManager.processPendingQueue();
      await updateActionBadge();
    })();
  }
});

// 3. Lifecycle Initialization
chrome.runtime.onInstalled.addListener(() => {
  console.log('[StreakForge] Extension installed or updated.');
  updateActionBadge();
});
