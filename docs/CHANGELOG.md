# Changelog

All notable changes to the StreakForge platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta.1] — 2026-11-04

### Initial Public Beta Release

StreakForge v1.0.0-beta.1 delivers an authentic coding activity synchronization platform uniting verified GitHub commits, LeetCode solutions, and local repository modifications into an immutable activity ledger.

#### Phase 1: User Interface & Developer Experience
- Built complete developer dashboard in Next.js 15, React 19, and Tailwind CSS.
- Implemented collapsible responsive sidebar with 10 dedicated navigation views.
- Created dark and light theme system with custom CSS variables and high-contrast accessibility.
- Implemented Recharts data visualizations: 365-day contribution calendar, weekly consistency bars, language distribution pie charts.

#### Phase 2: GitHub Authentication & Integration
- Implemented server-side OAuth 2.0 PKCE flow with anti-CSRF state token validation.
- Implemented authenticated **AES-256-GCM** encryption for access tokens stored in MongoDB.
- Created repository discovery engine fetching visibility, permissions, default branches, and clone URLs.
- Implemented HMAC-SHA256 signature verification and deduplication for incoming GitHub webhooks.
- Built automated repository health diagnostics (README, license, branch protection, secret exposure audit).

#### Phase 3: Local Desktop Agent & Git Engine
- Created cross-platform companion agent daemon (`@streakforge/desktop-agent`) and CLI tool.
- Built 15-step authentic Git execution workflow in `@streakforge/git-engine`.
- Implemented 4 synchronization modes: `AUTOMATIC`, `APPROVAL`, `MANUAL`, and `BACKUP`.
- Built pre-commit high-entropy secret scanner blocking `.env`, private keys (`id_rsa`, `*.pem`), and tokens.
- Bound agent HTTP IPC exclusively to loopback interface `127.0.0.1` with bearer token authentication.
- Provided Windows 1-click unprivileged installer (`install-agent.ps1`) and uninstaller (`uninstall-agent.ps1`).

#### Phase 4: Chrome Extension & LeetCode Sync Engine
- Created Chrome Extension using **Manifest V3**, TypeScript, React, and Vite.
- Implemented dual detection engine (DOM mutation observer and network listener).
- Implemented 11-state submission state machine and duplicate prevention registry.
- Built solution formatting engine generating Markdown documentation, complexity analysis, and performance metrics.
- Built popup interface with real-time status and options page for custom directory template preview.

#### Phase 5: Contribution Tracker & Timezone Streak Engine
- Implemented independent activity category tracking (GitHub, LeetCode, Local Dev, Maintenance).
- Built calendar math engine handling IANA timezones, leap years, and Daylight Saving Time (DST) boundaries.
- Implemented weekly activity score algorithm (0–100) weighting consistency, category diversity, and volume.
- Created proactive reminder engine evaluating daily streak warnings and agent disconnection alerts.

#### Phase 6: Automation Engine & Scheduler
- Built persistent job queue (`JobRecord`) with atomic lease locks and execution states.
- Implemented distributed scheduler (`SchedulerRule`, `SchedulerLock`) with cron and interval evaluation.
- Added 8 automated workflows: LeetCode export, GitHub sync, local backups, health checks, and analytics generation.
- Added exponential backoff retry ($10s \times 2^n$) and dead-letter handling.

#### Phase 7: Analytics, Strict Deduplication, Daily Journal & Reports
- Built verified GitHub commit volume, repository distribution, and programming language analytics.
- Enforced **Strict Question Deduplication**: Multiple accepted submissions for the same problem are strictly deduplicated into 1 unique problem solved.
- Enforced **Zero Duration Guessing**: Precise coding duration is never guessed from Git commit timestamps.
- Created Developer Daily Journal with isolated personal reflections stored in MongoDB.
- Built automated executive progress report generator (daily, weekly, monthly, quarterly, annual) with **RFC 4180 compliant CSV** and structured JSON exports.

#### Phase 8: Security Audit & Quality Assurance
- Conducted full security audit across all 5 tiers (Auth, API, Extension, Desktop Agent, Database).
- Hardened extension background worker: strictly rejected `UPDATE_CONFIG` and redacted tokens for content-script callers.
- Hardened API with strict production CORS and dedicated `authLimiter` (30 req / 15 min).
- Added `Types.ObjectId.isValid` guards preventing unhandled BSON errors on malformed or injection probe IDs.
- Implemented `isSafeRepositoryPath` blocking filesystem root and OS system directory access.
- Verified 12 test suites with 103 tests passing (100% pass rate).

#### Phase 9: Deployment & Release Engineering
- Added comprehensive liveness and readiness health checks (`GET /health`) checking database and memory metrics.
- Created standalone packaging scripts for Chrome Extension (`streakforge-extension-v1.0.0.zip`) and Windows Desktop Agent (`streakforge-agent-windows-v1.0.0.zip`) with SHA-256 checksums.
- Implemented GitHub Actions CI/CD workflows for validation and manual-approval release drafts.
- Authored production environment template (`.env.production.example`) and complete documentation suite.

