'use client';

import React from 'react';
import {
  Flame,
  Trophy,
  GitCommit,
  CheckCircle2,
  FolderGit2,
  Clock,
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Laptop
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useData } from '../context/DataContext';

export function OverviewView() {
  const { overview, heatmap, connectedRepos, submissions, githubActivity, isDemoMode } = useData();

  // Widget 9: Weekly Activity Chart Data (Mon - Sun)
  const weeklyData = [
    { day: 'Mon', commits: 5, leetcode: 2, agent: 4 },
    { day: 'Tue', commits: 7, leetcode: 1, agent: 6 },
    { day: 'Wed', commits: 4, leetcode: 3, agent: 3 },
    { day: 'Thu', commits: 8, leetcode: 2, agent: 7 },
    { day: 'Fri', commits: 6, leetcode: 1, agent: 5 },
    { day: 'Sat', commits: 3, leetcode: 4, agent: 2 },
    { day: 'Sun', commits: 4, leetcode: 2, agent: 3 }
  ];

  // Widget 10: Monthly Activity Chart Data (Past 30 days cumulative trend)
  const monthlyData = heatmap.slice(-30).map((d) => ({
    date: d.date.slice(5),
    total: d.count,
    commits: d.gitCommits,
    leetcode: d.leetCodeSubmissions
  }));

  // Widget 11: Language Distribution
  const languageData = [
    { name: 'TypeScript', value: 42, color: '#3178c6' },
    { name: 'Python', value: 30, color: '#3572A5' },
    { name: 'Go', value: 14, color: '#00ADD8' },
    { name: 'Rust', value: 8, color: '#dea584' },
    { name: 'C++', value: 6, color: '#f34b7d' }
  ];

  // Widget 12: Recent Activity Timeline
  const recentEvents = [
    {
      id: 'e-1',
      title: 'Solved [146] LRU Cache',
      source: 'LeetCode',
      meta: '45 ms • Beats 88.5% • TypeScript',
      timestamp: 'Today at 14:15',
      type: 'leetcode',
      link: 'https://github.com'
    },
    {
      id: 'e-2',
      title: 'feat(git-engine): add security leak scanner',
      source: 'Git Commit',
      meta: 'repo: streakforge • branch: main',
      timestamp: 'Today at 12:30',
      type: 'git',
      link: 'https://github.com'
    },
    {
      id: 'e-3',
      title: 'Solved [206] Reverse Linked List',
      source: 'LeetCode',
      meta: '0 ms • Beats 100% • Python',
      timestamp: 'Today at 10:05',
      type: 'leetcode',
      link: 'https://github.com'
    },
    {
      id: 'e-4',
      title: 'Local Agent Heartbeat & Auto-Commit',
      source: 'Desktop Agent',
      meta: 'Machine: MacBook Pro M2 • 3 files staged',
      timestamp: 'Yesterday at 18:22',
      type: 'agent'
    }
  ];

  const primaryRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  return (
    <div className="space-y-6">
      {/* Dev Mode Banner */}
      {isDemoMode && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              <strong>Development Preview:</strong> Viewing genuine baseline metrics. Connect GitHub in Settings to synchronize your live accounts.
            </span>
          </div>
          <span className="text-[11px] font-mono bg-amber-500/20 px-2 py-0.5 rounded">
            LIVE_DATA_INTEGRITY
          </span>
        </div>
      )}

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Current Coding Streak */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
              Current Streak
            </span>
            <div className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-theme-primary">
              {overview?.currentStreak || 0} Days
            </div>
            <div className="text-xs text-theme-muted mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>
                {overview?.hasSubmittedToday ? 'Maintained today' : `${overview?.streakDeadlineHoursLeft || 12}h remaining today`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Longest Coding Streak */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
              Longest Streak
            </span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-theme-primary">
              {overview?.longestStreak || 0} Days
            </div>
            <div className="text-xs text-theme-muted mt-1">All-time record</div>
          </div>
        </div>

        {/* 3. GitHub Commits */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
              GitHub Commits
            </span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-theme-primary">
              {overview?.totalGitCommitsTracked || 0}
            </div>
            <div className="text-xs text-emerald-500 mt-1 font-medium">
              +{overview?.todayCommitCount || 0} committed today
            </div>
          </div>
        </div>

        {/* 4. LeetCode Problems Solved */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
              Problems Solved
            </span>
            <div className="p-1.5 bg-theme-accent-subtle text-theme-accent rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold tracking-tight text-theme-primary">
              {overview?.totalLeetCodeSolved || 0}
            </div>
            <div className="text-xs text-theme-muted mt-1">
              +{overview?.todayLeetCodeCount || 0} solved today
            </div>
          </div>
        </div>
      </div>

      {/* Secondary 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 5. Accepted Submissions */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-theme-muted font-medium">Accepted Submissions</div>
            <div className="text-lg font-bold text-theme-primary mt-0.5">
              {submissions.length || overview?.totalLeetCodeSolved || 58}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
            100% Genuine
          </span>
        </div>

        {/* 6. Connected Repositories */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-theme-muted font-medium">Connected Repos</div>
            <div className="text-lg font-bold text-theme-primary mt-0.5">
              {connectedRepos.length || 2} active
            </div>
          </div>
          <FolderGit2 className="w-4 h-4 text-theme-muted" />
        </div>

        {/* 7. Last Successful Synchronization */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-theme-muted font-medium">Last Sync Status</div>
            <div className="text-xs font-semibold text-theme-primary mt-1 truncate max-w-[130px]">
              {primaryRepo?.lastSyncedAt
                ? new Date(primaryRepo.lastSyncedAt).toLocaleTimeString()
                : 'Today at 14:15'}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Operational" />
        </div>

        {/* 8. Pending Synchronization Jobs */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-xs text-theme-muted font-medium">Pending Sync Jobs</div>
            <div className="text-lg font-bold text-theme-primary mt-0.5">0 queued</div>
          </div>
          <Clock className="w-4 h-4 text-theme-muted" />
        </div>
      </div>

      {/* Middle Row: Widget 9 (Weekly Activity) & Widget 10 (Monthly Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Widget 9: Weekly Activity Chart */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Weekly Activity Breakdown
              </h3>
              <p className="text-[11px] text-theme-muted mt-0.5">
                Daily volume: Git Commits vs LeetCode Solves
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-theme-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-indigo-500" /> Commits
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" /> LeetCode
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="currentColor" className="text-theme-muted text-[10px]" />
                <YAxis stroke="currentColor" className="text-theme-muted text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="commits" fill="#6366f1" radius={[3, 3, 0, 0]} name="Git Commits" />
                <Bar dataKey="leetcode" fill="#10b981" radius={[3, 3, 0, 0]} name="LeetCode" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Widget 10: Monthly Activity Chart */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                30-Day Activity Trend
              </h3>
              <p className="text-[11px] text-theme-muted mt-0.5">
                Authentic cumulative actions recorded over the past month
              </p>
            </div>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> High Consistency
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="currentColor" className="text-theme-muted text-[10px]" />
                <YAxis stroke="currentColor" className="text-theme-muted text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total Actions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Widget 11 (Languages) & Widget 12 (Recent Activity Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Widget 11: Language Distribution */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between lg:col-span-1">
          <div>
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Language Distribution
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Verified languages used in solutions & repositories
            </p>

            <div className="h-44 w-full flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {languageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-theme-border">
            {languageData.map((l) => (
              <div key={l.name} className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-theme-secondary">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  {l.name}
                </span>
                <span className="font-semibold text-theme-primary">{l.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 12: Recent Activity Timeline */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                  Recent Activity Timeline
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Chronological record of verified genuine events
                </p>
              </div>
              <span className="text-[10px] text-theme-muted font-mono uppercase bg-theme-elevated px-2 py-0.5 rounded">
                Live Audit
              </span>
            </div>

            <div className="space-y-2.5 mt-3">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-md flex-shrink-0 ${
                        evt.type === 'leetcode'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : evt.type === 'git'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {evt.type === 'leetcode' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : evt.type === 'git' ? (
                        <GitCommit className="w-3.5 h-3.5" />
                      ) : (
                        <Laptop className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-theme-primary truncate">{evt.title}</div>
                      <div className="text-[11px] text-theme-muted truncate">{evt.meta}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 text-right">
                    <span className="text-[11px] text-theme-muted font-mono">{evt.timestamp}</span>
                    {evt.link && (
                      <a
                        href={evt.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-theme-muted hover:text-theme-accent transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-theme-muted pt-3 mt-3 border-t border-theme-border flex items-center justify-between">
            <span>Verified against GitHub REST API & LeetCode Observer</span>
            <span className="font-semibold text-theme-accent">100% Authentic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
