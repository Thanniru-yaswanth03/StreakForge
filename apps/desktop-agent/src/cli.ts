#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { getLocalConfig, saveLocalConfig } from './config.js';
import { StreakForgeAgent } from './agent.js';
import { isGitRepo, getGitStatus } from '@streakforge/git-engine';

const program = new Command();

program
  .name('streakforge-agent')
  .description('StreakForge Local Desktop Agent CLI & Git Sync Daemon')
  .version('1.0.0');

// Command: pair
program
  .command('pair')
  .description('Pair this local desktop agent with your StreakForge account')
  .requiredOption('--server <url>', 'Central StreakForge API server URL (e.g. http://localhost:4000)')
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

// Command: watch
const watchCommand = program.command('watch').description('Manage watched local Git repositories');

watchCommand
  .command('add <path>')
  .description('Add a local git repository to the automatic watch & sync list')
  .option('--idle <minutes>', 'Idle minutes before auto-commit (default: 15)', '15')
  .option('--auto-push', 'Automatically push committed changes to remote origin', false)
  .action(async (repoPath, options) => {
    const resolvedPath = path.resolve(process.cwd(), repoPath);
    const isValid = await isGitRepo(resolvedPath);
    if (!isValid) {
      console.error(`❌ Error: "${resolvedPath}" is not a valid Git repository.`);
      process.exit(1);
    }

    const config = getLocalConfig();
    const existingIndex = config.watchedRepositories.findIndex((r) => r.path === resolvedPath);

    const repoEntry = {
      path: resolvedPath,
      branch: 'main',
      idleMinutes: parseInt(options.idle, 10) || 15,
      autoPush: Boolean(options.autoPush)
    };

    if (existingIndex >= 0) {
      config.watchedRepositories[existingIndex] = repoEntry;
      console.log(`🔄 Updated watch settings for: ${resolvedPath}`);
    } else {
      config.watchedRepositories.push(repoEntry);
      console.log(`✅ Added to watched repositories: ${resolvedPath}`);
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
    console.log('─'.repeat(60));
    for (const repo of config.watchedRepositories) {
      try {
        const status = await getGitStatus(repo.path);
        const statusIcon = status.isClean ? '🟢 Clean' : `🟡 ${status.files.length} changes`;
        console.log(`- Path: ${repo.path}`);
        console.log(`  Branch: ${status.branch} | Status: ${statusIcon} | Idle: ${repo.idleMinutes}m | Auto-Push: ${repo.autoPush}`);
      } catch (err: any) {
        console.log(`- Path: ${repo.path} [Error reading status: ${err.message}]`);
      }
    }
    console.log('─'.repeat(60));
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

// Command: run / daemon
program
  .command('run')
  .alias('daemon')
  .description('Start the local desktop agent daemon process in foreground')
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

// Command: commit
program
  .command('commit')
  .description('Immediately commit genuine changes across all watched repositories')
  .action(async () => {
    const config = getLocalConfig();
    const agent = new StreakForgeAgent();
    console.log('Executing safe commit checks...');
    for (const repo of config.watchedRepositories) {
      await agent.commitRepositoryIfEligible(repo.path, repo.autoPush);
    }
    console.log('Done.');
  });

program.parse(process.argv);

