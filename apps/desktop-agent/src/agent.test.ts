import { describe, it, expect } from 'vitest';
import { getLocalConfig, saveLocalConfig } from './config.js';
import { StreakForgeAgent } from './agent.js';

describe('Desktop Agent Configuration & Instantiation', () => {
  it('loads default local config safely', () => {
    const config = getLocalConfig();
    expect(config).toBeDefined();
    expect(config.serverUrl).toBeDefined();
    expect(Array.isArray(config.watchedRepositories)).toBe(true);
  });

  it('can instantiate StreakForgeAgent with custom config', () => {
    const agent = new StreakForgeAgent({
      serverUrl: 'http://127.0.0.1:4000',
      watchedRepositories: []
    });
    expect(agent).toBeDefined();
  });
});

