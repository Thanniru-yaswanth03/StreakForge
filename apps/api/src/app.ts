import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { ENV } from './config/env.js';
import { authRouter } from './routes/authRoutes.js';
import { repoRouter } from './routes/repoRoutes.js';
import { githubRouter } from './routes/githubRoutes.js';
import { syncRouter } from './routes/syncRoutes.js';
import { agentRouter } from './routes/agentRoutes.js';
import { analyticsRouter } from './routes/analyticsRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { automationRoutes } from './routes/automationRoutes.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import { badgeRouter } from './routes/badgeRoutes.js';
import { studyRouter } from './routes/studyRoutes.js';
import { catalogRouter } from './routes/catalogRoutes.js';
import { streakForge3Router } from './routes/streakForge3Routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Trust Render / Vercel / Cloudflare reverse proxy headers so rate limiters key by real client IP
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  const allowedOrigins = Array.from(
    new Set([
      ...ENV.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
      ENV.WEB_APP_URL.trim().replace(/\/+$/, '')
    ])
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, extension background scripts)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some((allowed) => {
          if (allowed === '*' || origin === allowed) return true;
          if (allowed.includes('*')) {
            const regexStr = '^' + allowed.split('*').map(s => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('.*') + '$';
            return new RegExp(regexStr).test(origin);
          }
          return false;
        });

        if (isAllowed) return callback(null, true);

        if (process.env.NODE_ENV === 'production') {
          return callback(null, false);
        }
        callback(null, true); // Permissive in development
      },
      credentials: true
    })
  );

  // Rate Limiting (General API tier, keyed per real client IP via trust proxy)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
      }
    }
  });
  app.use('/api/', limiter);

  // Strict Authentication Rate Limiting for credential-bearing POST attempts
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.'
      }
    }
  });
  app.use('/api/v1/auth/github/pat', authLimiter);
  app.use('/api/v1/auth/leetcode', authLimiter);

  // Body Parsing (with raw body buffer preservation for webhook signature checks)
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root Service Check
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      service: 'streakforge-api',
      version: '3.0.0',
      status: 'healthy',
      healthCheck: '/health',
      docs: '/api/v1'
    });
  });

  // Comprehensive Liveness & Readiness Health Check
  app.get('/health', (_req: Request, res: Response) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const memUsage = process.memoryUsage();

    const isHealthy = isDbConnected || process.env.NODE_ENV === 'test';

    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'streakforge-api',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: isDbConnected ? 'connected' : 'disconnected',
        readyState: mongoose.connection.readyState
      },
      memory: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024)
      }
    };

    res.status(isHealthy ? 200 : 503).json(healthData);
  });

  // Mount API routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/repos', repoRouter);
  app.use('/api/v1/github', githubRouter);
  app.use('/api/v1/sync', syncRouter);
  app.use('/api/v1/agent', agentRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/automations', automationRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/badge', badgeRouter);
  app.use('/api/v1/study', studyRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1', streakForge3Router);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested API route does not exist'
      }
    });
  });

  // Error Handler
  app.use(errorHandler);

  return app;
}

