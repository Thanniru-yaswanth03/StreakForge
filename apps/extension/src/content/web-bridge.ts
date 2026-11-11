/**
 * StreakForge Web Bridge Content Script
 * Automatically bridges authenticated session & actions between the StreakForge Web Application
 * and the Chrome Extension background worker and storage.
 */

const PRODUCTION_API_URL = 'https://streakforge-api-5uhs.onrender.com';

function notifyExtensionActive() {
  try {
    document.documentElement.setAttribute('data-streakforge-extension', 'active');
    window.postMessage(
      { type: 'STREAKFORGE_EXTENSION_ACTIVE', version: '4.0.0' },
      window.location.origin
    );
  } catch {
    // Ignore context isolation errors
  }
}

function getWebToken(): string | null {
  try {
    const local = localStorage.getItem('streakforge_token');
    if (local && local.trim().length > 10) return local.trim();

    const match = document.cookie.match(/(?:^|;\s*)streakforge_token=([^;]+)/);
    if (match && match[1] && match[1].length > 10) {
      return decodeURIComponent(match[1].trim());
    }
  } catch {
    // LocalStorage or cookie access restricted
  }
  return null;
}

function getBackendUrl(): string {
  try {
    const metaApi = document
      .querySelector('meta[name="streakforge-api-url"]')
      ?.getAttribute('content');
    if (metaApi && /^https?:\/\//i.test(metaApi)) {
      const cleaned = metaApi.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
      if (cleaned && cleaned !== window.location.origin) {
        return cleaned;
      }
    }
  } catch {
    // Ignore DOM query exception
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  // Always fall back to canonical backend API host (NEVER frontend origin)
  return PRODUCTION_API_URL;
}

let lastDispatchedToken: string | null = null;
let hadActiveSession = false;

function syncTokenToExtension(): void {
  const token = getWebToken();
  if (token && token !== lastDispatchedToken) {
    lastDispatchedToken = token;
    hadActiveSession = true;
    const serverUrl = getBackendUrl();
    const webAppUrl = window.location.origin;

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime
        .sendMessage({
          type: 'AUTO_PAIR_TOKEN',
          payload: {
            token,
            serverUrl,
            webAppUrl
          }
        })
        .catch((err) => {
          console.warn('[StreakForge Web Bridge] Worker message failed:', err);
        });
    }
  } else if (!token && hadActiveSession) {
    lastDispatchedToken = null;
    hadActiveSession = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_TOKEN' }).catch(() => {});
    }
  }
}

// 1. Initial notification and token sync + DOMReady check
notifyExtensionActive();
syncTokenToExtension();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    notifyExtensionActive();
    syncTokenToExtension();
  });
}

// 2. Responsive low-cost polling while tab is open (catches post-OAuth Render cold-start redirects too)
const pollInterval = setInterval(() => {
  if (document.visibilityState === 'visible') {
    notifyExtensionActive();
    syncTokenToExtension();
  }
}, 4000);

window.addEventListener('focus', () => {
  notifyExtensionActive();
  syncTokenToExtension();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    notifyExtensionActive();
    syncTokenToExtension();
  }
});

// Clean up timer on unload
window.addEventListener('beforeunload', () => clearInterval(pollInterval));

// 3. Storage event listener (captures logins/logouts in other tabs)
window.addEventListener('storage', (e) => {
  if (e.key === 'streakforge_token') {
    syncTokenToExtension();
  }
});

// 4. Window message listener for explicit pair/logout/history-import requests from web app
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data?.type === 'STREAKFORGE_REQUEST_EXTENSION_STATUS') {
    notifyExtensionActive();
  }
  if (event.data?.type === 'STREAKFORGE_TRIGGER_PAIR') {
    lastDispatchedToken = null;
    syncTokenToExtension();
  }
  if (event.data?.type === 'STREAKFORGE_LOGOUT') {
    lastDispatchedToken = null;
    hadActiveSession = false;
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_TOKEN' }).catch(() => {});
    }
  }
  if (event.data?.type === 'STREAKFORGE_START_HISTORY_IMPORT') {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime
        .sendMessage({
          type: 'IMPORT_LEETCODE_HISTORY',
          payload: event.data.payload || { limit: 100, autoExportToGitHub: false }
        })
        .then((res) => {
          window.postMessage(
            {
              type: 'STREAKFORGE_HISTORY_IMPORT_RESULT',
              payload: res
            },
            window.location.origin
          );
        })
        .catch((err) => {
          window.postMessage(
            {
              type: 'STREAKFORGE_HISTORY_IMPORT_RESULT',
              payload: { success: false, error: err?.message || 'Extension worker unavailable' }
            },
            window.location.origin
          );
        });
    }
  }
});

// 5. Chrome runtime message listener for sync status & toast notifications
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_ON_SCREEN_SYNC_TOAST') {
      window.postMessage(
        {
          type: 'STREAKFORGE_LIVE_SYNC_COMPLETED',
          payload: message.payload
        },
        window.location.origin
      );
    }
    if (message.type === 'SYNC_IN_PROGRESS') {
      window.postMessage(
        {
          type: 'STREAKFORGE_LIVE_SYNC_STARTED'
        },
        window.location.origin
      );
    }
    if (message.type === 'SYNC_FAILED') {
      window.postMessage(
        {
          type: 'STREAKFORGE_LIVE_SYNC_FAILED',
          payload: message.payload
        },
        window.location.origin
      );
    }
  });
}
