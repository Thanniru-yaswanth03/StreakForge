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
  AuditLog
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

interface DataContextValue {
  user: User | null;
  overview: AnalyticsOverview | null;
  heatmap: HeatmapDay[];
  connectedRepos: RepositoryConnection[];
  githubRepos: any[];
  submissions: LeetCodeSubmission[];
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
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Initial empty overview for unauthenticated / fresh accounts
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

const DEMO_AUTOMATIONS: AutomationJob[] = [
  {
    id: 'auto-1',
    name: 'Local Agent Idle Auto-Commit',
    type: 'LOCAL_AGENT_IDLE',
    status: 'ACTIVE',
    scheduleDescription: 'After 15 minutes of inactivity in monitored repositories',
    nextExecution: 'Upon idle trigger',
    lastExecution: 'Today at 14:22',
    lastExecutionStatus: 'SUCCESS',
    successCount: 142,
    failureCount: 0,
    config: { idleMinutes: 15, autoPush: false }
  },
  {
    id: 'auto-2',
    name: 'End-of-Day Streak Wrap-Up',
    type: 'END_OF_DAY_WRAPUP',
    status: 'ACTIVE',
    scheduleDescription: 'Daily at 23:00 in user timezone',
    nextExecution: 'Today at 23:00',
    lastExecution: 'Yesterday at 23:00',
    lastExecutionStatus: 'SUCCESS',
    successCount: 45,
    failureCount: 1,
    config: { time: '23:00', requirePrompt: true }
  },
  {
    id: 'auto-3',
    name: 'LeetCode Solution Exporter',
    type: 'LEETCODE_EXPORT',
    status: 'ACTIVE',
    scheduleDescription: 'Instant trigger upon Accepted submission detection',
    nextExecution: 'Event-driven',
    lastExecution: 'Today at 12:45',
    lastExecutionStatus: 'SUCCESS',
    successCount: 58,
    failureCount: 0,
    config: { repo: 'dev/leetcode-solutions', branch: 'main' }
  },
  {
    id: 'auto-4',
    name: 'Weekly Archive & Consistency Tag',
    type: 'WEEKLY_ARCHIVE',
    status: 'PAUSED',
    scheduleDescription: 'Every Sunday at 23:59',
    nextExecution: 'Paused',
    lastExecution: 'Oct 28, 2026',
    lastExecutionStatus: 'SUCCESS',
    successCount: 8,
    failureCount: 0,
    config: { tagFormat: 'streak-week-{week}' }
  }
];

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'EXPORT_SUCCESS',
    title: 'LeetCode Solution Exported',
    message: 'Exported solution for [146] LRU Cache (45ms, 58MB) to user/leetcode-solutions.',
    timestamp: '2 hours ago',
    isRead: false,
    link: 'https://github.com'
  },
  {
    id: 'notif-2',
    type: 'STREAK_WARNING',
    title: 'Daily Streak Reminder',
    message: 'You have 6.5 hours remaining in your local timezone to maintain your 14-day streak!',
    timestamp: '4 hours ago',
    isRead: false
  },
  {
    id: 'notif-3',
    type: 'AGENT_ALERT',
    title: 'Desktop Agent Heartbeat',
    message: 'Agent "MacBook Pro M2" committed 3 genuine changes in project "web-service".',
    timestamp: 'Yesterday at 18:30',
    isRead: true
  },
  {
    id: 'notif-4',
    type: 'SECURITY',
    title: 'Safety Guard Filter Active',
    message: 'Prevented uncommitted .env file from being staged automatically.',
    timestamp: '2 days ago',
    isRead: true
  }
];

const DEMO_GITHUB_ACTIVITY: GitHubActivityData = {
  totalCommits: 164,
  recentCommits: [
    {
      sha: '8f7d9a1c3e4b5a',
      repo: 'streakforge',
      branch: 'main',
      author: 'alexdeveloper',
      message: 'feat(sync): add dual detection observer for LeetCode GraphQL',
      timestamp: 'Today at 14:15',
      filesChanged: 3
    },
    {
      sha: '3c2e1b4d5a6f7e',
      repo: 'streakforge',
      branch: 'main',
      author: 'alexdeveloper',
      message: 'fix(git-engine): strictly enforce secret filter on .env and private keys',
      timestamp: 'Today at 11:30',
      filesChanged: 2
    },
    {
      sha: '9b8a7c6e5d4f3a',
      repo: 'leetcode-solutions',
      branch: 'main',
      author: 'alexdeveloper',
      message: 'feat(leetcode): solve [146] LRU Cache (45ms, 58.2 MB)',
      timestamp: 'Today at 10:45',
      filesChanged: 2
    },
    {
      sha: '1a2b3c4d5e6f7a',
      repo: 'api-service',
      branch: 'dev',
      author: 'alexdeveloper',
      message: 'refactor(auth): migrate token validation to AES-256-GCM',
      timestamp: 'Yesterday at 17:20',
      filesChanged: 4
    }
  ],
  repositories: [
    {
      name: 'streakforge',
      fullName: 'alexdeveloper/streakforge',
      stars: 12,
      forks: 3,
      activeBranch: 'main',
      lastCommitTime: 'Today at 14:15',
      isPrivate: false
    },
    {
      name: 'leetcode-solutions',
      fullName: 'alexdeveloper/leetcode-solutions',
      stars: 34,
      forks: 5,
      activeBranch: 'main',
      lastCommitTime: 'Today at 10:45',
      isPrivate: false
    },
    {
      name: 'api-service',
      fullName: 'alexdeveloper/api-service',
      stars: 4,
      forks: 1,
      activeBranch: 'dev',
      lastCommitTime: 'Yesterday at 17:20',
      isPrivate: true
    }
  ],
  branches: [
    { name: 'main', repo: 'streakforge', isProtected: true, lastCommitSha: '8f7d9a1' },
    { name: 'dev', repo: 'streakforge', isProtected: false, lastCommitSha: '2d3c4e5' },
    { name: 'main', repo: 'leetcode-solutions', isProtected: true, lastCommitSha: '9b8a7c6' },
    { name: 'dev', repo: 'api-service', isProtected: false, lastCommitSha: '1a2b3c4' }
  ],
  pullRequests: [
    {
      number: 14,
      title: 'feat: Timezone-aware daily snapshot streak aggregation',
      repo: 'streakforge',
      state: 'MERGED',
      author: 'alexdeveloper',
      createdAt: '2 days ago'
    },
    {
      number: 15,
      title: 'fix: Add robust loopback nonce verification for local desktop agent',
      repo: 'streakforge',
      state: 'OPEN',
      author: 'alexdeveloper',
      createdAt: '1 day ago'
    }
  ],
  issues: [
    {
      number: 8,
      title: 'Support custom difficulty directory format templates',
      repo: 'streakforge',
      state: 'CLOSED',
      author: 'alexdeveloper',
      createdAt: '3 days ago'
    }
  ]
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(EMPTY_OVERVIEW);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<RepositoryConnection[]>([]);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<LeetCodeSubmission[]>([]);
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
  const [backendError, setBackendError] = useState<string | null>(null);

  const userRef = useRef<User | null>(null);
  const submissionsRef = useRef<LeetCodeSubmission[]>([]);
  userRef.current = user;
  submissionsRef.current = submissions;

  const refreshLeetCodeStats = useCallback(async (usernameOverride?: string): Promise<void> => {
    try {
      const stats = await api.sync.refreshProfileStats(usernameOverride);
      setLeetcodeStats(stats);
    } catch (err) {
      console.warn('Failed refreshing LeetCode stats:', err);
      throw err;
    }
  }, []);

  // Build deterministic 365-day empty heatmap (zero fabrication when no activity is recorded)
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

  const refreshData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setOverview(EMPTY_OVERVIEW);
      setConnectedRepos([]);
      setGithubRepos([]);
      setSubmissions([]);
      setAgents([]);
      setAuditLogs([]);
      setAutomations([]);
      setNotifications([]);
      setLeetcodeStats(null);
      setIsDemoMode(false);
      setBackendError(null);
      setHeatmap(buildEmptyHeatmap());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setBackendError(null);
      const [meRes, overviewRes, heatmapRes, reposRes, subsRes, agentsRes, logsRes, ghActRes, rulesRes, notifsRes, lcStatsRes] =
        await Promise.allSettled([
          api.auth.getMe(),
          api.analytics.getOverview(),
          api.analytics.getHeatmap(),
          api.repos.list(),
          api.sync.getHistory(1, 50),
          api.agent.list(),
          api.audit.getLogs(1, 100),
          api.github.getActivity(1, 20),
          api.automations.getRules(),
          api.notifications.list(1, 50),
          api.sync.getProfileStats()
        ]);

      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.user);
        setLeetcodeStats(meRes.value.user.leetcodeStats || null);
        setIsDemoMode(false);
        setBackendError(null);
      } else {
        const err = meRes.reason;
        const status = err instanceof ApiError ? err.status : 0;
        const isAuthInvalid = status === 401;

        if (isAuthInvalid) {
          setUser(null);
          setOverview(EMPTY_OVERVIEW);
          setLeetcodeStats(null);
          setConnectedRepos([]);
          setSubmissions([]);
          setIsDemoMode(false);
          clearStoredToken();
          if (typeof window !== 'undefined') {
            window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
          }
          setIsLoading(false);
          return;
        }

        // Preserve session across transient 429 rate-limit / Render 503 cold-start / network outages
        const msg =
          status === 429
            ? 'API rate limit reached temporarily. Please wait a moment and click Retry Sync.'
            : 'Backend server is waking up or temporarily unreachable. Your session is preserved — click Retry Sync.';
        setBackendError(msg);
        setIsDemoMode(false);
      }

      if (lcStatsRes.status === 'fulfilled' && lcStatsRes.value) {
        setLeetcodeStats(lcStatsRes.value);
      }

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (heatmapRes.status === 'fulfilled' && heatmapRes.value.length > 0) {
        setHeatmap(heatmapRes.value);
      } else if (meRes.status === 'fulfilled') {
        setHeatmap(buildEmptyHeatmap());
      }
      if (reposRes.status === 'fulfilled') {
        setConnectedRepos(reposRes.value.connected);
        setGithubRepos(reposRes.value.githubAvailable);
      }
      if (subsRes.status === 'fulfilled') setSubmissions(subsRes.value);
      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value);

      if (rulesRes.status === 'fulfilled' && rulesRes.value.length > 0) {
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

      if (notifsRes.status === 'fulfilled' && notifsRes.value.items.length > 0) {
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
            timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isRead: n.isRead,
            link: n.link
          }))
        );
      }

      if (meRes.status === 'fulfilled') {
        if (ghActRes.status === 'fulfilled' && ghActRes.value.commits.length > 0) {
          const gh = ghActRes.value;
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
            repositories: reposRes.status === 'fulfilled' ? reposRes.value.connected.map((r) => ({
              name: r.repoFullName.split('/')[1] || r.repoFullName,
              fullName: r.repoFullName,
              stars: 0,
              forks: 0,
              activeBranch: r.defaultBranch,
              lastCommitTime: r.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleString() : 'Recently',
              isPrivate: false
            })) : [],
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
        } else {
          // Zero-Fabrication: Never show mock demo commits to authenticated users
          const userRepos = reposRes.status === 'fulfilled' ? reposRes.value.connected : [];
          setGithubActivity({
            totalCommits: overviewRes.status === 'fulfilled' ? (overviewRes.value?.totalGitCommitsTracked || 0) : 0,
            recentCommits: [],
            repositories: userRepos.map((r) => ({
              name: r.repoFullName.split('/')[1] || r.repoFullName,
              fullName: r.repoFullName,
              stars: 0,
              forks: 0,
              activeBranch: r.defaultBranch,
              lastCommitTime: r.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleString() : 'Recently',
              isPrivate: false
            })),
            branches: userRepos.map((r) => ({
              name: r.defaultBranch,
              repo: r.repoFullName.split('/')[1] || r.repoFullName,
              isProtected: true,
              lastCommitSha: 'HEAD'
            })),
            pullRequests: [],
            issues: []
          });
        }
      }
    } catch (err: any) {
      setIsDemoMode(false);
      setBackendError(err?.message || 'Unable to load dashboard data from server.');
    } finally {
      setIsLoading(false);
    }
  }, [buildEmptyHeatmap]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Proceed with local cleanup even if backend request fails
    }
    clearStoredToken();
    setUser(null);
    setOverview(EMPTY_OVERVIEW);
    setConnectedRepos([]);
    setGithubRepos([]);
    setSubmissions([]);
    setAgents([]);
    setAuditLogs([]);
    setAutomations([]);
    setNotifications([]);
    setLeetcodeStats(null);
    setBackendError(null);
    setHeatmap(buildEmptyHeatmap());
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
    }
  }, [buildEmptyHeatmap]);

  useEffect(() => {
    // Load saved personal journal notes from localStorage (strictly empty by default — zero fabricated entries)
    const savedJournal = localStorage.getItem('streakforge_journal');
    if (savedJournal) {
      try {
        setJournalEntries(JSON.parse(savedJournal));
      } catch {
        setJournalEntries([]);
      }
    }

    refreshData();
  }, [refreshData]);

  useEffect(() => {
    // Extension detection & real-time live sync listeners using refs to avoid re-triggering refreshData loops
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
      }
    };
    window.addEventListener('message', handleSyncEvent);
    return () => {
      clearInterval(statusInterval);
      window.removeEventListener('message', handleSyncEvent);
    };
  }, [refreshData]);

  const updateJournalNote = (date: string, note: string) => {
    // Attempt backend sync
    api.analytics.saveJournalNote(date, note).catch(() => {
      // Ignored in offline/demo mode
    });

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
    if (!isDemoMode) {
      api.automations.toggleRule(id).catch(() => {});
    }
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    if (!isDemoMode) {
      api.automations.deleteRule(id).catch(() => {});
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (!isDemoMode) {
      api.notifications.markAsRead(id).catch(() => {});
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (!isDemoMode) {
      api.notifications.markAllAsRead().catch(() => {});
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (!isDemoMode) {
      api.notifications.clearAll().catch(() => {});
    }
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
        backendError,
        refreshData,
        refreshLeetCodeStats,
        logout,
        updateJournalNote,
        toggleAutomation,
        deleteAutomation,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications
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

