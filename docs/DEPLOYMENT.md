# StreakForge Deployment & Infrastructure Guide

## 1. Environment Configurations

StreakForge requires the following configuration environment variables. A template is provided in `.env.example`.

### Core Backend (`apps/api`)
```bash
# Server Port & Mode
PORT=4000
NODE_ENV=production

# Database
MONGODB_URI=mongodb://localhost:27017/streakforge

# Authentication & Encryption
JWT_SECRET=super_secret_jwt_signing_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef # 64-char hex (32 bytes)

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/v1/auth/github/callback

# Allowed Origins (CORS)
CORS_ORIGIN=http://localhost:3000,chrome-extension://*
WEB_APP_URL=http://localhost:3000
```

### Web Frontend (`apps/web`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Docker Deployment

StreakForge includes Docker configurations for rapid deployment.

### 2.1 Starting with Docker Compose
```bash
# Start MongoDB, Backend API, and Web Frontend
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### 2.2 Docker Compose Configuration
The `infrastructure/docker/docker-compose.yml` file provisions:
- **`mongo`**: Official MongoDB 7 image with persistent volume storage.
- **`api`**: Production-built container running the Express API service.
- **`web`**: Production-built container running the Next.js frontend.

---

## 3. GitHub Actions CI/CD Pipeline

The `.github/workflows/ci.yml` pipeline runs on every push and pull request:
1. **Lint & Type Check**: Validates formatting and TypeScript type definitions across all monorepo packages.
2. **Unit & Integration Tests**: Runs `pnpm test` (Vitest) across all 66 tests with in-memory execution.
3. **Build Verification**: Builds Next.js web application, Express API, Chrome extension, and Desktop agent to ensure zero compilation regressions.

---

## 4. Local Desktop Companion Agent Setup

The desktop agent connects your local git repositories to StreakForge:

### 4.1 Windows 1-Click Installation
```powershell
# Run the installation script in PowerShell
.\scripts\install-agent.ps1 -ApiKey "your_agent_api_key" -ServerUrl "http://localhost:4000/api/v1"
```
This script:
1. Verifies Node.js (>=20) and Git CLI (>=2.40).
2. Generates the agent configuration in `$env:LOCALAPPDATA\StreakForge\agent-config.json`.
3. Registers StreakForge in the Windows CurrentUser Run registry for automatic background launch on login.
4. Starts the background companion daemon.

### 4.2 Agent Process Management
```powershell
# Check agent status
.\scripts\agent-control.ps1 status

# Stop background agent
.\scripts\agent-control.ps1 stop

# Start agent
.\scripts\agent-control.ps1 start

# View recent agent logs
Get-Content "$env:LOCALAPPDATA\StreakForge\agent.log" -Tail 50 -Wait
```

---

## 5. Chrome Extension Loading (Manifest V3)

1. Build the extension bundle:
   ```bash
   pnpm --filter @streakforge/extension build
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the upper-right corner.
4. Click **Load unpacked**.
5. Select the `apps/extension/dist` folder.
6. Click the StreakForge icon in the extensions toolbar to open the popup, and click the gear icon to customize solution file structure templates.

---

## 6. Production Security Checklist

- [ ] **Reverse Proxy**: Place API and Web behind Nginx, Caddy, or Cloudflare with TLS 1.3 terminating HTTPS.
- [ ] **Encryption Key**: Set a secure 64-character hexadecimal `ENCRYPTION_MASTER_KEY` generated via `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
- [ ] **JWT Secret**: Use a cryptographically secure `JWT_SECRET` with minimum 32 characters.
- [ ] **GitHub OAuth Scopes**: Request only minimal needed scopes (`repo`, `read:user`, `user:email`).
- [ ] **Rate Limiting**: Verify rate limiters in production (standard IP rate limiting is enabled by default in `apps/api`).

