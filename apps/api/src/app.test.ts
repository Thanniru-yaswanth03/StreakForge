import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';

describe('Express API Server Endpoints', () => {
  const app = createApp();

  it('GET /health returns 200 OK and status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('streakforge-api');
  });

  it('GET /api/v1/auth/me returns 401 when token is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/agent/heartbeat returns 401 when agent key is missing', async () => {
    const res = await request(app).post('/api/v1/agent/heartbeat').send({
      agentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      status: 'ONLINE',
      watchedPaths: []
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AGENT_KEY_REQUIRED');
  });

  it('returns 404 with standard error JSON for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

