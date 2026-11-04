import http from 'node:http';
import chokidar, { FSWatcher } from 'chokidar';
import {
  isGitRepo,
  getGitStatus,
  commitSafeChanges
} from '@streakforge/git-engine';
import type { AgentActivityReport } from '@streakforge/shared-types';
import { getLocalConfig, saveLocalConfig, AgentLocalConfig } from './config.js';

export class StreakForgeAgent {
  private config: AgentLocalConfig;
  private watchers: Map<string, FSWatcher> = new Map();
  private lastActivityTimes: Map<string, number> = new Map();
  private pendingActivities: AgentActivityReport[] = [];
  private heartbeatTimer?: NodeJS.Timeout;
  private idleCheckTimer?: NodeJS.Timeout;
  private loopbackServer?: http.Server;
  private isRunning: boolean = false;

  constructor(customConfig?: Partial<AgentLocalConfig>) {
    this.config = { ...getLocalConfig(), ...customConfig };
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[StreakForge Agent] Initializing daemon...`);

    // 1. Validate watched repositories
    for (const repo of this.config.watchedRepositories) {
      await this.startWatchingRepo(repo.path);
    }

    // 2. Start loopback HTTP IPC server
    this.startLoopbackServer();

    // 3. Start idle check cycle (every 30 seconds)
    this.idleCheckTimer = setInterval(() => this.checkIdleRepositories(), 30 * 1000);

    // 4. Start heartbeat cycle (every 60 seconds)
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 60 * 1000);

    // Immediate initial heartbeat
    await this.sendHeartbeat();

    console.log(`[StreakForge Agent] Daemon active. Watching ${this.config.watchedRepositories.length} repositories.`);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.idleCheckTimer) clearInterval(this.idleCheckTimer);

    for (const [p, watcher] of this.watchers.entries()) {
      await watcher.close();
      console.log(`[StreakForge Agent] Stopped watcher for ${p}`);
    }
    this.watchers.clear();

    if (this.loopbackServer) {
      this.loopbackServer.close();
    }

    console.log(`[StreakForge Agent] Daemon stopped.`);
  }

  public async startWatchingRepo(repoPath: string): Promise<boolean> {
    const valid = await isGitRepo(repoPath);
    if (!valid) {
      console.warn(`[StreakForge Agent] Skipping "${repoPath}": Not a valid git repository.`);
      return false;
    }

    if (this.watchers.has(repoPath)) {
      return true;
    }

    const watcher = chokidar.watch(repoPath, {
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/.env*',
        '**/*.log'
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 6
    });

    watcher.on('all', (event, filePath) => {
      this.lastActivityTimes.set(repoPath, Date.now());
      if (this.config.logLevel === 'debug') {
        console.log(`[StreakForge Agent] [${event}] ${filePath}`);
      }
    });

    this.watchers.set(repoPath, watcher);
    console.log(`[StreakForge Agent] Watching repository: ${repoPath}`);
    return true;
  }

  public async checkIdleRepositories(): Promise<void> {
    const now = Date.now();

    for (const repo of this.config.watchedRepositories) {
      const lastModified = this.lastActivityTimes.get(repo.path);
      if (!lastModified) continue;

      const idleDurationMs = now - lastModified;
      const targetIdleMs = (repo.idleMinutes || 15) * 60 * 1000;

      // If idle threshold reached
      if (idleDurationMs >= targetIdleMs) {
        this.lastActivityTimes.delete(repo.path); // Reset activity tracker
        await this.commitRepositoryIfEligible(repo.path, repo.autoPush);
      }
    }
  }

  public async commitRepositoryIfEligible(repoPath: string, autoPush?: boolean): Promise<void> {
    try {
      const status = await getGitStatus(repoPath);
      if (status.isClean || !status.hasSafeChanges) {
        return; // No genuine safe changes to commit
      }

      console.log(`[StreakForge Agent] Auto-committing genuine changes in ${repoPath}...`);
      const result = await commitSafeChanges(repoPath, {
        autoPush: autoPush ?? false
      });

      console.log(`[StreakForge Agent] Committed: ${result.sha.slice(0, 7)} - ${result.message}`);

      this.pendingActivities.push({
        repoPath,
        commitSha: result.sha,
        commitMessage: result.message,
        filesChanged: result.filesCommitted,
        timestamp: result.timestamp
      });

      // Trigger immediate heartbeat to sync with server
      await this.sendHeartbeat();
    } catch (error: any) {
      console.error(`[StreakForge Agent] Auto-commit error in ${repoPath}: ${error.message}`);
    }
  }

  public async sendHeartbeat(): Promise<void> {
    if (!this.config.apiKey || !this.config.agentId) {
      return; // Agent not paired yet
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
      } else {
        const text = await res.text();
        console.warn(`[StreakForge Agent] Heartbeat error (${res.status}): ${text}`);
      }
    } catch (error: any) {
      console.warn(`[StreakForge Agent] Heartbeat failed to reach server: ${error.message}`);
    }
  }

  private startLoopbackServer(): void {
    const port = this.config.loopbackPort || 4545;
    const token = this.config.loopbackToken;

    this.loopbackServer = http.createServer(async (req, res) => {
      // Security: Only accept connections from loopback 127.0.0.1
      const ip = req.socket.remoteAddress;
      if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access forbidden: Non-loopback caller' }));
        return;
      }

      const auth = req.headers.authorization;
      if (auth !== `Bearer ${token}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized loopback IPC' }));
        return;
      }

      if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            isRunning: this.isRunning,
            agentId: this.config.agentId,
            watchedCount: this.config.watchedRepositories.length,
            pendingCommits: this.pendingActivities.length
          })
        );
        return;
      }

      if (req.url === '/commit-now' && req.method === 'POST') {
        for (const repo of this.config.watchedRepositories) {
          await this.commitRepositoryIfEligible(repo.path, repo.autoPush);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Triggered immediate commit checks' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    });

    this.loopbackServer.listen(port, '127.0.0.1', () => {
      console.log(`[StreakForge Agent] Loopback IPC listening on http://127.0.0.1:${port}`);
    });
  }
}

