import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import chokidar, { FSWatcher } from 'chokidar';
import {
  isGitRepo,
  getGitStatus,
  commitSafeChanges,
  createBackupSnapshot,
  checkRemoteStatus,
  generateSmartCommitMessage,
  scanDiffForSecrets,
  executeGit,
  GitStatusResult
} from '@streakforge/git-engine';
import type {
  AgentActivityReport,
  WatchedRepositoryConfig,
  SyncProposal,
  SyncMode
} from '@streakforge/shared-types';
import {
  getLocalConfig,
  saveLocalConfig,
  AgentLocalConfig,
  AGENT_VERSION,
  PID_FILE_PATH
} from './config.js';

export class StreakForgeAgent {
  private config: AgentLocalConfig;
  private watchers: Map<string, FSWatcher> = new Map();
  private lastActivityTimes: Map<string, number> = new Map();
  private pendingActivities: AgentActivityReport[] = [];
  private pendingProposals: SyncProposal[] = [];
  private heartbeatTimer?: NodeJS.Timeout;
  private idleCheckTimer?: NodeJS.Timeout;
  private backupTimer?: NodeJS.Timeout;
  private loopbackServer?: http.Server;
  private isRunning: boolean = false;
  private startTime: number = Date.now();

  constructor(customConfig?: Partial<AgentLocalConfig>) {
    this.config = { ...getLocalConfig(), ...customConfig };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    // Write PID file for process management
    try {
      fs.writeFileSync(PID_FILE_PATH, process.pid.toString(), 'utf-8');
    } catch {
      // Ignore write error if homedir permissions restricted
    }

    console.log(`[StreakForge Agent v${AGENT_VERSION}] Initializing daemon (PID: ${process.pid})...`);

    // 1. Validate and start watching registered repositories
    for (const repo of this.config.watchedRepositories) {
      await this.startWatchingRepo(repo.path);
    }

    // 2. Start loopback HTTP IPC server (strict loopback 127.0.0.1)
    this.startLoopbackServer();

    // 3. Start idle change check cycle (every 30 seconds)
    this.idleCheckTimer = setInterval(() => this.checkIdleRepositories(), 30 * 1000);

    // 4. Start periodic heartbeat cycle (every 60 seconds)
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 60 * 1000);

    // 5. Start periodic backup cycle (every 6 hours)
    this.backupTimer = setInterval(() => this.checkPeriodicBackups(), 6 * 60 * 60 * 1000);

    // Initial heartbeat
    await this.sendHeartbeat();

    console.log(
      `[StreakForge Agent] Daemon active. Watching ${this.config.watchedRepositories.length} repositories on loopback port ${this.config.loopbackPort}.`
    );
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);
    if (this.backupTimer) clearInterval(this.backupTimer);

    for (const [p, watcher] of this.watchers.entries()) {
      await watcher.close();
      console.log(`[StreakForge Agent] Closed watcher for ${p}`);
    }
    this.watchers.clear();

    if (this.loopbackServer) {
      await new Promise<void>((resolve) => this.loopbackServer?.close(() => resolve()));
    }

    // Remove PID file
    try {
      if (fs.existsSync(PID_FILE_PATH)) {
        fs.unlinkSync(PID_FILE_PATH);
      }
    } catch {
      // Ignore error
    }

    console.log(`[StreakForge Agent] Daemon stopped cleanly.`);
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      version: AGENT_VERSION,
      pid: process.pid,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      loopbackPort: this.config.loopbackPort,
      serverUrl: this.config.serverUrl,
      isPaired: Boolean(this.config.apiKey && this.config.agentId),
      watchedCount: this.config.watchedRepositories.length,
      pendingProposalsCount: this.pendingProposals.filter((p) => p.status === 'PENDING').length,
      pendingActivitiesCount: this.pendingActivities.length
    };
  }

  public getWatchedRepositories(): WatchedRepositoryConfig[] {
    return this.config.watchedRepositories;
  }

  public getPendingProposals(): SyncProposal[] {
    return this.pendingProposals.filter((p) => p.status === 'PENDING');
  }

  public async startWatchingRepo(repoPath: string): Promise<boolean> {
    const resolvedPath = path.resolve(repoPath);
    const valid = await isGitRepo(resolvedPath);
    if (!valid) {
      console.warn(`[StreakForge Agent] Skipping "${resolvedPath}": Not a valid git repository.`);
      return false;
    }

    if (this.watchers.has(resolvedPath)) {
      return true;
    }

    const watcher = chokidar.watch(resolvedPath, {
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.next/**',
        '**/coverage/**',
        '**/.env*',
        '**/*.log',
        '**/.DS_Store',
        '**/Thumbs.db'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 6
    });

    watcher.on('all', (event, filePath) => {
      this.lastActivityTimes.set(resolvedPath, Date.now());
      if (this.config.logLevel === 'debug') {
        console.log(`[StreakForge Agent] [${event}] ${filePath}`);
      }
    });

    this.watchers.set(resolvedPath, watcher);
    console.log(`[StreakForge Agent] Watching repository: ${resolvedPath}`);
    return true;
  }

  public async stopWatchingRepo(repoPath: string): Promise<void> {
    const resolvedPath = path.resolve(repoPath);
    const watcher = this.watchers.get(resolvedPath);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(resolvedPath);
    }
    this.lastActivityTimes.delete(resolvedPath);
  }

  /**
   * Check idle repositories that have settled without file modification during the idle window
   */
  public async checkIdleRepositories(): Promise<void> {
    const now = Date.now();

    for (const repo of this.config.watchedRepositories) {
      const lastModified = this.lastActivityTimes.get(repo.path);
      if (!lastModified) continue;

      const idleDurationMs = now - lastModified;
      const targetIdleMs = (repo.idleMinutes || 15) * 60 * 1000;

      // If changes have settled past the idle threshold
      if (idleDurationMs >= targetIdleMs) {
        this.lastActivityTimes.delete(repo.path); // Reset activity tracker
        await this.executeSyncWorkflow(repo, 'AUTO_IDLE_TRIGGER');
      }
    }
  }

  /**
   * Periodic backup snapshots for repositories configured in BACKUP mode
   */
  public async checkPeriodicBackups(): Promise<void> {
    for (const repo of this.config.watchedRepositories) {
      if (repo.mode === 'BACKUP') {
        try {
          console.log(`[StreakForge Agent] Executing periodic backup for ${repo.path}...`);
          const result = await createBackupSnapshot(repo.path);
          repo.lastSyncedAt = result.timestamp;
          repo.lastCommitSha = result.sha;
          saveLocalConfig(this.config);
        } catch (err: any) {
          repo.lastError = err.message;
          saveLocalConfig(this.config);
        }
      }
    }
  }

  /**
   * Execute the exact 15-step synchronization workflow
   */
  public async executeSyncWorkflow(
    repoConfig: WatchedRepositoryConfig,
    triggerSource: 'MANUAL_TRIGGER' | 'AUTO_IDLE_TRIGGER' | 'PROPOSAL_APPROVED' = 'MANUAL_TRIGGER',
    customMessage?: string
  ): Promise<{ success: boolean; sha?: string; message: string }> {
    const repoPath = repoConfig.path;

    try {
      // 1. Detect changes & 2. Identify repository
      const valid = await isGitRepo(repoPath);
      if (!valid) {
        throw new Error(`Path is not a valid git repository: ${repoPath}`);
      }

      // 3. Check current branch & 4. Check repository status
      const status: GitStatusResult = await getGitStatus(repoPath);

      if (status.isDetached) {
        throw new Error(`Repository is in detached HEAD state (${status.branch}). Switch to an active branch.`);
      }

      if (status.isClean) {
        return { success: true, message: 'Working tree is clean; no changes to commit.' };
      }

      if (repoConfig.allowedBranches && repoConfig.allowedBranches.length > 0) {
        if (!repoConfig.allowedBranches.includes(status.branch)) {
          throw new Error(
            `Branch restriction active: Branch "${status.branch}" is not in approved list [${repoConfig.allowedBranches.join(', ')}]`
          );
        }
      }

      // 5. Inspect changed files & 6. Apply ignore rules
      const safeFiles = status.files.filter((f) => f.isSafe).map((f) => f.path);
      if (safeFiles.length === 0) {
        throw new Error('All modified files matched security exclusion patterns or exceeded size limits.');
      }

      // 7. Scan diff for secrets
      const diffRes = await executeGit(['diff', '--', ...safeFiles], repoPath);
      const secretCheck = scanDiffForSecrets(diffRes.stdout);
      if (!secretCheck.safe) {
        throw new Error(`Commit blocked: Potential secrets detected (${secretCheck.findings.join('; ')})`);
      }

      // 8. Generate meaningful smart commit message
      const suggestedMessage = customMessage || generateSmartCommitMessage(safeFiles, diffRes.stdout);

      // 9 & 10. Policy & Approval checks
      const mode: SyncMode = repoConfig.mode || 'AUTOMATIC';

      if (mode === 'APPROVAL' && triggerSource !== 'PROPOSAL_APPROVED') {
        // Queue proposal and await user approval
        const proposal: SyncProposal = {
          id: crypto.randomUUID(),
          repoPath,
          branch: status.branch,
          files: safeFiles,
          suggestedMessage,
          diffSummary: `${safeFiles.length} file(s) modified (${status.stagedFiles.length} staged, ${status.unstagedFiles.length} unstaged)`,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        };

        // Replace any existing pending proposal for this repo
        this.pendingProposals = this.pendingProposals.filter((p) => p.repoPath !== repoPath);
        this.pendingProposals.push(proposal);

        console.log(`[StreakForge Agent] Created sync proposal ${proposal.id.slice(0, 8)} for ${repoPath} (Awaiting user approval).`);
        await this.sendHeartbeat();
        return {
          success: true,
          message: `Created commit proposal awaiting user approval: "${suggestedMessage}"`
        };
      }

      if (mode === 'BACKUP') {
        const backupResult = await createBackupSnapshot(repoPath);
        repoConfig.lastSyncedAt = backupResult.timestamp;
        repoConfig.lastCommitSha = backupResult.sha;
        repoConfig.lastError = undefined;
        saveLocalConfig(this.config);
        return {
          success: true,
          sha: backupResult.sha,
          message: `Backup snapshot recorded: ${backupResult.sha.slice(0, 7)}`
        };
      }

      // 11. Stage eligible files & 12. Commit genuine changes & 13. Push to configured remote & 14. Verify resulting commit
      console.log(`[StreakForge Agent] Committing safe changes to ${repoPath} (${status.branch})...`);
      const result = await commitSafeChanges(repoPath, {
        message: suggestedMessage,
        autoPush: repoConfig.autoPush,
        allowedBranches: repoConfig.allowedBranches
      });

      // 15. Record operation
      repoConfig.lastSyncedAt = result.timestamp;
      repoConfig.lastCommitSha = result.sha;
      repoConfig.lastError = undefined;
      saveLocalConfig(this.config);

      const activity: AgentActivityReport = {
        repoPath,
        commitSha: result.sha,
        commitMessage: result.message,
        filesChanged: result.filesCommitted,
        timestamp: result.timestamp
      };

      this.pendingActivities.push(activity);
      console.log(`[StreakForge Agent] Successfully committed ${result.sha.slice(0, 7)}: "${result.message}"`);

      if (result.pushWarning) {
        console.warn(`[StreakForge Agent] Push notice: ${result.pushWarning}`);
      }

      await this.sendHeartbeat();

      return {
        success: true,
        sha: result.sha,
        message: `Successfully committed ${result.sha.slice(0, 7)}: ${result.message}`
      };
    } catch (err: any) {
      console.error(`[StreakForge Agent] Workflow error in ${repoPath}: ${err.message}`);
      repoConfig.lastError = err.message;
      saveLocalConfig(this.config);
      return { success: false, message: err.message };
    }
  }

  public async approveProposal(proposalId: string, customMessage?: string): Promise<{ success: boolean; message: string }> {
    const proposal = this.pendingProposals.find((p) => p.id === proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    const repo = this.config.watchedRepositories.find((r) => r.path === proposal.repoPath);
    if (!repo) {
      throw new Error(`Repository no longer watched: ${proposal.repoPath}`);
    }

    proposal.status = 'APPROVED';
    const result = await this.executeSyncWorkflow(repo, 'PROPOSAL_APPROVED', customMessage || proposal.suggestedMessage);

    if (result.success) {
      proposal.status = 'COMMITTED';
    } else {
      proposal.status = 'PENDING'; // Reset if failed
    }

    return result;
  }

  public rejectProposal(proposalId: string): boolean {
    const proposal = this.pendingProposals.find((p) => p.id === proposalId);
    if (proposal) {
      proposal.status = 'REJECTED';
      this.pendingProposals = this.pendingProposals.filter((p) => p.id !== proposalId);
      return true;
    }
    return false;
  }

  public async sendHeartbeat(): Promise<void> {
    if (!this.config.apiKey || !this.config.agentId) {
      return; // Agent not paired with server yet
    }

    try {
      const activitiesToSend = [...this.pendingActivities];
      const payload = {
        agentId: this.config.agentId,
        status: 'ONLINE',
        watchedPaths: this.config.watchedRepositories.map((r) => r.path),
        recentActivities: activitiesToSend
      };

      const res = await fetch(`${this.config.serverUrl}/api/v1/agent/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-StreakForge-Agent-Key': this.config.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Clear reported activities
        this.pendingActivities = this.pendingActivities.filter(
          (act) => !activitiesToSend.includes(act)
        );
      }
    } catch {
      // Offline or server unreachable
    }
  }

  /**
   * Secure Loopback IPC Server (127.0.0.1 only, Bearer Auth, strict path checking)
   */
  private startLoopbackServer(): void {
    const port = this.config.loopbackPort || 4545;
    const token = this.config.loopbackToken;

    this.loopbackServer = http.createServer(async (req, res) => {
      // 1. Strict loopback caller check
      const ip = req.socket.remoteAddress;
      const isLoopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      if (!isLoopback) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access forbidden: Non-loopback caller' }));
        return;
      }

      // 2. Strict CORS policy (only local web app)
      const origin = req.headers.origin;
      const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // 3. Authenticate with local bearer token
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${token}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid loopback token' }));
        return;
      }

      // 4. Request size limiter (1MB max)
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      req.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > 1024 * 1024) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload too large (1MB limit)' }));
          req.destroy();
        } else {
          chunks.push(chunk);
        }
      });

      req.on('end', async () => {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        let body: any = {};
        if (bodyStr) {
          try {
            body = JSON.parse(bodyStr);
          } catch {
            // Non-JSON body
          }
        }

        const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
        const pathname = url.pathname;

        try {
          // Route: GET /status
          if (pathname === '/status' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: this.getStatus() }));
            return;
          }

          // Route: GET /repos
          if (pathname === '/repos' && req.method === 'GET') {
            const listWithStatus = [];
            for (const r of this.config.watchedRepositories) {
              try {
                const gitStatus = await getGitStatus(r.path);
                listWithStatus.push({
                  ...r,
                  currentBranch: gitStatus.branch,
                  isClean: gitStatus.isClean,
                  modifiedCount: gitStatus.files.length,
                  remoteOriginUrl: gitStatus.remoteOriginUrl
                });
              } catch (e: any) {
                listWithStatus.push({ ...r, error: e.message });
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: listWithStatus }));
            return;
          }

          // Route: POST /repos/watch
          if (pathname === '/repos/watch' && req.method === 'POST') {
            const targetPath = body.path;
            if (!targetPath) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing repository path' }));
              return;
            }

            const resolved = path.resolve(targetPath);
            const isValid = await isGitRepo(resolved);
            if (!isValid) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Not a valid git repository: ${resolved}` }));
              return;
            }

            let entry = this.config.watchedRepositories.find((r) => r.path === resolved);
            if (!entry) {
              entry = {
                path: resolved,
                branch: 'main',
                idleMinutes: body.idleMinutes || 15,
                autoPush: Boolean(body.autoPush),
                mode: body.mode || 'AUTOMATIC'
              };
              this.config.watchedRepositories.push(entry);
            } else {
              if (body.idleMinutes) entry.idleMinutes = body.idleMinutes;
              if (body.autoPush !== undefined) entry.autoPush = body.autoPush;
              if (body.mode) entry.mode = body.mode;
            }

            saveLocalConfig(this.config);
            await this.startWatchingRepo(resolved);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: entry }));
            return;
          }

          // Route: DELETE /repos/unwatch
          if (pathname === '/repos/unwatch' && req.method === 'POST') {
            const targetPath = body.path;
            const resolved = path.resolve(targetPath);
            await this.stopWatchingRepo(resolved);
            this.config.watchedRepositories = this.config.watchedRepositories.filter((r) => r.path !== resolved);
            saveLocalConfig(this.config);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: `Unwatched ${resolved}` }));
            return;
          }

          // Route: GET /proposals
          if (pathname === '/proposals' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: this.getPendingProposals() }));
            return;
          }

          // Route: POST /proposals/approve
          if (pathname === '/proposals/approve' && req.method === 'POST') {
            const { proposalId, customMessage } = body;
            const result = await this.approveProposal(proposalId, customMessage);
            res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
          }

          // Route: POST /proposals/reject
          if (pathname === '/proposals/reject' && req.method === 'POST') {
            const { proposalId } = body;
            const success = this.rejectProposal(proposalId);
            res.writeHead(success ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success }));
            return;
          }

          // Route: POST /sync-now
          if (pathname === '/sync-now' && req.method === 'POST') {
            const targetPath = body.path ? path.resolve(body.path) : undefined;
            const repos = targetPath
              ? this.config.watchedRepositories.filter((r) => r.path === targetPath)
              : this.config.watchedRepositories;

            if (targetPath && repos.length === 0) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'PATH_NOT_APPROVED: Repository path is not registered' }));
              return;
            }

            const results = [];
            for (const r of repos) {
              const res = await this.executeSyncWorkflow(r, 'MANUAL_TRIGGER', body.message);
              results.push({ path: r.path, ...res });
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: results }));
            return;
          }

          // Route: POST /backup-now
          if (pathname === '/backup-now' && req.method === 'POST') {
            const targetPath = body.path ? path.resolve(body.path) : undefined;
            const repo = this.config.watchedRepositories.find((r) => r.path === targetPath);

            if (!repo) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'PATH_NOT_APPROVED: Repository path is not registered' }));
              return;
            }

            const backupResult = await createBackupSnapshot(repo.path);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: backupResult }));
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    });

    this.loopbackServer.listen(port, '127.0.0.1', () => {
      console.log(`[StreakForge Agent] Loopback IPC listening strictly on http://127.0.0.1:${port}`);
    });
  }
}
