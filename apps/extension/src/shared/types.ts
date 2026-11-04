import type { LeetCodeSubmissionInput, Difficulty } from '@streakforge/shared-types';

export interface ExtensionStorage {
  authToken?: string;
  serverUrl?: string;
  userProfile?: {
    username: string;
    avatarUrl: string;
  };
  pendingSubmissions: LeetCodeSubmissionInput[];
  syncedSubmissions: Array<LeetCodeSubmissionInput & { commitUrl?: string; syncedAt: string }>;
  streakSummary?: {
    currentStreak: number;
    hasSubmittedToday: boolean;
    todayLeetCodeCount: number;
  };
}

export type ExtensionMessage =
  | {
      type: 'LEETCODE_SUBMISSION_DETECTED';
      payload: LeetCodeSubmissionInput;
    }
  | {
      type: 'FORCE_SYNC_PENDING';
    }
  | {
      type: 'GET_SYNC_STATUS';
    };

