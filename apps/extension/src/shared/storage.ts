import type {
  ExtensionConfig,
  DetectedSubmission,
  FailedSubmission,
  StateTransitionLog,
  ActiveProblemContext,
  ExtensionNotificationItem
} from './types';

export const DEFAULT_SERVER_URL = 'https://streakforge-api-5uhs.onrender.com';
export const DEFAULT_WEB_APP_URL = 'https://streak-forge-six.vercel.app';

export const DEFAULT_CONFIG: ExtensionConfig = {
  authToken: '',
  serverUrl: DEFAULT_SERVER_URL,
  webAppUrl: DEFAULT_WEB_APP_URL,
  authState: 'UNAUTHENTICATED',
  autoSyncEnabled: true,
  targetRepoFullName: '',
  targetBranch: 'main',
  folderStructureTemplate: 'solutions/{difficulty}/{id}-{slug}',
  fileNamingPattern: '{slug}{ext}',
  zeroPadId: 0,
  archiveFailedSubmissionsLocally: true,
  notifyOnSolved: true,
  notifyOnSuccess: true,
  notifyOnSyncFailure: true,
  exportNewOnly: false,
  exportPolicy: 'ALLOW_MULTIPLE',
  allowMultipleSubmissions: true,
  addSolutionComments: true,
  includeMetrics: true
};

export class StorageManager {
  public static async getConfig(): Promise<ExtensionConfig> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      return { ...DEFAULT_CONFIG };
    }
    const res = await chrome.storage.local.get('config');
    const stored = res.config || {};

    // Self-heal polluted serverUrl if web-bridge previously saved the Vercel frontend origin
    if (stored.serverUrl && stored.serverUrl.includes('.vercel.app')) {
      stored.serverUrl = DEFAULT_SERVER_URL;
      await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG, ...stored } });
    }

    return { ...DEFAULT_CONFIG, ...stored };
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
      await chrome.storage.local.set({ pendingQueue: queue.slice(0, 200) });
    }
  }

  public static async getSyncedHistory(): Promise<DetectedSubmission[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('syncedHistory');
    return res.syncedHistory || [];
  }

  public static async appendSyncedHistory(sub: DetectedSubmission): Promise<void> {
    const history = await this.getSyncedHistory();
    const filtered = history.filter((h) => h.submissionId !== sub.submissionId);
    filtered.unshift(sub);
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ syncedHistory: filtered.slice(0, 100) });
    }
  }

  public static async setSyncedHistory(history: DetectedSubmission[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ syncedHistory: history.slice(0, 100) });
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

  public static async getNotificationHistory(): Promise<ExtensionNotificationItem[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return [];
    const res = await chrome.storage.local.get('notificationHistory');
    return res.notificationHistory || [];
  }

  public static async appendNotification(item: ExtensionNotificationItem): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    const list = await this.getNotificationHistory();
    list.unshift(item);
    await chrome.storage.local.set({ notificationHistory: list.slice(0, 100) });
  }

  public static async clearNotifications(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ notificationHistory: [] });
  }
}
