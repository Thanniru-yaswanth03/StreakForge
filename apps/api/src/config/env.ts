import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from root or local
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/streakforge',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_at_least_32_chars_long_streakforge',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_MASTER_KEY:
    process.env.ENCRYPTION_MASTER_KEY ||
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || 'dummy_client_id',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || 'dummy_client_secret',
  GITHUB_CALLBACK_URL:
    process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/github/callback',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || 'sf_webhook_secret_development_at_least_20_chars',
  WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000,chrome-extension://*'
};

