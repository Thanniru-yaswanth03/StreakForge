import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken, generateAgentApiKey, hashApiKey } from './utils/crypto.js';

describe('AES-256-GCM Token Encryption', () => {
  it('encrypts and decrypts OAuth tokens reliably', () => {
    const rawToken = 'gho_1234567890abcdefghijklmnopqrstuvwxyz';
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it('fails decryption when encrypted payload is tampered with', () => {
    const rawToken = 'gho_secret_token';
    const encrypted = encryptToken(rawToken);
    const parts = encrypted.split(':');
    // Tamper with ciphertext
    parts[1] = 'ffff' + parts[1].slice(4);
    const tampered = parts.join(':');

    expect(() => decryptToken(tampered)).toThrow();
  });

  it('generates secure agent API keys and hashes them consistently', () => {
    const key1 = generateAgentApiKey();
    const key2 = generateAgentApiKey();

    expect(key1).toMatch(/^sf_agent_[a-f0-9]{48}$/);
    expect(key2).toMatch(/^sf_agent_[a-f0-9]{48}$/);
    expect(key1).not.toBe(key2);

    const hash1 = hashApiKey(key1);
    const hash2 = hashApiKey(key1);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });
});

