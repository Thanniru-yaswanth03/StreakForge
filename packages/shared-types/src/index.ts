// ========================================================
// StreakForge Shared Types & Domain Contracts
// ========================================================

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED' | 'SKIPPED';

export type AgentStatus = 'ONLINE' | 'OFFLINE' | 'PAUSED';

export type AuditComponent = 'API' | 'EXTENSION' | 'AGENT' | 'WEB';

export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'WARNING' | 'INFO';

export interface LeetCodeUserStats {
  username: string;
  realName?: string;
  ranking?: number;
  userAvatar?: string;
  reputation?: number;
  aboutMe?: string;
  countryName?: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions: number;
  acceptanceRate: number;
  totalActiveDays?: number;
  maxStreak?: number;
  submissionCalendar?: string;
  badgesCount?: number;
  easyTotal?: number;
  mediumTotal?: number;
  hardTotal?: number;
  lastSyncedAt: string;
}

export interface User {
  id: string;
  githubId: string;
  username: string;
  name: string;
  email: string;
  verifiedEmails?: string[];
  avatarUrl: string;
  timezone: string;
  streakGoalPerDay: number;
  notificationPreferences: {
    inApp: boolean;
    email: boolean;
    streakWarningHoursBefore: number;
  };
  leetcodeUsername?: string;
  leetcodeStats?: LeetCodeUserStats;
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

export interface SyncPolicy {
  autoCommit: boolean;
  autoPush: boolean;
  branch: string;
  pathPattern: string;
  intervalMinutes: number;
}

export interface RepositoryConnection {
  id: string;
  userId: string;
  githubRepoId: number;
  repoFullName: string;
  description?: string;
  primaryLanguage?: string;
  cloneUrl?: string;
  defaultBranch: string;
  solutionPathPattern: string;
  isPrivate: boolean;
  isTargetForLeetCode: boolean;
  autoCommitEnabled: boolean;
  category?: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  syncPolicy?: SyncPolicy;
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
  topicTags?: string[];
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

export type SyncMode = 'MANUAL' | 'APPROVAL' | 'AUTOMATIC' | 'BACKUP';

export interface SyncProposal {
  id: string;
  repoPath: string;
  branch: string;
  files: string[];
  suggestedMessage: string;
  diffSummary: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMMITTED';
  createdAt: string;
}

export interface ConflictReport {
  hasConflict: boolean;
  type?: 'REMOTE_AHEAD' | 'MERGE_CONFLICT' | 'DETACHED_HEAD' | 'MISSING_REMOTE' | 'SECRET_BLOCKED' | 'LARGE_FILE';
  message?: string;
  resolutionInstructions?: string;
}

export interface WatchedRepositoryConfig {
  path: string;
  branch: string;
  idleMinutes: number;
  autoPush: boolean;
  mode?: SyncMode;
  allowedBranches?: string[];
  ignorePatterns?: string[];
  lastSyncedAt?: string;
  lastCommitSha?: string;
  lastError?: string;
  nextBackupAt?: string;
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
  description?: string;
  primaryLanguage?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  isTargetForLeetCode?: boolean;
  solutionPathPattern?: string;
  autoCommitEnabled?: boolean;
  category?: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  syncPolicy?: SyncPolicy;
}

export interface UpdateRepositoryInput {
  category?: string;
  defaultBranch?: string;
  isTargetForLeetCode?: boolean;
  solutionPathPattern?: string;
  autoCommitEnabled?: boolean;
  syncPolicy?: SyncPolicy;
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

export type ActivityCategory = 'GITHUB' | 'LEETCODE' | 'LOCAL_DEV' | 'MAINTENANCE';

export type ActivityEventType =
  | 'GITHUB_COMMIT'
  | 'GITHUB_PR'
  | 'GITHUB_ISSUE'
  | 'GITHUB_OTHER'
  | 'LEETCODE_SUBMISSION'
  | 'LEETCODE_ACCEPTED'
  | 'LOCAL_SESSION'
  | 'LOCAL_REPO_CHANGE'
  | 'MAINTENANCE_BACKUP'
  | 'MAINTENANCE_DEPENDENCY'
  | 'MAINTENANCE_DOCS';

export interface ActivityRecord {
  id: string;
  userId: string;
  category: ActivityCategory;
  eventType: ActivityEventType;
  source: 'GITHUB' | 'LEETCODE' | 'LOCAL_AGENT' | 'SYSTEM';
  timestamp: string; // UTC ISO string
  date: string; // YYYY-MM-DD in user's timezone
  reference: string; // repo full name or problem slug
  verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  metadata?: Record<string, any>;
}

export interface StreakMetric {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  hasSubmittedToday?: boolean;
}

export interface AnalyticsOverview {
  currentStreak: number;
  longestStreak: number;
  hasSubmittedToday: boolean;
  todayCommitCount: number;
  todayLeetCodeCount: number;
  weeklyConsistencyPercent: number;
  weeklyActivityScore: number; // 0 to 100 comprehensive activity score
  streakDeadlineHoursLeft: number;
  totalLeetCodeSolved: number;
  totalGitCommitsTracked: number;
  difficultyDistribution: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
  githubStreak: StreakMetric;
  leetCodeStreak: StreakMetric;
  localDevStreak: StreakMetric;
  breakdown: {
    githubCommits: number;
    githubPRs: number;
    githubIssues: number;
    leetCodeTotalSubmissions: number;
    leetCodeAccepted: number;
    leetCodeUniqueProblems: number;
    localSessions: number;
    maintenanceBackups: number;
  };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  gitCommits: number;
  leetCodeSubmissions: number;
  level: 0 | 1 | 2 | 3 | 4;
  verifiedGitHub?: {
    commits: number;
    prs: number;
    issues: number;
  };
  leetCode?: {
    submissions: number;
    accepted: number;
    uniqueProblems: number;
  };
  localDev?: {
    sessions: number;
    filesChanged: number;
  };
  maintenance?: {
    backups: number;
  };
  events?: ActivityRecord[];
}

export interface StreakReminder {
  id: string;
  type:
    | 'NO_ACTIVITY_TODAY'
    | 'PENDING_LEETCODE_EXPORT'
    | 'FAILED_GITHUB_SYNC'
    | 'LOCAL_AGENT_DISCONNECTED'
    | 'UPCOMING_BACKUP';
  title: string;
  message: string;
  urgency: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: string;
  dueInHours?: number;
  actionLink?: string;
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

// --------------------------------------------------------
// GitHub Phase 2 Diagnostics & Integration Types
// --------------------------------------------------------

export interface CommitAttributionCheck {
  name: string;
  passed: boolean;
  message: string;
  actionableFix?: string;
}

export interface CommitDiagnosticsResult {
  commitSha: string;
  authorEmail: string;
  repoFullName: string;
  branch: string;
  isEligible: boolean;
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'WARNING';
  checks: CommitAttributionCheck[];
  summary: string;
}

export interface RepoHealthDiagnosticsResult {
  repoFullName: string;
  healthScore: number; // 0 to 100
  hasReadme: boolean;
  hasGitignore: boolean;
  hasLicense: boolean;
  licenseName?: string;
  openIssuesCount: number;
  daysSinceLastActivity: number;
  branchProtection?: {
    isProtected: boolean;
    requiresPullRequest?: boolean;
    enforceAdmins?: boolean;
  };
  secretScanResult: {
    safe: boolean;
    findings: string[];
  };
  scannedScope: string;
  recommendations: string[];
}

export interface GitHubActivityFeed {
  commits: Array<{
    sha: string;
    repo: string;
    branch: string;
    author: string;
    authorEmail?: string;
    message: string;
    timestamp: string;
    filesChanged: number;
    url: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    repo: string;
    state: 'OPEN' | 'MERGED' | 'CLOSED';
    author: string;
    createdAt: string;
    url: string;
  }>;
  issues: Array<{
    number: number;
    title: string;
    repo: string;
    state: 'OPEN' | 'CLOSED';
    author: string;
    createdAt: string;
    url: string;
  }>;
  branches: Array<{
    name: string;
    repo: string;
    isProtected: boolean;
    lastCommitSha: string;
  }>;
  releases: Array<{
    id: number;
    name: string;
    tagName: string;
    repo: string;
    publishedAt: string;
    url: string;
  }>;
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

// --------------------------------------------------------
// Phase 6 — Automation Engine, Scheduler & Job Queue Types
// --------------------------------------------------------

export type AutomationType =
  | 'LEETCODE_EXPORT'
  | 'GITHUB_SYNC_CHANGES'
  | 'LOCAL_BACKUP'
  | 'REPO_HEALTH_CHECK'
  | 'GITHUB_ACTIVITY_SYNC'
  | 'LEETCODE_HISTORY_SYNC'
  | 'DAILY_REMINDERS'
  | 'WEEKLY_ANALYTICS';

export type AutomationTriggerType = 'CRON' | 'EVENT' | 'MANUAL' | 'WEBHOOK';

export type JobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED';

export interface AutomationExecutionPolicy {
  timeoutSeconds: number;
  concurrency: 'FORBID' | 'ALLOW';
  retryLimit: number;
  backoffInitialSeconds: number;
}

export interface AutomationFailurePolicy {
  maxRetries: number;
  backoffMultiplier: number;
  deadLetter: boolean;
  notifyOnFailure: boolean;
}

export interface AutomationLastExecution {
  timestamp: string;
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED';
  durationMs: number;
  summary: string;
  jobId?: string;
}

export interface AutomationRule {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: AutomationType;
  enabled: boolean;
  triggerType: AutomationTriggerType;
  schedule: string;
  timezone: string;
  repositoryScope: 'ALL' | 'DEFAULT' | string[];
  executionPolicy: AutomationExecutionPolicy;
  lastExecution?: AutomationLastExecution;
  nextExecution?: string;
  failurePolicy: AutomationFailurePolicy;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: string;
  userId: string;
  automationRuleId?: string;
  jobType: AutomationType;
  payload: Record<string, any>;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  retryCount: number;
  maxRetries: number;
  nextRunAt?: string;
  error?: {
    message: string;
    stack?: string;
    code?: string;
    failedAt: string;
  };
  idempotencyKey: string;
  workerId?: string;
  progress?: number;
  result?: Record<string, any>;
}

export type NotificationCategory =
  | 'EXPORT_SUCCESS'
  | 'EXPORT_FAILURE'
  | 'AUTH_EXPIRATION'
  | 'AGENT_DISCONNECTED'
  | 'BACKUP_COMPLETED'
  | 'MISSING_SOURCE'
  | 'PENDING_APPROVAL'
  | 'STREAK_WARNING'
  | 'HEALTH_CHECK_WARNING'
  | 'GENERAL';

export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  userId: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface QueueStats {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  retrying: number;
  cancelled: number;
  totalJobs: number;
  successRate: number;
  avgDurationMs: number;
}

// --------------------------------------------------------
// Phase 7 — Comprehensive Analytics & Progress Contracts
// --------------------------------------------------------

export interface GitHubAnalytics {
  totalCommits: number;
  weeklyCommits: number;
  monthlyCommits: number;
  repositoryActivity: Array<{
    repoFullName: string;
    commitsCount: number;
    pullRequestsCount: number;
    issuesCount: number;
    percentageOfTotal: number;
    lastCommitAt?: string;
  }>;
  languages: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  pullRequests: {
    total: number;
    open: number;
    merged: number;
    closed: number;
  };
  issues: {
    total: number;
    open: number;
    closed: number;
  };
  repositoryGrowth: Array<{
    date: string;
    cumulativeCommits: number;
    newCommits: number;
  }>;
  activeRepositories: string[];
  dataFreshness: {
    lastSyncedAt?: string;
    isStale: boolean;
  };
}

export interface LeetCodeAnalytics {
  totalSubmissions: number;
  acceptedSubmissions: number;
  uniqueProblemsSolved: number;
  acceptanceRate: number;
  difficultyDistribution: {
    Easy: { count: number; percentage: number };
    Medium: { count: number; percentage: number };
    Hard: { count: number; percentage: number };
  };
  languageDistribution: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  topicDistribution: Array<{
    topic: string;
    solvedCount: number;
    percentage: number;
  }>;
  submissionHistory: Array<{
    submissionId: string;
    questionTitle: string;
    difficulty: Difficulty;
    language: string;
    runtimeMs: number;
    status: string;
    submittedAt: string;
  }>;
  avgSubmissionsPerSolved: number;
  problemSolvingConsistency: {
    currentStreakDays: number;
    weeklyAverage: number;
    monthlyAverage: number;
  };
}

export interface CodingAnalytics {
  trackedDurationAvailable: boolean;
  dailyCodingDurationMinutes: number | null;
  weeklyCodingDurationMinutes: number | null;
  activeCodingDays: number;
  repositoryActivity: Array<{
    repoName: string;
    sessionCount: number;
    filesModified: number;
  }>;
  languageUsage: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  sessionHistory: Array<{
    id: string;
    timestamp: string;
    repoPath: string;
    filesChanged: number;
    durationMinutes?: number;
    agentName: string;
  }>;
  durationNotice: string;
}

export interface DailyJournalData {
  date: string;
  notes: string;
  codingDurationMinutes: number | null;
  durationTracked: boolean;
  githubActivity: {
    commitsCount: number;
    commits: Array<{
      sha: string;
      message: string;
      repo: string;
      timestamp: string;
    }>;
    prsCount: number;
    issuesCount: number;
  };
  leetCodeActivity: {
    acceptedCount: number;
    uniqueProblems: Array<{
      questionId: string;
      questionTitle: string;
      difficulty: Difficulty;
      language: string;
    }>;
  };
  repositoriesModified: string[];
  syncEventsCount: number;
  updatedAt: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export interface DeveloperReport {
  period: ReportPeriod;
  title: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  dataFreshness: {
    lastSyncedAt?: string;
    status: 'LIVE' | 'CACHED';
  };
  summary: {
    totalActivities: number;
    githubCommits: number;
    githubPRs: number;
    githubIssues: number;
    leetCodeSubmissions: number;
    leetCodeAccepted: number;
    uniqueProblemsSolved: number;
    codingDurationMinutes: number | null;
    activeDaysCount: number;
    consistencyScore: number;
    longestStreak: number;
    topLanguages: Array<{ name: string; count: number; percentage: number }>;
    topRepositories: Array<{ name: string; count: number; percentage: number }>;
  };
  activityBreakdown: Array<{
    date: string;
    commits: number;
    leetCode: number;
    localDev: number;
    maintenance: number;
    total: number;
  }>;
}

// ========================================================
// StreakForge 2.0 — Intelligence & Learning Ecosystem Types
// ========================================================

export type CurriculumTrackId = 'blind75' | 'neetcode150' | 'topInterview150';

export interface CurriculumProblem {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  order: number;
  leetcodeUrl: string;
}

export type StudyProblemStatus =
  | 'NOT_STARTED'
  | 'ATTEMPTED'
  | 'SOLVED'
  | 'NEEDS_REVISION'
  | 'MASTERED';

export type SrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export interface StudyProgressItem {
  id: string;
  userId: string;
  problemId: number;
  questionSlug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  curricula: CurriculumTrackId[];
  status: StudyProblemStatus;
  userNotes?: string;
  repetitionLevel: number;
  easeFactor: number;
  intervalDays: number;
  lastReviewedAt?: string;
  nextReviewDate: string;
  history: Array<{
    reviewedAt: string;
    rating: SrsRating;
    intervalDays: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionQueueSummary {
  dueToday: StudyProgressItem[];
  overdue: StudyProgressItem[];
  upcoming: StudyProgressItem[];
  totalMastered: number;
  totalNeedsRevision: number;
  totalSolved: number;
}

export interface CatalogItem {
  number: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  language: string;
  solutionPath: string;
  githubUrl: string;
  lastSyncedAt?: string;
}

export interface CatalogPreview {
  repoFullName: string;
  branch: string;
  totalCount: number;
  items: CatalogItem[];
  markdownPreview: string;
  currentContentSha?: string;
  lastSyncedAt?: string;
}

export interface CatalogSyncResult {
  success: boolean;
  repoFullName: string;
  commitSha: string;
  commitUrl: string;
  itemsCataloged: number;
  syncedAt: string;
}

export type BadgeTheme = 'minimal' | 'dark' | 'light' | 'terminal' | 'gradient';

export interface BadgeOptions {
  user: string;
  theme?: BadgeTheme;
  showRank?: boolean;
  showDifficulty?: boolean;
  showStreak?: boolean;
  width?: number;
}

export interface LearningIntelligenceSummary {
  totalSolvedLeetCode: number;
  authenticStreakDays: number;
  longestStreakDays: number;
  curriculumProgress: {
    blind75: { solved: number; total: number; percentage: number };
    neetcode150: { solved: number; total: number; percentage: number };
    topInterview150: { solved: number; total: number; percentage: number };
  };
  topicStrengths: Array<{
    topic: string;
    solved: number;
    total: number;
    accuracyPercent: number;
    status: 'STRONG' | 'GROWING' | 'NEEDS_FOCUS';
  }>;
  srsHealth: {
    dueTodayCount: number;
    overdueCount: number;
    masteredCount: number;
    retentionRatePercent: number;
  };
  catalogStatus: {
    repoFullName: string;
    totalSolutionsCataloged: number;
    lastCatalogSyncedAt?: string;
    isFresh: boolean;
  };
}

// ========================================================
// StreakForge 3.0 — Domain Contracts & Types
// ========================================================

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ConsistencyMetrics {
  consistencyScore: number;
  streakDays: number;
  longestStreakDays: number;
  activeDaysPastYear: number;
  weeklyAverageSolves: number;
  mostProductiveDay: string;
  activityCadence: Array<{
    label: string;
    count: number;
    genuineCommits: number;
    leetCodeSolves: number;
    codeforcesSolves: number;
  }>;
  trend: 'UPWARD' | 'STABLE' | 'NEEDS_MOMENTUM';
}

export type TopicMasteryStatus = 'STRONG' | 'MODERATE' | 'WEAK' | 'CRITICAL_WEAK';

export interface TopicPerformance {
  topic: string;
  attempted: number;
  solved: number;
  accuracy: number;
  failedAttempts: number;
  needsRevisionCount: number;
  status: TopicMasteryStatus;
  color: string;
}

export interface ProblemRecommendation {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  pattern: string;
  reason: string;
  sourceTrack: string;
}

export interface WeaknessReport {
  topics: TopicPerformance[];
  weakestTopics: string[];
  recommendations: ProblemRecommendation[];
  overallAccuracyPercent: number;
}

export interface RoutineItem {
  dayOfWeek: string;
  focusTopics: string[];
  targetCount: number;
  revisionMinutes: number;
}

export interface CodingGoal {
  id?: string;
  userId?: string;
  dailyTarget: { easy: number; medium: number; hard: number; revisionMinutes: number };
  weeklyTarget: number;
  studyRoutines: RoutineItem[];
  completedToday: { easy: number; medium: number; hard: number; total: number; revisionCount: number };
  completedThisWeek: number;
  weekStartDate: string;
}

export type PlatformType = 'github' | 'leetcode' | 'codeforces' | 'codechef' | 'hackerrank';

export interface PlatformProfile {
  platform: PlatformType;
  handle: string;
  connected: boolean;
  rating?: number;
  rank?: string;
  totalSolved?: number;
  lastSyncedAt?: string;
  avatarUrl?: string;
}

export interface UnifiedActivityItem {
  id: string;
  platform: PlatformType;
  title: string;
  subtitle?: string;
  timestamp: string;
  url?: string;
  type: 'COMMIT' | 'SOLVE' | 'CONTEST';
  metadata?: Record<string, any>;
}

export interface PublicDeveloperProfile {
  username: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  githubHandle?: string;
  leetcodeHandle?: string;
  codeforcesHandle?: string;
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  topSkills: Array<{ topic: string; count: number; level: string }>;
  badges: Array<{ id: string; name: string; icon: string; unlockedAt: string }>;
  recentActivity: Array<{ date: string; title: string; platform: string }>;
  publicUrl: string;
}

export interface AchievementItem {
  id: string;
  key: string;
  title: string;
  description: string;
  category: 'STREAK' | 'DSA' | 'COMMITS' | 'MASTERY' | 'INTERVIEW';
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  target: number;
}

export interface GamificationProfile {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  rankTitle: string;
  totalAchievementsUnlocked: number;
  achievements: AchievementItem[];
  recentXpGains: Array<{ timestamp: string; action: string; xp: number }>;
}

export interface SolutionApproach {
  id: string;
  name: string;
  timeComplexity: string;
  spaceComplexity: string;
  language: string;
  code: string;
  explanation: string;
  tradeoffs: string;
  isOptimal: boolean;
}

export interface ProblemSolutionRecord {
  id: string;
  questionSlug: string;
  questionTitle: string;
  difficulty: Difficulty;
  approaches: SolutionApproach[];
  optimalTimeComplexity: string;
  optimalSpaceComplexity: string;
  patterns: string[];
  lastUpdated: string;
}

export type InterviewDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'RANDOM';

export interface MockInterviewSession {
  id: string;
  track: string;
  difficulty: InterviewDifficulty;
  timeLimitMinutes: number;
  timeSpentSeconds: number;
  problems: Array<{
    id: number;
    slug: string;
    title: string;
    difficulty: Difficulty;
    category?: string;
    solved: boolean;
    notes?: string;
  }>;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  scorePercent: number;
  feedback: string;
  startedAt: string;
  completedAt?: string;
}

export interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folder: string;
  linkedProblemSlug?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  weekNumber: number;
  startDate: string;
  endDate: string;
  problemsSolved: number;
  problemsAttempted: number;
  gitCommits: number;
  streakMaintained: boolean;
  activeDaysCount: number;
  topFocusTopic: string;
  weaknessesTackled: string[];
  srsRevisionsCompleted: number;
  goalCompletionPercent: number;
  deltaPreviousWeek: { solves: number; commits: number };
  markdownSummary: string;
}

export interface PatternItem {
  name: string;
  description: string;
  problemCount: number;
  solvedCount: number;
  masteryLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  typicalTimeComplexity: string;
  coreTechnique: string;
  exampleProblems: Array<{ title: string; slug: string; difficulty: Difficulty }>;
}

export interface CareerReadinessScore {
  overallScore: number;
  tier: 'READY_FOR_SCREEN' | 'INTERVIEW_READY' | 'COMPETITIVE' | 'FOUNDATIONAL';
  components: {
    dsaCurriculumCoverage: { score: number; max: 35; details: string };
    spacedRepetitionRetention: { score: number; max: 20; details: string };
    codingConsistency: { score: number; max: 20; details: string };
    mockInterviewPerformance: { score: number; max: 15; details: string };
    githubPortfolioCompleteness: { score: number; max: 10; details: string };
  };
  recommendedNextActions: string[];
  disclaimer: string;
}



