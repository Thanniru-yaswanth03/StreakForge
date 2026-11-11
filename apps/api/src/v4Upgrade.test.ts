import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from './app.js';
import { generateAuthToken, invalidateTokenHealthCache } from './services/authService.js';
import { User } from './models/User.js';
import { Account } from './models/Account.js';
import { RepositoryConnection } from './models/RepositoryConnection.js';
import { LeetCodeSubmission } from './models/LeetCodeSubmission.js';
import { DailyActivitySnapshot } from './models/DailyActivitySnapshot.js';
import { ActivityRecord } from './models/ActivityRecord.js';
import { JobRecord } from './models/JobRecord.js';
import { AuditLog } from './models/AuditLog.js';
import { JOB_HANDLERS } from './services/jobHandlers.js';

function mockQueryChain<T>(result: T) {
  const q: any = Promise.resolve(result);
  q.sort = vi.fn().mockReturnValue(q);
  q.skip = vi.fn().mockReturnValue(q);
  q.limit = vi.fn().mockReturnValue(q);
  q.lean = vi.fn().mockReturnValue(q);
  q.select = vi.fn().mockReturnValue(q);
  return q;
}

describe('StreakForge V4.0 End-to-End Scenarios (API Layer)', () => {
  const app = createApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Session Persistence & Silent Refresh + Token Health + Preferences Reset
  it('supports seamless /auth/refresh, returns tokenHealth + syncPreferences in /auth/me, and saves/resets preferences', async () => {
    const userId = new Types.ObjectId();
    const saveMock = vi.fn().mockResolvedValue(true);
    const fakeUser: any = {
      _id: userId,
      githubId: '777',
      username: 'v4tester',
      name: 'V4 Tester',
      email: 'v4@example.com',
      verifiedEmails: ['v4@example.com'],
      avatarUrl: 'https://avatars.githubusercontent.com/u/777',
      timezone: 'UTC',
      streakGoalPerDay: 1,
      notificationPreferences: { inApp: true, email: false, streakWarningHoursBefore: 3 },
      syncPreferences: { autoSyncEnabled: true, exportPolicy: 'ALLOW_MULTIPLE' },
      uiPreferences: { enabledModules: ['overview', 'leetcode', 'repos', 'settings'], sidebarOrder: [] },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: saveMock
    };

    invalidateTokenHealthCache(userId.toString());
    vi.spyOn(User, 'findById').mockReturnValue(mockQueryChain(fakeUser));
    vi.spyOn(Account, 'findOne').mockResolvedValue(null as any);

    const token = generateAuthToken(fakeUser);

    // 1. Verify /me exposes V4 fields
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.githubTokenHealth.status).toBe('MISSING');
    expect(meRes.body.data.user.syncPreferences.exportPolicy).toBe('ALLOW_MULTIPLE');
    expect(meRes.body.data.user.uiPreferences.enabledModules).toContain('mock');
    expect(meRes.body.data.user.uiPreferences.enabledModules).toContain('curriculum');
    expect(meRes.body.data.user.sessionExpiresAt).toBeTruthy();

    // 2. Verify sliding /auth/refresh issues new token without re-login
    const refRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${token}`);
    expect(refRes.status).toBe(200);
    expect(refRes.body.data.token).toBeTruthy();
    expect(refRes.body.data.expiresAt).toBeTruthy();

    // 3. Verify PATCH /auth/preferences & POST /auth/preferences/reset
    const patchRes = await request(app)
      .patch('/api/v1/auth/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        syncPreferences: {
          folderPattern: '{Difficulty}/{id4}-{slug}',
          fileNamingPattern: 'solution{ext}',
          exportPolicy: 'NEW_ONLY'
        },
        uiPreferences: {
          enabledModules: ['overview', 'leetcode', 'settings'],
          sidebarOrder: ['overview', 'settings', 'leetcode']
        },
        notificationPreferences: {
          syncSuccess: false,
          weeklyReport: false
        }
      });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.syncPreferences.folderPattern).toBe('{Difficulty}/{id4}-{slug}');
    expect(patchRes.body.data.syncPreferences.fileNamingPattern).toBe('solution{ext}');
    expect(patchRes.body.data.notificationPreferences.syncSuccess).toBe(false);
    expect(patchRes.body.data.notificationPreferences.weeklyReport).toBe(false);
    expect(patchRes.body.data.notificationPreferences.problemSolved).toBe(true);
    expect(patchRes.body.data.uiPreferences.enabledModules).toEqual([
      'overview',
      'leetcode',
      'settings'
    ]);

    const resetRes = await request(app)
      .post('/api/v1/auth/preferences/reset')
      .set('Authorization', `Bearer ${token}`);
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.data.syncPreferences.exportPolicy).toBe('ALLOW_MULTIPLE');
    expect(resetRes.body.data.uiPreferences.customized).toBe(false);
    expect(resetRes.body.data.uiPreferences.enabledModules).toContain('mock');
    expect(resetRes.body.data.uiPreferences.enabledModules).toContain('curriculum');
  });

  // Scenario 2 & 3: Repository Endpoints Validation & Zero Hardcoded Owner
  it('validates /repos/create and /repos/test-access without hardcoding any repository', async () => {
    const userId = new Types.ObjectId();
    const fakeUser: any = { _id: userId, username: 'repo_owner', isActive: true };
    const token = generateAuthToken(fakeUser);

    vi.spyOn(User, 'findById').mockReturnValue(mockQueryChain(fakeUser));
    vi.spyOn(Account, 'findOne').mockResolvedValue(null as any);

    const createNoGh = await request(app)
      .post('/api/v1/repos/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'my-algo-practice' });
    expect(createNoGh.status).toBe(401);
    expect(createNoGh.body.error.code).toBe('GITHUB_NOT_CONNECTED');

    const invalidTest = await request(app)
      .post('/api/v1/repos/test-access')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoFullName: 'bad-format' });
    expect(invalidTest.status).toBe(400);

    const badCreateName = await request(app)
      .post('/api/v1/repos/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'invalid/slash name' });
    expect(badCreateName.status).toBe(400);
  });

  // Scenario 4 & 5: Historical Import, Distinct Metrics Filtering, Canonical Sync State & DB-only Deletion
  it('handles historical import metadata honesty, filtered history metrics, /sync/state, and safe DB deletion', async () => {
    const userId = new Types.ObjectId();
    const fakeUser: any = {
      _id: userId,
      username: 'lc_historian',
      email: 'hist@example.com',
      leetcodeUsername: 'lc_historian',
      leetcodeStats: { totalSolved: 33, totalSubmissions: 50, easySolved: 20, mediumSolved: 10, hardSolved: 3 },
      timezone: 'UTC',
      streakGoalPerDay: 1,
      notificationPreferences: { inApp: true, email: false, streakWarningHoursBefore: 3 },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const token = generateAuthToken(fakeUser);

    vi.spyOn(User, 'findById').mockReturnValue(mockQueryChain(fakeUser));
    vi.spyOn(LeetCodeSubmission, 'findOne').mockResolvedValue(null as any);
    const createdDocs: any[] = [];
    vi.spyOn(LeetCodeSubmission, 'create').mockImplementation(async (doc: any) => {
      createdDocs.push(doc);
      return doc;
    });
    vi.spyOn(ActivityRecord, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(ActivityRecord, 'create').mockResolvedValue({} as any);
    vi.spyOn(DailyActivitySnapshot, 'findOneAndUpdate').mockResolvedValue({} as any);

    const importRes = await request(app)
      .post('/api/v1/sync/leetcode/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        submissions: [
          {
            submissionId: 'hist_1',
            questionId: '1',
            questionTitle: 'Two Sum',
            questionSlug: 'two-sum',
            difficulty: 'Easy',
            language: 'python3',
            code: '',
            submittedAt: '2026-10-01T10:00:00.000Z'
          },
          {
            submissionId: 'hist_2',
            questionId: '2',
            questionTitle: 'Add Two Numbers',
            questionSlug: 'add-two-numbers',
            difficulty: 'Medium',
            language: 'java',
            code: 'class Solution {}',
            submittedAt: '2026-10-02T10:00:00.000Z'
          }
        ],
        autoExportToGitHub: false
      });

    expect(importRes.status).toBe(201);
    expect(importRes.body.data.importedCount).toBe(2);
    expect(importRes.body.data.missingCodeCount).toBe(1);
    expect(createdDocs[0].syncStatus).toBe('SKIPPED');
    expect(createdDocs[1].syncStatus).toBe('PENDING');

    // Test filtered history & metrics
    const sampleDoc: any = {
      _id: new Types.ObjectId(),
      submissionId: 'hist_2',
      questionId: '2',
      questionTitle: 'Add Two Numbers',
      questionSlug: 'add-two-numbers',
      difficulty: 'Medium',
      language: 'java',
      code: 'class Solution {}',
      syncStatus: 'PENDING',
      submittedAt: new Date('2026-10-02T10:00:00.000Z'),
      toObject() {
        return { ...this };
      }
    };

    vi.spyOn(LeetCodeSubmission, 'countDocuments').mockResolvedValue(2);
    vi.spyOn(LeetCodeSubmission, 'find').mockReturnValue(mockQueryChain([sampleDoc]));
    vi.spyOn(LeetCodeSubmission, 'aggregate').mockResolvedValue([
      { _id: 'SYNCED', count: 1 },
      { _id: 'PENDING', count: 2 },
      { _id: 'FAILED', count: 1 }
    ] as any);
    vi.spyOn(LeetCodeSubmission, 'distinct').mockImplementation(((field: string) => {
      if (field === 'questionSlug') return mockQueryChain(['two-sum', 'add-two-numbers']);
      if (field === 'language') return mockQueryChain(['java', 'python3']);
      return mockQueryChain(['Array']);
    }) as any);

    const histRes = await request(app)
      .get('/api/v1/sync/leetcode/history?difficulty=Medium&status=PENDING&sort=questionId')
      .set('Authorization', `Bearer ${token}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.meta.metrics).toEqual({
      uniqueProblemsSolved: 2,
      acceptedSubmissions: 4,
      exportedCount: 1,
      pendingCount: 2,
      failedCount: 1,
      skippedCount: 0
    });

    // Test canonical /sync/state
    vi.spyOn(Account, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(RepositoryConnection, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(DailyActivitySnapshot, 'find').mockReturnValue(mockQueryChain([]));
    vi.spyOn(JobRecord, 'aggregate').mockResolvedValue([{ _id: 'FAILED', count: 2 }] as any);
    vi.spyOn(LeetCodeSubmission, 'findOne').mockReturnValue(mockQueryChain(null) as any);

    const stateRes = await request(app)
      .get('/api/v1/sync/state')
      .set('Authorization', `Bearer ${token}`);
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.data.metrics.uniqueProblemsSolved).toBe(2);
    expect(stateRes.body.data.metrics.exportedCount).toBe(1);
    expect(stateRes.body.data.queueSummary.failed).toBe(2);

    // Test DB-only bulk delete & audit log
    const delId = new Types.ObjectId().toString();
    vi.spyOn(LeetCodeSubmission, 'deleteMany').mockResolvedValue({ deletedCount: 1 } as any);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as any);

    const delRes = await request(app)
      .post('/api/v1/sync/leetcode/bulk-delete')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [delId] });
    expect(delRes.status).toBe(200);
    expect(delRes.body.data.deletedCount).toBe(1);
  });

  // Scenario 7 & 8: Automation Handlers Honesty & Log Cleanup
  it('skips empty snapshot in LOCAL_BACKUP without fabricating backup notification and clears finished jobs', async () => {
    const userId = new Types.ObjectId();
    const fakeUser: any = { _id: userId, username: 'auto_user', isActive: true };
    const token = generateAuthToken(fakeUser);

    vi.spyOn(User, 'findById').mockReturnValue(mockQueryChain(fakeUser));
    vi.spyOn(RepositoryConnection, 'find').mockReturnValue(mockQueryChain([]));
    vi.spyOn(LeetCodeSubmission, 'countDocuments').mockResolvedValue(0);

    const backupRes = await JOB_HANDLERS.LOCAL_BACKUP(userId.toString(), {});
    expect(backupRes.success).toBe(true);
    expect(backupRes.summary).toContain('Skipped snapshot');

    vi.spyOn(JobRecord, 'deleteMany').mockResolvedValue({ deletedCount: 5 } as any);
    const clearRes = await request(app)
      .delete('/api/v1/automations/jobs?scope=finished')
      .set('Authorization', `Bearer ${token}`);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.data.deletedCount).toBe(5);
  });
});

