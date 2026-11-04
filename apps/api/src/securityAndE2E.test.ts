import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from './app.js';
import {
  generateOAuthState,
  verifyOAuthState,
  generateAuthToken,
  revokeSessionToken,
  isTokenRevoked
} from './services/authService.js';
import { encryptToken, decryptToken, generateAgentApiKey, hashApiKey } from './utils/crypto.js';
import { isSafeRepositoryPath } from '@streakforge/validation';
import { StreakEngine } from './services/streakEngine.js';

const { mockUsers, mockRepos } = vi.hoisted(() => {
  return {
    mockUsers: {
      '650000000000000000000001': {
        _id: '650000000000000000000001',
        username: 'alice_dev',
        email: 'alice@example.com',
        isActive: true,
        timezone: 'America/New_York'
      },
      '650000000000000000000002': {
        _id: '650000000000000000000002',
        username: 'bob_dev',
        email: 'bob@example.com',
        isActive: true,
        timezone: 'Europe/London'
      }
    } as Record<string, any>,
    mockRepos: [
      {
        _id: '6500000000000000000000aa',
        userId: '650000000000000000000001',
        repoFullName: 'alice/algorithms',
        category: 'LeetCode',
        defaultBranch: 'main'
      },
      {
        _id: '6500000000000000000000bb',
        userId: '650000000000000000000002',
        repoFullName: 'bob/secret-repo',
        category: 'Backend',
        defaultBranch: 'main'
      }
    ]
  };
});

// Mock MongoDB models for isolated unit-level API testing
vi.mock('./models/User.js', () => ({
  User: {
    findById: vi.fn((id: any) => Promise.resolve(mockUsers[id?.toString()] || null)),
    findOne: vi.fn()
  }
}));

vi.mock('./models/RepositoryConnection.js', () => ({
  RepositoryConnection: {
    find: vi.fn(({ userId }: any) => ({
      sort: () => Promise.resolve(mockRepos.filter((r) => r.userId.toString() === userId.toString()))
    })),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(({ _id, userId }: any) => {
      const found = mockRepos.find(
        (r) => r._id.toString() === _id?.toString() && r.userId.toString() === userId?.toString()
      );
      return Promise.resolve(found || null);
    }),
    findOneAndDelete: vi.fn(({ _id, userId }: any) => {
      const found = mockRepos.find(
        (r) => r._id.toString() === _id?.toString() && r.userId.toString() === userId?.toString()
      );
      return Promise.resolve(found || null);
    }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 })
  }
}));

vi.mock('./models/Notification.js', () => ({
  Notification: {
    find: vi.fn().mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) })
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    findOneAndUpdate: vi.fn(({ _id, userId }: any) => {
      // IDOR check: only resolves if belonging to user 1
      if (_id.toString() === '650000000000000000000011' && userId.toString() === '650000000000000000000001') {
        return Promise.resolve({ _id, isRead: true });
      }
      return Promise.resolve(null);
    }),
    deleteOne: vi.fn(({ _id, userId }: any) => {
      if (_id.toString() === '650000000000000000000011' && userId.toString() === '650000000000000000000001') {
        return Promise.resolve({ deletedCount: 1 });
      }
      return Promise.resolve({ deletedCount: 0 });
    })
  }
}));

describe('PHASE 8 — Security Audit & Quality Assurance Test Suite', () => {
  const app = createApp();

  const aliceUser = {
    _id: '650000000000000000000001' as any,
    githubId: '1001',
    username: 'alice_dev'
  } as any;

  const bobUser = {
    _id: '650000000000000000000002' as any,
    githubId: '1002',
    username: 'bob_dev'
  } as any;

  const aliceToken = generateAuthToken(aliceUser);
  const bobToken = generateAuthToken(bobUser);

  // --------------------------------------------------------------------------
  // 1. Authentication & Session Security
  // --------------------------------------------------------------------------
  describe('1. Authentication & Session Security', () => {
    it('rejects API requests missing an Authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/repos');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed Bearer tokens with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/repos')
        .set('Authorization', 'Bearer not-a-valid-jwt-token');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('rejects forged tokens signed with an unauthorized key', async () => {
      const forgedToken = jwt.sign(
        { userId: aliceUser._id.toString(), username: 'alice_dev' },
        'attacker_private_secret_key_12345678'
      );
      const res = await request(app)
        .get('/api/v1/repos')
        .set('Authorization', `Bearer ${forgedToken}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('immediately invalidates token on logout and denies subsequent access with 401 TOKEN_REVOKED', async () => {
      const disposableToken = generateAuthToken(aliceUser);

      // Verify token initially works
      expect(isTokenRevoked(disposableToken)).toBe(false);

      // Perform logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${disposableToken}`);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Confirm token is now in revoked list
      expect(isTokenRevoked(disposableToken)).toBe(true);

      // Subsequent attempt with revoked token must fail with 401 TOKEN_REVOKED
      const subsequentRes = await request(app)
        .get('/api/v1/repos')
        .set('Authorization', `Bearer ${disposableToken}`);
      expect(subsequentRes.status).toBe(401);
      expect(subsequentRes.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('OAuth state parameter enforces tamper-proof CSRF protection', () => {
      const validState = generateOAuthState();
      expect(verifyOAuthState(validState)).toBe(true);

      // Tampered state token
      const tamperedState = validState.slice(0, -5) + 'xxxxx';
      expect(verifyOAuthState(tamperedState)).toBe(false);

      // Arbitrary string
      expect(verifyOAuthState('csrf_injection_probe')).toBe(false);
    });

    it('GitHub OAuth callback rejects missing or invalid state with 403 CSRF_STATE_INVALID', async () => {
      const res = await request(app)
        .get('/api/v1/auth/github/callback?code=mock_gh_code_123&state=fake_state_123');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_STATE_INVALID');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Encryption & Cryptographic Security
  // --------------------------------------------------------------------------
  describe('2. Encryption & Key Management', () => {
    it('encrypts and decrypts OAuth tokens using authenticated AES-256-GCM', () => {
      const plainSecret = 'gho_16DigitsPersonalAccessTokenSecretValueForTesting';
      const cipherText = encryptToken(plainSecret);

      expect(cipherText).not.toBe(plainSecret);
      expect(cipherText.split(':')).toHaveLength(3); // iv : ciphertext : authTag

      const decrypted = decryptToken(cipherText);
      expect(decrypted).toBe(plainSecret);
    });

    it('detects tampering in encrypted tokens and throws authentication error', () => {
      const plainSecret = 'gho_secret_access_token';
      const cipherText = encryptToken(plainSecret);
      const [iv, ciphertext, authTag] = cipherText.split(':');

      // Tamper with ciphertext by flipping one hex byte
      const tamperedCipher =
        ciphertext.slice(0, -2) + (ciphertext.endsWith('a') ? 'b' : 'a');
      const tamperedPayload = `${iv}:${tamperedCipher}:${authTag}`;

      expect(() => decryptToken(tamperedPayload)).toThrow();
    });

    it('generates high-entropy random agent API keys and secure SHA-256 hashes', () => {
      const key1 = generateAgentApiKey();
      const key2 = generateAgentApiKey();

      expect(key1).toMatch(/^sf_agent_[0-9a-f]{48}$/);
      expect(key1).not.toBe(key2);

      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).toHaveLength(64);
      expect(hash1).not.toBe(hash2);
      expect(hashApiKey(key1)).toBe(hash1); // Deterministic
    });
  });

  // --------------------------------------------------------------------------
  // 3. IDOR & Authorization Boundaries
  // --------------------------------------------------------------------------
  describe('3. IDOR & Tenant Authorization Boundaries', () => {
    it('prevents User A from deleting User B repository connection (IDOR defense)', async () => {
      // Bob owns repository 6500000000000000000000bb
      // Alice tries to delete Bob's repository
      const res = await request(app)
        .delete('/api/v1/repos/6500000000000000000000bb')
        .set('Authorization', `Bearer ${aliceToken}`);

      // Must return 404 (or 403) and NOT delete Bob's resource
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents User A from modifying User B repository configuration (IDOR defense)', async () => {
      const res = await request(app)
        .patch('/api/v1/repos/6500000000000000000000bb')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ category: 'Compromised' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('prevents User A from reading or mutating User B notifications', async () => {
      // Notification 650000000000000000000011 belongs to Alice
      // Bob tries to mark Alice's notification as read
      const res = await request(app)
        .patch('/api/v1/notifications/650000000000000000000011/read')
        .set('Authorization', `Bearer ${bobToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Injection & Input Validation Resilience
  // --------------------------------------------------------------------------
  describe('4. Injection & Input Validation Resilience', () => {
    it('handles malformed / non-hex ObjectIds without throwing 500 BSON errors', async () => {
      const maliciousIds = [
        '../../etc/passwd',
        'invalid_id_not_24_hex',
        'admin;DROP TABLE users;'
      ];

      for (const malId of maliciousIds) {
        const res = await request(app)
          .delete(`/api/v1/repos/${encodeURIComponent(malId)}`)
          .set('Authorization', `Bearer ${aliceToken}`);

        // Must gracefully return 404 and NOT crash server with 500
        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
      }
    });

    it('rejects LeetCode submission export when source code is missing or empty', async () => {
      const res = await request(app)
        .post('/api/v1/sync/leetcode/submission')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({
          submissionId: 'sub_empty_test',
          questionId: '1',
          questionTitle: 'Two Sum',
          questionSlug: 'two-sum',
          difficulty: 'Easy',
          language: 'TypeScript',
          code: '', // Empty code violation
          runtimeMs: 45,
          runtimePercentile: 88,
          memoryBytes: 52428800,
          memoryPercentile: 75,
          submittedAt: new Date().toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Local Desktop Agent Security & Path Traversal
  // --------------------------------------------------------------------------
  describe('5. Local Desktop Agent Security', () => {
    it('blocks filesystem root directories from being watched', () => {
      expect(isSafeRepositoryPath('/').safe).toBe(false);
      if (process.platform === 'win32') {
        expect(isSafeRepositoryPath('C:\\').safe).toBe(false);
      }
    });

    it('blocks system directories from being watched', () => {
      if (process.platform === 'win32') {
        expect(isSafeRepositoryPath('C:\\Windows\\System32').safe).toBe(false);
      } else {
        expect(isSafeRepositoryPath('/etc').safe).toBe(false);
        expect(isSafeRepositoryPath('/sys/kernel').safe).toBe(false);
      }
    });

    it('detects and rejects null byte injection attempts in repository paths', () => {
      const nullByteAttempt = '/home/user/repo\0/malicious';
      const result = isSafeRepositoryPath(nullByteAttempt);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('Null byte injection');
    });

    it('allows valid normal project repository directories', () => {
      const validPath = process.cwd();
      const result = isSafeRepositoryPath(validPath);
      expect(result.safe).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Timezone & Streak Engine Integrity
  // --------------------------------------------------------------------------
  describe('6. Streak Engine Timezone & Calendar Boundaries', () => {
    it('calculates streaks accurately across year boundary without false resets', () => {
      const activeDates = new Set(['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
      const streak = StreakEngine.computeStreakFromDates(activeDates, '2026-01-02');
      expect(streak.currentStreak).toBe(4);
      expect(streak.longestStreak).toBe(4);
      expect(streak.hasSubmittedToday).toBe(true);
    });

    it('maintains streak if today has no submission yet but yesterday had one', () => {
      const activeDates = new Set(['2026-03-10', '2026-03-11', '2026-03-12']);
      // Today is 2026-03-13 (no submission yet)
      const streak = StreakEngine.computeStreakFromDates(activeDates, '2026-03-13');
      expect(streak.currentStreak).toBe(3);
      expect(streak.hasSubmittedToday).toBe(false);
    });

    it('resets streak to 0 if both today and yesterday had no submission', () => {
      const activeDates = new Set(['2026-03-10', '2026-03-11']);
      // Today is 2026-03-13 (gap of 2 days)
      const streak = StreakEngine.computeStreakFromDates(activeDates, '2026-03-13');
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(2);
    });
  });
});
