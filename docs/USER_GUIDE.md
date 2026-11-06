# StreakForge End-User Guide & Operational Manual

Welcome to **StreakForge**! This guide walks you through using the StreakForge web dashboard and Chrome extension to maintain authentic coding records across GitHub and LeetCode, with an optional desktop agent for advanced local git monitoring.

## Primary Architecture Overview

StreakForge is designed around two primary components:
1. **StreakForge Web Application** (Primary): Full dashboard, GitHub authentication and OAuth/PAT synchronization, repository management, streak calendar, analytics, and automation rules.
2. **StreakForge Chrome Extension** (Primary): Automatic LeetCode problem detection, accepted solution extraction from Monaco editor, direct GitHub exports, and compact quick stats.
3. **StreakForge Desktop Agent** (Optional Advanced): Optional background CLI daemon for watching local workstation Git folders on disk, pre-commit secret scanning, and offline commit queues.

> **Zero-Fabrication Guarantee**: Every commit, problem submission, and streak event represents authentic, verified developer activity. Fake commits and unearned streaks are strictly prohibited by system architecture.

---

## 1. Getting Started: Authentication

1. Open your browser and navigate to the StreakForge Dashboard (`http://localhost:3000` or your production domain).
2. Click **Connect with GitHub**.
3. You will be redirected to GitHub to authorize the StreakForge application.
   - StreakForge requests minimum necessary scopes: `repo`, `read:user`, `user:email`.
4. After authorization, GitHub returns you to the dashboard with an encrypted session token.
5. In **Settings**, configure your primary **IANA Timezone** (e.g. `America/New_York`, `Europe/London`, `Asia/Tokyo`).
   - StreakForge calculates streaks against your localized midnight, ensuring late evening coding sessions are correctly attributed.

---

## 2. Connecting & Managing Repositories

Navigate to the **Repository Manager** tab:

1. Click **Discover Repositories** to view all public and private GitHub repositories belonging to your account.
2. Select a repository you wish to use as your **LeetCode Solutions Archive** and click **Connect**.
3. In the repository settings dialog:
   - Toggle **Designate as LeetCode Target**: Enabled.
   - **Target Branch**: `main` (or preferred default branch).
   - **Solution Directory Template**: `solutions/{difficulty}/{id}-{slug}` (customizable).
   - **Auto-Commit**: Enabled.
4. Click **Save Configuration**. Only one connected repository can be designated as the active LeetCode target at a time.

---

## 3. Synchronizing LeetCode Solutions

StreakForge LeetCode Sync operates entirely via genuine event observation:

### 3.1 Pairing the Chrome Extension
1. Open the extension popup by clicking the StreakForge icon in your browser toolbar.
2. Open **Options**.
3. Enter your backend URL (`http://localhost:4000` or production domain) and your pairing token.
4. Click **Save Configuration**.

### 3.2 Solving Problems on LeetCode
1. Visit any problem on LeetCode (`https://leetcode.com/problems/<slug>/`).
2. The extension content script automatically identifies the problem title, difficulty, and tags.
3. Solve the problem and click **Submit**.
4. The extension observes the judge verdict:
   - If verdict is `Accepted`: The extension captures the runtime, runtime percentile, memory consumption, memory percentile, language, and your exact submitted source code.
   - If verdict is `Wrong Answer` or `Time Limit Exceeded`: The submission is ignored, preserving zero-fabrication integrity.
5. The extension dispatches the solution to your central API:
   - The API formats the solution with a Markdown header documenting complexity, performance benchmarks, and a direct link to the problem.
   - The API commits and pushes the file directly to your target GitHub repository.
   - An immutable event is logged in your activity ledger.

---

## 4. Optional Advanced Feature: Local Desktop Companion Agent

> **Optional Power-User Tool**: You do **not** need to install or run the desktop agent for standard StreakForge functionality. The Web Dashboard and Chrome Extension provide 100% of the tools needed to synchronize LeetCode solutions to GitHub and calculate verified streaks. The desktop agent is only needed if you want automatic local Git repository workspace monitoring on your workstation.

The desktop agent monitors your computer's local development workspaces and executes genuine Git operations according to configured policies.

### 4.1 Registering Folders to Monitor
In PowerShell or terminal:
```bash
streakforge-agent watch "C:\Projects\my-project" --mode AUTOMATIC --idle 15
```
Or register it from the Web Dashboard (**Overview -> Local Companion Agent -> Add Monitored Directory**).

### 4.2 Synchronization Modes
StreakForge supports 4 sync modes:
1. **AUTOMATIC**: Automatically stages, commits, and pushes genuine modifications after a configured period of inactivity (default: 15 minutes).
2. **APPROVAL**: Detects modifications and creates a **Sync Proposal** on the dashboard. Changes are only committed when you click **Approve Proposal**.
3. **MANUAL**: Watches files for activity logging but only commits when you explicitly trigger `streakforge-agent sync-now`.
4. **BACKUP**: Creates dated backup snapshot branches (e.g. `backup/2026-11-04-1230`) every 6 hours without mutating your active working branch.

### 4.3 Pre-Commit Secret Scanner
Every commit evaluated by the agent passes through a mandatory high-entropy secret scanner:
- Files matching `.env*`, `*.key`, `id_rsa`, `credentials.json` are rejected.
- Diffs containing AWS access keys, GitHub PATs, or Slack webhooks are blocked.
- Clean working trees and detached HEAD branches are refused.

---

## 5. Automation Center

Navigate to **Automation Center** on the dashboard to configure and monitor background tasks:

### Supported Automations
- **Automatic LeetCode Export**: Pushes accepted submissions to GitHub.
- **GitHub Sync Changes**: Pulls remote repository events into your local snapshot.
- **Local Workspace Backup**: Creates periodic snapshot branches of uncommitted work.
- **Repository Health Check**: Audits README presence, license, branch protection, and secret exposure.
- **Daily Reminders**: Sends proactive in-app notifications if no coding activity is detected 3 hours before midnight.

### Inspecting Queue Jobs
Click the **Queue Inspector** sub-tab to view real-time job execution states (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `RETRYING`). You can manually cancel active jobs or retry failed jobs with exponential backoff.

---

## 6. Contribution Calendar & Streaks

Navigate to **Streak Calendar**:
- Displays a complete **365-day Contribution Heatmap**.
- Hover over any square to see verified GitHub commits, LeetCode unique problems solved, local sessions, and maintenance events.
- **Category Separation**: Categories are tracked independently and never merged into false contribution numbers.
- **Consistency Score**: Calculates your weekly activity score (0–100) based on active days frequency, category diversity, and volume consistency.

---

## 7. Analytics & Developer Progress

Navigate to **Analytics**:
- **GitHub Analytics**: Commits over time, repository shares, language distribution, and pull request growth.
- **LeetCode Analytics**: Acceptance rate, Easy/Medium/Hard distribution, average attempts per solved problem.
  - *Strict Deduplication Guarantee*: Multiple submissions for the same problem slug are strictly deduplicated into 1 unique problem solved.
- **Coding Duration**: Displays active coding duration tracked by your desktop daemon. Zero duration is guessed from Git commit timestamps.
- **Executive Reports**: Generate daily, weekly, monthly, quarterly, or annual summaries.
- **Exporting Reports**: Click **Export CSV** to download an RFC 4180 compliant spreadsheet or **Export JSON** for structured analysis.

---

## 8. Activity Journal

Navigate to **Activity Journal**:
- Aggregates each day's concrete work: verified commits authored, unique problems solved, and modified repositories.
- **Engineering Notes**: Document architectural decisions, algorithm trade-offs, or blockers in the dedicated notes editor.
- **Immutability Separation**: Personal reflections are stored in an isolated collection. Editing or updating notes will never alter or compromise external Git audit logs.
- Press `Ctrl + Enter` (or `Cmd + Enter`) to quickly save notes.

---

## 9. Account Disconnection & Data Purging

If you wish to stop using StreakForge:
1. Navigate to **Settings -> Danger Zone**.
2. Click **Disconnect GitHub Account**.
3. StreakForge will:
   - Permanently purge all stored encrypted GitHub OAuth tokens from the database.
   - Disconnect repository mappings.
   - Invalidate all active JWT sessions.
   - Log an audit event.

