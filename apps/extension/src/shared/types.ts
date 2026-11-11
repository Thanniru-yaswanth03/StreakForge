import type { Difficulty } from '@streakforge/shared-types';

export type SubmissionVerdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compile Error'
  | 'Output Limit Exceeded'
  | 'Unknown';

export type SubmissionState =
  | 'DETECTED'
  | 'VALIDATING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SOURCE_RETRIEVAL_PENDING'
  | 'SOURCE_RETRIEVED'
  | 'EXPORT_PENDING'
  | 'EXPORTING'
  | 'SYNCED'
  | 'FAILED'
  | 'RETRY_PENDING';

export type ExtensionAuthState =
  | 'AUTHENTICATED'
  | 'EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNAUTHENTICATED';

export type ExtensionNotificationCategory =
  | 'PROBLEM_SOLVED'
  | 'SYNC_SUCCESS'
  | 'SYNC_FAILURE'
  | 'SYSTEM';

export interface ExtensionNotificationItem {
  id: string;
  category: ExtensionNotificationCategory;
  title: string;
  message: string;
  url?: string;
  timestamp: string;
  dedupeKey: string;
}

export interface StateTransitionLog {
  id: string;
  submissionId: string;
  fromState: SubmissionState;
  toState: SubmissionState;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface DetectedSubmission {
  submissionId: string;
  questionId: string;
  questionTitle: string;
  questionSlug: string;
  difficulty: Difficulty;
  language: string;
  code: string;
  runtimeMs: number;
  runtimePercentile: number;
  memoryBytes: number;
  memoryPercentile: number;
  verdict: SubmissionVerdict;
  topicTags: string[];
  submittedAt: string;
  state: SubmissionState;
  commitSha?: string;
  commitUrl?: string;
  filePath?: string;
  errorMessage?: string;
  retryCount?: number;
  lastAttemptAt?: number;
}

export interface FailedSubmission {
  id: string;
  questionId: string;
  questionTitle: string;
  questionSlug: string;
  verdict: SubmissionVerdict;
  language: string;
  runtimeMs?: number;
  memoryBytes?: number;
  submittedAt: string;
  codeSnippet?: string;
  notes?: string;
}

export interface ActiveProblemContext {
  title: string;
  slug: string;
  id: string;
  difficulty: Difficulty;
  language: string;
  topicTags: string[];
  detectedAt: string;
}

export interface ExtensionConfig {
  authToken: string;
  serverUrl: string;
  webAppUrl?: string;
  authState?: ExtensionAuthState;
  authErrorReason?: string;
  sessionExpiresAt?: string;
  tokenHealthStatus?: 'VALID' | 'EXPIRED' | 'REVOKED' | 'MISSING' | 'UNKNOWN';
  autoSyncEnabled: boolean;
  targetRepoFullName: string;
  targetBranch: string;
  folderStructureTemplate: string;
  fileNamingPattern?: string;
  zeroPadId?: number;
  archiveFailedSubmissionsLocally: boolean;
  notifyOnSolved?: boolean;
  notifyOnSuccess: boolean;
  notifyOnSyncFailure?: boolean;
  exportNewOnly?: boolean;
  exportPolicy?: 'NEW_ONLY' | 'LATEST_ONLY' | 'ALLOW_MULTIPLE';
  allowMultipleSubmissions?: boolean;
  addSolutionComments?: boolean;
  includeMetrics?: boolean;
  userProfile?: {
    username: string;
    email: string;
    avatarUrl: string;
  };
  leetcodeUsername?: string;
  metrics?: {
    uniqueProblemsSolved: number;
    acceptedSubmissions: number;
    exportedCount: number;
    pendingCount: number;
    failedCount: number;
    currentStreak: number;
    longestStreak: number;
  };
  lastSyncedSubmission?: {
    submissionId?: string;
    questionId?: string;
    questionTitle: string;
    language: string;
    commitSha?: string;
    commitUrl?: string;
    filePath?: string;
    syncedAt?: string;
  } | null;
  lastBackendSyncAt?: string;
}

export type ExtensionMessageType = ExtensionMessage['type'];

export interface DuplicateRecord {
  syncedAt: string;
  commitSha?: string;
  commitUrl?: string;
  filePath?: string;
}

export interface ExtensionStorage {
  config: ExtensionConfig;
  pendingQueue: DetectedSubmission[];
  syncedHistory: DetectedSubmission[];
  failedArchive: FailedSubmission[];
  duplicateRegistry: Record<string, DuplicateRecord>;
  transitionLogs: StateTransitionLog[];
  notificationHistory: ExtensionNotificationItem[];
  activeProblem?: ActiveProblemContext;
}

export type ExtensionMessage =
  | {
      type: 'LEETCODE_SUBMISSION_DETECTED';
      payload: DetectedSubmission;
    }
  | {
      type: 'PROBLEM_VIEWED';
      payload: ActiveProblemContext;
    }
  | {
      type: 'MANUAL_CAPTURE_REQUEST';
    }
  | {
      type: 'FORCE_SYNC_PENDING';
    }
  | {
      type: 'GET_SYNC_STATUS';
    }
  | {
      type: 'AUTO_PAIR_TOKEN';
      payload: {
        token: string;
        serverUrl?: string;
        webAppUrl?: string;
      };
    }
  | {
      type: 'CLEAR_AUTH_TOKEN';
    }
  | {
      type: 'SYNC_FROM_BACKEND';
    }
  | {
      type: 'IMPORT_LEETCODE_HISTORY';
      payload?: {
        limit?: number;
        autoExportToGitHub?: boolean;
      };
    }
  | {
      type: 'PUSH_PREFERENCES_TO_BACKEND';
      payload: Record<string, any>;
    }
  | {
      type: 'TEST_NOTIFICATION';
    }
  | {
      type: 'UPDATE_CONFIG';
      payload: Partial<ExtensionConfig>;
    }
  | {
      type: 'CLEAR_PENDING_QUEUE';
      payload?: {
        submissionId?: string;
      };
    };
