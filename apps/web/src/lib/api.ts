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
  AgentRegisterInput,
  AgentRegisterResponse
} from '@streakforge/shared-types';

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
      })
  },
  analytics: {
    getOverview: () => apiFetch<AnalyticsOverview>('/analytics/overview'),
    getHeatmap: (year?: number) =>
      apiFetch<HeatmapDay[]>(year ? `/analytics/heatmap?year=${year}` : '/analytics/heatmap')
  },
  repos: {
    list: () =>
      apiFetch<{ connected: RepositoryConnection[]; githubAvailable: any[] }>('/repos'),
    connect: (input: ConnectRepositoryInput) =>
      apiFetch<RepositoryConnection>('/repos/connect', {
        method: 'POST',
        body: JSON.stringify(input)
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
  audit: {
    getLogs: (page: number = 1, limit: number = 50, component?: string) =>
      apiFetch<AuditLog[]>(
        `/audit/logs?page=${page}&limit=${limit}${component ? `&component=${component}` : ''}`
      )
  }
};
