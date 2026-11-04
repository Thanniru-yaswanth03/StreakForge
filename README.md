# StreakForge

> Authentic Coding Activity Records & Zero-Fabrication Synchronization Platform for GitHub and LeetCode.

---

## ⚡ What is StreakForge?

StreakForge helps developers maintain accurate coding activity records and synchronize genuine coding work across GitHub and LeetCode.

### Key Features
- **100% Genuine Activity**: Zero synthetic commits, zero fake timestamps, zero fabricated submissions.
- **LeetCode Chrome Extension**: Automatically captures accepted submissions and exports solutions cleanly to GitHub with documentation and performance metrics.
- **Local Desktop Agent**: Monitors your actual git workspaces and automatically stages, commits, and pushes your real work based on customizable idle/wrap-up rules.
- **Timezone-Aware Streak Engine**: Calculates your daily consistency and active days accurately according to your local timezone.
- **Immutable Audit Trail**: Inspect every automated commit, export, and API synchronization in real-time.

---

## 🏗️ Architecture & Monorepo

```
streakforge/
├── apps/
│   ├── web/                  # Next.js 15 Web Application
│   ├── api/                  # Express REST API (Node/TS/Mongoose)
│   ├── extension/            # Manifest V3 Chrome Extension
│   └── desktop-agent/        # Node.js Git Desktop Daemon CLI
├── packages/
│   ├── shared-types/         # Pure TypeScript DTOs & Contracts
│   ├── validation/           # Zod validation schemas
│   ├── config/               # Global constants & environment parsing
│   ├── git-engine/           # Safe Git CLI execution & secret filters
│   └── sync-engine/          # LeetCode transformer & GitHub Octokit client
├── infrastructure/
│   ├── docker/               # Docker & Docker Compose configs
│   └── github-actions/       # CI/CD Workflows
└── docs/                     # Full Architectural Specifications
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20 (v22 recommended)
- pnpm >= 10
- Git CLI >= 2.40
- MongoDB instance (local or MongoDB Atlas)

### Setup
```bash
# 1. Install dependencies across all packages
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Build packages
pnpm build

# 4. Run tests
pnpm test

# 5. Start development servers
pnpm dev
```

---

## 📚 Documentation
- [Architecture Details](docs/ARCHITECTURE.md)
- [Database Schemas](docs/DATABASE_SCHEMA.md)
- [REST API Reference](docs/API_REFERENCE.md)
- [Security & Threat Model](docs/SECURITY.md)
- [Chrome Extension Guide](docs/EXTENSION_GUIDE.md)
- [Local Agent Guide](docs/LOCAL_AGENT_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

