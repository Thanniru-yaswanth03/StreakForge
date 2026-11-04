import { describe, it, expect } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import {
  generateOAuthState,
  verifyOAuthState,
  revokeSessionToken,
  isTokenRevoked
} from './services/authService.js';
import {
  verifyWebhookSignature,
  handleGitHubWebhook
} from './services/githubService.js';

describe('Phase 2 — GitHub Authentication & Integration', () => {
  const app = createApp();

  describe('OAuth CSRF Nonce & Session Revocation', () => {
    it('generates a tamper-proof signed OAuth state and validates it successfully', () => {
      const state = generateOAuthState();
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(20);
      expect(verifyOAuthState(state)).toBe(true);
    });

    it('rejects tampered or malformed OAuth state nonces', () => {
      expect(verifyOAuthState('malicious_forged_state')).toBe(false);
      expect(verifyOAuthState('')).toBe(false);

      const validState = generateOAuthState();
      const tamperedState = validState.slice(0, -5) + 'xxxxx';
      expect(verifyOAuthState(tamperedState)).toBe(false);
    });

    it('rejects OAuth callback without valid CSRF state', async () => {
      const res = await request(app)
        .get('/api/v1/auth/github/callback')
        .query({ code: 'gh_code_123', state: 'invalid_state' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CSRF_STATE_INVALID');
    });

    it('tracks revoked session tokens and marks them as invalid', () => {
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJ0ZXN0LXRva2VuLXV1aWQiLCJ1c2VySWQiOiIxMjMifQ.signature';
      expect(isTokenRevoked(fakeToken)).toBe(false);

      revokeSessionToken(fakeToken);
      expect(isTokenRevoked(fakeToken)).toBe(true);
    });
  });

  describe('GitHub Webhooks — HMAC-SHA256 & Deduplication', () => {
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: { full_name: 'testuser/leetcode-solutions' },
      sender: { login: 'testuser' },
      commits: [
        {
          id: 'b5e4a3d2c1',
          message: 'feat: add LRU cache solution in Go'
        }
      ]
    });

    it('correctly verifies valid HMAC-SHA256 signatures', () => {
      const validHash = crypto
        .createHmac('sha256', ENV.GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      const validHeader = `sha256=${validHash}`;

      expect(verifyWebhookSignature(payload, validHeader)).toBe(true);
    });

    it('rejects missing or tampered HMAC signatures', () => {
      expect(verifyWebhookSignature(payload, undefined)).toBe(false);
      expect(verifyWebhookSignature(payload, 'sha256=invalidhex0123456789abcdef')).toBe(false);
      expect(verifyWebhookSignature(payload, 'sha1=legacyhash')).toBe(false);
    });

    it('processes valid webhook requests via HTTP endpoint', async () => {
      const deliveryId = `test-deliv-${Date.now()}`;
      const hash = crypto
        .createHmac('sha256', ENV.GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      const res = await request(app)
        .post('/api/v1/github/webhook')
        .set('x-hub-signature-256', `sha256=${hash}`)
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'push')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PROCESSED');
    });

    it('deduplicates identical webhook delivery IDs', async () => {
      const deliveryId = `dup-deliv-${Date.now()}`;
      const hash = crypto
        .createHmac('sha256', ENV.GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      // First delivery
      const res1 = await request(app)
        .post('/api/v1/github/webhook')
        .set('x-hub-signature-256', `sha256=${hash}`)
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'push')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.data.status).toBe('PROCESSED');

      // Second identical delivery (replay)
      const res2 = await request(app)
        .post('/api/v1/github/webhook')
        .set('x-hub-signature-256', `sha256=${hash}`)
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'push')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.status).toBe('DUPLICATE');
    });

    it('returns 401 INVALID_SIGNATURE when webhook signature is forged', async () => {
      const res = await request(app)
        .post('/api/v1/github/webhook')
        .set('x-hub-signature-256', 'sha256=0000000000000000000000000000000000000000000000000000000000000000')
        .set('x-github-delivery', 'bad-sig-1')
        .set('x-github-event', 'push')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('Commit Attribution & Repository Diagnostics Validation', () => {
    it('rejects unauthenticated requests to /api/v1/github/activity', async () => {
      const res = await request(app).get('/api/v1/github/activity');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated requests to /api/v1/github/diagnose-commit', async () => {
      const res = await request(app).post('/api/v1/github/diagnose-commit').send({
        repoFullName: 'octocat/Hello-World',
        commitSha: '7fd1a60b01f91b314f59955a4e4d4e80d8edf11d'
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthenticated requests to /api/v1/github/diagnose-repo', async () => {
      const res = await request(app).post('/api/v1/github/diagnose-repo').send({
        repoFullName: 'octocat/Hello-World'
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});

