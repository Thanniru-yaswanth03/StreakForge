#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import {
  getLocalConfig,
  saveLocalConfig,
  configureAutostart,
  AGENT_VERSION,
  PID_FILE_PATH
} from './config.js';
import { StreakForgeAgent } from './agent.js';
import { isGitRepo, getGitStatus } from '@streakforge/git-engine';

const program = new Command();

program
  .name('streakforge-agent')
  .description('StreakForge Local Desktop Agent CLI & Git Sync Daemon')
  .version(AGENT_VERSION);

// 1. Command: pair
program
  .command('pair')
  .description('Pair this local desktop agent with your StreakForge account')
  .requiredOption('--server <url>', 'StreakForge API server URL (e.g. http://localhost:4000)')
  .requiredOption('--key <key>', 'Agent API Key issued from StreakForge dashboard')
  .requiredOption('--agent-id <id>', 'Agent ID issued from StreakForge dashboard')
  .action((options) => {
    const config = getLocalConfig();
    config.serverUrl = options.server.replace(/\/$/, '');
    config.apiKey = options.key;
    config.agentId = options.agentId;
    saveLocalConfig(config);
    console.log('✅ Local agent successfully paired with StreakForge server!');
    console.log(`Server: ${config.serverUrl}`);
    console.log(`Agent ID: ${config.agentId}`);
  });

// 2. Command: status
program
  .command('status')
  .description('Display local agent daemon health, loopback port, and watched repositories')
  .action(async () => {
    const config = getLocalConfig();
    let isDaemonRunning = false;
    let daemonPid: number | undefined;

    if (fs.existsSync(PID_FILE_PATH)) {
      try {
        const rawPid = fs.readFileSync(PID_FILE_PATH, 'utf-8').trim();
        daemonPid = parseInt(rawPid, 10);
        // Check if process is alive (signal 0)
        process.kill(daemonPid, 0);
        isDaemonRunning = true;
      } catch {
        isDaemonRunning = false;
      }
    }

    console.log('\n========================================');
    console.log(`  StreakForge Desktop Agent v${AGENT_VERSION}`);
    console.log('========================================');
    console.log(`Status:            ${isDaemonRunning ? '🟢 RUNNING' : '⚪ STOPPED'}`);
    if (daemonPid && isDaemonRunning) {
      console.log(`PID:               ${daemonPid}`);
    }
    console.log(`Loopback Port:     ${config.loopbackPort} (127.0.0.1)`);
    console.log(`Server URL:        ${config.serverUrl}`);
    console.log(`Paired Account:    ${config.agentId ? `Yes (${config.agentId})` : 'No (run streakforge-agent pair)'}`);
    console.log(`Auto-start:        ${config.autoStartEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Watched Repos:     ${config.watchedRepositories.length}`);

    if (config.watchedRepositories.length > 0) {
      console.log('\nRepositories:');
      for (const r of config.watchedRepositories) {
        try {
          const status = await getGitStatus(r.path);
          const icon = status.isClean ? '🟢 Clean' : `🟡 ${status.files.length} changes`;
          console.log(`  • ${r.path}`);
          console.log(`    Branch: ${status.branch} | Mode: ${r.mode || 'AUTOMATIC'} | Status: ${icon}`);
        } catch {
          console.log(`  • ${r.path} [unreadable]`);
        }
      }
    }
    console.log('========================================\n');
  });

// 3. Command: start (Background daemon)
program
  .command('start')
  .description('Start the local desktop agent as a background process')
  .action(() => {
    if (fs.existsSync(PID_FILE_PATH)) {
      try {
        const rawPid = fs.readFileSync(PID_FILE_PATH, 'utf-8').trim();
        const pid = parseInt(rawPid, 10);
        process.kill(pid, 0);
        console.log(`⚠️ Agent daemon is already running (PID: ${pid}).`);
        return;
      } catch {
        // Stale PID file
      }
    }

    const scriptPath = path.resolve(__dirname, 'cli.js');
    const child = spawn(process.execPath, [scriptPath, 'run'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });

    child.unref();
    console.log(`🚀 StreakForge agent background daemon started (PID: ${child.pid}).`);
    console.log('Use "streakforge-agent status" to inspect health, or "streakforge-agent stop" to terminate.');
  });

// 4. Command: stop
program
  .command('stop')
  .description('Stop the running local desktop agent background daemon')
  .action(() => {
    if (!fs.existsSync(PID_FILE_PATH)) {
      console.log('⚪ Agent daemon is not currently running.');
      return;
    }

    try {
      const rawPid = fs.readFileSync(PID_FILE_PATH, 'utf-8').trim();
      const pid = parseInt(rawPid, 10);
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(PID_FILE_PATH);
      console.log(`🛑 StreakForge agent daemon (PID: ${pid}) stopped.`);
    } catch (err: any) {
      console.log(`Error stopping agent daemon: ${err.message}`);
      try {
        fs.unlinkSync(PID_FILE_PATH);
      } catch {}
    }
  });

// 5. Command: run / daemon (Foreground process)
program
  .command('run')
  .alias('daemon')
  .description('Start the local desktop agent daemon in foreground (interactive / service mode)')
  .action(async () => {
    const agent = new StreakForgeAgent();
    await agent.start();

    const shutdown = async () => {
      console.log('\nStopping agent daemon...');
      await agent.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

// 6. Command: watch
const watchCommand = program.command('watch').description('Manage watched local Git repositories');

watchCommand
  .command('add <path>')
  .description('Add a local git repository to the watch and sync list')
  .option('--idle <minutes>', 'Idle minutes before auto-commit (default: 15)', '15')
  .option('--auto-push', 'Automatically push committed changes to remote origin', false)
  .option('--mode <mode>', 'Sync mode: MANUAL, APPROVAL, AUTOMATIC, or BACKUP', 'AUTOMATIC')
  .action(async (repoPath, options) => {
    const resolvedPath = path.resolve(process.cwd(), repoPath);
    const isValid = await isGitRepo(resolvedPath);
    if (!isValid) {
      console.error(`❌ Error: "${resolvedPath}" is not a valid Git repository.`);
      process.exit(1);
    }

    const config = getLocalConfig();
    const existingIndex = config.watchedRepositories.findIndex((r) => r.path === resolvedPath);

    const validModes = ['MANUAL', 'APPROVAL', 'AUTOMATIC', 'BACKUP'];
    const mode = validModes.includes(options.mode.toUpperCase()) ? options.mode.toUpperCase() : 'AUTOMATIC';

    const repoEntry = {
      path: resolvedPath,
      branch: 'main',
      idleMinutes: parseInt(options.idle, 10) || 15,
      autoPush: Boolean(options.autoPush),
      mode
    };

    if (existingIndex >= 0) {
      config.watchedRepositories[existingIndex] = repoEntry;
      console.log(`🔄 Updated watch settings for: ${resolvedPath} (Mode: ${mode})`);
    } else {
      config.watchedRepositories.push(repoEntry);
      console.log(`✅ Added to watched repositories: ${resolvedPath} (Mode: ${mode})`);
    }

    saveLocalConfig(config);
  });

watchCommand
  .command('list')
  .description('List all currently watched local repositories and their Git status')
  .action(async () => {
    const config = getLocalConfig();
    if (config.watchedRepositories.length === 0) {
      console.log('No repositories are currently watched. Add one using: streakforge-agent watch add <path>');
      return;
    }

    console.log('\n📂 Watched Repositories:');
    console.log('─'.repeat(70));
    for (const repo of config.watchedRepositories) {
      try {
        const status = await getGitStatus(repo.path);
        const statusIcon = status.isClean ? '🟢 Clean' : `🟡 ${status.files.length} changes`;
        console.log(`- Path:      ${repo.path}`);
        console.log(`  Branch:    ${status.branch} | Mode: ${repo.mode || 'AUTOMATIC'}`);
        console.log(`  Status:    ${statusIcon} | Idle Window: ${repo.idleMinutes}m | Auto-Push: ${repo.autoPush}`);
        if (repo.lastSyncedAt) {
          console.log(`  Last Sync: ${repo.lastSyncedAt} (${repo.lastCommitSha?.slice(0, 7) || 'n/a'})`);
        }
        if (repo.lastError) {
          console.log(`  Last Error: ⚠️ ${repo.lastError}`);
        }
      } catch (err: any) {
        console.log(`- Path: ${repo.path} [Error reading status: ${err.message}]`);
      }
      console.log('─'.repeat(70));
    }
  });

watchCommand
  .command('remove <path>')
  .description('Remove a local repository from the watched list')
  .action((repoPath) => {
    const resolvedPath = path.resolve(process.cwd(), repoPath);
    const config = getLocalConfig();
    const initialLen = config.watchedRepositories.length;
    config.watchedRepositories = config.watchedRepositories.filter((r) => r.path !== resolvedPath);

    if (config.watchedRepositories.length < initialLen) {
      saveLocalConfig(config);
      console.log(`✅ Removed repository from watch list: ${resolvedPath}`);
    } else {
      console.log(`⚠️ Repository not found in watch list: ${resolvedPath}`);
    }
  });

// 7. Command: sync
program
  .command('sync [path]')
  .description('Immediately execute safe synchronization for a repository (or all watched repos)')
  .option('-m, --message <msg>', 'Custom commit message override')
  .action(async (repoPath, options) => {
    const config = getLocalConfig();
    const agent = new StreakForgeAgent();

    const targetRepos = repoPath
      ? config.watchedRepositories.filter((r) => r.path === path.resolve(repoPath))
      : config.watchedRepositories;

    if (targetRepos.length === 0) {
      console.log('No matching repositories found to synchronize.');
      return;
    }

    console.log('Executing safe synchronization workflow...');
    for (const repo of targetRepos) {
      const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER', options.message);
      if (res.success) {
        console.log(`✅ ${repo.path}: ${res.message}`);
      } else {
        console.error(`❌ ${repo.path}: ${res.message}`);
      }
    }
  });

// 8. Command: backup
program
  .command('backup <path>')
  .description('Create an explicit backup snapshot commit for a project repository')
  .action(async (repoPath) => {
    const resolved = path.resolve(repoPath);
    const isValid = await isGitRepo(resolved);
    if (!isValid) {
      console.error(`❌ Error: "${resolved}" is not a valid Git repository.`);
      process.exit(1);
    }

    const config = getLocalConfig();
    let repo = config.watchedRepositories.find((r) => r.path === resolved);
    if (!repo) {
      repo = { path: resolved, branch: 'main', idleMinutes: 15, autoPush: false, mode: 'BACKUP' };
    }

    const agent = new StreakForgeAgent();
    console.log(`Creating backup snapshot for ${resolved}...`);
    const res = await agent.executeSyncWorkflow(repo, 'MANUAL_TRIGGER');
    if (res.success) {
      console.log(`✅ Backup created: ${res.message}`);
    } else {
      console.error(`❌ Backup failed: ${res.message}`);
    }
  });

// 9. Command: autostart
program
  .command('autostart <action>')
  .description('Configure agent automatic startup on system boot (enable | disable)')
  .action(async (action) => {
    const enable = action.toLowerCase() === 'enable';
    if (!enable && action.toLowerCase() !== 'disable') {
      console.error('Invalid action. Use "enable" or "disable".');
      process.exit(1);
    }

    console.log(`Configuring automatic startup: ${enable ? 'ENABLE' : 'DISABLE'}...`);
    const res = await configureAutostart(enable);
    if (res.success) {
      console.log(`✅ ${res.message}`);
    } else {
      console.error(`❌ ${res.message}`);
    }
  });

program.parse(process.argv);
