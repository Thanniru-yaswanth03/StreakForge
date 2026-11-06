import { API_BASE_URL, getStoredToken } from './utils';
import type {
  User,
  LeetCodeUserStats,
  AnalyticsOverview,
  HeatmapDay,
  RepositoryConnection,
  LeetCodeSubmission,
  LocalAgentInstance,
  AuditLog,
  ApiResponse,
  ConnectRepositoryInput,
  UpdateRepositoryInput,
  AgentRegisterInput,
  AgentRegisterResponse,
  GitHubActivityFeed,
  CommitDiagnosticsResult,
  RepoHealthDiagnosticsResult,
  SyncMode,
  SyncProposal,
  WatchedRepositoryConfig,
  ActivityRecord,
  StreakReminder,
  AutomationRule,
  JobRecord,
  QueueStats,
  AppNotification,
  GitHubAnalytics,
  LeetCodeAnalytics,
  CodingAnalytics,
  DailyJournalData,
  DeveloperReport,
  ReportPeriod
} from '@streakforge/shared-types';

export const LOCAL_AGENT_URL = 'http://127.0.0.1:4545';

export function getStoredLoopbackToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('streakforge_loopback_token') || '';
  }
  return '';
}

export function setStoredLoopbackToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('streakforge_loopback_token', token);
  }
}

export async function localAgentFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredLoopbackToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${LOCAL_AGENT_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new ApiError(
        data.error?.code || 'AGENT_ERROR',
        data.error?.message || `Local agent request failed with status ${res.status}`,
        res.status,
        data.error?.details
      );
    }

    return data.data as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'AGENT_UNREACHABLE',
      `Cannot connect to local agent on 127.0.0.1:4545: ${err.message || 'Connection refused'}. Is streakforge-agent running?`,
      0
    );
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'API_ERROR',
      data.error?.message || `Request failed with status ${res.status}`,
      res.status,
      data.error?.details
    );
  }

  return data.data as T;
}

export const api = {
  auth: {
    getMe: () => apiFetch<{ user: User }>('/auth/me'),
    connectWithPAT: (pat: string) =>
      apiFetch<{ token: string; user: User }>('/auth/github/pat', {
        method: 'POST',
        body: JSON.stringify({ pat })
      }),
    updatePreferences: (prefs: any) =>
      apiFetch('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify(prefs)
      }),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
    disconnect: () => apiFetch('/auth/disconnect', { method: 'POST' }),
    linkLeetCode: (username: string) =>
      apiFetch<{ message: string; leetcodeUsername: string; leetcodeStats: any }>('/auth/leetcode', {
        method: 'POST',
        body: JSON.stringify({ username })
      }),
    disconnectLeetCode: () =>
      apiFetch<{ message: string }>('/auth/leetcode', {
        method: 'DELETE'
      })
  },
  github: {
    getActivity: (page: number = 1, limit: number = 20) =>
      apiFetch<GitHubActivityFeed>(`/github/activity?page=${page}&limit=${limit}`),
    diagnoseCommit: (input: { repoFullName: string; commitSha: string; branch?: string }) =>
      apiFetch<CommitDiagnosticsResult>('/github/diagnose-commit', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    diagnoseRepo: (input: { repoFullName: string }) =>
      apiFetch<RepoHealthDiagnosticsResult>('/github/diagnose-repo', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    sync: () =>
      apiFetch<{ message: string; syncedAt: string }>('/github/sync', {
        method: 'POST'
      })
  },
  analytics: {
    getOverview: () => apiFetch<AnalyticsOverview>('/analytics/overview'),
    getHeatmap: (year?: number) =>
      apiFetch<HeatmapDay[]>(year ? `/analytics/heatmap?year=${year}` : '/analytics/heatmap'),
    getReminders: () => apiFetch<StreakReminder[]>('/analytics/reminders'),
    getDayDetails: (date: string) =>
      apiFetch<ActivityRecord[]>(`/analytics/day-details?date=${date}`),
    recalculate: (timezone?: string) =>
      apiFetch<{ message: string; daysProcessed: number }>('/analytics/recalculate', {
        method: 'POST',
        body: JSON.stringify({ timezone })
      }),
    getGitHubAnalytics: () => apiFetch<GitHubAnalytics>('/analytics/github'),
    getLeetCodeAnalytics: () => apiFetch<LeetCodeAnalytics>('/analytics/leetcode'),
    getCodingAnalytics: () => apiFetch<CodingAnalytics>('/analytics/coding'),
    getJournal: (date?: string) =>
      apiFetch<DailyJournalData>(`/analytics/journal${date ? `?date=${date}` : ''}`),
    saveJournalNote: (date: string, notes: string) =>
      apiFetch<DailyJournalData>('/analytics/journal', {
        method: 'PUT',
        body: JSON.stringify({ date, notes })
      }),
    getReport: (period: ReportPeriod, date?: string) =>
      apiFetch<DeveloperReport>(`/analytics/reports?period=${period}${date ? `&date=${date}` : ''}`),
    exportReport: async (period: ReportPeriod, format: 'csv' | 'json', date?: string) => {
      const token = getStoredToken();
      const url = `${API_BASE_URL}/analytics/reports/export?period=${period}&format=${format}${date ? `&date=${date}` : ''}`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Report export failed');
      return format === 'csv' ? res.text() : res.json();
    }
  },
  repos: {
    list: () =>
      apiFetch<{ connected: RepositoryConnection[]; githubAvailable: any[] }>('/repos'),
    connect: (input: ConnectRepositoryInput) =>
      apiFetch<RepositoryConnection>('/repos/connect', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    update: (id: string, update: UpdateRepositoryInput) =>
      apiFetch<RepositoryConnection>(`/repos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(update)
      }),
    disconnect: (id: string) =>
      apiFetch<{ message: string }>(`/repos/${id}`, {
        method: 'DELETE'
      })
  },
  sync: {
    getHistory: (page: number = 1, limit: number = 20, status?: string) =>
      apiFetch<LeetCodeSubmission[]>(
        `/sync/leetcode/history?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`
      ),
    retry: (id: string) =>
      apiFetch(`/sync/leetcode/${id}/retry`, {
        method: 'POST'
      }),
    getProfileStats: () =>
      apiFetch<LeetCodeUserStats>('/sync/leetcode/profile-stats'),
    refreshProfileStats: (username?: string) =>
      apiFetch<LeetCodeUserStats>('/sync/leetcode/profile-stats/refresh', {
        method: 'POST',
        body: JSON.stringify({ username })
      })
  },
  agent: {
    list: () => apiFetch<LocalAgentInstance[]>('/agent/list'),
    register: (input: AgentRegisterInput) =>
      apiFetch<AgentRegisterResponse>('/agent/register', {
        method: 'POST',
        body: JSON.stringify(input)
      })
  },
  agentLocal: {
    getStatus: () =>
      localAgentFetch<{
        status: string;
        agentId: string;
        version: string;
        pid: number;
        port: number;
        watchedRepositories: number;
        pendingProposals: number;
        lastHeartbeatAt: string;
      }>('/status'),
    getRepos: () => localAgentFetch<WatchedRepositoryConfig[]>('/repos'),
    watchRepo: (input: {
      repoPath: string;
      mode?: SyncMode;
      allowedBranches?: string[];
      autoPush?: boolean;
      backupIntervalHours?: number;
    }) =>
      localAgentFetch<{ message: string; repo: WatchedRepositoryConfig }>('/repos/watch', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    unwatchRepo: (repoPath: string) =>
      localAgentFetch<{ message: string }>('/repos/unwatch', {
        method: 'POST',
        body: JSON.stringify({ repoPath })
      }),
    getProposals: () => localAgentFetch<SyncProposal[]>('/proposals'),
    approveProposal: (proposalId: string, customCommitMessage?: string) =>
      localAgentFetch<{ message: string; commitSha?: string }>('/proposals/approve', {
        method: 'POST',
        body: JSON.stringify({ proposalId, customCommitMessage })
      }),
    rejectProposal: (proposalId: string) =>
      localAgentFetch<{ message: string }>('/proposals/reject', {
        method: 'POST',
        body: JSON.stringify({ proposalId })
      }),
    syncNow: (repoPath: string) =>
      localAgentFetch<{ success: boolean; message: string; commitSha?: string }>('/sync-now', {
        method: 'POST',
        body: JSON.stringify({ repoPath })
      }),
    backupNow: (repoPath: string) =>
      localAgentFetch<{ success: boolean; message: string; commitSha?: string }>('/backup-now', {
        method: 'POST',
        body: JSON.stringify({ repoPath })
      })
  },
  audit: {
    getLogs: (page: number = 1, limit: number = 50, component?: string) =>
      apiFetch<AuditLog[]>(
        `/audit/logs?page=${page}&limit=${limit}${component ? `&component=${component}` : ''}`
      )
  },
  automations: {
    getRules: () => apiFetch<AutomationRule[]>('/automations/rules'),
    createRule: (input: any) =>
      apiFetch<{ id: string; name: string; type: string; schedule: string }>('/automations/rules', {
        method: 'POST',
        body: JSON.stringify(input)
      }),
    updateRule: (id: string, updates: any) =>
      apiFetch<AutomationRule>(`/automations/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    toggleRule: (id: string) =>
      apiFetch<{ id: string; enabled: boolean }>(`/automations/rules/${id}/toggle`, {
        method: 'POST'
      }),
    triggerRule: (id: string) =>
      apiFetch<{ jobId: string; jobType: string; status: string; isDuplicate: boolean }>(
        `/automations/rules/${id}/trigger`,
        { method: 'POST' }
      ),
    deleteRule: (id: string) =>
      apiFetch<{ message: string }>(`/automations/rules/${id}`, {
        method: 'DELETE'
      }),
    getJobs: (page: number = 1, limit: number = 20, status?: string, jobType?: string) =>
      apiFetch<{ jobs: JobRecord[]; total: number; page: number; totalPages: number }>(
        `/automations/jobs?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}${jobType ? `&jobType=${jobType}` : ''}`
      ),
    getJobDetails: (id: string) => apiFetch<JobRecord>(`/automations/jobs/${id}`),
    cancelJob: (id: string) =>
      apiFetch<{ message: string }>(`/automations/jobs/${id}/cancel`, { method: 'POST' }),
    retryJob: (id: string) =>
      apiFetch<{ jobId: string; status: string }>(`/automations/jobs/${id}/retry`, { method: 'POST' }),
    getStats: () => apiFetch<QueueStats>('/automations/stats')
  },
  notifications: {
    list: (page: number = 1, limit: number = 20, unreadOnly: boolean = false, category?: string) =>
      apiFetch<{
        items: AppNotification[];
        total: number;
        unreadCount: number;
        page: number;
        totalPages: number;
      }>(
        `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}${category ? `&category=${category}` : ''}`
      ),
    markAsRead: (id: string) =>
      apiFetch<{ message: string }>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () =>
      apiFetch<{ updatedCount: number }>('/notifications/mark-all-read', { method: 'POST' }),
    delete: (id: string) =>
      apiFetch<{ message: string }>(`/notifications/${id}`, { method: 'DELETE' }),
    clearAll: () =>
      apiFetch<{ deletedCount: number }>('/notifications', { method: 'DELETE' })
  },
  study: {
    getCurriculum: (track: string = 'blind75') =>
      apiFetch<any>(`/study/curriculum/${track}`),
    updateStatus: (questionSlug: string, status: string, userNotes?: string) =>
      apiFetch<any>('/study/status', {
        method: 'POST',
        body: JSON.stringify({ questionSlug, status, userNotes })
      }),
    recordReview: (questionSlug: string, rating: string, userNotes?: string) =>
      apiFetch<any>('/study/review', {
        method: 'POST',
        body: JSON.stringify({ questionSlug, rating, userNotes })
      }),
    getRevisionQueue: () =>
      apiFetch<any>('/study/revision-queue'),
    getIntelligence: () =>
      apiFetch<any>('/study/intelligence')
  },
  catalog: {
    preview: (repo?: string) =>
      apiFetch<any>(`/catalog/preview${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
    sync: (repo?: string) =>
      apiFetch<any>('/catalog/sync', {
        method: 'POST',
        body: JSON.stringify({ repo })
      }),
    rollback: (repo?: string) =>
      apiFetch<any>('/catalog/rollback', {
        method: 'POST',
        body: JSON.stringify({ repo })
      })
  },
  // StreakForge 3.0 Modules
  consistency: {
    getMetrics: (period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly') =>
      apiFetch<any>(`/analytics/consistency?period=${period}`)
  },
  weakness: {
    getReport: () =>
      apiFetch<any>('/learning/weaknesses')
  },
  planner: {
    get: () =>
      apiFetch<any>('/planner'),
    updateTargets: (dailyTarget: any, weeklyTarget: number) =>
      apiFetch<any>('/planner/targets', {
        method: 'POST',
        body: JSON.stringify({ dailyTarget, weeklyTarget })
      }),
    updateRoutines: (studyRoutines: any[]) =>
      apiFetch<any>('/planner/routines', {
        method: 'POST',
        body: JSON.stringify({ studyRoutines })
      })
  },
  platforms: {
    getProfiles: () =>
      apiFetch<any>('/platforms/profiles'),
    connect: (platform: string, handle: string) =>
      apiFetch<any>('/platforms/connect', {
        method: 'POST',
        body: JSON.stringify({ platform, handle })
      })
  },
  gamification: {
    getProfile: () =>
      apiFetch<any>('/gamification/profile')
  },
  solutions: {
    get: (slug: string) =>
      apiFetch<any>(`/solutions/${slug}`),
    addApproach: (slug: string, approach: any) =>
      apiFetch<any>(`/solutions/${slug}/approaches`, {
        method: 'POST',
        body: JSON.stringify(approach)
      })
  },
  interview: {
    start: (difficulty: string = 'MEDIUM', track: string = 'Blind 75') =>
      apiFetch<any>('/interview/start', {
        method: 'POST',
        body: JSON.stringify({ difficulty, track })
      }),
    complete: (sessionId: string, timeSpentSeconds: number, problemResults: any[]) =>
      apiFetch<any>('/interview/complete', {
        method: 'POST',
        body: JSON.stringify({ sessionId, timeSpentSeconds, problemResults })
      }),
    getSessions: () =>
      apiFetch<any>('/interview/sessions')
  },
  vault: {
    list: (tag?: string, folder?: string, search?: string) => {
      const params = new URLSearchParams();
      if (tag) params.append('tag', tag);
      if (folder) params.append('folder', folder);
      if (search) params.append('search', search);
      const q = params.toString();
      return apiFetch<any>(`/vault/notes${q ? `?${q}` : ''}`);
    },
    create: (note: { title: string; content: string; tags?: string[]; folder?: string; linkedProblemSlug?: string; isPinned?: boolean }) =>
      apiFetch<any>('/vault/notes', {
        method: 'POST',
        body: JSON.stringify(note)
      }),
    update: (id: string, note: any) =>
      apiFetch<any>(`/vault/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(note)
      }),
    delete: (id: string) =>
      apiFetch<any>(`/vault/notes/${id}`, { method: 'DELETE' })
  },
  reports: {
    getWeekly: () =>
      apiFetch<any>('/reports/weekly')
  },
  patterns: {
    getOverview: () =>
      apiFetch<any>('/patterns/overview')
  },
  career: {
    getReadiness: () =>
      apiFetch<any>('/career/readiness')
  },
  publicProfile: {
    get: (username: string) =>
      apiFetch<any>(`/public/u/${username}`)
  }
};
