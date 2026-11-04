# StreakForge

<p align="center">
  <img src="https://raw.githubusercontent.com/StreakForge/streakforge/main/apps/extension/icons/icon-128.png" alt="StreakForge Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Authentic Coding Activity Synchronization & Developer Consistency Platform</strong><br>
  Zero-Fabrication Git Records • LeetCode Manifest V3 Sync • Local Desktop Agent • Timezone Streak Engine
</p>

<p align="center">
  <a href="https://github.com/StreakForge/streakforge/actions"><img src="https://img.shields.io/badge/CI-Passing-emerald?style=flat-square&logo=githubactions" alt="CI" /></a>
  <a href="https://github.com/StreakForge/streakforge/releases"><img src="https://img.shields.io/badge/Release-v1.0.0--beta.1-indigo?style=flat-square" alt="Version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-%3E%3D20.0.0-green?style=flat-square&logo=node.js" alt="Node" /></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-amber?style=flat-square&logo=googlechrome" alt="MV3" /></a>
</p>

---

## ⚡ What is StreakForge?

**StreakForge** helps engineers maintain authentic coding records by uniting verified GitHub commits, LeetCode submissions, and local repository modifications into an immutable activity ledger.

Unlike superficial streak counters or artificial commit generators, StreakForge enforces a strict **Zero-Fabrication Principle**:
- **No Synthetic Commits**: Commits are only produced from actual local file changes or accepted LeetCode submissions.
- **No Falsified Timestamps**: Timestamps reflect genuine execution times localized to your IANA timezone.
- **No Inferred Coding Duration**: Active coding hours are never guessed from commit spans; only real companion daemon sessions are reported.
- **Immutable Audit Ledger**: Every automated action is permanently recorded in an inspectable database audit log.

---

## 🏗️ Architecture Overview

```
                                  +---------------------------+
                                  |     LeetCode Platform     |
                                  +---------------------------+
                                                |
                                                v (DOM & Network Observer)
+----------------------------+    +---------------------------+
|    Web Dashboard UI        |    | StreakForge Chrome Ext    |
| (Next.js 15 / TailwindCSS) |    |  (Manifest V3 / Vite)     |
+----------------------------+    +---------------------------+
              |                                 |
              | Bearer JWT                      | Scoped API Token
              v                                 v
+-------------------------------------------------------------+
|              StreakForge Central API Service                |
|             (Express / TypeScript / Mongoose)               |
|                                                             |
|  - AES-256-GCM Token Encryption   - IANA Timezone Engine    |
|  - Distributed Scheduler & Queue  - Rate Limiting & IDOR    |
+-------------------------------------------------------------+
       |                                     ^
       | Octokit REST                        | HTTPS Heartbeat & IPC
       v                                     |
+----------------------------+    +---------------------------+
|    GitHub Platform         |    | Local Desktop Agent       |
| (Repos, Commits, Webhooks) |    | (Node.js Daemon / Git CLI)|
+----------------------------+    +---------------------------+
                                                |
                                                v (Safe Spawning)
                                  +---------------------------+
                                  | Local Git Repositories    |
                                  | (Secret Scanning Filter)  |
                                  +---------------------------+
```

---

## 📦 Monorepo Structure

Managed with **pnpm workspaces** (Node v20+, pnpm v10+):

```
streakforge/
├── apps/
│   ├── web/                  # Next.js 15 App Router, React 19, Tailwind CSS, Recharts
│   ├── api/                  # Express REST API, Mongoose, Zod, AES-256-GCM crypto
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

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0
- **Git** >= 2.40.0
- **MongoDB** >= 7.0 (Local instance or MongoDB Atlas free tier)

### 1. Clone & Install
```bash
git clone https://github.com/StreakForge/streakforge.git
cd streakforge
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, and GitHub OAuth credentials
```

### 3. Build & Run Tests
```bash
# Typecheck all 9 workspace packages
pnpm typecheck

# Run full test suite (103 tests across 12 test suites)
pnpm test

# Build all applications and packages
pnpm build
```

### 4. Start Development Servers
```bash
# Concurrently launches Web Dashboard (3000) and API Service (4000)
pnpm dev
```

Visit the dashboard at `http://localhost:3000`.

---

## 🧩 Packaging & Distributables

### Chrome Extension (Manifest V3)
```bash
# Builds and creates dist-releases/streakforge-extension-v1.0.0.zip
pnpm package:extension
```
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select `apps/extension/dist` (or unzip the release package).

### Windows Desktop Agent
```bash
# Builds and packages standalone Windows bundle to dist-releases/streakforge-agent-windows-v1.0.0.zip
pnpm package:agent
```
To install on Windows without administrator privileges:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-agent.ps1
```

---

## 🌐 Production Hosting & Free-Tier Compatibility

StreakForge is engineered to deploy cleanly on practical free and low-cost tiers:
- **Web Frontend**: Deployable on **Vercel** or **Cloudflare Pages** (Hobby free tier: 100GB bandwidth).
- **Central API**: Deployable on **Render** (Free Web Service) or **Railway** ($5 credit).
- **Database**: **MongoDB Atlas M0** free tier (512MB storage, TLS/SSL, replica set).

> [!NOTE]
> Free-tier instances on Render spin down after 15 minutes of inactivity, resulting in a ~30-50s cold-start latency. For production installations requiring 24/7 background scheduled jobs, an entry-level $5-$7/month instance is recommended. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full details.

---

## 📚 Documentation Index

- [Installation Manual](docs/INSTALLATION.md) — Comprehensive setup for Web, API, Extension, and Agents.
- [User Guide](docs/USER_GUIDE.md) — End-user walkthrough from GitHub OAuth to LeetCode syncing.
- [Deployment & Free-Tier Guide](docs/DEPLOYMENT.md) — Vercel, Render, Railway, and Docker guides.
- [Security Architecture](docs/SECURITY.md) — Threat models, encryption, IDOR defenses, and audit reports.
- [API Reference Manual](docs/API_REFERENCE.md) — Detailed REST endpoints, payloads, and status codes.
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) — Solutions for OAuth, extension, and agent issues.
- [Contributing Guide](docs/CONTRIBUTING.md) — Development conventions, testing, and PR workflow.
- [Changelog](docs/CHANGELOG.md) — Release notes and milestone history.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for details.
