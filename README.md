# ⚡ StreakForge v4.0 — Zero-Fabrication Developer Consistency & Automated Sync Ecosystem

<p align="center">
  <img src="apps/extension/icons/icon-128.png" alt="StreakForge Logo" width="100" height="100" />
</p>

<p align="center">
  <strong>The open-source, zero-fabrication developer platform uniting genuine Git commits, LeetCode accepted solutions, real-time mock interviews, spaced repetition recall, and automated repository documentation into an immutable activity ledger.</strong>
</p>

<p align="center">
  <a href="https://streak-forge-six.vercel.app"><img src="https://img.shields.io/badge/Production%20Web-streak--forge--six.vercel.app-238636?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Web App" /></a>
  <a href="https://streakforge-api-5uhs.onrender.com/health"><img src="https://img.shields.io/badge/API%20Health-200%20OK-0969da?style=for-the-badge&logo=render&logoColor=white" alt="API Health" /></a>
  <a href="https://github.com/Thanniru-yaswanth03/StreakForge"><img src="https://img.shields.io/badge/Release-v4.0.0--stable-8957e5?style=for-the-badge&logo=github&logoColor=white" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tests-141%2F141%20Passing%20(100%25)-success?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/TypeScript-5.6%20Strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-15.5%20App%20Router-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20.0.0-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/pnpm-Workspaces%20v10-f69220?style=flat-square&logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-amber?style=flat-square&logo=googlechrome&logoColor=white" alt="MV3" />
</p>

---

## 📑 Table of Contents

- [⚡ What is StreakForge v4.0?](#-what-is-streakforge-v40)
- [✨ Core Features & Capabilities](#-core-features--capabilities)
  - [1. 🛡️ Zero-Fabrication Commit Engine & Embedded Solution Source](#1-️-zero-fabrication-commit-engine--embedded-solution-source)
  - [2. 🔄 Real-Time GitHub Commit Ingestion & Instant Streak Refresh](#2--real-time-github-commit-ingestion--instant-streak-refresh)
  - [3. 🔒 Centralized GitHub Connection State Machine](#3--centralized-github-connection-state-machine)
  - [4. ⏱️ Mock Interview Practice Arena](#4-️-mock-interview-practice-arena)
  - [5. 🧠 Interview Curricula & SuperMemo-2 Spaced Repetition (SRS)](#5--interview-curricula--supermemo-2-spaced-repetition-srs)
  - [6. 🎯 Canonical Pattern Recognition (Pattern Explorer)](#6--canonical-pattern-recognition-pattern-explorer)
  - [7. 📚 DSA Knowledge Vault & Architectural Trade-Offs](#7--dsa-knowledge-vault--architectural-trade-offs)
  - [8. 📅 Personal Coding Planner & Sprint Velocity Tracking](#8--personal-coding-planner--sprint-velocity-tracking)
  - [9. 📑 Weekly Developer Report & 1-Click Markdown Exporter](#9--weekly-developer-report--1-click-markdown-exporter)
  - [10. 🛡️ Dynamic Edge-Cached Profile SVG Badges](#10-️-dynamic-edge-cached-profile-svg-badges)
  - [11. 📖 GitHub README Auto-Cataloging Engine](#11--github-readme-auto-cataloging-engine)
  - [12. 🧩 Resilient Manifest V3 Chrome Extension](#12--resilient-manifest-v3-chrome-extension)
  - [13. 💻 Local Desktop Companion Agent Daemon](#13--local-desktop-companion-agent-daemon)
  - [14. 🎨 High-Contrast GitHub Dual Theme Engine](#14--high-contrast-github-dual-theme-engine)
- [🏗️ System Architecture](#-system-architecture)
- [📂 Monorepo Workspace Inventory](#-monorepo-workspace-inventory)
- [🚀 Quick Start (Local Setup)](#-quick-start-local-setup)
- [🌐 Production Deployment & Environment Guide](#-production-deployment--environment-guide)
  - [Vercel (Frontend)](#1-vercel-frontend-configuration)
  - [Render (Backend)](#2-render-backend-configuration)
  - [GitHub OAuth Application Settings](#3-github-developer-settings-oauth-app)
- [🛠️ Automated Testing & Verification](#-automated-testing--verification)
- [🧩 Loading the Chrome Extension](#-loading-the-chrome-extension)
- [🛡️ Security & Zero-Fabrication Guarantees](#-security--zero-fabrication-guarantees)
- [📜 License](#-license)

---

## ⚡ What is StreakForge v4.0?

**StreakForge v4.0** is an open-source, full-stack developer ecosystem engineered to transform daily coding consistency into tangible career progression. It bridges verified Git commits, authentic LeetCode passing submissions, real-time mock interviews, spaced repetition recall, and automated repository documentation into an immutable activity ledger.

Unlike superficial streak counters or synthetic commit generators, StreakForge enforces a strict **Zero-Fabrication Principle**:
* **Authentic Git Ledger**: Commits are pushed strictly from genuine local modifications or verified **Accepted** LeetCode passing verdicts.
* **Embedded Source Code**: Every synchronized algorithm embeds the developer's exact submitted passing source code directly into its solution `README.md` with full commit SHA tracking.
* **Instant Refresh Pipeline**: A single click on the dashboard triggers backend ingestion of fresh GitHub commits (`POST /api/v1/github/sync`), synchronizing streaks instantaneously.
* **Resilient Extension Cold-Start Recovery**: Handles Render free-tier spin-up HTML delays gracefully without JSON parsing crashes, automatically retrying until the gateway wakes up.
* **Pixel-Perfect Dual Theme**: Authentic GitHub Dark mode (`#0d1117`) and GitHub Light mode (`#ffffff` cards, `#1f2328` typography, `#d0d7de` borders) with zero opacity hacks.
* **Timezone Integrity**: Day boundaries and streak continuity calculate strictly within the user's explicit IANA timezone.

---

## ✨ Core Features & Capabilities

### 1. 🛡️ Zero-Fabrication Commit Engine & Embedded Solution Source
* Every synchronized LeetCode solution automatically commits the complete source code directly into your repository:
  * Generates clean language-specific solution files (`solution.py`, `Solution.java`, `solution.ts`, `solution.rs`, etc.).
  * Creates an informative `README.md` for each problem containing problem metadata, difficulty, runtime metrics, memory percentiles, and the submitted code fenced in appropriate markdown syntax.
  * Links every activity entry to its verified Git commit SHA for tamper-proof verification.

### 2. 🔄 Real-Time GitHub Commit Ingestion & Instant Streak Refresh
* **Dynamic Sync Endpoint**: `POST /api/v1/github/sync` queries your connected GitHub repository's default branch, ingesting fresh commits directly into `ActivityRecord` and `DailyActivitySnapshot`.
* **Instant Dashboard Update**: Clicking the **Refresh Metrics** button triggers an immediate GitHub crawl and recomputes the user's current streak and contribution count without waiting for hourly cron jobs.

### 3. 🔒 Centralized GitHub Connection State Machine
* Robust state management across both the frontend web app and Chrome extension:
  * `CONNECTED`: GitHub OAuth token is valid, active, and repository access verified.
  * `DISCONNECTED`: No GitHub account connected.
  * `TOKEN_INVALID`: Stored token is malformed or invalid.
  * `AUTHORIZATION_REVOKED`: GitHub OAuth authorization explicitly revoked by user.
  * `INSUFFICIENT_PERMISSIONS`: Token lacks required `repo` or `read:user` scopes.
  * `RATE_LIMITED`: GitHub API secondary rate limit encountered; gracefully pauses without falsely revoking credentials.
  * `CHECKING_CONNECTION`: Non-blocking background health check in progress.

### 4. ⏱️ Mock Interview Practice Arena
* **Timed Real-World Simulations**:
  * **Warmup Session**: 30-minute Easy problem (focusing on fundamental data structures, array traversal, two pointers).
  * **Industry Standard**: 45-minute Medium paired set (reflecting typical FAANG/Tier-1 screening rounds: BFS, Sliding Window, DP).
  * **Senior / Staff Challenge**: 60-minute Hard problem (complex topological sorting, monotonic queues, multi-dimensional DP).
* **Curated Problem Pools**: Switch between **Blind 75**, **NeetCode 150**, and **LeetCode Top Interview 150**.
* **In-Browser IDE Scratchpad**:
  * Multi-language starter boilerplate: **Python 3**, **Java**, **C++**, **TypeScript**, **Go**, and **Rust**.
  * 1-click **Reset Starter** boilerplate button.
  * Direct deep-links to full LeetCode problem specifications.
* **Automated Post-Session Evaluation**: Calculates completion time, speed score, Big-O efficiency rating, and detailed interviewer feedback.

### 5. 🧠 Interview Curricula & SuperMemo-2 Spaced Repetition (SRS)
* **Standard Roadmaps**: Built-in tracking for **Blind 75**, **NeetCode 150**, and **Top Interview 150**.
* **SM-2 Algorithm Engine**: Automatically schedules recall flashcard reviews across expanding intervals (**1d**, **3d**, **7d**, **14d**, **30d**, **60d**, **90d**).
* **Interactive Flashcard Reviews**: Review DSA concepts and algorithmic patterns with recall grades (`Again`, `Hard`, `Good`, `Easy`) and real-time next-review projection.
* **Auto-Reconciliation**: Submitting an accepted LeetCode solution automatically marks the corresponding problem in your curriculum as solved and enqueues its first SRS review.

### 6. 🎯 Canonical Pattern Recognition (Pattern Explorer)
* **16 Core Algorithmic Patterns Library**:
  * Sliding Window, Two Pointers, Fast & Slow Pointers, Monotonic Stack
  * Interval Merging, Cyclic Sort, In-Place Reversal of LinkedList
  * Tree & Graph BFS, Tree & Graph DFS, Two Heaps, Subsets & Backtracking
  * Modified Binary Search, Top 'K' Elements, K-way Merge, Topological Sort, 0/1 Knapsack & DP
* **Pattern Deep-Dives**: Includes time/space complexity analysis, visual triggers ("When to Use"), reusable code templates, and canonical benchmark problems.

### 7. 📚 DSA Knowledge Vault & Architectural Trade-Offs
* **Cheat Sheet Library**: Searchable reference library covering Arrays, Strings, Trees, Graphs, Heaps, Disjoint Set Union (DSU), Tries, and Dynamic Programming.
* **Big-O Trade-Off Tables**: Worst/Average time complexities, auxiliary memory trade-offs, and common implementation traps to avoid during live interviews.

### 8. 📅 Personal Coding Planner & Sprint Velocity Tracking
* **Sprint Momentum**: Configure weekly problem goals and target difficulty distributions (e.g. 5 Easy, 8 Medium, 2 Hard).
* **Progress Telemetry**: Live completion tracking, sprint velocity graphs, and weekly streak targets.

### 9. 📑 Weekly Developer Report & 1-Click Markdown Exporter
* **Automated Activity Synthesis**: Analyzes 7-day performance, total problems solved, commit velocity, primary focus areas, and targeted weakness patterns.
* **1-Click Markdown Export**: Generates beautifully formatted Markdown ready to paste into GitHub profile READMEs, LinkedIn developer updates, or engineering team standup notes.

### 10. 🛡️ Dynamic Edge-Cached Profile SVG Badges
* **Fast Public SVG Endpoint**: `/api/v1/badge/streak.svg?user=:username&theme=:theme`
* **5 Tailored Themes**: `Dark Primer`, `Minimal Outline`, `Crisp Light`, `Hacker Terminal`, and `Vibrant Gradient`.
* **Edge Cached & Secure**: Sub-millisecond response caching, XML-escaped SVG generation, and responsive rendering inside any markdown file.

```markdown
<!-- Embed directly into your GitHub Profile README -->
[![StreakForge Stats](https://streakforge-api-5uhs.onrender.com/api/v1/badge/streak.svg?user=Thanniru-yaswanth03&theme=dark)](https://github.com/Thanniru-yaswanth03)
```

### 11. 📖 GitHub README Auto-Cataloging Engine
* Scans connected repositories and compiles an elegant, structured table of contents indexing all solved algorithms by difficulty and topic.
* **Safe Delimiters**: Uses comment markers `<!-- STREAKFORGE:START -->` ... `<!-- STREAKFORGE:END -->` to preserve existing repository documentation.
* **Diff Preview & Rollback**: Visual side-by-side diff preview prior to committing, with 1-click snapshot restoration.

### 12. 🧩 Resilient Manifest V3 Chrome Extension
* Intercepts accepted submissions on `leetcode.com` in real time via DOM and Monaco editor hooks.
* **Multi-Language Detection**: Supports Python 3, Java, C++, TypeScript, JavaScript, Go, Rust, C#, Ruby, Swift, Kotlin, and PHP.
* **Cold-Start Resilience**: Gracefully absorbs Render free-tier spin-up delays with exponential backoff and zero JSON parse crashes.
* **Self-Reconciling Retry Queue**: Automatically detects verified exported commits and purges them from the local retry queue, with a 1-click **Clear Queue** button for instant manual management.

### 13. 💻 Local Desktop Companion Agent Daemon
* Background daemon monitoring local development repositories via native Git CLI.
* **Secret Leak Scanner**: Intercepts staged diffs to prevent accidental commits containing AWS secret keys, GitHub Personal Access Tokens (`ghp_*`), or private SSH keys.
* **Approval Mode**: Supports a proposal queue requiring developer approval before committing changes.
* **Detached HEAD Guard**: Refuses to commit on detached HEAD states to prevent orphaned commits.

### 14. 🎨 High-Contrast GitHub Dual Theme Engine
* Built with Tailwind CSS semantic tokens (`bg-theme-bg`, `bg-theme-surface`, `bg-theme-elevated`, `border-theme-border`, `text-theme-primary`, `text-theme-muted`).
* **Dark Theme**: Authentic GitHub Dark Primer (`#0d1117` background, `#161b22` cards, `#30363d` borders, `#f0f6fc` text).
* **Light Theme**: High-contrast GitHub Light (`#f6f8fa` canvas, `#ffffff` cards, `#d0d7de` borders, `#1f2328` text).
* **Portal-Rendered Heatmap Tooltips**: All calendar day tooltips render via React DOM Portals directly to `document.body`, eliminating z-index card clipping.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        Ext["Chrome Extension (MV3)<br/>DOM & Monaco Interceptor"]
        Web["Web Dashboard (Next.js 15)<br/>React 19 & Tailwind CSS"]
        Agent["Desktop Agent Daemon<br/>Git CLI & Secret Scanner"]
    end

    subgraph Gateway ["API Service (streakforge-api-5uhs.onrender.com)"]
        API["Express 4 REST Gateway"]
        Auth["OAuth 2.0 & Session Security<br/>Dynamic Host Resolution"]
        SM2["SuperMemo-2 SRS Engine"]
        Badge["Edge-Cached SVG Engine"]
        SyncEng["Zero-Fabrication Sync Engine"]
    end

    subgraph Storage ["Database & Vault"]
        DB[("MongoDB Atlas<br/>Mongoose Schemas")]
        Vault["AES-256-GCM Token Encryption"]
    end

    subgraph Integrations ["External Platforms"]
        LC["LeetCode Platform<br/>GraphQL API & Solutions"]
        GH["GitHub API & Repositories<br/>Octokit REST & Webhooks"]
    end

    Ext -->|"1. Observes Accepted Verdict"| LC
    Ext -->|"2. POST /api/v1/sync/leetcode/submission"| API
    Agent -->|"Safe Local Commits"| GH
    Web <-->|"User Telemetry & Controls"| API
    API --> Auth
    API --> SM2
    API --> Badge
    API --> SyncEng
    Auth --> Vault
    Vault --> DB
    SyncEng -->|"3. Verified Git Push"| GH
    SyncEng --> DB
```

---

## 📂 Monorepo Workspace Inventory

Managed with **pnpm workspaces** (Node.js >= 20, pnpm >= 10):

```
StreakForge/
├── apps/
│   ├── web/                  # Next.js 15 App Router, React 19, Tailwind CSS, Lucide icons
│   ├── api/                  # Express REST API, Mongoose, Zod, AES-256-GCM, SM-2 Engine
│   ├── extension/            # Chrome Extension Manifest V3 (Vite, React, Background Service Worker)
│   └── desktop-agent/        # Companion local agent daemon, Git CLI wrapper, secret scanner
├── packages/
│   ├── shared-types/         # Pure TypeScript type contracts, DTOs, and interface definitions
│   ├── validation/           # Zod validation schemas and safe path sanitizers
│   ├── config/               # Shared constants, entropy patterns, and environment rules
│   ├── git-engine/           # Safe Git CLI execution, secret scanner, diff analyzer
│   └── sync-engine/          # LeetCode transformer, language mappers, Octokit client
├── infrastructure/
│   ├── docker/               # Production Dockerfiles (Dockerfile.api, Dockerfile.web, docker-compose.yml)
│   └── github-actions/       # Workflows for CI testing and release automation
├── scripts/                  # Packaging, agent control, install and uninstall scripts
└── docs/                     # Comprehensive architecture and operational guides
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
* **Node.js** >= 20.0.0
* **pnpm** >= 10.0.0
* **Git** >= 2.40.0
* **MongoDB** >= 7.0 (Local instance or MongoDB Atlas)

### 1. Clone & Install
```bash
git clone https://github.com/Thanniru-yaswanth03/StreakForge.git
cd StreakForge
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Ensure `.env` contains your database and GitHub application credentials:
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/streakforge
JWT_SECRET=dev_jwt_secret_at_least_32_chars_long_streakforge
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/v1/auth/github/callback
WEB_APP_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,chrome-extension://*
```

### 3. Build & Verify Monorepo
```bash
# Typecheck all workspace packages
pnpm -r typecheck

# Build Chrome Extension into apps/extension/dist
pnpm --filter @streakforge/extension build

# Run test suite across all packages (141 tests)
pnpm -r test
```

### 4. Start Development Runtimes
```bash
# Concurrently launches Web Dashboard (localhost:3000) and API Gateway (localhost:4000)
pnpm dev
```
Visit `http://localhost:3000` in your browser.

---

## 🌐 Production Deployment & Environment Guide

### Production Endpoints
* **Web Frontend**: [streak-forge-six.vercel.app](https://streak-forge-six.vercel.app)
* **API Gateway**: [streakforge-api-5uhs.onrender.com](https://streakforge-api-5uhs.onrender.com)
* **API Health Check**: [streakforge-api-5uhs.onrender.com/health](https://streakforge-api-5uhs.onrender.com/health)
* **OAuth Diagnostic**: [streakforge-api-5uhs.onrender.com/api/v1/auth/config-status](https://streakforge-api-5uhs.onrender.com/api/v1/auth/config-status)

---

### 1. Vercel (Frontend) Configuration
In **Vercel Dashboard > streak-forge-six > Settings > Environment Variables**:

| Variable | Value | Environment | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://streakforge-api-5uhs.onrender.com/api/v1` | Production & Preview | Active Render backend API URL. |
| `NEXT_PUBLIC_APP_URL` | `https://streak-forge-six.vercel.app` | Production & Preview | Primary frontend application domain. |

---

### 2. Render (Backend) Configuration
In **Render Dashboard > streakforge-api-5uhs > Environment**:

| Variable | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations and secure cookies. |
| `MONGODB_URI` | `mongodb+srv://...` | Connection URI for MongoDB Atlas cluster. |
| `JWT_SECRET` | `[32+ char random hex string]` | Secret key used to sign user session tokens & OAuth states. |
| `ENCRYPTION_MASTER_KEY` | `[64 char hex string (32 bytes)]` | Master key for AES-256-GCM token encryption. |
| `GITHUB_CLIENT_ID` | `Ov23lid3vOdnrGXzUWDO` | Public OAuth Client ID from GitHub Developer Settings. |
| `GITHUB_CLIENT_SECRET` | `[Your GitHub OAuth Secret]` | **Never exposed to frontend or client bundle.** |
| `GITHUB_CALLBACK_URL` | `https://streakforge-api-5uhs.onrender.com/api/v1/auth/github/callback` | Exact canonical authorization callback URL. |
| `WEB_APP_URL` | `https://streak-forge-six.vercel.app` | Target redirect origin after successful authentication. |
| `CORS_ORIGIN` | `https://streak-forge-six.vercel.app,https://streakforge.vercel.app,chrome-extension://*` | Whitelist for web and extension requests. |

---

### 3. GitHub Developer Settings (OAuth App)
Navigate to [github.com/settings/developers](https://github.com/settings/developers) > **OAuth Apps** > Select your app:

| Field | Required Value | Notes |
|---|---|---|
| **Application name** | `StreakForge` | Shown on GitHub authorization consent screen. |
| **Homepage URL** | `https://streak-forge-six.vercel.app` | Main entry point for the application. |
| **Authorization callback URL** | `https://streakforge-api-5uhs.onrender.com/api/v1/auth/github/callback` | **Must match character-for-character with no trailing slash.** |

> [!TIP]
> Character-for-character matching between GitHub's **Authorization callback URL** and the backend `GITHUB_CALLBACK_URL` is required by the OAuth 2.0 specification. Any mismatch produces `"The redirect_uri is not associated with this application."`

---

## 🛠️ Automated Testing & Verification

StreakForge maintains a rigorous automated testing suite with **141/141 tests passing (100%)** across 15 test suites:

```bash
# Run all 141 automated unit and integration tests
pnpm -r test

# Verify TypeScript across all workspace packages
pnpm -r typecheck

# Verify Next.js production build
pnpm --filter @streakforge/web build
```

### Verification Highlights:
```
 ✓ packages/git-engine/src/index.test.ts (5 tests)
 ✓ packages/sync-engine/src/index.test.ts (7 tests)
 ✓ apps/extension/test/auditExtension.test.ts (4 tests)
 ✓ apps/extension/test/extension.test.ts (11 tests)
 ✓ apps/extension/test/v4Extension.test.ts (7 tests)
 ✓ apps/api/src/streakEngine.test.ts (16 tests)
 ✓ apps/api/src/crypto.test.ts (3 tests)
 ✓ apps/api/src/streak.test.ts (2 tests)
 ✓ apps/api/src/developerAnalytics.test.ts (5 tests)
 ✓ apps/api/src/automation.test.ts (11 tests)
 ✓ apps/api/src/v4Upgrade.test.ts (10 tests)
 ✓ apps/api/src/auditScenarios.test.ts (12 tests)
 ✓ apps/api/src/app.test.ts (4 tests)
 ✓ apps/api/src/github.test.ts (15 tests)
 ✓ apps/api/src/securityAndE2E.test.ts (20 tests)
 ✓ apps/desktop-agent/src/agent.test.ts (9 tests)

 Test Files  16 passed (16)
      Tests  141 passed (141)
   Duration  12.4s
```

---

## 🧩 Loading the Chrome Extension

1. Build the production extension bundle:
   ```bash
   pnpm --filter @streakforge/extension build
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** via the toggle in the upper-right corner.
4. Click **Load unpacked** and select the folder `apps/extension/dist`.
5. Pin the **StreakForge** extension icon in your Chrome toolbar.
6. Open any problem on [leetcode.com/problemset](https://leetcode.com/problemset/), write your solution, and click **Submit**. Only genuine **Accepted** passing verdicts trigger automated synchronization!

---

## 🛡️ Security & Zero-Fabrication Guarantees

* **No Synthetic Commits**: StreakForge never fabricates commit timestamps or creates fake activity. Every commit corresponds to an authentic passing LeetCode solution or a verified local code modification.
* **Secret Leak Prevention**: All staged diffs are scanned for credentials (`AWS_SECRET_KEY`, `ghp_*`, `id_rsa`, `BEGIN PRIVATE KEY`). Any commit containing secrets is blocked and unstaged immediately.
* **Encrypted Credentials**: All stored GitHub tokens are encrypted with **AES-256-GCM** using a cryptographically secure initialization vector (IV) and authentication tag.
* **Isolated User Tenancy**: Every database query is scoped to the authenticated user ID (`req.userId`). Unauthenticated visitors access an isolated sandbox with zero access to private user records.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for full details.
