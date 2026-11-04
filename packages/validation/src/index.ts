import { z } from 'zod';

export const DifficultySchema = z.enum(['Easy', 'Medium', 'Hard']);

export const SyncStatusSchema = z.enum(['PENDING', 'SYNCED', 'FAILED', 'SKIPPED']);

export const AgentStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'PAUSED']);

export const AuditComponentSchema = z.enum(['API', 'EXTENSION', 'AGENT', 'WEB']);

export const AuditStatusSchema = z.enum(['SUCCESS', 'FAILURE', 'WARNING', 'INFO']);

// --------------------------------------------------------
// LeetCode Submission Schema
// --------------------------------------------------------

export const LeetCodeSubmissionInputSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  questionTitle: z.string().min(1, 'Question title is required'),
  questionSlug: z.string().min(1, 'Question slug is required'),
  difficulty: DifficultySchema,
  language: z.string().min(1, 'Programming language is required'),
  code: z.string().min(1, 'Solution code cannot be empty'),
  runtimeMs: z.number().nonnegative('Runtime must be non-negative'),
  runtimePercentile: z.number().min(0).max(100, 'Percentile must be between 0 and 100'),
  memoryBytes: z.number().nonnegative('Memory must be non-negative'),
  memoryPercentile: z.number().min(0).max(100, 'Percentile must be between 0 and 100'),
  submittedAt: z.string().datetime({ message: 'Must be an ISO datetime string' })
});

export type LeetCodeSubmissionInputType = z.infer<typeof LeetCodeSubmissionInputSchema>;

// --------------------------------------------------------
// Repository Connection Schemas
// --------------------------------------------------------

export const ConnectRepositoryInputSchema = z.object({
  repoFullName: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/, 'Invalid repo format (owner/repo)'),
  githubRepoId: z.number().int().positive('GitHub repo ID must be positive integer'),
  defaultBranch: z.string().min(1).default('main'),
  isTargetForLeetCode: z.boolean().default(true),
  solutionPathPattern: z.string().min(1).default('solutions/{difficulty}/{id}-{slug}'),
  autoCommitEnabled: z.boolean().default(false)
});

export type ConnectRepositoryInputType = z.infer<typeof ConnectRepositoryInputSchema>;

// --------------------------------------------------------
// Local Agent Schemas
// --------------------------------------------------------

export const AgentRegisterInputSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(100),
  hostname: z.string().min(1, 'Machine hostname is required'),
  os: z.string().min(1, 'Operating system is required'),
  agentVersion: z.string().min(1, 'Agent version is required')
});

export type AgentRegisterInputType = z.infer<typeof AgentRegisterInputSchema>;

export const AgentActivityReportSchema = z.object({
  repoPath: z.string().min(1),
  commitSha: z.string().min(7),
  commitMessage: z.string().min(1),
  filesChanged: z.number().int().nonnegative(),
  timestamp: z.string().datetime()
});

export const AgentHeartbeatInputSchema = z.object({
  agentId: z.string().uuid('Agent ID must be a valid UUID'),
  status: AgentStatusSchema,
  watchedPaths: z.array(z.string()),
  recentActivities: z.array(AgentActivityReportSchema).optional()
});

export type AgentHeartbeatInputType = z.infer<typeof AgentHeartbeatInputSchema>;

// --------------------------------------------------------
// Analytics & Audit Schemas
// --------------------------------------------------------

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  component: AuditComponentSchema.optional(),
  status: AuditStatusSchema.optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export type AuditLogQueryType = z.infer<typeof AuditLogQuerySchema>;

// --------------------------------------------------------
// User Settings Schema
// --------------------------------------------------------

export const UserUpdatePreferencesSchema = z.object({
  timezone: z.string().min(1).optional(),
  streakGoalPerDay: z.number().int().min(1).max(50).optional(),
  notificationPreferences: z.object({
    inApp: z.boolean().optional(),
    email: z.boolean().optional(),
    streakWarningHoursBefore: z.number().min(1).max(12).optional()
  }).optional()
});

export type UserUpdatePreferencesType = z.infer<typeof UserUpdatePreferencesSchema>;

