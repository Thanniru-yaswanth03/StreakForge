import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { WatchedRepositoryConfig } from '@streakforge/shared-types';

export interface AgentLocalConfig {
  agentId?: string;
  apiKey?: string;
  serverUrl: string;
  loopbackPort: number;
  loopbackToken: string;
  watchedRepositories: WatchedRepositoryConfig[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.streakforge');
const CONFIG_FILE_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');

export function getLocalConfig(): AgentLocalConfig {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    return {
      serverUrl: 'http://localhost:4000',
      loopbackPort: 4545,
      loopbackToken: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2),
      watchedRepositories: [],
      logLevel: 'info'
    };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      serverUrl: 'http://localhost:4000',
      loopbackPort: 4545,
      loopbackToken: 'default_local_token',
      watchedRepositories: [],
      logLevel: 'info'
    };
  }
}

export function saveLocalConfig(config: AgentLocalConfig): void {
  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    fs.mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

