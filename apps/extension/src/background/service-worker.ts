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

// 1. Message Dispatcher
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  (async () => {
    try {
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
