# StreakForge Installation & Setup Manual

This document provides step-by-step instructions for installing and configuring all four core StreakForge subsystems:

1. **Central API Server** (`apps/api`)
2. **Web Dashboard** (`apps/web`)
3. **LeetCode Sync Chrome Extension** (`apps/extension`)
4. **Local Desktop Companion Agent** (`apps/desktop-agent`)

---

## 1. System Prerequisites

Before proceeding, ensure your environment meets the minimum version requirements:

| Tool | Required Version | Verification Command | Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.0.0` (LTS v22 recommended) | `node --version` | Required for API, Web, and Agent |
| **pnpm** | `>= 10.0.0` | `pnpm --version` | Workspace package manager |
| **Git CLI** | `>= 2.40.0` | `git --version` | Must be available in system PATH |
| **MongoDB** | `>= 7.0` | `mongod --version` | Local instance or MongoDB Atlas |

---

## 2. Server & Web Application Installation

### Step 2.1 — Clone the Repository
```bash
git clone https://github.com/StreakForge/streakforge.git
cd streakforge
```

### Step 2.2 — Install Monorepo Dependencies
```bash
pnpm install
```

### Step 2.3 — Configure Environment Variables
Create your local environment configuration:
```bash
cp .env.example .env
```
Open `.env` and fill in:
- `MONGODB_URI`: Local MongoDB URI (`mongodb://localhost:27017/streakforge`) or MongoDB Atlas connection string.
- `JWT_SECRET`: Random string at least 32 characters long.
- `ENCRYPTION_MASTER_KEY`: 64-character hexadecimal key (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
- `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: From your GitHub OAuth App registration.

### Step 2.4 — Compile All Workspace Packages
```bash
pnpm build
```

### Step 2.5 — Start Development Servers
```bash
pnpm dev
```
- Web Application: `http://localhost:3000`
- API Service: `http://localhost:4000`
- API Health Check: `http://localhost:4000/health`

---

## 3. Chrome Extension Installation (Manifest V3)

StreakForge LeetCode Sync connects your browser directly to your target repository.

### Option A: From Source / Unpacked Build
1. Build the extension package:
   ```bash
   pnpm --filter @streakforge/extension build
   ```
2. Open Google Chrome (or any Chromium browser: Brave, Edge, Opera).
3. Navigate to `chrome://extensions/`.
4. Enable the **Developer mode** toggle in the top-right corner.
5. Click **Load unpacked** in the top-left toolbar.
6. Select the folder: `apps/extension/dist`.
7. The StreakForge flame icon will appear in your browser extension toolbar.

### Option B: From Release ZIP
1. Download `streakforge-extension-v1.0.0.zip` from [Releases](https://github.com/StreakForge/streakforge/releases).
2. Extract the ZIP archive into a persistent directory (e.g. `C:\Tools\StreakForgeExtension`).
3. In `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**, and select the extracted folder.

### Extension Initial Configuration
1. Click the StreakForge extension icon in Chrome toolbar.
2. Click the gear icon to open **Options**.
3. Confirm the backend API URL (Default: `http://localhost:4000`).
4. Generate a scoped extension token from the Web Dashboard (**Settings -> API Keys**) and paste it into the authentication field.
5. Click **Save Configuration**.

---

## 4. Local Desktop Companion Agent Installation

The desktop companion agent monitors your local repositories and executes safe Git operations. It runs entirely in user-space and **does not require administrator privileges**.

### Windows Installation (PowerShell)

#### 1-Click Installer
Open PowerShell in the project root and run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-agent.ps1 -ApiKey "YOUR_AGENT_API_KEY" -AgentId "YOUR_AGENT_ID"
```
The installer will:
1. Validate Git CLI and Node.js prerequisites.
2. Compile `@streakforge/desktop-agent` and `@streakforge/git-engine`.
3. Create the user configuration directory at `$env:USERPROFILE\.streakforge`.
4. Create the Windows CLI wrapper (`streakforge-agent.cmd`) in `$env:USERPROFILE\.streakforge\bin`.
5. Add `$env:USERPROFILE\.streakforge\bin` to your User `PATH` environment variable.
6. Optionally register the agent daemon in your user startup registry (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Run`).

#### Testing Windows Installation
Open a **new** PowerShell window and verify the CLI is recognized:
```powershell
streakforge-agent --version
streakforge-agent status
```

#### Windows Uninstallation
To cleanly remove the agent:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-agent.ps1
```

---

### macOS & Linux Installation

#### 1. Compile the Agent
```bash
pnpm --filter @streakforge/desktop-agent build
```

#### 2. Create Global CLI Link
```bash
mkdir -p "$HOME/.streakforge/bin"
cat << 'EOF' > "$HOME/.streakforge/bin/streakforge-agent"
#!/usr/bin/env bash
node "$(dirname "$0")/../../apps/desktop-agent/dist/cli.js" "$@"
EOF
chmod +x "$HOME/.streakforge/bin/streakforge-agent"

# Add to ~/.bashrc or ~/.zshrc
echo 'export PATH="$HOME/.streakforge/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 3. Run in Background (systemd User Service on Linux)
Create `~/.config/systemd/user/streakforge-agent.service`:
```ini
[Unit]
Description=StreakForge Desktop Agent Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /absolute/path/to/streakforge/apps/desktop-agent/dist/cli.js start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=default.target
```
Enable and start the service:
```bash
systemctl --user enable streakforge-agent
systemctl --user start streakforge-agent
systemctl --user status streakforge-agent
```

---

## 5. Docker Deployment (All-In-One Container Stack)

If you prefer deploying the server and frontend via Docker:

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```
This starts:
- MongoDB 7 on port `27017`
- Central API on port `4000`
- Web Dashboard on port `3000`

Inspect container logs:
```bash
docker-compose -f infrastructure/docker/docker-compose.yml logs -f
```
