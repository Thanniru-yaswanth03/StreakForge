# StreakForge Desktop Agent & Git Automation Guide

## 1. Overview & System Architecture

The **StreakForge Desktop Agent** (`@streakforge/desktop-agent`) is a secure, cross-platform local companion daemon that runs on the developer's computer. It monitors approved coding directories, enforces developer hygiene and security policies, detects genuine code modifications, and automates legitimate Git commits and pushes without synthetic activity.

### Architecture Highlights
```
┌───────────────────────────────────────────┐
│        Local Coding Environment           │
│   (Watched Repositories: ~/work, ~/src)   │
└────────────────────┬──────────────────────┘
                     │ FS Events (Chokidar)
┌────────────────────▼──────────────────────┐
│     StreakForge Desktop Agent Daemon      │
│  - 15-Step Synchronization Workflow       │
│  - Deep Secret & Credential Scanner       │
│  - Smart Conventional Commit Generator    │
│  - Loopback IPC Server (127.0.0.1:4545)   │
└────────────┬───────────────────▲──────────┘
             │ Loopback REST     │ Authenticated
             │ (Bearer Auth)     │ HTTPS Heartbeat
┌────────────▼──────────┐ ┌──────┴──────────┐
│ Web Dashboard / UI    │ │ StreakForge API │
│ (http://localhost:3000│ │ Server (:4000)   │
└───────────────────────┘ └─────────────────┘
```

---

## 2. Installation Instructions

### 2.1 Windows Installation (Primary Environment)

#### Method A: Automated PowerShell Installer (Recommended)
Open PowerShell as your current user and run:
```powershell
# From the project root
.\scripts\install-agent.ps1
```
Optional flags:
- `-EnableAutoStart`: Automatically registers the agent in Windows Startup (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
- `-ServerUrl "http://localhost:4000"`: Central StreakForge API endpoint.
- `-AgentKey "<KEY>" -AgentId "<UUID>"`: Immediately pairs the agent.

#### Method B: Double-Click Command Prompt Installer
Double-click `scripts\install-agent.cmd` from Windows File Explorer. It executes the PowerShell installer with `Bypass` policy.

#### Method C: Manual NPM/PNPM Build
```powershell
pnpm --filter @streakforge/git-engine build
pnpm --filter @streakforge/desktop-agent build
# Run directly or link globally
node apps/desktop-agent/dist/cli.js status
```

---

### 2.2 macOS Installation

1. **Prerequisites**: Ensure Git and Node.js (>= 18) are installed (`brew install git node pnpm`).
2. **Build and Link**:
   ```bash
   pnpm --filter @streakforge/git-engine build
   pnpm --filter @streakforge/desktop-agent build
   npm link ./apps/desktop-agent
   ```
3. **Background Operation via Launchd (Optional Auto-Start)**:
   Create `~/Library/LaunchAgents/dev.streakforge.agent.plist`:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>Label</key>
       <string>dev.streakforge.agent</string>
       <key>ProgramArguments</key>
       <array>
           <string>/usr/local/bin/node</string>
           <string>/path/to/streakforge/apps/desktop-agent/dist/cli.js</string>
           <string>run</string>
       </array>
       <key>RunAtLoad</key>
       <true/>
       <key>KeepAlive</key>
       <true/>
       <key>StandardOutPath</key>
       <string>/tmp/streakforge-agent.log</string>
       <key>StandardErrorPath</key>
       <string>/tmp/streakforge-agent.err</string>
   </dict>
   </plist>
   ```
   Load the service:
   ```bash
   launchctl load ~/Library/LaunchAgents/dev.streakforge.agent.plist
   ```

---

### 2.3 Linux Installation (Ubuntu, Debian, Fedora, Arch)

1. **Build and Link**:
   ```bash
   pnpm --filter @streakforge/git-engine build
   pnpm --filter @streakforge/desktop-agent build
   npm link ./apps/desktop-agent
   ```
2. **Background Operation via Systemd User Unit (Auto-Start)**:
   Create `~/.config/systemd/user/streakforge-agent.service`:
   ```ini
   [Unit]
   Description=StreakForge Desktop Agent Daemon
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/bin/node /path/to/streakforge/apps/desktop-agent/dist/cli.js run
   Restart=on-failure
   RestartSec=10
   StandardOutput=journal
   StandardError=journal

   [Install]
   WantedBy=default.target
   ```
   Enable and start the service:
   ```bash
   systemctl --user daemon-reload
   systemctl --user enable --now streakforge-agent
   ```

---

## 3. CLI Command Reference

| Command | Description |
|---|---|
| `streakforge-agent pair --server <url> --key <key> --agent-id <id>` | Pairs local agent with StreakForge account |
| `streakforge-agent start` | Starts background daemon process (writes PID) |
| `streakforge-agent stop` | Stops background daemon process cleanly |
| `streakforge-agent status` | Displays daemon health, PID, loopback port, and repos |
| `streakforge-agent run` (or `daemon`) | Runs daemon in foreground (service mode) |
| `streakforge-agent watch add <path> [--idle <mins>] [--auto-push] [--mode <mode>]` | Registers a repository to watch |
| `streakforge-agent watch list` | Lists watched repositories with live Git status |
| `streakforge-agent watch remove <path>` | Unwatches a local repository |
| `streakforge-agent sync [path] [-m "message"]` | Immediately triggers safe synchronization |
| `streakforge-agent backup <path>` | Creates an explicit backup snapshot commit |
| `streakforge-agent autostart <enable\|disable>` | Configures startup on system boot |

---

## 4. The 15-Step Synchronization Workflow

Every synchronization follows this non-destructive 15-step sequence:

1. **Detect Changes**: Filesystem watcher notices created, modified, or deleted files.
2. **Identify Repository**: Confirms path matches an approved repository worktree.
3. **Check Branch**: Obtains active branch. Rejects detached HEAD or disallowed branches.
4. **Check Status**: Runs `git status --porcelain=v1 -uall` to inspect uncommitted changes.
5. **Inspect Files**: Parses index and working tree states for each modified path.
6. **Apply Ignore Rules**: Filters out `.env*`, build folders (`dist/`, `build/`, `.next/`), `node_modules/`, credentials.
7. **Scan for Secrets**: Scans staged diff additions for high-entropy tokens, AWS keys, database connection strings, or private key blocks. If secrets are found, files are unstaged and synchronization is aborted immediately.
8. **Smart Message Suggestion**: Analyzes modified files and diff intent to generate a Conventional Commit message.
9. **Display Proposed Changes**: Prepares structured proposal metadata.
10. **Policy Check**:
    - **Manual Mode**: Awaits user explicit trigger.
    - **Approval Mode**: Adds proposal to queue awaiting user approval via Web Dashboard or CLI.
    - **Automatic Mode**: Checks idle threshold and proceeds automatically.
    - **Backup Mode**: Creates snapshot commit with `[streakforge-backup]` marker.
11. **Stage Eligible Files**: Stages only verified safe files (`git add -- <safePaths>`).
12. **Commit Genuine Changes**: Commits changes (`git commit -m "<message>"`).
13. **Push to Remote**: Pushes to configured upstream without force flags.
14. **Verify Resulting Commit**: Verifies commit SHA via `git rev-parse HEAD`.
15. **Record Operation**: Updates local sync timestamps and sends telemetry heartbeat to the API.

---

## 5. Synchronization Modes

### 5.1 Manual Mode
The agent watches for changes but never commits automatically. The user manually triggers synchronization via the dashboard or CLI.

### 5.2 Approval Mode
The agent detects settled changes and drafts a **Sync Proposal**. The proposal appears in the Web Dashboard and Agent CLI for approval, modification, or rejection.

### 5.3 Automatic Mode
The agent automatically commits and pushes genuine work once edits have settled for the configured idle window (default: 15 minutes).
Guarantees:
- Never commits when working tree is clean.
- Strictly excludes sensitive files and secrets.
- Enforces branch restrictions.
- Prevents duplicate commits.

### 5.4 Backup Mode
Creates periodic project snapshots tagged with `[streakforge-backup]`. These commits are recorded for data preservation and are explicitly excluded from coding contribution streaks.

---

## 6. Security & Sandboxing Boundaries

1. **Strict Loopback Binding**: Local IPC listens exclusively on `127.0.0.1` (never `0.0.0.0`).
2. **Local Bearer Authentication**: Every IPC request must supply `Authorization: Bearer <loopbackToken>`.
3. **CORS Validation**: Restricts browser requests to `http://localhost:3000`.
4. **No Arbitrary Shell Execution**: The agent never accepts shell commands or script strings from the web.
5. **Approved Paths Only**: Operations are strictly restricted to paths pre-registered in `config.watchedRepositories`.

---

## 7. Conflict Handling & Non-Destructive Recovery

- **Remote Divergence**: If the remote branch has new commits, the agent will **never** force-push (`--force` or `--force-with-lease`). It flags a conflict and instructs the user to pull or rebase:
  ```bash
  git pull --rebase origin <branch>
  ```
- **Detached HEAD**: Commits are refused until the user switches to a branch (`git checkout -b <branch>`).
- **Missing Remote**: If no remote is configured, the agent completes the local commit and skips the push safely.
- **Large Files**: Files exceeding 50MB are blocked from auto-commit to prevent repository bloat and GitHub push rejections.
