// ========================================================
// StreakForge Shared Types & Domain Contracts
// ========================================================

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'PAUSED';

export type AuditComponent = 'API' | 'EXTENSION' | 'AGENT' | 'WEB';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO';

export interface User {
  id: string;
  githubId: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  timezone: string;
  streakGoalPerDay: number;
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    streakWarningHoursBefore: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  provider: 'github';
  providerAccountId: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryConnection {
  id: string;
  userId: string;
  githubRepoId: number;
  repoFullName: string;
  defaultBranch: string;
  solutionPathPattern: string;
  isPrivate: boolean;
  isTargetForLeetCode: boolean;
  autoCommitEnabled: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeetCodeSubmission {
  id: string;
  userId: string;
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
  status: 'Accepted';
  submittedAt: string;
  syncStatus: SyncStatus;
  githubCommitSha?: string;
  githubCommitUrl?: string;
  filePath?: string;
  syncErrorMessage?: string;
  syncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchedRepositoryConfig {
  path: string;
  branch: string;
  idleMinutes: number;
  autoPush: boolean;
  ignorePatterns?: string[];
}

export interface LocalAgentInstance {
  id: string;
  userId: string;
  agentId: string;
  name: string;
  hostname: string;
  os: string;
  agentVersion: string;
  status: AgentStatus;
  lastHeartbeatAt: string;
  watchedPaths: string[];
  rules: {
    idleAutoCommitMinutes: number;
    autoPushOnCommit: boolean;
    allowedBranches: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  component: AuditComponent;
  action: string;
  status: AuditStatus;
  description: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface DailyActivitySnapshot {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  gitCommitCount: number;
  leetCodeCount: number;
  totalActivities: number;
  languagesUsed: string[];
  streakMaintained: boolean;
  createdAt: string;
  updatedAt: string;
}

// --------------------------------------------------------
// Request & Response DTOs
// --------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export interface LeetCodeSubmissionInput {
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
  submittedAt: string;
}

export interface ConnectRepositoryInput {
  repoFullName: string;
  githubRepoId: number;
  defaultBranch?: string;
  isTargetForLeetCode?: boolean;
  solutionPathPattern?: string;
  autoCommitEnabled?: boolean;
}

export interface AgentRegisterInput {
  name: string;
  hostname: string;
  os: string;
  agentVersion: string;
}

export interface AgentRegisterResponse {
  agentId: string;
  apiKey: string;
  name: string;
}

export interface AgentActivityReport {
  repoPath: string;
  commitSha: string;
  commitMessage: string;
  filesChanged: number;
  timestamp: string;
}

export interface AgentHeartbeatInput {
  agentId: string;
  status: AgentStatus;
  watchedPaths: string[];
  recentActivities?: AgentActivityReport[];
}

export interface AnalyticsOverview {
  currentStreak: number;
  longestStreak: number;
  hasSubmittedToday: boolean;
  todayCommitCount: number;
  todayLeetCodeCount: number;
  weeklyConsistencyPercent: number;
  streakDeadlineHoursLeft: number;
  totalLeetCodeSolved: number;
  totalGitCommitsTracked: number;
  difficultyDistribution: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  gitCommits: number;
  leetCodeSubmissions: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  component?: AuditComponent;
  status?: AuditStatus;
  action?: string;
  startDate?: string;
  endDate?: string;
}

