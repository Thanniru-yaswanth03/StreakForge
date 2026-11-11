'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  User,
  LeetCodeUserStats,
  AnalyticsOverview,
  HeatmapDay,
  RepositoryConnection,
  LeetCodeSubmission,
  LocalAgentInstance,
  AuditLog,
  ExtensionSyncState
} from '@streakforge/shared-types';
import { api, ApiError } from '../lib/api';
import { getStoredToken, clearStoredToken } from '../lib/utils';

export interface AutomationJob {
  id: string;
  name: string;
  type: 'LOCAL_AGENT_IDLE' | 'END_OF_DAY_WRAPUP' | 'LEETCODE_EXPORT' | 'WEEKLY_ARCHIVE';
  status: 'ACTIVE' | 'PAUSED';
  scheduleDescription: string;
  nextExecution: string;
  lastExecution: string;
  lastExecutionStatus: 'SUCCESS' | 'FAILURE' | 'SKIPPED';
  successCount: number;
  failureCount: number;
  config: Record<string, any>;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  codingDurationMinutes: number;
  commitsCount: number;
  problemsSolvedCount: number;
  notes: string;
  syncEventsCount: number;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'STREAK_WARNING' | 'EXPORT_SUCCESS' | 'EXPORT_FAILURE' | 'AGENT_ALERT' | 'SECURITY';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface GitHubActivityData {
  totalCommits: number;
  recentCommits: Array<{
    sha: string;
    repo: string;
    branch: string;
    author: string;
    message: string;
    timestamp: string;
    filesChanged: number;
  }>;
  repositories: Array<{
    name: string;
    fullName: string;
    stars: number;
    forks: number;
    activeBranch: string;
    lastCommitTime: string;
    isPrivate: boolean;
  }>;
  branches: Array<{
    name: string;
    repo: string;
    isProtected: boolean;
    lastCommitSha: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    repo: string;
    state: 'OPEN' | 'MERGED' | 'CLOSED';
    author: string;
    createdAt: string;
  }>;
  issues: Array<{
    number: number;
    title: string;
    repo: string;
    state: 'OPEN' | 'CLOSED';
    author: string;
    createdAt: string;
  }>;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

export type ExtensionDetectionStatus =
  | 'NOT_INSTALLED'
  | 'INSTALLED_DISCONNECTED'
  | 'CONNECTED'
  | 'SYNCHRONIZING'
  | 'SYNC_FAILED';

export interface SubmissionMetricsSummary {
  uniqueProblemsSolved: number;
  acceptedSubmissions: number;
  exportedCount: number;
  pendingCount: number;
  failedCount: number;
  skippedCount: number;
}

interface DataContextValue {
  user: User | null;
  overview: AnalyticsOverview | null;
  heatmap: HeatmapDay[];
  connectedRepos: RepositoryConnection[];
  githubRepos: any[];
  submissions: LeetCodeSubmission[];
  submissionMetrics: SubmissionMetricsSummary;
  canonicalState: ExtensionSyncState | null;
  agents: LocalAgentInstance[];
  auditLogs: AuditLog[];
  automations: AutomationJob[];
  journalEntries: JournalEntry[];
  notifications: NotificationItem[];
  githubActivity: GitHubActivityData;
  leetcodeStats: LeetCodeUserStats | null;
  extensionStatus: ExtensionDetectionStatus;
  isLoading: boolean;
  isDemoMode: boolean;
  isStaleData: boolean;
  lastUpdatedAt: string | null;
  backendError: string | null;
  refreshData: () => Promise<void>;
  refreshLeetCodeStats: (usernameOverride?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateJournalNote: (date: string, note: string) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  patchUserPreferencesLocal: (
    patch: Partial<
      Pick<User, 'timezone' | 'streakGoalPerDay' | 'notificationPreferences' | 'syncPreferences' | 'uiPreferences'>
    >
  ) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);
const SNAPSHOT_CACHE_KEY = 'streakforge_snapshot_v4';

const EMPTY_OVERVIEW: AnalyticsOverview = {
  currentStreak: 0,
  longestStreak: 0,
  hasSubmittedToday: false,
  todayCommitCount: 0,
  todayLeetCodeCount: 0,
  weeklyConsistencyPercent: 0,
  weeklyActivityScore: 0,
  streakDeadlineHoursLeft: 24,
  totalLeetCodeSolved: 0,
  totalGitCommitsTracked: 0,
  difficultyDistribution: { Easy: 0, Medium: 0, Hard: 0 },
  githubStreak: { currentStreak: 0, longestStreak: 0, activeDays: 0, hasSubmittedToday: false },
  leetCodeStreak: { currentStreak: 0, longestStreak: 0, activeDays: 0, hasSubmittedToday: false },
  localDevStreak: { currentStreak: 0, longestStreak: 0, activeDays: 0, hasSubmittedToday: false },
  breakdown: {
    githubCommits: 0,
    githubPRs: 0,
    githubIssues: 0,
    leetCodeTotalSubmissions: 0,
    leetCodeAccepted: 0,
    leetCodeUniqueProblems: 0,
    localSessions: 0,
    maintenanceBackups: 0
  }
};

const EMPTY_SUBMISSION_METRICS: SubmissionMetricsSummary = {
  uniqueProblemsSolved: 0,
  acceptedSubmissions: 0,
  exportedCount: 0,
  pendingCount: 0,
  failedCount: 0,
  skippedCount: 0
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(EMPTY_OVERVIEW);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<RepositoryConnection[]>([]);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<LeetCodeSubmission[]>([]);
  const [submissionMetrics, setSubmissionMetrics] = useState<SubmissionMetricsSummary>(EMPTY_SUBMISSION_METRICS);
  const [canonicalState, setCanonicalState] = useState<ExtensionSyncState | null>(null);
  const [agents, setAgents] = useState<LocalAgentInstance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [automations, setAutomations] = useState<AutomationJob[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [githubActivity, setGithubActivity] = useState<GitHubActivityData>({
    totalCommits: 0,
    recentCommits: [],
    repositories: [],
    branches: [],
    pullRequests: [],
    issues: []
  });
  const [leetcodeStats, setLeetcodeStats] = useState<LeetCodeUserStats | null>(null);
  const [extensionStatus, setExtensionStatus] = useState<ExtensionDetectionStatus>('NOT_INSTALLED');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isStaleData, setIsStaleData] = useState<boolean>(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const userRef = useRef<User | null>(null);
  const submissionsRef = useRef<LeetCodeSubmission[]>([]);
  const refreshControllerRef = useRef<AbortController | null>(null);
  const tokenRefreshedRef = useRef<boolean>(false);
  userRef.current = user;
  submissionsRef.current = submissions;

  const refreshLeetCodeStats = useCallback(async (usernameOverride?: string): Promise<void> => {
    const stats = await api.sync.refreshProfileStats(usernameOverride);
    setLeetcodeStats(stats);
  }, []);

  const buildEmptyHeatmap = useCallback(() => {
    const days: HeatmapDay[] = [];
    const now = new Date();
    for (let i = 365; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      days.push({
        date: d.toISOString().split('T')[0],
        count: 0,
        gitCommits: 0,
        leetCodeSubmissions: 0,
        level: 0
      });
    }
    return days;
  }, []);

  const clearCachedSnapshot = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SNAPSHOT_CACHE_KEY);
    }
  }, []);

  const refreshData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setOverview(EMPTY_OVERVIEW);
      setConnectedRepos([]);
      setGithubRepos([]);
      setSubmissions([]);
      setSubmissionMetrics(EMPTY_SUBMISSION_METRICS);
      setCanonicalState(null);
      setAgents([]);
      setAuditLogs([]);
      setAutomations([]);
      setNotifications([]);
      setLeetcodeStats(null);
      setIsDemoMode(false);
      setIsStaleData(false);
      setLastUpdatedAt(null);
      setBackendError(null);
      setHeatmap(buildEmptyHeatmap());
      clearCachedSnapshot();
      setIsLoading(false);
      return;
    }

    // Cancel any previous in-flight dashboard sync to prevent stale race overwrites
    if (refreshControllerRef.current) {
      refreshControllerRef.current.abort();
    }
    const controller = new AbortController();
    refreshControllerRef.current = controller;

    try {
      setIsLoading(true);
      setBackendError(null);

      // Phase A: Fast canonical bootstrap first (/sync/state + overview + repos + submissions + heatmap + notifications)
      const [stateRes, overviewRes, heatmapRes, reposRes, subsRes, notifsRes, rulesRes] =
        await Promise.allSettled([
          api.sync.getState(controller.signal),
          api.analytics.getOverview(),
          api.analytics.getHeatmap(),
          api.repos.list(),
          api.sync.queryHistory({ page: 1, limit: 50 }),
          api.notifications.list(1, 50),
          api.automations.getRules()
        ]);

      if (controller.signal.aborted) return;

      let loadedUser: User | null = null;
      if (stateRes.status === 'fulfilled' && stateRes.value?.user) {
        const s = stateRes.value;
        setCanonicalState(s);
        loadedUser = s.user;
        setUser(s.user);
        setLeetcodeStats(s.user?.leetcodeStats || null);
        if (s.metrics) {
          setSubmissionMetrics({
            uniqueProblemsSolved: s.metrics.uniqueProblemsSolved,
            acceptedSubmissions: s.metrics.acceptedSubmissions,
            exportedCount: s.metrics.exportedCount,
            pendingCount: s.metrics.pendingCount,
            failedCount: s.metrics.failedCount,
            skippedCount: s.metrics.skippedCount
          });
        }
        setIsStaleData(false);
        setBackendError(null);

        // Silent sliding JWT refresh if within 48 hours of expiration
        if (!tokenRefreshedRef.current && s.user?.sessionExpiresAt) {
          const msLeft = new Date(s.user.sessionExpiresAt).getTime() - Date.now();
          if (msLeft > 0 && msLeft < 48 * 60 * 60 * 1000) {
            tokenRefreshedRef.current = true;
            api.auth
              .refresh()
              .then(() => {
                if (typeof window !== 'undefined') {
                  window.postMessage({ type: 'STREAKFORGE_TRIGGER_PAIR' }, window.location.origin);
                }
              })
              .catch(() => {});
          }
        }
      } else if (stateRes.status === 'rejected') {
        const err = stateRes.reason;
        const status = err instanceof ApiError ? err.status : 0;
        if (status === 401) {
          setUser(null);
          setOverview(EMPTY_OVERVIEW);
          setLeetcodeStats(null);
          setConnectedRepos([]);
          setSubmissions([]);
          setCanonicalState(null);
          clearStoredToken();
          clearCachedSnapshot();
          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
          }
          setIsLoading(false);
          return;
        }

        const msg =
          status === 429
            ? 'API rate limit reached temporarily. Showing cached state — retry shortly.'
            : 'Backend server is waking up or temporarily unreachable. Showing cached state — your session is preserved.';
        setBackendError(msg);
        setIsStaleData(Boolean(userRef.current));
      }

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (heatmapRes.status === 'fulfilled' && heatmapRes.value.length > 0) {
        setHeatmap(heatmapRes.value);
      } else if (loadedUser && heatmap.length === 0) {
        setHeatmap(buildEmptyHeatmap());
      }

      if (reposRes.status === 'fulfilled') {
        setConnectedRepos(reposRes.value.connected);
        setGithubRepos(reposRes.value.githubAvailable);
      }

      if (subsRes.status === 'fulfilled') {
        setSubmissions(subsRes.value.data || []);
        if (subsRes.value.meta?.metrics) {
          setSubmissionMetrics(subsRes.value.meta.metrics);
        }
      }

      if (notifsRes.status === 'fulfilled') {
        setNotifications(
          notifsRes.value.items.map((n) => ({
            id: n.id,
            type: (n.category === 'STREAK_WARNING'
              ? 'STREAK_WARNING'
              : n.category === 'EXPORT_SUCCESS'
                ? 'EXPORT_SUCCESS'
                : n.category === 'EXPORT_FAILURE'
                  ? 'EXPORT_FAILURE'
                  : n.category === 'AGENT_DISCONNECTED'
                    ? 'AGENT_ALERT'
                    : 'SECURITY') as any,
            title: n.title,
            message: n.message,
            timestamp: new Date(n.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            }),
            isRead: n.isRead,
            link: n.link
          }))
        );
      }

      if (rulesRes.status === 'fulfilled') {
        setAutomations(
          rulesRes.value.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type as any,
            status: r.enabled ? 'ACTIVE' : 'PAUSED',
            scheduleDescription: `${r.triggerType}: ${r.schedule} (${r.timezone})`,
            nextExecution: r.nextExecution ? new Date(r.nextExecution).toLocaleString() : 'Paused',
            lastExecution: r.lastExecution?.timestamp
              ? new Date(r.lastExecution.timestamp).toLocaleString()
              : 'Never',
            lastExecutionStatus: r.lastExecution?.status || 'SKIPPED',
            successCount: r.lastExecution?.status === 'SUCCESS' ? 1 : 0,
            failureCount: r.lastExecution?.status === 'FAILURE' ? 1 : 0,
            config: { repositoryScope: r.repositoryScope }
          }))
        );
      }

      const nowIso = new Date().toISOString();
      if (loadedUser && typeof window !== 'undefined') {
        setLastUpdatedAt(nowIso);
        try {
          localStorage.setItem(
            SNAPSHOT_CACHE_KEY,
            JSON.stringify({
              savedAt: nowIso,
              user: loadedUser,
              overview: overviewRes.status === 'fulfilled' ? overviewRes.value : EMPTY_OVERVIEW,
              connectedRepos: reposRes.status === 'fulfilled' ? reposRes.value.connected : [],
              submissions: subsRes.status === 'fulfilled' ? subsRes.value.data : [],
              metrics:
                subsRes.status === 'fulfilled' && subsRes.value.meta?.metrics
                  ? subsRes.value.meta.metrics
                  : stateRes.status === 'fulfilled'
                    ? stateRes.value.metrics
                    : EMPTY_SUBMISSION_METRICS
            })
          );
        } catch {
          // Ignore storage quota errors
        }
      }

      setIsLoading(false);

      // Phase B: Non-blocking background hydration for secondary analytics (GitHub live feed, audit logs, agents)
      Promise.allSettled([
        api.github.getActivity(1, 20),
        api.audit.getLogs(1, 100),
        api.agent.list()
      ]).then(([ghActRes, logsRes, agentsRes]) => {
        if (controller.signal.aborted) return;
        if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value);
        if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value);

        if (ghActRes.status === 'fulfilled') {
          const gh = ghActRes.value;
          const userRepos = reposRes.status === 'fulfilled' ? reposRes.value.connected : [];
          setGithubActivity({
            totalCommits: gh.commits.length,
            recentCommits: gh.commits.map((c) => ({
              sha: c.sha,
              repo: c.repo,
              branch: c.branch,
              author: c.author,
              message: c.message,
              timestamp: new Date(c.timestamp).toLocaleString(),
              filesChanged: c.filesChanged
            })),
            repositories: userRepos.map((r) => ({
              name: r.repoFullName.split('/')[1] || r.repoFullName,
              fullName: r.repoFullName,
              stars: 0,
              forks: 0,
              activeBranch: r.defaultBranch,
              lastCommitTime: r.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleString() : 'Recently',
              isPrivate: Boolean(r.isPrivate)
            })),
            pullRequests: gh.pullRequests.map((p) => ({
              number: p.number,
              title: p.title,
              repo: p.repo,
              state: p.state,
              author: p.author,
              createdAt: new Date(p.createdAt).toLocaleDateString()
            })),
            issues: gh.issues.map((i) => ({
              number: i.number,
              title: i.title,
              repo: i.repo,
              state: i.state,
              author: i.author,
              createdAt: new Date(i.createdAt).toLocaleDateString()
            })),
            branches: gh.branches.map((b) => ({
              name: b.name,
              repo: b.repo,
              isProtected: b.isProtected,
              lastCommitSha: b.lastCommitSha
            })),
            rateLimit: gh.rateLimit
          });
        }
      });
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setIsDemoMode(false);
      setIsStaleData(Boolean(userRef.current));
      setBackendError(err?.message || 'Unable to load dashboard data from server.');
      setIsLoading(false);
    }
  }, [buildEmptyHeatmap, clearCachedSnapshot]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Proceed cleanly
    }
    clearStoredToken();
    clearCachedSnapshot();
    setUser(null);
    setOverview(EMPTY_OVERVIEW);
    setConnectedRepos([]);
    setGithubRepos([]);
    setSubmissions([]);
    setSubmissionMetrics(EMPTY_SUBMISSION_METRICS);
    setCanonicalState(null);
    setAgents([]);
    setAuditLogs([]);
    setAutomations([]);
    setNotifications([]);
    setLeetcodeStats(null);
    setIsStaleData(false);
    setLastUpdatedAt(null);
    setBackendError(null);
    setHeatmap(buildEmptyHeatmap());
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
    }
  }, [buildEmptyHeatmap, clearCachedSnapshot]);

  // Hydrate instant cached snapshot if authenticated, then trigger live network sync
  useEffect(() => {
    const savedJournal = localStorage.getItem('streakforge_journal');
    if (savedJournal) {
      try {
        setJournalEntries(JSON.parse(savedJournal));
      } catch {
        setJournalEntries([]);
      }
    }

    const token = getStoredToken();
    if (token) {
      try {
        const rawSnap = localStorage.getItem(SNAPSHOT_CACHE_KEY);
        if (rawSnap) {
          const parsed = JSON.parse(rawSnap);
          if (parsed?.user) {
            setUser(parsed.user);
            setLeetcodeStats(parsed.user.leetcodeStats || null);
            if (parsed.overview) setOverview(parsed.overview);
            if (Array.isArray(parsed.connectedRepos)) setConnectedRepos(parsed.connectedRepos);
            if (Array.isArray(parsed.submissions)) setSubmissions(parsed.submissions);
            if (parsed.metrics) setSubmissionMetrics(parsed.metrics);
            setLastUpdatedAt(parsed.savedAt || null);
            setIsStaleData(true);
            setIsLoading(false); // Fast optimistic first paint!
          }
        }
      } catch {
        // Ignore bad cache JSON
      }
    }

    refreshData();
  }, [refreshData]);

  useEffect(() => {
    const evaluateExtensionStatus = () => {
      const hasAttr =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute('data-streakforge-extension') === 'active';
      const token = getStoredToken();
      const activeUser = userRef.current;
      const currentSubs = submissionsRef.current;
      const hasFailed = currentSubs.some((s) => s.syncStatus === 'FAILED');

      if (hasFailed) {
        setExtensionStatus('SYNC_FAILED');
      } else if (hasAttr) {
        if (token && activeUser) {
          setExtensionStatus('CONNECTED');
        } else {
          setExtensionStatus('INSTALLED_DISCONNECTED');
        }
      } else if (currentSubs.length > 0 && activeUser) {
        setExtensionStatus('CONNECTED');
      } else {
        setExtensionStatus('NOT_INSTALLED');
      }

      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'STREAKFORGE_REQUEST_EXTENSION_STATUS' }, window.location.origin);
      }
    };

    evaluateExtensionStatus();
    const statusInterval = setInterval(evaluateExtensionStatus, 3000);

    const handleSyncEvent = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'STREAKFORGE_EXTENSION_ACTIVE') {
        const token = getStoredToken();
        if (token && userRef.current) {
          setExtensionStatus('CONNECTED');
        } else {
          setExtensionStatus('INSTALLED_DISCONNECTED');
        }
      } else if (event.data?.type === 'STREAKFORGE_LIVE_SYNC_STARTED') {
        setExtensionStatus('SYNCHRONIZING');
      } else if (event.data?.type === 'STREAKFORGE_LIVE_SYNC_COMPLETED') {
        setExtensionStatus('CONNECTED');
        refreshData();
      } else if (event.data?.type === 'STREAKFORGE_LIVE_SYNC_FAILED') {
        setExtensionStatus('SYNC_FAILED');
        refreshData();
      }
    };
    window.addEventListener('message', handleSyncEvent);
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('message', handleSyncEvent);
    };
  }, [refreshData]);

  const updateJournalNote = (date: string, note: string) => {
    api.analytics.saveJournalNote(date, note).catch(() => {});
    setJournalEntries((prev) => {
      const existingIndex = prev.findIndex((j) => j.date === date);
      let updated: JournalEntry[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          notes: note,
          updatedAt: new Date().toISOString()
        };
      } else {
        updated = [
          {
            id: `j-${Date.now()}`,
            date,
            codingDurationMinutes: 60,
            commitsCount: 1,
            problemsSolvedCount: 0,
            notes: note,
            syncEventsCount: 1,
            updatedAt: new Date().toISOString()
          },
          ...prev
        ];
      }
      localStorage.setItem('streakforge_journal', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : a
      )
    );
    api.automations.toggleRule(id).catch(() => {});
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    api.automations.deleteRule(id).catch(() => {});
  };

  const patchUserPreferencesLocal = useCallback(
    (
      patch: Partial<
        Pick<User, 'timezone' | 'streakGoalPerDay' | 'notificationPreferences' | 'syncPreferences' | 'uiPreferences'>
      >
    ) => {
      setUser((prev) => {
        if (!prev) return prev;
        const updatedUser: User = {
          ...prev,
          ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
          ...(patch.streakGoalPerDay !== undefined ? { streakGoalPerDay: patch.streakGoalPerDay } : {}),
          ...(patch.notificationPreferences
            ? {
                notificationPreferences: {
                  ...prev.notificationPreferences,
                  ...patch.notificationPreferences
                }
              }
            : {}),
          ...(patch.syncPreferences
            ? {
                syncPreferences: {
                  ...prev.syncPreferences,
                  ...patch.syncPreferences
                }
              }
            : {}),
          ...(patch.uiPreferences
            ? {
                uiPreferences: {
                  ...prev.uiPreferences,
                  ...patch.uiPreferences
                } as any
              }
            : {})
        };

        if (typeof window !== 'undefined') {
          try {
            const rawSnap = localStorage.getItem(SNAPSHOT_CACHE_KEY);
            if (rawSnap) {
              const snap = JSON.parse(rawSnap);
              snap.user = updatedUser;
              localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(snap));
            }
          } catch {
            // Ignore snapshot update error
          }
        }

        return updatedUser;
      });
    },
    []
  );

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    api.notifications.markAsRead(id).catch(() => {
      refreshData();
    });
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    api.notifications.markAllAsRead().catch(() => {
      refreshData();
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    api.notifications.clearAll().catch(() => {
      refreshData();
    });
  };

  return (
    <DataContext.Provider
      value={{
        user,
        overview,
        heatmap,
        connectedRepos,
        githubRepos,
        submissions,
        submissionMetrics,
        canonicalState,
        agents,
        auditLogs,
        automations,
        journalEntries,
        notifications,
        githubActivity,
        leetcodeStats,
        extensionStatus,
        isLoading,
        isDemoMode,
        isStaleData,
        lastUpdatedAt,
        backendError,
        refreshData,
        refreshLeetCodeStats,
        logout,
        updateJournalNote,
        toggleAutomation,
        deleteAutomation,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        patchUserPreferencesLocal
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
