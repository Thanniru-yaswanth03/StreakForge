/**
 * StreakForge Web Bridge Content Script
 * Automatically bridges authenticated session from the StreakForge Web Application
 * to the Chrome Extension background worker and storage.
 */

console.log('[StreakForge Web Bridge] Active on web dashboard.');

function notifyExtensionActive() {
  try {
    document.documentElement.setAttribute('data-streakforge-extension', 'active');
    window.postMessage({ type: 'STREAKFORGE_EXTENSION_ACTIVE', version: '1.0.0' }, '*');
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
    const metaApi = document.querySelector('meta[name="streakforge-api-url"]')?.getAttribute('content');
    if (metaApi) {
      return metaApi.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    }
  } catch {
    // Ignore DOM query exception
  }

  // Local development fallback
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  // Production fallback to current web origin
  return window.location.origin;
}

let lastDispatchedToken: string | null = null;

function syncTokenToExtension(): void {
  const token = getWebToken();
  if (token && token !== lastDispatchedToken) {
    lastDispatchedToken = token;
    const serverUrl = getBackendUrl();
    console.log(`[StreakForge Web Bridge] Detected active user session. Dispatching auto-pair message (server: ${serverUrl}).`);
    
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'AUTO_PAIR_TOKEN',
        payload: {
          token,
          serverUrl
        }
      }).then((resp) => {
        if (resp?.success) {
          console.log('[StreakForge Web Bridge] Auto-pairing succeeded with backend.');
        }
      }).catch((err) => {
        console.warn('[StreakForge Web Bridge] Worker message failed:', err);
      });
    }
  }
}

// 1. Initial notification and token sync
notifyExtensionActive();
syncTokenToExtension();

// 2. Poll briefly on load in case hydration completes shortly after
const interval = setInterval(() => {
  notifyExtensionActive();
  syncTokenToExtension();
}, 2000);

// Stop polling after 30 seconds to save CPU, fallback to event listeners
setTimeout(() => clearInterval(interval), 30000);

// 3. Storage event listener (captures logins/logouts in other tabs or same tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'streakforge_token') {
    syncTokenToExtension();
  }
});

// 4. Window message listener for explicit pair requests from web app
window.addEventListener('message', (event) => {
  if (event.data?.type === 'STREAKFORGE_REQUEST_EXTENSION_STATUS') {
    notifyExtensionActive();
  }
  if (event.data?.type === 'STREAKFORGE_TRIGGER_PAIR') {
    syncTokenToExtension();
  }
});

// 5. Chrome runtime message listener for sync completion
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SHOW_ON_SCREEN_SYNC_TOAST') {
      window.postMessage({
        type: 'STREAKFORGE_LIVE_SYNC_COMPLETED',
        payload: message.payload
      }, '*');
    }
  });
}

