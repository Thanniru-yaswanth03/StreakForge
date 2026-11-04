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
2. **Unit & Integration Tests**: Runs `pnpm test` (Vitest) with coverage reporting.
3. **Build Verification**: Builds Next.js web application, Express API, Chrome extension, and Desktop agent to ensure zero compilation regressions.

