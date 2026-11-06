# StreakForge 2.0 — Intelligence & Learning Ecosystem

<p align="center">
  <img src="apps/extension/icons/icon-128.png" alt="StreakForge Logo" width="100" height="100" />
</p>

<p align="center">
  <strong>Authentic Coding Activity Synchronization, Automated Documentation &amp; Interview Preparation Platform</strong><br>
  Zero-Fabrication Git Records • Dynamic Profile SVG Badges • GitHub README Auto-Catalog • Blind 75 &amp; NeetCode 150 • SuperMemo-2 Spaced Repetition
</p>

<p align="center">
  <a href="https://github.com/Thanniru-yaswanth03/StreakForge/actions"><img src="https://img.shields.io/badge/CI-Passing-emerald?style=flat-square&logo=githubactions" alt="CI" /></a>
  <a href="https://github.com/Thanniru-yaswanth03/StreakForge/releases"><img src="https://img.shields.io/badge/Release-v2.0.0--stable-indigo?style=flat-square" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%3E%3D20.0.0-green?style=flat-square&logo=node.js" alt="Node" /></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-amber?style=flat-square&logo=googlechrome" alt="MV3" /></a>
</p>

---

## ⚡ What is StreakForge 2.0?

**StreakForge 2.0** transforms progress tracking into a comprehensive **coding consistency and interview preparation ecosystem**. It unites verified GitHub commits, authentic LeetCode accepted solutions, repository documentation auto-cataloging, dynamic profile badges, and spaced repetition review into an immutable activity ledger.

Unlike superficial streak counters or synthetic commit generators, StreakForge enforces a strict **Zero-Fabrication Principle**:
- **Authentic Git Ledger**: Commits are generated only from real local modifications or verified **Accepted** LeetCode passing verdicts.
- **Auto-Reconciled Telemetry**: Problem solves are scraped directly from LeetCode and reconciled with interview preparation roadmaps.
- **Timezone Integrity**: Daily snapshots calculate day boundaries in the user's explicit IANA timezone.
- **Delimiter Safeguards**: Repository documentation updates strictly within designated comments, never destroying custom README content.

---

## 🚀 Key Modules & Capabilities

### 1. 📚 GitHub README Auto-Catalog
- Automatically scans connected repositories and constructs a structured solutions index.
- Uses protective delimiters: `<!-- STREAKFORGE:START -->` ... `<!-- STREAKFORGE:END -->`.
- Formats problem number, title, difficulty badge, category, language, and direct GitHub code links.
- Supports **diff preview before commit** and **1-click rollback** to previous README snapshots.

### 2. 🛡️ Dynamic Profile SVG Badges
- Fast public SVG endpoint (`/api/v1/badge/streak.svg?user=:username&theme=:theme`).
- **5 Designed Themes**: `Dark Primer`, `Minimal Outline`, `Crisp Light`, `Hacker Terminal`, and `Vibrant Gradient`.
- Embeds verified streak days, all-time record, total solves, and difficulty breakdown directly into any GitHub profile README.
- Fast edge caching (`max-age=1800`), XML injection escaping, and responsive dimensions.

```markdown
<!-- Embed directly into your GitHub Profile README -->
[![StreakForge Stats](http://localhost:4000/api/v1/badge/streak.svg?user=Thanniru-yaswanth03&theme=dark)](https://github.com/Thanniru-yaswanth03)
```

### 3. 🧠 Interview Study Curricula & Spaced Repetition (SRS)
- **Supported Roadmaps**: **Blind 75**, **NeetCode 150**, and **LeetCode Top Interview 150**.
- **SuperMemo-2 (SM-2) Scheduling Engine**: Automatically schedules recall reviews across expanding intervals (1d, 3d, 7d, 14d, 30d, 60d, 90d).
- Interactive flashcard review dashboard with recall grades (`Again`, `Hard`, `Good`, `Easy`) and real-time interval projection.
- Automatic solve reconciliation: Accepted LeetCode submissions automatically advance problem study status to `SOLVED`.

### 4. 📊 Learning Intelligence & Domain Radar
- Consolidated progress analytics synthesizing Git activity, solved volume, and recall retention rates.
- Algorithmic domain proficiency classification across 14 technical topics (Arrays, Two Pointers, Trees, Dynamic Programming, Graphs, etc.) tagged as `STRONG`, `GROWING`, or `NEEDS_FOCUS`.

### 5. 🧩 Manifest V3 Chrome Extension
- Observes LeetCode DOM, Monaco editor, and GraphQL submission responses in real time.
- Automatic language detection (Python, TypeScript, JavaScript, Java, C++, Go, Rust, etc.).
- Multi-layer deduplication locks preventing duplicate dispatches or redundant commits.
- Non-blocking dismissible notification toasts.

---

## 🏗️ System Architecture

```
                                  +---------------------------+
                                  |     LeetCode Platform     |
                                  +---------------------------+
                                                |
                                                v (DOM & Monaco Interceptor)
+----------------------------+    +---------------------------+
|    Web Dashboard UI        |    | StreakForge Chrome Ext    |
| (Next.js 15 / TailwindCSS) |    |  (Manifest V3 / Vite)     |
+----------------------------+    +---------------------------+
              |                                 |
              | Bearer JWT                      | Authenticated API Header
              v                                 v
+-------------------------------------------------------------+
|              StreakForge Central API Service                |
|             (Express / TypeScript / Mongoose)               |
|                                                             |
|  - SM-2 Spaced Repetition Engine  - README Catalog Generator|
|  - Edge-Cached SVG Badge Engine   - AES-256-GCM Encryption |
|  - IANA Timezone Streak Calculator- Distributed Job Queue   |
+-------------------------------------------------------------+
       |                                     ^
       | Octokit REST                        | Loopback IPC Nonce
       v                                     |
+----------------------------+    +---------------------------+
|    GitHub Platform         |    | Local Desktop Agent       |
| (Repos, Commits, Webhooks) |    | (Node.js Daemon / Git CLI)|
+----------------------------+    +---------------------------+
                                                |
                                                v (Secret Leak Scanner)
                                  +---------------------------+
                                  | Monitored Local Workspaces|
                                  +---------------------------+
```

---

## 📦 Monorepo Workspace Inventory

Managed with **pnpm workspaces** (Node v20+, pnpm v10+):

```
StreakForge/
├── apps/
│   ├── web/                  # Next.js 15 App Router, React 19, Tailwind CSS, Lucide
│   ├── api/                  # Express REST API, Mongoose, Zod, AES-256-GCM, SM-2 Engine
│   ├── extension/            # Chrome Extension Manifest V3 (Vite, React, Service Worker)
│   └── desktop-agent/        # Local companion agent daemon, Git CLI wrapper, loopback IPC
├── packages/
│   ├── shared-types/         # Pure TypeScript contracts, interfaces, DTOs
│   ├── validation/           # Zod validation schemas and safe path validators
│   ├── config/               # Shared constants, entropy patterns, and environment rules
│   ├── git-engine/           # Safe Git CLI execution, secret scanner, diff analyzer
│   └── sync-engine/          # LeetCode transformer, language mappers, Octokit client
├── infrastructure/
│   ├── docker/               # Dockerfile.api, Dockerfile.web, docker-compose.yml
│   └── github-actions/       # Workflows for CI and Release automation
├── scripts/                  # Packaging, agent control, install and uninstall scripts
└── docs/                     # Comprehensive architecture and operational guides
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Git** >= 2.40.0
- **MongoDB** >= 7.0 (Local instance or MongoDB Atlas)

### 1. Clone & Install
```bash
git clone https://github.com/Thanniru-yaswanth03/StreakForge.git
cd StreakForge
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Configure MONGODB_URI, JWT_SECRET, and GitHub OAuth credentials in .env
```

### 3. Build & Verify Monorepo
```bash
# Typecheck all 9 workspace packages
pnpm -r typecheck

# Build Chrome extension into apps/extension/dist
pnpm --filter @streakforge/extension build

# Build all packages
pnpm build
```

### 4. Start Development Runtimes
```bash
# Concurrently launches Web Dashboard (localhost:3000) and Central API (localhost:4000)
pnpm dev
```

Visit the dashboard at `http://localhost:3000`.

---

## 🧩 Loading the Chrome Extension

1. Build the extension: `pnpm --filter @streakforge/extension build`.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the upper-right corner.
4. Click **Load unpacked** and select the folder `apps/extension/dist`.
5. Pin the **StreakForge** extension icon to your toolbar.
6. Open any problem on `leetcode.com`, write your solution, and click **Submit**. Only genuine **Accepted** passing verdicts trigger automatic synchronization!

---

## 📚 Documentation Index

- [Installation Guide](docs/INSTALLATION.md) — Comprehensive setup for Web, API, Extension, and Agents.
- [User Guide](docs/USER_GUIDE.md) — End-user walkthrough from GitHub OAuth to LeetCode syncing.
- [API Reference Manual](docs/API_REFERENCE.md) — Detailed REST endpoints, payloads, and status codes.
- [Deployment Guide](docs/DEPLOYMENT.md) — Vercel, Render, Railway, and Docker configurations.
- [Security Architecture](docs/SECURITY.md) — Encryption standards, threat models, and IDOR defenses.
- [Troubleshooting](docs/TROUBLESHOOTING.md) — Diagnostics for authentication, extension, and sync errors.
- [Contributing](docs/CONTRIBUTING.md) — Code style, pull request protocol, and test standards.
- [Changelog](docs/CHANGELOG.md) — Release notes and milestone history.

---

## 🛡️ License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
