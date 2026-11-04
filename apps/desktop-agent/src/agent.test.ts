import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { executeGit, getGitStatus } from '@streakforge/git-engine';
import { StreakForgeAgent } from './agent.js';

describe('Phase 3 — Local Desktop Agent & Git Engine Scenarios', () => {
  let tempBaseDir: string;
  let testRepoDir: string;

  beforeAll(async () => {
    // Create temporary directory for git testing
    tempBaseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'streakforge-agent-tests-'));
    testRepoDir = path.join(tempBaseDir, 'test-project');
    fs.mkdirSync(testRepoDir, { recursive: true });

    // Initialize real git repository
    await executeGit(['init', '-b', 'main'], testRepoDir);
    await executeGit(['config', 'user.name', 'StreakForge Test Bot'], testRepoDir);
    await executeGit(['config', 'user.email', 'testbot@streakforge.local'], testRepoDir);

    // Initial commit
    fs.writeFileSync(path.join(testRepoDir, 'README.md'), '# Test Project\nInitial README', 'utf-8');
    await executeGit(['add', 'README.md'], testRepoDir);
    await executeGit(['commit', '-m', 'chore: initial commit'], testRepoDir);
  });

  afterAll(() => {
    try {
      fs.rmSync(tempBaseDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error on windows locks
    }
  });

  beforeEach(async () => {
    // Ensure clean state before each test
    await executeGit(['checkout', 'main'], testRepoDir);
    await executeGit(['reset', '--hard', 'HEAD'], testRepoDir);
    await executeGit(['clean', '-fd'], testRepoDir);
  });

  it('1. Clean repository: refuses to commit when working tree is clean', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);
    expect(res.message).toContain('clean');
  });

  it('2. Modified repository: detects modifications, creates genuine commit, and verifies SHA', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Modify file
    fs.appendFileSync(path.join(testRepoDir, 'README.md'), '\nUpdated documentation content.');

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);
    expect(res.sha).toBeDefined();
    expect(res.sha!.length).toBeGreaterThan(8);

    const status = await getGitStatus(testRepoDir);
    expect(status.isClean).toBe(true);
  });

  it('3. Untracked file: safely stages new source file and commits', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Add new untracked safe file
    fs.writeFileSync(
      path.join(testRepoDir, 'binarySearch.ts'),
      'export function binarySearch(arr: number[], target: number) { return -1; }',
      'utf-8'
    );

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);
    expect(res.message).toContain('feat: update binarySearch implementation');

    const status = await getGitStatus(testRepoDir);
    expect(status.isClean).toBe(true);
  });

  it('4. Deleted file: stages deletion and commits genuine removal', async () => {
    // First commit a file so we can delete it
    fs.writeFileSync(path.join(testRepoDir, 'toDelete.ts'), 'export const x = 1;', 'utf-8');
    await executeGit(['add', 'toDelete.ts'], testRepoDir);
    await executeGit(['commit', '-m', 'chore: add toDelete'], testRepoDir);

    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Delete file
    fs.unlinkSync(path.join(testRepoDir, 'toDelete.ts'));

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);

    const status = await getGitStatus(testRepoDir);
    expect(status.isClean).toBe(true);
  });

  it('5. Repository with secrets: BLOCKS commit when secret file is present', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Attempt to commit .env
    fs.writeFileSync(path.join(testRepoDir, '.env'), 'DATABASE_PASSWORD=SuperSecretPass999', 'utf-8');

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    // Must be blocked!
    expect(res.success).toBe(false);
    expect(res.message).toContain('security exclusion');

    // Clean up forbidden file
    fs.unlinkSync(path.join(testRepoDir, '.env'));
  });

  it('6. Secret scanning in code additions: blocks commit containing AWS key or token in code', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Create a regular .ts file but with a leaked GitHub token
    fs.writeFileSync(
      path.join(testRepoDir, 'apiClient.ts'),
      'export const token = "ghp_123456789012345678901234567890123456";',
      'utf-8'
    );

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(false);
    expect(res.message).toContain('Potential credentials detected');

    // Clean up
    fs.unlinkSync(path.join(testRepoDir, 'apiClient.ts'));
    await executeGit(['reset', 'HEAD'], testRepoDir);
  });

  it('7. Repository without remote: commits safely locally and notes remote missing without crash', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [
        { path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: true, mode: 'AUTOMATIC' }
      ]
    });

    fs.appendFileSync(path.join(testRepoDir, 'README.md'), '\nFeature update.');

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);
    expect(res.sha).toBeDefined();
  });

  it('8. Approval Mode: queues proposal awaiting user confirmation instead of auto-committing', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [
        { path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'APPROVAL' }
      ]
    });

    fs.writeFileSync(path.join(testRepoDir, 'mathUtil.ts'), 'export const add = (a: number, b: number) => a + b;', 'utf-8');

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(true);
    expect(res.message).toContain('Created commit proposal awaiting user approval');

    const proposals = agent.getPendingProposals();
    expect(proposals.length).toBe(1);
    expect(proposals[0].files).toContain('mathUtil.ts');

    // Now approve proposal
    const approveRes = await agent.approveProposal(proposals[0].id);
    expect(approveRes.success).toBe(true);

    const remaining = agent.getPendingProposals();
    expect(remaining.length).toBe(0);
  });

  it('9. Detached HEAD: agent refuses to commit on detached HEAD state', async () => {
    const agent = new StreakForgeAgent({
      watchedRepositories: [{ path: testRepoDir, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'AUTOMATIC' }]
    });

    // Detach HEAD
    const headSha = (await executeGit(['rev-parse', 'HEAD'], testRepoDir)).stdout.trim();
    await executeGit(['checkout', headSha], testRepoDir);

    fs.appendFileSync(path.join(testRepoDir, 'README.md'), '\nDetached edit.');

    const repo = agent.getWatchedRepositories()[0];
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');

    expect(res.success).toBe(false);
    expect(res.message).toContain('detached HEAD');

    // Switch back to branch main
    await executeGit(['checkout', 'main'], testRepoDir);
  });
});
