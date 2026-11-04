'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  User,
  AnalyticsOverview,
  HeatmapDay,
  RepositoryConnection,
  LeetCodeSubmission,
  LocalAgentInstance,
  AuditLog
} from '@streakforge/shared-types';
import { api } from '../lib/api';
import { getStoredToken } from '../lib/utils';

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
  isLoading: boolean;
  isDemoMode: boolean;
  refreshData: () => Promise<void>;
  updateJournalNote: (date: string, note: string) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Realistic demo fallback for development / unauthenticated state
const DEMO_OVERVIEW: AnalyticsOverview = {
  currentStreak: 14,
  longestStreak: 42,
  hasSubmittedToday: true,
  todayCommitCount: 4,
  todayLeetCodeCount: 2,
  weeklyConsistencyPercent: 86,
  weeklyActivityScore: 92,
  streakDeadlineHoursLeft: 6.5,
  totalLeetCodeSolved: 58,
  totalGitCommitsTracked: 164,
  difficultyDistribution: { Easy: 28, Medium: 23, Hard: 7 },
  githubStreak: { currentStreak: 14, longestStreak: 42, activeDays: 45, hasSubmittedToday: true },
  leetCodeStreak: { currentStreak: 8, longestStreak: 21, activeDays: 32, hasSubmittedToday: true },
  localDevStreak: { currentStreak: 12, longestStreak: 30, activeDays: 40, hasSubmittedToday: true },
  breakdown: {
    githubCommits: 164,
    githubPRs: 24,
    githubIssues: 12,
    leetCodeTotalSubmissions: 76,
    leetCodeAccepted: 58,
    leetCodeUniqueProblems: 54,
    localSessions: 48,
    maintenanceBackups: 16
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
  const [overview, setOverview] = useState<AnalyticsOverview | null>(DEMO_OVERVIEW);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [connectedRepos, setConnectedRepos] = useState<RepositoryConnection[]>([]);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<LeetCodeSubmission[]>([]);
  const [agents, setAgents] = useState<LocalAgentInstance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [automations, setAutomations] = useState<AutomationJob[]>(DEMO_AUTOMATIONS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);
  const [githubActivity, setGithubActivity] = useState<GitHubActivityData>(DEMO_GITHUB_ACTIVITY);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Generate 365-day heatmap
  const generateInitialHeatmap = useCallback(() => {
    const days: HeatmapDay[] = [];
    const now = new Date();
    for (let i = 365; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const isPast = i > 0;
      // Realistic activity distribution
      const rand = Math.random();
      const count = isPast ? (rand > 0.35 ? Math.floor(Math.random() * 5) + 1 : 0) : 4;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 5) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      days.push({
        date: d.toISOString().split('T')[0],
        count,
        gitCommits: Math.floor(count * 0.6),
        leetCodeSubmissions: Math.ceil(count * 0.4),
        level
      });
    }
    return days;
  }, []);

  const refreshData = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setIsDemoMode(true);
      setHeatmap(generateInitialHeatmap());
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [meRes, overviewRes, heatmapRes, reposRes, subsRes, agentsRes, logsRes, ghActRes] =
        await Promise.allSettled([
          api.auth.getMe(),
          api.analytics.getOverview(),
          api.analytics.getHeatmap(),
          api.repos.list(),
          api.sync.getHistory(1, 50),
          api.agent.list(),
          api.audit.getLogs(1, 100),
          api.github.getActivity(1, 20)
        ]);

      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.user);
        setIsDemoMode(false);
      } else {
        setIsDemoMode(true);
      }

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (heatmapRes.status === 'fulfilled' && heatmapRes.value.length > 0) {
        setHeatmap(heatmapRes.value);
      } else {
        setHeatmap(generateInitialHeatmap());
      }
      if (reposRes.status === 'fulfilled') {
        setConnectedRepos(reposRes.value.connected);
        setGithubRepos(reposRes.value.githubAvailable);
      }
      if (subsRes.status === 'fulfilled') setSubmissions(subsRes.value);
      if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value);
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value);

      if (ghActRes.status === 'fulfilled' && ghActRes.value.commits.length > 0) {
        const gh = ghActRes.value;
        setGithubActivity((prev) => ({
          ...prev,
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
        }));
      }
    } catch {
      setIsDemoMode(true);
    } finally {
      setIsLoading(false);
    }
  }, [generateInitialHeatmap]);

  useEffect(() => {
    // Load journal from localStorage
    const savedJournal = localStorage.getItem('streakforge_journal');
    if (savedJournal) {
      try {
        setJournalEntries(JSON.parse(savedJournal));
      } catch {
        // ignore
      }
    } else {
      // Default today entry
      const todayStr = new Date().toISOString().split('T')[0];
      setJournalEntries([
        {
          id: 'j-1',
          date: todayStr,
          codingDurationMinutes: 195,
          commitsCount: 4,
          problemsSolvedCount: 2,
          notes: 'Solved Two Sum & LRU Cache on LeetCode; refactored local agent git staging filters to prevent secret leaks.',
          syncEventsCount: 6,
          updatedAt: new Date().toISOString()
        }
      ]);
    }

    refreshData();
  }, [refreshData]);

  const updateJournalNote = (date: string, note: string) => {
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
  };

  const deleteAutomation = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
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
        isLoading,
        isDemoMode,
        refreshData,
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

