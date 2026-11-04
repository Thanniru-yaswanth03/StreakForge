import type {
  ExtensionConfig,
  DetectedSubmission,
  FailedSubmission,
  StateTransitionLog,
  ActiveProblemContext,
  ExtensionStorage
} from './types';

export const DEFAULT_CONFIG: ExtensionConfig = {
  authToken: '',
  serverUrl: 'http://localhost:4000',
  autoSyncEnabled: true,
  targetRepoFullName: '',
  targetBranch: 'main',
  folderStructureTemplate: 'leetcode-solutions/{Language}/{Topic}/{id}_{slug}{ext}',
  archiveFailedSubmissionsLocally: true,
  notifyOnSuccess: true
};

export class StorageManager {
  public static async getConfig(): Promise<ExtensionConfig> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { ...DEFAULT_CONFIG };
    }
    const res = await chrome.storage.local.get('config');
    return { ...DEFAULT_CONFIG, ...(res.config || {}) };
  }

  public static async updateConfig(partial: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...partial };
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ config: updated });
    }
    return updated;
  }

  public static async getPendingQueue(): Promise<DetectedSubmission[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('pendingQueue');
    return res.pendingQueue || [];
  }

  public static async setPendingQueue(queue: DetectedSubmission[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ pendingQueue: queue });
    }
  }

  public static async getSyncedHistory(): Promise<DetectedSubmission[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('syncedHistory');
    return res.syncedHistory || [];
  }

  public static async appendSyncedHistory(sub: DetectedSubmission): Promise<void> {
    const history = await this.getSyncedHistory();
    // Prepend to show latest first and retain up to 100
    const filtered = history.filter((h) => h.submissionId !== sub.submissionId);
    filtered.unshift(sub);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ syncedHistory: filtered.slice(0, 100) });
    }
  }

  public static async getFailedArchive(): Promise<FailedSubmission[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('failedArchive');
    return res.failedArchive || [];
  }

  public static async archiveFailedSubmission(sub: FailedSubmission): Promise<void> {
    const archive = await this.getFailedArchive();
    archive.unshift(sub);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ failedArchive: archive.slice(0, 100) });
    }
  }

  public static async getActiveProblem(): Promise<ActiveProblemContext | undefined> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return undefined;
    const res = await chrome.storage.local.get('activeProblem');
    return res.activeProblem;
  }

  public static async setActiveProblem(prob: ActiveProblemContext): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ activeProblem: prob });
    }
  }

  public static async getTransitionLogs(): Promise<StateTransitionLog[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('transitionLogs');
    return res.transitionLogs || [];
  }
}
