import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { WatchedRepositoryConfig } from '@streakforge/shared-types';

const execAsync = promisify(exec);

export interface AgentLocalConfig {
  agentId?: string;
  apiKey?: string;
  serverUrl: string;
  loopbackPort: number;
  loopbackToken: string;
  watchedRepositories: WatchedRepositoryConfig[];
  autoStartEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  agentVersion: string;
}

export const AGENT_VERSION = '1.0.0';

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), '.streakforge');
const CONFIG_FILE_PATH = path.join(DEFAULT_CONFIG_DIR, 'config.json');
export const PID_FILE_PATH = path.join(DEFAULT_CONFIG_DIR, 'agent.pid');

export function getLocalConfig(): AgentLocalConfig {
  if (!fs.existsSync(CONFIG_FILE_PATH)) {
    const freshToken = crypto.randomBytes(24).toString('hex');
    const defaultConfig: AgentLocalConfig = {
      serverUrl: 'http://localhost:4000',
      loopbackPort: 4545,
      loopbackToken: freshToken,
      watchedRepositories: [],
      autoStartEnabled: false,
      logLevel: 'info',
      agentVersion: AGENT_VERSION
    };
    saveLocalConfig(defaultConfig);
    return defaultConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      serverUrl: parsed.serverUrl || 'http://localhost:4000',
      loopbackPort: parsed.loopbackPort || 4545,
      loopbackToken: parsed.loopbackToken || crypto.randomBytes(24).toString('hex'),
      watchedRepositories: parsed.watchedRepositories || [],
      autoStartEnabled: Boolean(parsed.autoStartEnabled),
      logLevel: parsed.logLevel || 'info',
      agentVersion: AGENT_VERSION,
      agentId: parsed.agentId,
      apiKey: parsed.apiKey
    };
  } catch {
    return {
      serverUrl: 'http://localhost:4000',
      loopbackPort: 4545,
      loopbackToken: crypto.randomBytes(24).toString('hex'),
      watchedRepositories: [],
      autoStartEnabled: false,
      logLevel: 'info',
      agentVersion: AGENT_VERSION
    };
  }
}

export function saveLocalConfig(config: AgentLocalConfig): void {
  if (!fs.existsSync(DEFAULT_CONFIG_DIR)) {
    fs.mkdirSync(DEFAULT_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Configure automatic startup with explicit user permission
 */
export async function configureAutostart(enable: boolean): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();
  const config = getLocalConfig();

  if (platform === 'win32') {
    try {
      const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
      const entryName = 'StreakForgeAgent';

      if (enable) {
        // Find path to streakforge-agent or node wrapper
        const agentScript = path.resolve(__dirname, 'cli.js');
        const nodeExe = process.execPath;
        const cmdVal = `"${nodeExe}" "${agentScript}" run`;

        await execAsync(`reg add "${regKey}" /v "${entryName}" /t REG_SZ /d "${cmdVal}" /f`);
        config.autoStartEnabled = true;
        saveLocalConfig(config);
        return { success: true, message: 'Windows auto-start enabled in registry (CurrentVersion\\Run).' };
      } else {
        try {
          await execAsync(`reg delete "${regKey}" /v "${entryName}" /f`);
        } catch {
          // Key may not exist
        }
        config.autoStartEnabled = false;
        saveLocalConfig(config);
        return { success: true, message: 'Windows auto-start disabled.' };
      }
    } catch (err: any) {
      return { success: false, message: `Failed to configure Windows auto-start: ${err.message}` };
    }
  } else if (platform === 'darwin') {
    // macOS launchd instructions
    config.autoStartEnabled = enable;
    saveLocalConfig(config);
    return {
      success: true,
      message: enable
        ? 'Configured auto-start setting. See docs/LOCAL_AGENT_GUIDE.md for launchd ~/Library/LaunchAgents/dev.streakforge.agent.plist template.'
        : 'Auto-start disabled.'
    };
  } else {
    // Linux systemd user service instructions
    config.autoStartEnabled = enable;
    saveLocalConfig(config);
    return {
      success: true,
      message: enable
        ? 'Configured auto-start setting. See docs/LOCAL_AGENT_GUIDE.md for ~/.config/systemd/user/streakforge-agent.service setup.'
        : 'Auto-start disabled.'
    };
  }
}
