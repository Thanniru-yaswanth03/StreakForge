import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

function getKeyBuffer(): Buffer {
  const masterKey = ENV.ENCRYPTION_MASTER_KEY;
  if (/^[0-9a-fA-F]{64}$/.test(masterKey)) {
    return Buffer.from(masterKey, 'hex');
  }
  return crypto.createHash('sha256').update(masterKey).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns formatted string: iv:ciphertext:authTag (all hex encoded)
 */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKeyBuffer(), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

/**
 * Decrypt a token previously encrypted with AES-256-GCM
 */
export function decryptToken(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, ciphertextHex, authTagHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', getKeyBuffer(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a cryptographically secure random API key for local agents
 */
export function generateAgentApiKey(): string {
  return `sf_agent_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generate a SHA-256 hash of an API key for safe database storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

