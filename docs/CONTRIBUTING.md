# Contributing to StreakForge

Thank you for your interest in contributing to StreakForge! This project is an open ecosystem designed to maintain authentic coding activity records without fabricating work.

---

## 1. Monorepo Organization

StreakForge uses `pnpm` workspaces. Please keep cross-package imports clean and strictly respect package boundaries:

- `apps/web`: Next.js 15 App Router web application.
- `apps/api`: Express REST API and MongoDB domain services.
- `apps/extension`: Chrome Extension Manifest V3 built with Vite.
- `apps/desktop-agent`: Node.js companion daemon and CLI tool.
- `packages/shared-types`: Pure TypeScript interfaces and DTOs.
- `packages/validation`: Zod schemas and path validators.
- `packages/config`: Common constants, entropy regex patterns, environment parsing.
- `packages/git-engine`: Safe Git CLI spawning and secret filtering.
- `packages/sync-engine`: LeetCode solution formatting and GitHub Octokit integrations.

---

## 2. Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy environment template:
   ```bash
   cp .env.example .env
   ```
4. Build all packages:
   ```bash
   pnpm build
   ```
5. Launch development services:
   ```bash
   pnpm dev
   ```

---

## 3. Core Development Principles

When contributing to StreakForge, you must strictly uphold the following principles:

1. **Zero-Fabrication Principle**: Never write code that generates artificial Git commits, fake LeetCode submissions, backdated timestamps, or synthetic activity metrics.
2. **Strict Problem Deduplication**: In LeetCode analytics, solving the same question multiple times must never inflate the `uniqueProblemsSolved` count.
3. **Zero Duration Inference**: Never calculate or guess active coding duration from the difference between commit timestamps. Duration may only be presented when actively measured by the companion agent.
4. **Isolated Personal Notes**: User reflections and notes must never mutate or compromise the verified external activity records.
5. **No Shell Injections**: Never use `exec` or pass unsanitized shell strings to git. Use `spawn('git', args, { shell: false })` with argument arrays.

---

## 4. Quality & Pre-PR Checklist

Before opening a pull request, you **must** verify that all three quality gates pass locally:

```bash
# 1. Typecheck across all workspace packages
pnpm typecheck

# 2. Run all unit, integration, and security test suites
pnpm test

# 3. Compile production builds
pnpm build
```

---

## 5. Commit Convention

StreakForge follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope)`: New user-facing feature or domain capability.
- `fix(scope)`: Bug fix or defect resolution.
- `refactor(scope)`: Code refactoring without behavioral alterations.
- `test(scope)`: Adding or modifying test suites.
- `docs(scope)`: Documentation updates or additions.
- `chore(scope)`: Dependency updates or build tooling changes.

Examples:
- `feat(analytics): add RFC 4180 compliant CSV export engine`
- `fix(agent): enforce system root directory checks in path validator`
- `test(security): add multi-user IDOR isolation unit tests`

---

## 6. Security Vulnerability Reporting

If you discover a security vulnerability or privilege escalation vector, please **do not** open a public issue. Follow our responsible disclosure guidelines outlined in [SECURITY.md](SECURITY.md).

