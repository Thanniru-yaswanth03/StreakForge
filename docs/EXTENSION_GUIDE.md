# StreakForge Chrome Extension Guide

## 1. Extension Architecture Overview

The StreakForge Chrome Extension uses **Manifest V3** to capture authentic LeetCode submissions and transmit them to the user's StreakForge account for automatic GitHub repository export.

### Core Components
```
apps/extension/
├── manifest.json            # Manifest V3 specification
├── vite.config.ts           # Bundler config for extension assets
├── src/
│   ├── background/
│   │   └── service-worker.ts # Handles queueing, retries, and network calls
│   ├── content/
│   │   ├── leetcode-observer.ts # Intercepts submissions & DOM status
│   │   └── problem-scraper.ts   # Extracts code, problem metadata & runtime
│   ├── popup/
│   │   ├── App.tsx          # Status indicator, streak badge, quick links
│   │   └── index.html
│   └── shared/
│       ├── storage.ts       # Type-safe wrapper for chrome.storage.local
│       └── messaging.ts     # Internal message bus between content & worker
```

---

## 2. Detection Strategies

### 2.1 Dual-Strategy Submission Detection
To maintain resilience against changes in LeetCode's front-end architecture, StreakForge utilizes two complementary mechanisms:

1. **Network Response Hooking (Primary)**:
   - Injects a lightweight script into the page context to monitor `fetch` and `XMLHttpRequest` traffic targeted at LeetCode's GraphQL endpoint (`/graphql`).
   - Identifies operations `submissionDetails` and `submitCode`.
   - When a submission returns `status_display: "Accepted"`, fires an event containing the exact submission ID.

2. **DOM Observer (Fallback)**:
   - Observes DOM mutations in the submission result panel (selectors such as `[data-e2e-locator="submission-result"]` or `.text-green-s`).
   - Verifies text content matches "Accepted" alongside runtime and memory stats.

---

## 3. Storage & Offline Queueing

When the user solves a problem while disconnected or when the StreakForge API is briefly unreachable:
1. The submission is persisted in `chrome.storage.local` under the `pending_submissions` array.
2. The background service worker utilizes `chrome.alarms` to retry synchronization every 5 minutes with exponential backoff.
3. Once successfully synchronized, the entry is moved to `synced_submissions` with its GitHub commit SHA.

---

## 4. Building and Loading the Extension

### Development Build
```bash
# From workspace root
pnpm --filter @streakforge/extension dev
# Or build production dist
pnpm --filter @streakforge/extension build
```

### Loading in Chrome
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in upper right corner).
3. Click **Load unpacked**.
4. Select directory `apps/extension/dist`.
5. Pin the StreakForge extension icon and open the popup to pair with your local or cloud StreakForge instance.

