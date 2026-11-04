import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): Express {
  const app = express();

  // Security Middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  const allowedOrigins = ENV.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, extension background scripts)
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some((allowed) => {
          if (allowed.includes('*')) {
            const prefix = allowed.replace('*', '');
            return origin.startsWith(prefix);
          }
          return origin === allowed;
        });
        if (isAllowed) return callback(null, true);

        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('CORS origin access denied by security policy'), false);
        }
        callback(null, true); // Permissive in development
      },
      credentials: true
    })
  );

  // Rate Limiting (General API tier)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
      }
    }
  });
  app.use('/api/', limiter);

  // Strict Authentication Rate Limiting (Mitigate brute-force & credential stuffing)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.'
      }
    }
  });
  app.use('/api/v1/auth/', authLimiter);

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

  // Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'streakforge-api',
      version: '1.0.0'
    });
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

