# StreakForge Desktop Agent Guide

## 1. Overview & Responsibilities

The StreakForge Desktop Agent (`apps/desktop-agent`) is a lightweight local Node.js daemon that monitors genuine coding work in local Git repositories and ensures authentic activity is committed and tracked.

It operates entirely with local Git CLI processes, respecting existing `.gitignore` and security rules.

---

## 2. Agent Capabilities & Safety Guarantees

1. **Zero Synthetic Activity**:
   - The agent strictly checks `git status --porcelain`. If no files have actually been modified, no commit is generated.
   - Timestamps reflect genuine local wall-clock time; no backdating is performed.
2. **Secret Leak Prevention**:
   - Hardcoded exclusions for sensitive files (`.env*`, `*.pem`, `*.key`, `id_rsa`, `credentials.json`, `node_modules`).
   - If any file matching forbidden patterns is modified, it is excluded from staging, and a warning is logged.
3. **Configurable Commit Rules**:
   - **Idle Auto-Commit**: Waits for $N$ minutes (e.g. 15 minutes) of inactivity following active edits before committing changes.
   - **Daily Wrap-Up**: Configured schedule (e.g., 23:00 local time) that verifies if uncommitted work exists and prompts or auto-commits.
   - **Auto-Push Control**: Optional flag permitting the agent to run `git push origin <branch>` only if tracking remote is configured and clean.

---

## 3. CLI Commands Reference

The agent provides a clean command-line interface:

```bash
# Pair agent with your StreakForge account
streakforge-agent pair --server http://localhost:4000 --key <USER_AGENT_KEY>

# Add a repository to the watch list
streakforge-agent watch add /path/to/my-repo

# Remove a repository from watch list
streakforge-agent watch remove /path/to/my-repo

# List currently watched repositories and statuses
streakforge-agent watch list

# Start the background monitoring daemon
streakforge-agent daemon start

# Check status of local agent daemon
streakforge-agent status

# Manually trigger a safe commit of pending changes
streakforge-agent commit --all --message "feat(core): implement genuine git changes"
```

---

## 4. Configuration Schema (`~/.streakforge/config.json`)

```json
{
  "agentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "apiKey": "sf_agent_live_xxxxxxxxxxxxxxxxxxxxxxxx",
  "serverUrl": "http://localhost:4000",
  "watchedRepositories": [
    {
      "path": "C:\\Users\\dev\\projects\\streakforge",
      "branch": "main",
      "idleMinutes": 15,
      "autoPush": true,
      "ignorePatterns": ["*.tmp", "dist/*"]
    }
  ],
  "logLevel": "info"
}
```

