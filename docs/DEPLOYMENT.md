# StreakForge Production Deployment & Infrastructure Guide

This guide covers production deployment architectures, environment configuration, database scaling, OAuth domain coordination, health checks, and a realistic evaluation of free-tier cloud hosting vs. dedicated production infrastructure.

---

## 1. Production Architecture Overview

A production StreakForge deployment consists of:

```
                      ┌────────────────────────────────────────┐
                      │              Google Chrome             │
                      │  ┌──────────────────────────────────┐  │
                      │  │ StreakForge LeetCode Sync (MV3)  │  │
                      │  └─────────────────┬────────────────┘  │
                      └────────────────────┼───────────────────┘
                                           │ Authenticated API Requests
                                           │
[ End User Browser ] ──HTTPS──> ┌──────────▼───────────────┐
                                │ Cloudflare / SSL Proxy   │
                                └─────┬─────────────────┬──┘
                                      │                 │
              Frontend Requests (/)   │                 │ API Requests (/api/v1)
                                      ▼                 ▼
                          ┌─────────────────┐   ┌──────────────────────┐
                          │   Next.js Web   │   │  Express API Server  │
                          │ (Vercel/Docker) │   │ (Render/Railway/VM)  │
                          └─────────────────┘   └──────────┬───────────┘
                                                           │
                                   ┌───────────────────────┼──────────────────────┐
                                   ▼                       ▼                      ▼
                          ┌────────────────┐      ┌─────────────────┐    ┌─────────────────┐
                          │ MongoDB Atlas  │      │ Local Companion │    │ GitHub REST API │
                          │ (M0 Free / M10)│      │  Agent (Daemon) │    │  (Octokit v21)  │
                          └────────────────┘      └─────────────────┘    └─────────────────┘
```

---

## 2. Environment Configuration

Production deployments must use verified secrets. Do not commit `.env` or production credentials to Git. Use `.env.production.example` as a template.

### 2.1 Backend Environment Variables (`apps/api`)

| Variable | Description | Example / Required Format |
| :--- | :--- | :--- |
| `PORT` | Listening port | `4000` |
| `NODE_ENV` | Environment identifier | `production` |
| `MONGODB_URI` | MongoDB connection string with TLS/SRV | `mongodb+srv://streakforge_prod:***@cluster0.abcde.mongodb.net/streakforge?retryWrites=true&w=majority` |
| `JWT_SECRET` | Session signing secret (`>= 32` chars) | `64-character random string` |
| `JWT_EXPIRES_IN` | Session cookie validity | `7d` |
| `ENCRYPTION_MASTER_KEY` | AES-256-GCM token encryption key | `64-character hex string (32 bytes)` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | From GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | From GitHub Developer Settings |
| `GITHUB_CALLBACK_URL` | Server OAuth Callback URL | `https://api.yourdomain.com/api/v1/auth/github/callback` |
| `CORS_ORIGIN` | Allowed cross-origin domains | `https://yourdomain.com,chrome-extension://*` |
| `WEB_APP_URL` | Frontend URL for redirects | `https://yourdomain.com` |

#### Key Generation
Generate cryptographic keys securely using Node.js:
```bash
# 64-char Hexadecimal AES-256-GCM Master Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# High-entropy JWT Secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 2.2 Frontend Environment Variables (`apps/web`)

| Variable | Description | Example / Required Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Public API endpoint base path | `https://api.yourdomain.com/api/v1` |
| `NEXT_PUBLIC_APP_URL` | Public frontend URL | `https://yourdomain.com` |

---

## 3. GitHub OAuth Production Setup

When deploying to production domains (e.g., `yourdomain.com` and `api.yourdomain.com`), configure GitHub OAuth settings accordingly:

1. Navigate to **GitHub -> Settings -> Developer Settings -> OAuth Apps**.
2. Select your registered Application or click **New OAuth App**:
   - **Application name**: `StreakForge Production`
   - **Homepage URL**: `https://yourdomain.com`
   - **Authorization callback URL**: `https://api.yourdomain.com/api/v1/auth/github/callback`
3. Generate a new **Client Secret** and add it to your server environment variables.
4. Verify Cookie Security:
   - In production (`NODE_ENV=production`), session cookies are automatically marked `Secure: true`, `HttpOnly: true`, and `SameSite: 'lax'` (or `'none'` if API and Web reside on distinct top-level domains).

---

## 4. Free-Tier Cloud Deployment Guide

StreakForge can be deployed using free-tier cloud hosting during beta phases. However, free-tier platforms impose architectural constraints that must be accounted for.

### 4.1 Recommended Free-Tier Architecture

| Component | Platform | Plan | Specs |
| :--- | :--- | :--- | :--- |
| **Database** | MongoDB Atlas | M0 Sandbox | 512 MB Storage, Shared RAM, TLS 1.3 |
| **Web Frontend** | Vercel or Cloudflare Pages | Hobby / Free | Edge Network, Unlimited Static Deployments |
| **API Backend** | Render or Railway | Free Web Service | 512 MB RAM, 0.1 vCPU |

### 4.2 Realistic Free-Tier Constraints & Mitigations

> [!WARNING]
> Free-tier hosting is designed for prototyping and low-volume beta testing. It is **not** suitable for high-frequency background cron jobs without external pings.

#### 1. Cold Starts & Inactivity Spindown
- **Constraint**: On Render Free Tier, backend instances automatically spin down (sleep) after **15 minutes of inactivity**. The first incoming HTTP request takes **30–50 seconds** to wake the container.
- **Impact**: The LeetCode Chrome extension or web dashboard may experience timeouts on the first request of the day.
- **Mitigation**: Configure an external uptime ping (e.g., [Cron-Job.org](https://cron-job.org) or [UptimeKuma](https://github.com/louislam/uptime-kuma)) to call `GET https://api.yourdomain.com/health` every 10 minutes to prevent container spindown.

#### 2. Background Automation & Scheduled Jobs
- **Constraint**: StreakForge's in-memory scheduler (`JobScheduler`) only fires while the Node.js process is active. When the free container sleeps, scheduled background tasks (e.g. 2:00 AM activity sync) **will not execute** until someone wakes the server.
- **Mitigation**:
  - Use an external cron service to trigger an authenticated webhook endpoint (`POST /api/v1/jobs/scheduler-tick`), OR
  - Upgrade to an always-on basic instance ($5-$7/month on Render, Railway, or Fly.io).

#### 3. Memory Ceiling (512 MB)
- **Constraint**: Node.js v20+ with heavy Git operations or large AST parsing can exceed 512 MB if multiple concurrent sync jobs occur.
- **Mitigation**:
  - The API service includes memory telemetry in `GET /health` (`heapUsedMb`, `rssMb`).
  - Heavy Git operations are performed client-side on the user's machine by the Local Companion Agent, keeping the central API memory footprint low (~80-120 MB RSS).

### 4.3 Realistic Hosting Cost Breakdown

| Deployment Tier | Monthly Cost | Infrastructure Composition | Workload Suitability |
| :--- | :--- | :--- | :--- |
| **Hobby / Beta** | **$0.00 / mo** | Vercel (Frontend) + Render Free (API) + Atlas M0 (DB) | Single-user, personal developer testing, occasional cold starts |
| **Always-On Starter** | **$7.00 - $12.00 / mo** | Vercel Free + Render Starter ($7/mo) + Atlas M0 | Reliable 24/7 background scheduler, no cold starts, 100+ users |
| **Production Team** | **$25.00 - $45.00 / mo** | Railway ($10/mo) / Hetzner Cloud ($6/mo) + Atlas M2 ($9/mo) | High concurrency, multi-repo synchronization, 5,000+ users |

---

## 5. Step-by-Step Deployment Instructions

### 5.1 MongoDB Atlas Provisioning

1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Sandbox** cluster in your preferred region (e.g. `us-east-1` or `eu-central-1`).
3. Under **Security -> Database Access**, create a user `streakforge_app` with read and write permissions to database `streakforge`.
4. Under **Security -> Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) or whitelist your cloud provider's egress IPs.
5. Retrieve the connection string: `mongodb+srv://streakforge_app:<password>@cluster0.abcde.mongodb.net/streakforge?retryWrites=true&w=majority`.

### 5.2 API Server Deployment (Render)

1. Create a new **Web Service** on Render connected to your GitHub repository.
2. Configure settings:
   - **Environment**: `Node`
   - **Root Directory**: `apps/api`
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @streakforge/api build`
   - **Start Command**: `node dist/server.js`
   - **Health Check Path**: `/health`
3. Add Environment Variables:
   - `PORT=4000`
   - `NODE_ENV=production`
   - `MONGODB_URI=<your_atlas_connection_string>`
   - `JWT_SECRET=<generated_secret>`
   - `ENCRYPTION_MASTER_KEY=<generated_hex_key>`
   - `GITHUB_CLIENT_ID=<github_client_id>`
   - `GITHUB_CLIENT_SECRET=<github_client_secret>`
   - `GITHUB_CALLBACK_URL=https://<your-render-app>.onrender.com/api/v1/auth/github/callback`
   - `CORS_ORIGIN=https://<your-vercel-app>.vercel.app,chrome-extension://*`
   - `WEB_APP_URL=https://<your-vercel-app>.vercel.app`

### 5.3 Web Frontend Deployment (Vercel)

1. Import your GitHub repository in Vercel.
2. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @streakforge/web build`
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://<your-render-app>.onrender.com/api/v1`
   - `NEXT_PUBLIC_APP_URL=https://<your-vercel-app>.vercel.app`
4. Click **Deploy**.

---

## 6. Self-Hosted Docker Compose Deployment

For on-premises servers or virtual private clouds (DigitalOcean, Hetzner, AWS EC2):

### 6.1 Clone and Configure
```bash
git clone https://github.com/StreakForge/streakforge.git /opt/streakforge
cd /opt/streakforge
cp .env.production.example .env
nano .env # Configure secrets and production domain
```

### 6.2 Docker Compose Configuration (`infrastructure/docker/docker-compose.yml`)
```yaml
version: '3.8'

services:
  mongo:
    image: mongo:7.0
    restart: unless-stopped
    volumes:
      - mongo-data:/data/db
    ports:
      - "127.0.0.1:27017:27017"

  api:
    build:
      context: ../..
      dockerfile: infrastructure/docker/Dockerfile.api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=4000
      - MONGODB_URI=mongodb://mongo:27017/streakforge
    env_file:
      - ../../.env
    depends_on:
      - mongo
    ports:
      - "127.0.0.1:4000:4000"

  web:
    build:
      context: ../..
      dockerfile: infrastructure/docker/Dockerfile.web
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
    env_file:
      - ../../.env
    depends_on:
      - api
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  mongo-data:
```

### 6.3 Reverse Proxy & SSL Configuration (Nginx / Caddy)

#### Caddyfile (Automatic Let's Encrypt TLS)
```caddy
yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}

api.yourdomain.com {
    reverse_proxy 127.0.0.1:4000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-Proto https
    }
}
```

#### Nginx Configuration
```nginx
server {
    server_name api.yourdomain.com;
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 7. Health Checks and Monitoring

The StreakForge API provides an unauthenticated, zero-overhead health check endpoint:

### Endpoint: `GET /health`
Returns runtime diagnostics and database connectivity:

```json
{
  "status": "healthy",
  "timestamp": "2026-11-04T15:20:00.000Z",
  "uptime": 86400.24,
  "service": "streakforge-api",
  "version": "1.0.0-beta.1",
  "database": "connected",
  "memory": {
    "rssMb": 112.45,
    "heapUsedMb": 68.32
  }
}
```

- **HTTP 200**: Service operational (`database: "connected"`).
- **HTTP 503**: Database disconnected or process degraded (`database: "disconnected"`).

### Monitoring Tools Integration
- **Uptime Monitoring**: Point Better Uptime, Uptime Kuma, or Pingdom at `https://api.yourdomain.com/health` with a 60-second polling interval.
- **Sentry Integration**: Add `SENTRY_DSN` to error handling middleware in `apps/api/src/server.ts` for automated exception capture.
- **Log Aggregation**: Application logs are output in JSON format compatible with Datadog, Grafana Loki, and Logtail.
