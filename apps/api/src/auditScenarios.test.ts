import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { createApp } from './app.js';
import { ENV } from './config/env.js';
import { resolveOAuthCallbackUrl } from './routes/authRoutes.js';
import {
  generateAuthToken,
  generateOAuthState,
  verifyOAuthState,
  extractOAuthReturnTo,
  revokeSessionToken,
  isTokenRevokedAsync
} from './services/authService.js';
import { User } from './models/User.js';
import { RevokedToken } from './models/RevokedToken.js';
import { RepositoryConnection } from './models/RepositoryConnection.js';
import { Account } from './models/Account.js';
import { MockInterviewSession } from './models/MockInterviewSession.js';
import { DailyActivitySnapshot } from './models/DailyActivitySnapshot.js';
import { LeetCodeSubmission } from './models/LeetCodeSubmission.js';
import { ActivityRecord } from './models/ActivityRecord.js';
import { UserAchievement } from './models/UserAchievement.js';
import { StudyProgress } from './models/StudyProgress.js';
import { MockInterviewService } from './services/mockInterviewService.js';
import { CareerReadinessService } from './services/careerReadinessService.js';
import { GamificationService } from './services/gamificationService.js';
import { WeeklyReportService } from './services/weeklyReportService.js';
import { PublicProfileService } from './services/publicProfileService.js';
import { fetchLeetCodeUserStats, syncLeetCodeUserStats } from './services/leetcodeService.js';

function mockQuery<T>(result: T) {
  const q: any = Promise.resolve(result);
  q.sort = vi.fn().mockReturnValue(q);
  q.limit = vi.fn().mockReturnValue(q);
  q.lean = vi.fn().mockReturnValue(q);
  q.select = vi.fn().mockReturnValue(q);
  return q;
}

describe('Phase 15 — Complete Engineering Audit Scenarios (A–J)', () => {
  const app = createApp();
  const originalEnv = {
    NODE_ENV: ENV.NODE_ENV,
    GITHUB_CLIENT_ID: ENV.GITHUB_CLIENT_ID,
    GITHUB_CALLBACK_URL: ENV.GITHUB_CALLBACK_URL,
    WEB_APP_URL: ENV.WEB_APP_URL
  };

  afterEach(() => {
    vi.restoreAllMocks();
    ENV.NODE_ENV = originalEnv.NODE_ENV;
    ENV.GITHUB_CLIENT_ID = originalEnv.GITHUB_CLIENT_ID;
    ENV.GITHUB_CALLBACK_URL = originalEnv.GITHUB_CALLBACK_URL;
    ENV.WEB_APP_URL = originalEnv.WEB_APP_URL;
  });

  // --------------------------------------------------------------------------
  // Scenario A & F: OAuth Config, Redirect URI Consistency, CSRF, Revocation
  // --------------------------------------------------------------------------
  describe('Scenario A & F — GitHub OAuth Config, Redirect URI, CSRF & Durable Revocation', () => {
    it('strips trailing slashes and normalizes OAuth callback URLs', () => {
      ENV.GITHUB_CALLBACK_URL = 'https://streakforge-api-5uhs.onrender.com/api/v1/auth/github/callback///';
      const fakeReq: any = {
        headers: { 'x-forwarded-host': 'streakforge-api-5uhs.onrender.com', 'x-forwarded-proto': 'https' },
        secure: true,
        get: (name: string) => (name.toLowerCase() === 'host' ? 'streakforge-api-5uhs.onrender.com' : '')
      };

      expect(resolveOAuthCallbackUrl(fakeReq)).toBe(
        'https://streakforge-api-5uhs.onrender.com/api/v1/auth/github/callback'
      );
    });

    it('aligns localhost callback URL with active Render reverse-proxy host in production', () => {
      ENV.NODE_ENV = 'production';
      ENV.GITHUB_CALLBACK_URL = 'http://localhost:4000/api/v1/auth/github/callback';
      const fakeReq: any = {
        headers: { 'x-forwarded-host': 'streakforge-api-5uhs.onrender.com', 'x-forwarded-proto': 'https' },
        secure: true,
        get: () => 'streakforge-api-5uhs.onrender.com'
      };

      expect(resolveOAuthCallbackUrl(fakeReq)).toBe(
        'https://streakforge-api-5uhs.onrender.com/api/v1/auth/github/callback'
      );
    });

    it('blocks dummy dev fallback in production and redirects with OAUTH_NOT_CONFIGURED', async () => {
      ENV.NODE_ENV = 'production';
      ENV.GITHUB_CLIENT_ID = 'dummy-client-id';
      ENV.WEB_APP_URL = 'https://streak-forge-six.vercel.app';

      const res = await request(app).get(
        '/api/v1/auth/github?return_to=https://streak-forge-six.vercel.app'
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://streak-forge-six.vercel.app/auth/callback');
      expect(res.headers.location).toContain('error=OAUTH_NOT_CONFIGURED');
    });

    it('validates HMAC-signed OAuth state nonces and preserves safe returnTo paths', () => {
      const state = generateOAuthState('https://streak-forge-six.vercel.app');
      expect(verifyOAuthState(state)).toBe(true);
      expect(extractOAuthReturnTo(state)).toBe('https://streak-forge-six.vercel.app');

      const tampered = `${state}tamper`;
      expect(verifyOAuthState(tampered)).toBe(false);
    });

    it('clears streakforge_token HttpOnly cookie and rejects subsequent requests with revoked token', async () => {
      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'alice_dev', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);

      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);
      vi.spyOn(RevokedToken, 'findOneAndUpdate').mockResolvedValue({} as any);
      vi.spyOn(RevokedToken, 'exists').mockResolvedValue(null);

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);
      const setCookies = ([] as string[]).concat(logoutRes.headers['set-cookie'] || []);
      expect(setCookies.some((c: string) => c.startsWith('streakforge_token=;'))).toBe(true);

      expect(await isTokenRevokedAsync(token)).toBe(true);

      const meAfterLogout = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meAfterLogout.status).toBe(401);
      expect(meAfterLogout.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('revokes token durably and deletes account + clears session cookie at DELETE /api/v1/auth/account', async () => {
      const userId = new Types.ObjectId();
      const deleteUser: any = { _id: userId, username: 'delete_me', role: 'USER', isActive: true };
      const deleteToken = generateAuthToken(deleteUser);

      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(deleteUser) as any);
      vi.spyOn(User, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      vi.spyOn(User, 'findByIdAndDelete').mockResolvedValue(deleteUser as any);
      vi.spyOn(mongoose.Model, 'deleteMany').mockResolvedValue({ deletedCount: 1 } as any);
      vi.spyOn(RevokedToken, 'findOneAndUpdate').mockResolvedValue({} as any);

      const otherToken = generateAuthToken(deleteUser);
      await revokeSessionToken(otherToken);
      expect(await isTokenRevokedAsync(otherToken)).toBe(true);

      const delRes = await request(app)
        .delete('/api/v1/auth/account')
        .set('Authorization', `Bearer ${deleteToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
      const setCookies = ([] as string[]).concat(delRes.headers['set-cookie'] || []);
      expect(setCookies.some((c: string) => c.startsWith('streakforge_token=;'))).toBe(true);
      expect(await isTokenRevokedAsync(deleteToken)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario C & D: Repo Connection Validation & LeetCode Connect / Zero-Fabrication
  // --------------------------------------------------------------------------
  describe('Scenario C & D — Repo Connect Validation & LeetCode Zero-Fabrication', () => {
    it('accepts zero/omitted githubRepoId for manual owner/repo connect while rejecting malformed names', async () => {
      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'octo_user', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);

      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);
      vi.spyOn(Account, 'findOne').mockResolvedValue(null);
      vi.spyOn(RepositoryConnection, 'updateMany').mockResolvedValue({ modifiedCount: 0 } as any);
      vi.spyOn(RepositoryConnection, 'findOneAndUpdate').mockImplementation(((_filter: any, update: any) =>
        mockQuery({
          _id: new Types.ObjectId(),
          ...update,
          repoFullName: 'octo_user/leetcode-solutions'
        })
      ) as any);

      const badRes = await request(app)
        .post('/api/v1/repos/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({ repoFullName: 'invalid-without-slash', githubRepoId: 0 });
      expect(badRes.status).toBe(400);

      const goodRes = await request(app)
        .post('/api/v1/repos/connect')
        .set('Authorization', `Bearer ${token}`)
        .send({
          repoFullName: 'octo_user/leetcode-solutions',
          githubRepoId: 0,
          defaultBranch: 'main',
          isTargetForLeetCode: true
        });

      expect(goodRes.status).toBe(201);
      expect(goodRes.body.success).toBe(true);
      expect(goodRes.body.data.githubRepoId).toBeGreaterThan(0);
    });

    it('rejects invalid LeetCode usernames at POST /api/v1/auth/leetcode', async () => {
      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'lc_tester', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);
      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);

      const emptyRes = await request(app)
        .post('/api/v1/auth/leetcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ leetcodeUsername: '' });
      expect(emptyRes.status).toBe(400);

      const badCharsRes = await request(app)
        .post('/api/v1/auth/leetcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ username: 'bad handle with spaces!' });
      expect(badCharsRes.status).toBe(400);
    });

    it('returns genuine 0 stats for zero-solve LeetCode users without fabricating defaults', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            matchedUser: {
              username: 'brand_new_coder',
              profile: { realName: 'Brand New', userAvatar: '', ranking: 0 },
              submitStatsGlobal: {
                acSubmissionNum: [
                  { difficulty: 'All', count: 0, submissions: 0 },
                  { difficulty: 'Easy', count: 0, submissions: 0 },
                  { difficulty: 'Medium', count: 0, submissions: 0 },
                  { difficulty: 'Hard', count: 0, submissions: 0 }
                ],
                totalSubmissionNum: [{ difficulty: 'All', count: 0, submissions: 0 }]
              },
              badges: [],
              submissionCalendar: '{}'
            },
            allQuestionsCount: [
              { difficulty: 'Easy', count: 850 },
              { difficulty: 'Medium', count: 1800 },
              { difficulty: 'Hard', count: 750 }
            ]
          }
        })
      } as any);

      const stats = await fetchLeetCodeUserStats('brand_new_coder');
      expect(stats.totalSolved).toBe(0);
      expect(stats.easySolved).toBe(0);
      expect(stats.mediumSolved).toBe(0);
      expect(stats.hardSolved).toBe(0);
      expect(stats.totalSubmissions).toBe(0);
      expect(stats.acceptanceRate).toBe(0);
      expect(stats.totalActiveDays).toBe(0);
      expect(stats.maxStreak).toBe(0);
      expect(stats.submissionCalendar).toBe('{}');
    });

    it('throws LEETCODE_USER_NOT_FOUND (HTTP 404) instead of returning fake metrics on missing profile', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { matchedUser: null }
        })
      } as any);

      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'missing_lc', leetcodeUsername: 'nobody_xyz_999', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);
      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);

      await expect(syncLeetCodeUserStats(userId.toString())).rejects.toThrow(/does not exist/i);

      const httpRes = await request(app)
        .post('/api/v1/auth/leetcode')
        .set('Authorization', `Bearer ${token}`)
        .send({ leetcodeUsername: 'nobody_xyz_999' });

      expect(httpRes.status).toBe(404);
      expect(httpRes.body.error.code).toBe('LEETCODE_USER_NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // Scenario G & H: Multi-User Isolation, IDOR Defense, Zero-Fabrication Services
  // --------------------------------------------------------------------------
  describe('Scenario G & H — IDOR Defense, Badge Isolation & Zero-Fabrication Reporting', () => {
    it('prevents User B from completing User A mock interview session (IDOR -> 404)', async () => {
      const userB = new Types.ObjectId();
      const sessionIdA = new Types.ObjectId().toString();

      vi.spyOn(MockInterviewSession, 'findOne').mockResolvedValue(null);

      await expect(
        MockInterviewService.completeSession(userB, sessionIdA, -120, [{ slug: 'two-sum', solved: true }])
      ).rejects.toMatchObject({ statusCode: 404 });

      await expect(
        MockInterviewService.completeSession(userB, 'not-an-object-id', 100, [])
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('escapes XSS characters and returns 404 SVG on missing user without leaking another user', async () => {
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery(null));

      const missingParamRes = await request(app).get('/api/v1/badge/streak.svg');
      expect(missingParamRes.status).toBe(400);
      expect(missingParamRes.headers['content-type']).toContain('image/svg+xml');

      const xssRes = await request(app).get('/api/v1/badge/streak.svg?user=<script>alert(1)</script>');
      expect(xssRes.status).toBe(404);
      expect(xssRes.headers['content-type']).toContain('image/svg+xml');
      const xssSvg = xssRes.text ?? Buffer.from(xssRes.body).toString('utf8');
      expect(xssSvg).not.toContain('<script>');
      expect(xssSvg).toContain('&lt;script&gt;');

      const notFoundRes = await request(app).get('/api/v1/badge/streak.svg?user=nonexistent_user_123');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.headers['content-type']).toContain('image/svg+xml');
      const notFoundSvg = notFoundRes.text ?? Buffer.from(notFoundRes.body).toString('utf8');
      expect(notFoundSvg).toContain('StreakForge profile not found for @nonexistent_user_123');
    });

    it('computes honest zeroed CareerReadiness, Gamification, WeeklyReport & PublicProfile for empty account', async () => {
      const userId = new Types.ObjectId();
      const emptyUser: any = {
        _id: userId,
        username: 'fresh_user',
        name: 'Fresh User',
        isActive: true,
        isPublicProfile: true,
        streakGoalPerDay: 1,
        publicProfileSettings: { showStreak: true, showHeatmap: true, showCurriculum: true, showBadges: true },
        createdAt: new Date('2026-11-01T00:00:00Z')
      };

      vi.spyOn(User, 'findById').mockImplementation(() => mockQuery(emptyUser) as any);
      vi.spyOn(User, 'findOne').mockReturnValue(mockQuery(emptyUser) as any);
      vi.spyOn(StudyProgress, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(StudyProgress, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(LeetCodeSubmission, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(LeetCodeSubmission, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(MockInterviewSession, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(MockInterviewSession, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(ActivityRecord, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(ActivityRecord, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(RepositoryConnection, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(DailyActivitySnapshot, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(UserAchievement, 'findOne').mockReturnValue(mockQuery({
        userId,
        level: 1,
        currentXp: 0,
        unlockedAchievementKeys: [],
        unlockedAchievementsMeta: {},
        recentXpGains: [],
        save: vi.fn().mockResolvedValue(true)
      }) as any);

      const readiness = await CareerReadinessService.calculateReadiness(userId);
      expect(readiness.overallScore).toBe(0);
      expect(readiness.tier).toBe('FOUNDATIONAL');

      const gamification = await GamificationService.getGamificationProfile(userId);
      expect(gamification.currentXp).toBe(0);
      expect(gamification.level).toBe(1);
      expect(gamification.recentXpGains).toEqual([]);

      const weekly = await WeeklyReportService.generateWeeklyReport(userId);
      expect(weekly.problemsSolved).toBe(0);
      expect(weekly.gitCommits).toBe(0);
      expect(weekly.activeDaysCount).toBe(0);
      expect(weekly.streakMaintained).toBe(false);
      expect(weekly.topFocusTopic).toBe('No problems solved yet this week');

      const profile = await PublicProfileService.getPublicProfile('fresh_user');
      expect(profile).not.toBeNull();
      expect(profile!.totalSolved).toBe(0);
      expect(profile!.currentStreak).toBe(0);
      expect(profile!.longestStreak).toBe(0);
      expect(profile!.badges).toEqual([]);
      expect(profile!.publicUrl).toContain('fresh_user');
    });

    it('returns deterministic consistency analytics without Math.random fabrication', async () => {
      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'consistent_dev', timezone: 'UTC', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);

      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);
      vi.spyOn(DailyActivitySnapshot, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(DailyActivitySnapshot, 'countDocuments').mockResolvedValue(0 as any);
      vi.spyOn(LeetCodeSubmission, 'find').mockReturnValue(mockQuery([]) as any);
      vi.spyOn(ActivityRecord, 'find').mockReturnValue(mockQuery([]) as any);

      const res1 = await request(app)
        .get('/api/v1/analytics/consistency?period=weekly')
        .set('Authorization', `Bearer ${token}`);
      const res2 = await request(app)
        .get('/api/v1/analytics/consistency?period=weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.data).toEqual(res2.body.data);
      expect(res1.body.data.streakDays).toBe(0);
      expect(res1.body.data.activeDaysPastYear).toBe(0);
      expect(res1.body.data.consistencyScore).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario E: Submission Verdict & Duplicate-Commit Prevention
  // --------------------------------------------------------------------------
  describe('Scenario E — Submission Code Validation & Duplicate Prevention', () => {
    it('rejects empty solution code at POST /api/v1/sync/leetcode/submission with 400 and skips already-SYNCED duplicates', async () => {
      const userId = new Types.ObjectId();
      const fakeUser: any = { _id: userId, username: 'sync_user', role: 'USER', isActive: true };
      const token = generateAuthToken(fakeUser);

      vi.spyOn(User, 'findById').mockReturnValue(mockQuery(fakeUser) as any);

      const emptyRes = await request(app)
        .post('/api/v1/sync/leetcode/submission')
        .set('Authorization', `Bearer ${token}`)
        .send({
          submissionId: 'sub_empty_api',
          questionId: '1',
          questionTitle: 'Two Sum',
          questionSlug: 'two-sum',
          difficulty: 'Easy',
          language: 'python3',
          code: '',
          runtimeMs: 40,
          runtimePercentile: 80,
          memoryBytes: 17000000,
          memoryPercentile: 50,
          submittedAt: '2026-11-10T10:00:00.000Z'
        });

      expect(emptyRes.status).toBe(400);

      vi.spyOn(LeetCodeSubmission, 'findOne').mockResolvedValue({
        submissionId: 'sub_dup_1',
        syncStatus: 'SYNCED',
        githubCommitSha: 'abc123sha',
        githubCommitUrl: 'https://github.com/sync_user/lc/commit/abc123sha'
      } as any);

      const dupRes = await request(app)
        .post('/api/v1/sync/leetcode/submission')
        .set('Authorization', `Bearer ${token}`)
        .send({
          submissionId: 'sub_dup_1',
          questionId: '1',
          questionTitle: 'Two Sum',
          questionSlug: 'two-sum',
          difficulty: 'Easy',
          language: 'python3',
          code: 'class Solution: pass',
          runtimeMs: 40,
          runtimePercentile: 80,
          memoryBytes: 17000000,
          memoryPercentile: 50,
          submittedAt: '2026-11-10T10:00:00.000Z'
        });

      expect(dupRes.status).toBe(201);
      expect(dupRes.body.data.syncStatus).toBe('SKIPPED');
      expect(dupRes.body.data.commitSha).toBe('abc123sha');
    });
  });
});
