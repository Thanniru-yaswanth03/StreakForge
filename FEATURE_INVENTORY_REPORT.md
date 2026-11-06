# ⚡ StreakForge — Comprehensive Feature Inventory & Project Report

> **Project Version**: 1.0.0 Production-Ready  
> **Architecture**: Monorepo (`pnpm` workspaces: Next.js 15, Node.js/Express API, Manifest V3 Chrome Extension, Shared Packages)  
> **Core Guarantee**: **Zero-Fabrication** — 100% authentic developer activity synchronization from genuine accepted LeetCode submissions and verified Git commits.

---

## 1. Executive Summary

StreakForge is an automated, developer telemetry and repository synchronization platform. It connects a developer's real-time **LeetCode coding practice** and **GitHub repository activity** into a unified, authenticated developer portfolio and contribution engine. 

Instead of manual uploads, third-party mock counters, or unverified streak trackers, StreakForge:
1. **Captures Authentic Solves**: Detects verified accepted submissions on LeetCode directly at the editor and network layer using a dedicated Manifest V3 Chrome Extension.
2. **Exports Clean Code**: Automatically formats, documents, and commits solutions directly to a target GitHub repository using the GitHub Git Database API without cloning the repository.
3. **Harmonizes Contributions**: Generates verified, dual-stream contribution calendars and streak telemetry that match GitHub and LeetCode standards.

---

## 2. System Architecture & Workspaces

```
Sync/
├── apps/
│   ├── api/                  # Express REST API, Mongoose (MongoDB), JWT, AES-256-GCM, BullMQ/Scheduler
│   ├── web/                  # Next.js 15 App Router, React 19, Tailwind CSS, Dark Theme
│   └── extension/            # Manifest V3 Chrome Extension (Vite, React, Main-World Interceptors)
├── packages/
│   ├── sync-engine/          # Octokit Git Database tree/blob/commit engine & solution path resolver
│   ├── shared-types/         # Canonical TypeScript models, DTOs, Enums, State Machine types
│   ├── validation/           # Zod validation schemas for all API payloads and configurations
│   ├── config/               # Shared environment, ESLint, and TypeScript configurations
│   └── agent-daemon/         # Background local development tracking agent
└── docs/                     # User Guide, Installation Guide, Contributing, Architecture specs
```

---

## 3. Web Dashboard Features (`apps/web`)

The web dashboard is designed with a dark theme (inspired by GitHub's Primer design system), glossy cards, responsive layout, and real-time state synchronization via React context ([`DataContext.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/context/DataContext.tsx)).

### 3.1 Overview Command Center ([`OverviewView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/OverviewView.tsx))
- **Hero Metrics**:
  - **Verified Streak**: Consecutive days with authentic activity, plus all-time record counter.
  - **Git Commits Today**: Verified default-branch commits across monitored repositories.
  - **LeetCode Solved Today**: Passing solves recorded within the current 24-hour cycle.
  - **Total Problems Solved**: Deduplicated count of unique algorithmic problems solved.
- **Unified Contribution Heatmap**:
  - Full-year calendar visualizing both GitHub commits and LeetCode solves with interactive multi-source filtering (All, GitHub Only, LeetCode Only).
- **Live Activity Streams**:
  - Two parallel split feeds showing real-time LeetCode solves and pushed GitHub commits side-by-side.
- **Repository Health Snapshot**:
  - Active target repository link, default branch tracker, and last sync timestamp.

### 3.2 LeetCode Activity View ([`LeetCodeActivityView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/LeetCodeActivityView.tsx))
- **Authoritative Profile Card ([`LeetCodeStatsCard.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/components/LeetCodeStatsCard.tsx))**:
  - Live scraped profile data: Avatar, username, real name, global ranking (`#3,777,525`), and bio.
  - One-click username editor and immediate background resync.
  - Exact LeetCode circular progress gauge for Acceptance Rate (e.g., `79.59%`) and difficulty breakdown (Easy / Medium / Hard).
  - Full 53-week submission heatmap with column-aligned month markers (`Nov` through `Nov`) and interactive tooltips showing exact submission counts per date.
- **Data Structure & Algorithm Topic Breakdown**:
  - Solved problem counts categorized across key patterns: *Arrays & Hashing*, *Two Pointers*, *Dynamic Programming*, *Trees & Graphs*, *Stack & Queue*, *Binary Search*.
- **Submission History & Export Table**:
  - Filterable by difficulty (Easy, Medium, Hard, All) and searchable by problem title or language.
  - Displays runtime/memory performance percentiles (e.g. `50 ms (75%) • 16.0 MB (70%)`).
  - Export status indicators: `Exported` (with direct link to GitHub commit), `Pending`, `Duplicate / Skipped`, or `Failed`.
  - Non-blocking inline **Retry** button with automatic in-app feedback and token expiration diagnosis.
  - **Code Inspector Modal**: Instant syntax-highlighted viewer of the exact code submitted.

### 3.3 GitHub Activity View ([`GitHubActivityView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/GitHubActivityView.tsx))
- **Verified Commits Feed**:
  - Lists verified commits authored across all connected repositories with commit SHA and timestamps.
- **Attribution Diagnostic Tool**:
  - One-click diagnosis testing whether a commit author email matches the user's verified GitHub email addresses to guarantee contribution graph eligibility.
- **Branch Protection & Health Analysis**:
  - Audits monitored repositories for default branch configuration and protection rules.
- **Pull Requests & Issues Telemetry**:
  - Tracks open/merged pull requests and issues across monitored projects.

### 3.4 Streak Calendar View ([`StreakCalendarView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/StreakCalendarView.tsx))
- **Granular Activity Inspector**:
  - Clicking any date in the 365-day calendar queries the database for all underlying [`ActivityRecord`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/api/src/services/streakService.ts#L330-L342) items (timestamps, commit hashes, question titles, source tags).
- **Streak Protection Metrics**:
  - Streak freeze token balance (e.g. 2 tokens).
  - Weekend protection indicator (grace periods for non-working days).
  - Longest streak milestone tracker.
- **Historical Recalculation Engine**:
  - Re-evaluates entire activity history upon timezone changes without data loss.

### 3.5 Automation Center ([`AutomationCenterView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/AutomationCenterView.tsx))
- Configurable automation rules:
  - Auto-commit solution on passing verdict.
  - Auto-archive failed submissions locally.
  - Nightly sync and repository health check jobs.
  - Streak expiry reminder notifications.

### 3.6 Settings & Credentials Manager ([`SettingsView.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/views/SettingsView.tsx))
- **GitHub Account Authentication**:
  - Supports both **GitHub OAuth 2.0** and **Personal Access Tokens (PAT)** (classic `ghp_` or fine-grained).
  - **Inline PAT Updater**: Allows pasting a refreshed token immediately if a session expires without having to disconnect the account.
  - Verified email checklist indicating which emails are valid for commit author attribution.
- **Repository Management ([`RepoManager.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/web/src/components/RepoManager.tsx))**:
  - Lists discovered GitHub repositories with privacy tags (Public/Private).
  - Single-click radio selection of target repository for LeetCode solutions.
  - Customizable solution path patterns (e.g. `leetcode/{difficulty}/{id}-{slug}.{ext}`).
- **Chrome Extension Pairing**:
  - Auto-pairing via Web Bridge postMessage and manual API key / token copy.
- **Privacy & Export**:
  - One-click full data export (JSON dump of user profile, repos, submissions, journal entries, and audit logs).
  - Safe account disconnect and token purge.

---

## 4. Chrome Extension Features (`apps/extension`)

The extension runs under Chrome **Manifest V3** with strict privilege separation, offline queueing, and dual interception techniques.

```
                    ┌────────────────────────────────────────────────────────┐
                    │                   LEETCODE.COM TAB                     │
                    │                                                        │
                    │  [Main World Interceptor]                              │
                    │  ├── Intercepts /submit/ POST & /check/ polling        │
                    │  └── Reads Monaco Editor models (Code & Language ID)   │
                    │                             │                          │
                    │                   window.postMessage                   │
                    │                             ▼                          │
                    │  [Isolated World Observer]                             │
                    │  ├── Listens for submit button clicks                  │
                    │  ├── Extracts DOM fallback & validates code            │
                    │  └── Debounces duplicate mutations (15s cooldown)      │
                    └─────────────────────────────┬──────────────────────────┘
                                                  │ chrome.runtime.sendMessage
                                                  ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               BACKGROUND SERVICE WORKER                │
                    │                                                        │
                    │  [11-State Submission Machine & Sync Manager]          │
                    │  ├── State: DETECTED -> VALIDATING -> ACCEPTED ...     │
                    │  ├── Duplicate Registry (subKey prevention)            │
                    │  ├── Auto-export to StreakForge Backend API            │
                    │  └── Offline Pending Queue (IndexedDB / storage)       │
                    └────────────────────────────────────────────────────────┘
```

### 4.1 Dual-Engine Detection Pipeline
1. **Main World Interceptor ([`leetcode-interceptor.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/content/leetcode-interceptor.ts))**:
   - Injected into the page's execution context (`"world": "MAIN"`).
   - Monkey-patches `window.fetch` to capture submission payload (`question_id`, `typed_code`, `lang`).
   - Intercepts `/check/` polling response to confirm the authoritative `Accepted` verdict and execution metrics (`status_runtime`, `status_memory`, `runtime_percentile`, `memory_percentile`).
   - Hooks directly into Monaco editor models (`monaco.editor.getModels()`) to read full, unvirtualized code and exact language IDs (`javascript`, `typescript`, `python3`, `cpp`, etc.).
2. **DOM Observer & Fallback ([`dom-extractor.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/content/dom-extractor.ts) & [`leetcode-observer.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/content/leetcode-observer.ts))**:
   - Runs in isolated world.
   - Intercepts submit button click events to cache editor contents.
   - Extracts problem title, ID, difficulty (Easy/Medium/Hard), and topic tags.
   - Session-stable fallback submission ID caching prevents duplicate dispatch loops during DOM re-renders.
   - **Syntax Heuristic Analyzer**: Validates code syntax against language keywords so JavaScript solutions (`function createCounter`, `const`, `let`, `===`, `=>`) are never misattributed to `python3`.

### 4.2 Sync Engine & State Machine ([`sync-manager.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/background/sync-manager.ts))
- **11-State Deterministic State Machine**:
  `DETECTED` → `VALIDATING` → `ACCEPTED` / `REJECTED` → `SOURCE_RETRIEVAL_PENDING` → `SOURCE_RETRIEVED` → `EXPORT_PENDING` → `EXPORTING` → `SYNCED` / `RETRY_PENDING` / `FAILED`.
- **Duplicate Registry**:
  - Hashes `userId:submissionId:repo` to guarantee idempotency.
  - Re-submitting the same solve will not create duplicate GitHub commits.
- **Offline & Retry Queue**:
  - Submissions failing due to network disconnects are queued in Chrome storage and retried automatically when connectivity resumes.
- **Real-Time On-Screen Toast**:
  - Displays a slide-in GitHub-styled toast in the browser tab upon successful commit with commit SHA and direct link.

### 4.3 Extension Popup & Web Bridge
- **Popup UI ([`App.tsx`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/popup/App.tsx))**:
  - Shows connected user profile, target repo, and live LeetCode stats.
  - Policy toggles: *Submit only new solutions*, *Sync multiple submissions for same problem*, *Add explanation header & runtime comments*.
  - "Sync Now" button to flush pending queue.
- **Web Bridge ([`web-bridge.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/extension/src/content/web-bridge.ts))**:
  - Auto-detects active dashboard session at `http://localhost:3000` or production URL and auto-pairs auth tokens without manual copy-pasting.

---

## 5. Backend Services & GitHub Engine (`apps/api` & `packages/sync-engine`)

### 5.1 Git Database Engine ([`exportSolutionToGitHub`](file:///c:/Users/batma/Desktop/VibeCode/Sync/packages/sync-engine/src/index.ts))
- **Pure API Git Operations**:
  - Uses Octokit to read repository branches, create Git blobs, build trees, and create signed commits without needing local Git binary or cloning.
- **Solution Template Resolver**:
  - Evaluates patterns like `{difficulty}/{id}-{slug}.{ext}` into clean directory structures:
    ```
    LeetCodeHustle/
    └── Easy/
        ├── 0001-two-sum.py
        └── 2620-counter.js
    ```
- **Rich Solution Header**:
  - Prepends an educational header to each file: Problem name, difficulty, runtime ms, memory MB, percentiles, submission timestamp, and LeetCode problem link.

### 5.2 LeetCode GraphQL Scraper ([`leetcodeService.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/api/src/services/leetcodeService.ts))
- Queries LeetCode's public GraphQL endpoint for authentic profile data:
  - `submitStatsGlobal`: Total/Easy/Medium/Hard solved counts and total submissions.
  - `submissionCalendar`: Complete epoch-timestamped submission history for the entire year.
  - Automatically refreshes in the background whenever an accepted solve is recorded.

### 5.3 Zero-Fabrication Streak Engine ([`streakEngine.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/api/src/services/streakEngine.ts))
- Reconciles both GitHub commits on default branches and accepted LeetCode solves.
- Aggregates activity into daily snapshots (`DailyActivitySnapshot`).
- Strictly enforces: *No artificial streak padding* — days without genuine activity break the streak unless protected by an explicit freeze policy.

### 5.4 Security & Cryptography ([`crypto.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/api/src/utils/crypto.ts))
- **AES-256-GCM Token Encryption**:
  - GitHub OAuth and Personal Access Tokens are encrypted with unique initialization vectors (IVs) and authentication tags before writing to MongoDB.
  - Plaintext tokens are never stored, logged, or returned in API responses.
- **JWT Authentication with JTI Revocation**:
  - Issues signed JWT tokens stored in HttpOnly cookies and `Authorization` headers.
  - Supports instant token invalidation via a durable revoked-token store.

### 5.5 Audit Trail ([`auditService.ts`](file:///c:/Users/batma/Desktop/VibeCode/Sync/apps/api/src/services/auditService.ts))
- Immutable logging of critical lifecycle events:
  - `GITHUB_OAUTH_LOGIN`, `GITHUB_PAT_CONNECTED`, `LEETCODE_EXPORT_SUCCESS`, `LEETCODE_EXPORT_FAILED`, `REPOSITORY_DISCONNECTED`, `TOKEN_REVOCATION`.

---

## 6. Current Feature Matrix

| Feature Area | Component | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **LeetCode Detection** | Monaco Code Extraction | ✅ **Production** | Unvirtualized code via Main World model hook |
| | Monaco Language Detection | ✅ **Production** | Direct model language ID (`getLanguageId()`) |
| | Syntax Heuristic Fallback | ✅ **Production** | Detects JS/TS/Py/C++/Java/Go/Rust signatures |
| | DOM Observation | ✅ **Production** | Fallback for buttons and submission detail pages |
| | Debounce & Deduplication | ✅ **Production** | 45s fallback cache + 15s dispatch cooldown |
| **GitHub Integration** | OAuth 2.0 Flow | ✅ **Production** | Standard web flow with CSRF state verification |
| | Personal Access Token (PAT) | ✅ **Production** | Instant connect & inline update in Settings |
| | Git Database Export | ✅ **Production** | Tree & blob commits via Octokit without cloning |
| | Webhook Ingestion | ✅ **Production** | HMAC-SHA256 signature verification (`X-Hub-Signature-256`) |
| | Attribution Diagnostic | ✅ **Production** | Checks verified emails against author attribution |
| **Dashboard UI** | Overview Hub | ✅ **Production** | Dual activity feeds & core metrics |
| | LeetCode Activity View | ✅ **Production** | 53-week heatmap, topic breakdown, submissions table |
| | LeetCode Profile Heatmap | ✅ **Production** | Column-aligned month markers (`Nov`–`Nov`), tooltips |
| | Submissions Table | ✅ **Production** | Filter, search, code inspection modal, non-blocking retry |
| | GitHub Activity View | ✅ **Production** | Commit feed, PR/issue tracker, repo health |
| | Streak Calendar View | ✅ **Production** | Granular date drill-down, streak audit |
| | Automation Center | ✅ **Production** | Background worker rules and schedules |
| | Settings & Export | ✅ **Production** | Repos, PAT, preferences, full JSON dump |
| **Security & Infra** | AES-256-GCM Encryption | ✅ **Production** | Encrypted token storage with auth tags |
| | Local Tunnel Support | ✅ **Production** | Cloudflare Tunnel integration (`cloudflared`) |
| | Zero Fabrication Policy | ✅ **Production** | Verified data paths only; no synthetic filler |

---

## 7. Potential Features & Expansion Roadmap

Based on the completed audit, here are high-impact features we could consider adding if desired:

### A. Code & Solution Enhancements
1. **Automated Readme Generator in Target Repo**:
   - Automatically generate and update a root `README.md` in the user's `LeetCodeHustle` repository displaying a table of all solved problems, difficulties, tags, and solution links.
2. **Problem Description & Testcases Markdown**:
   - Alongside `2620-counter.js`, commit a companion `README.md` or docstring containing the problem description, constraints, and example test cases.
3. **Multiple Solution Variants**:
   - Allow users to store optimal vs. brute force solutions (e.g. `2620-counter-iterative.js` vs `2620-counter-closure.js`) when solving in different ways.

### B. Developer Experience & Social
4. **SVG Profile Badge for GitHub Readme**:
   - A live, dynamic SVG badge endpoint (`/api/v1/badge/streak.svg?user=username`) that users can embed directly into their personal GitHub profile README to display their verified streak, problems solved, and global rank.
5. **Discord / Slack Webhook Integration**:
   - Post an automated celebratory message in a Discord or Slack channel whenever a problem is solved and committed.

### C. Advanced Practice & Analytics
6. **Spaced Repetition & Revision Reminders**:
   - A "Review Queue" suggesting previously solved Medium/Hard problems that the user hasn't touched in 30, 60, or 90 days.
7. **Company Tags & Interview Curated Lists**:
   - Flagging whether solved problems belong to popular lists (Blind 75, NeetCode 150, Grind 75, Top Interview 150).
