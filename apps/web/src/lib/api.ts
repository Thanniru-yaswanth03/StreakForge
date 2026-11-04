import { API_BASE_URL, getStoredToken } from './utils';
import type {
  User,
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
  StreakReminder
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
    updatePreferences: (prefs: any) =>
      apiFetch('/auth/preferences', {
        method: 'PATCH',
        body: JSON.stringify(prefs)
      }),
    logout: () => apiFetch('/auth/logout', { method: 'POST' }),
    disconnect: () => apiFetch('/auth/disconnect', { method: 'POST' })
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
      })
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
  }
};
