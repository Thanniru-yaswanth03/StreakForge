import type { DuplicateRecord } from './types';

/**
 * Generates an idempotent submission key
 */
export function generateSubmissionKey(
  userId: string,
  submissionId: string,
  repoFullName: string
): string {
  const cleanUser = (userId || 'anonymous').trim().toLowerCase();
  const cleanSub = submissionId.trim();
  const cleanRepo = (repoFullName || 'default-repo').trim().toLowerCase();
  return `${cleanUser}:${cleanSub}:${cleanRepo}`;
}

/**
 * Duplicate Prevention Registry backed by Chrome Local Storage
 */
export class DuplicateRegistry {
  private static async getRegistry(): Promise<Record<string, DuplicateRecord>> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return {};
    }
    const res = await chrome.storage.local.get('duplicateRegistry');
    return res.duplicateRegistry || {};
  }

  private static async saveRegistry(registry: Record<string, DuplicateRecord>): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return;
    }
    await chrome.storage.local.set({ duplicateRegistry: registry });
  }

  /**
   * Check if a submission has already been synchronized
   */
  public static async isDuplicate(key: string): Promise<{ isDuplicate: boolean; record?: DuplicateRecord }> {
    const registry = await this.getRegistry();
    const record = registry[key];
    if (record) {
      return { isDuplicate: true, record };
    }
    return { isDuplicate: false };
  }

  /**
   * Register a synchronized submission to prevent duplicate commits
   */
  public static async register(
    key: string,
    details: { commitSha?: string; commitUrl?: string; filePath?: string }
  ): Promise<void> {
    const registry = await this.getRegistry();
    registry[key] = {
      syncedAt: new Date().toISOString(),
      commitSha: details.commitSha,
      commitUrl: details.commitUrl,
      filePath: details.filePath
    };
    await this.saveRegistry(registry);
  }

  /**
   * Return count of tracked submissions
   */
  public static async count(): Promise<number> {
    const registry = await this.getRegistry();
    return Object.keys(registry).length;
  }

  /**
   * Clear the duplicate registry (e.g. from Options page)
   */
  public static async clear(): Promise<void> {
    await this.saveRegistry({});
  }
}

