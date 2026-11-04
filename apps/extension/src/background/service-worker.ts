import type { LeetCodeSubmissionInput } from '@streakforge/shared-types';
import type { ExtensionMessage } from '../shared/types.js';

console.log('[StreakForge Worker] Background service worker initialized.');

const DEFAULT_SERVER_URL = 'http://localhost:4000';

async function getStorageData<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] !== undefined ? result[key] : defaultValue);
    });
  });
}

async function setStorageData(key: string, value: any): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function syncSubmissionToBackend(
  submission: LeetCodeSubmissionInput
): Promise<{ success: boolean; data?: any; error?: string }> {
  const token = await getStorageData<string>('authToken', '');
  const serverUrl = await getStorageData<string>('serverUrl', DEFAULT_SERVER_URL);

  if (!token) {
    return { success: false, error: 'User is not authenticated in StreakForge extension' };
  }

  try {
    const res = await fetch(`${serverUrl}/api/v1/sync/leetcode/submission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(submission)
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Failed to sync with StreakForge' };
    }

    return { success: true, data: data.data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching StreakForge API' };
  }
}

async function processPendingSubmissions(): Promise<void> {
  const pending = await getStorageData<LeetCodeSubmissionInput[]>('pendingSubmissions', []);
  if (pending.length === 0) return;

  const remaining: LeetCodeSubmissionInput[] = [];
  const synced = await getStorageData<any[]>('syncedSubmissions', []);

  for (const sub of pending) {
    const result = await syncSubmissionToBackend(sub);
    if (result.success) {
      synced.unshift({
        ...sub,
        commitUrl: result.data?.commitUrl,
        syncedAt: new Date().toISOString()
      });
    } else {
      remaining.push(sub);
    }
  }

  await setStorageData('pendingSubmissions', remaining);
  await setStorageData('syncedSubmissions', synced.slice(0, 50)); // Keep last 50
}

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'LEETCODE_SUBMISSION_DETECTED') {
    (async () => {
      const submission = message.payload;
      const pending = await getStorageData<LeetCodeSubmissionInput[]>('pendingSubmissions', []);
      pending.push(submission);
      await setStorageData('pendingSubmissions', pending);

      // Attempt immediate sync
      await processPendingSubmissions();
      sendResponse({ status: 'queued' });
    })();
    return true; // Keep message channel open for async response
  }

  if (message.type === 'FORCE_SYNC_PENDING') {
    processPendingSubmissions().then(() => sendResponse({ status: 'completed' }));
    return true;
  }
});

// Periodic retry alarm every 5 minutes
chrome.alarms.create('streakforge_retry_sync', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'streakforge_retry_sync') {
    processPendingSubmissions();
  }
});

