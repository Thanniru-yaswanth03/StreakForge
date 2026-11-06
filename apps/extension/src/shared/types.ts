import type { Difficulty, LeetCodeSubmissionInput } from '@streakforge/shared-types';

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
  autoSyncEnabled: boolean;
  targetRepoFullName: string;
  targetBranch: string;
  folderStructureTemplate: string;
  archiveFailedSubmissionsLocally: boolean;
  notifyOnSuccess: boolean;
  exportNewOnly?: boolean;
  allowMultipleSubmissions?: boolean;
  addSolutionComments?: boolean;
  userProfile?: {
    username: string;
    email: string;
    avatarUrl: string;
  };
  leetcodeUsername?: string;
  webAppUrl?: string;
}

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
      type: 'MANUAL_CAPTURE_RESPONSE';
      payload: {
        code: string;
        language: string;
      };
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
      };
    }
  | {
      type: 'SYNC_FROM_BACKEND';
    }
  | {
      type: 'UPDATE_CONFIG';
      payload: Partial<ExtensionConfig>;
    };
