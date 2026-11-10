'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  FolderGit2,
  Code2,
  Download,
  Filter,
  Calendar,
  Layers,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  RotateCw,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import type {
  GitHubAnalytics,
  LeetCodeAnalytics,
  CodingAnalytics,
  DeveloperReport,
  ReportPeriod
} from '@streakforge/shared-types';

export function AnalyticsView() {
  const { overview, heatmap, connectedRepos } = useData();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'overview' | 'github' | 'leetcode' | 'coding' | 'reports'>('overview');

  // Filter States
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [selectedRepo, setSelectedRepo] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Analytics API Data States
  const [githubAnalytics, setGithubAnalytics] = useState<GitHubAnalytics | null>(null);
  const [leetcodeAnalytics, setLeetcodeAnalytics] = useState<LeetCodeAnalytics | null>(null);
  const [codingAnalytics, setCodingAnalytics] = useState<CodingAnalytics | null>(null);
  const [report, setReport] = useState<DeveloperReport | null>(null);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    Promise.allSettled([
      api.analytics.getGitHubAnalytics(),
      api.analytics.getLeetCodeAnalytics(),
      api.analytics.getCodingAnalytics(),
      api.analytics.getReport(reportPeriod)
    ])
      .then(([ghRes, lcRes, cdRes, repRes]) => {
        if (ghRes.status === 'fulfilled') setGithubAnalytics(ghRes.value);
        if (lcRes.status === 'fulfilled') setLeetcodeAnalytics(lcRes.value);
        if (cdRes.status === 'fulfilled') setCodingAnalytics(cdRes.value);
        if (repRes.status === 'fulfilled') setReport(repRes.value);
      })
      .finally(() => setIsLoading(false));
  }, [reportPeriod]);

  // Compute genuine hour-of-day distribution from recorded report/submissions (zero static fake bars)
  const hourlyCounts: Record<string, number> = {
    '00:00': 0, '04:00': 0, '08:00': 0, '12:00': 0, '16:00': 0, '20:00': 0
  };
  (leetcodeAnalytics?.submissionHistory || []).forEach((s: any) => {
    if (s.submittedAt) {
      const hr = new Date(s.submittedAt).getHours();
      const bucket = `${String(Math.floor(hr / 4) * 4).padStart(2, '0')}:00`;
      if (bucket in hourlyCounts) hourlyCounts[bucket]++;
    }
  });
  const hourlyData = Object.entries(hourlyCounts).map(([hour, actions]) => ({ hour, actions }));

  // Dynamic Day of week distribution computed from authentic heatmap activity for selected date range
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  const targetDays =
    dateRange === '7d'
      ? heatmap.slice(-7)
      : dateRange === '30d'
      ? heatmap.slice(-30)
      : dateRange === '90d'
      ? heatmap.slice(-90)
      : heatmap;

  targetDays.forEach((d) => {
    const dayName = dayNames[new Date(d.date + 'T00:00:00').getDay()];
    if (dayName) {
      dayCounts[dayName] = (dayCounts[dayName] || 0) + (d.count || 0);
    }
  });

  const dayOfWeekData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
    day,
    count: dayCounts[day] || 0
  }));

  // LeetCode Difficulty Distribution
  const diffColors = { Easy: '#10b981', Medium: '#f59e0b', Hard: '#ef4444' };
  const diffData = [
    {
      name: 'Easy',
      count: leetcodeAnalytics?.difficultyDistribution?.Easy?.count ?? overview?.difficultyDistribution?.Easy ?? 0,
      color: diffColors.Easy
    },
    {
      name: 'Medium',
      count: leetcodeAnalytics?.difficultyDistribution?.Medium?.count ?? overview?.difficultyDistribution?.Medium ?? 0,
      color: diffColors.Medium
    },
    {
      name: 'Hard',
      count: leetcodeAnalytics?.difficultyDistribution?.Hard?.count ?? overview?.difficultyDistribution?.Hard ?? 0,
      color: diffColors.Hard
    }
  ];

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const data = await api.analytics.exportReport(reportPeriod, format);
      const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `streakforge-${reportPeriod}-report.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-theme-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-theme-accent" />
            Developer Analytics & Growth
          </h2>
          <p className="text-xs text-theme-muted mt-0.5">
            Verified productivity metrics derived strictly from authenticated repositories and submissions
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'github', label: 'GitHub Activity' },
            { id: 'leetcode', label: 'LeetCode Progress' },
            { id: 'coding', label: 'Coding Duration' },
            { id: 'reports', label: 'Reports & Export' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-theme-accent text-slate-950 shadow-xs'
                  : 'bg-theme-surface hover:bg-theme-elevated text-theme-secondary hover:text-theme-primary border border-theme-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-theme-muted flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" /> Filter Range:
          </span>
          {(['7d', '30d', '90d', '365d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                dateRange === r
                  ? 'bg-theme-accent text-slate-950'
                  : 'bg-theme-elevated text-theme-secondary hover:text-theme-primary border border-theme-border'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}

          {connectedRepos.length > 0 && (
            <select
              value={selectedRepo}
              onChange={(e) => setSelectedRepo(e.target.value)}
              className="bg-theme-elevated border border-theme-border rounded px-2.5 py-1 text-[11px] text-theme-primary focus:outline-hidden"
            >
              <option value="ALL">All Repositories</option>
              {connectedRepos.map((r) => (
                <option key={r.id} value={r.repoFullName}>
                  {r.repoFullName}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-[11px] text-theme-muted flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ground truth: Verified events only</span>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW & VELOCITY
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Velocity Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
                <span>Weekly Activity Score</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-500 mt-2">
                {overview?.weeklyActivityScore ?? 0}/100
              </div>
              <div className="text-xs text-theme-muted mt-1">Weighted 7-day consistency</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
                <span>Verified GitHub Commits</span>
                <GitCommit className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-2">
                {overview?.totalGitCommitsTracked ?? 0}
              </div>
              <div className="text-xs text-theme-muted mt-1">Across default/monitored branches</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
                <span>Unique Problems Solved</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-2">
                {leetcodeAnalytics?.uniqueProblemsSolved ?? overview?.totalLeetCodeSolved ?? 0}
              </div>
              <div className="text-xs text-emerald-500 mt-1">Strict unique problem count</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
                <span>Active Coding Days</span>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-2">
                {overview?.githubStreak?.activeDays ?? 0} Days
              </div>
              <div className="text-xs text-theme-muted mt-1">Calendar days with recorded work</div>
            </div>
          </div>

          {/* Hourly Distribution & Day of Week */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                  Active Hours Distribution
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Verified coding activity grouped by local hour of day
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="hour" stroke="currentColor" className="text-theme-muted text-[10px]" />
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
                    <Bar dataKey="actions" fill="#10b981" radius={[3, 3, 0, 0]} name="Actions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
              <div className="mb-3">
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                  Day of Week Velocity
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Activity distribution across weekdays
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Events" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: GITHUB ANALYTICS
         ========================================================================= */}
      {activeTab === 'github' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Total Commits
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-1">
                {githubAnalytics?.totalCommits ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Verified authored commits</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Weekly Commits
              </div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">
                {githubAnalytics?.weeklyCommits ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Trailing 7 calendar days</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Pull Requests
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {githubAnalytics?.pullRequests.total ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">
                {githubAnalytics?.pullRequests.merged ?? 0} merged • {githubAnalytics?.pullRequests.open ?? 0} open
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Issues Managed
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {githubAnalytics?.issues.total ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">
                {githubAnalytics?.issues.closed ?? 0} closed • {githubAnalytics?.issues.open ?? 0} open
              </div>
            </div>
          </div>

          {/* Repository Activity Table */}
          <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-theme-border flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="w-4 h-4 text-theme-accent" />
                  Connected Repository Activity Distribution
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Commit and contribution breakdown by repository
                </p>
              </div>
            </div>

            <div className="divide-y divide-theme-border text-xs">
              {(githubAnalytics?.repositoryActivity || []).length === 0 ? (
                <div className="p-6 text-center text-theme-muted text-xs">
                  No repository commit activity recorded yet.
                </div>
              ) : (
                githubAnalytics?.repositoryActivity || []
              ).map((repo) => (
                <div
                  key={repo.repoFullName}
                  className="p-3.5 hover:bg-theme-elevated/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-theme-primary flex items-center gap-2">
                      <FolderGit2 className="w-3.5 h-3.5 text-theme-muted" />
                      <span>{repo.repoFullName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-theme-elevated font-mono">
                        {repo.percentageOfTotal}% of total
                      </span>
                    </div>
                    <div className="text-[11px] text-theme-muted mt-1">
                      {repo.commitsCount} commits • {repo.pullRequestsCount} PRs • {repo.issuesCount} issues
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-theme-muted font-mono">
                    Last active: {repo.lastCommitAt ? new Date(repo.lastCommitAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Programming Languages */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-theme-accent" />
              Language Distribution Across Workspaces
            </h3>
            <div className="space-y-3 mt-3">
              {(githubAnalytics?.languages || []).length === 0 ? (
                <div className="py-4 text-center text-theme-muted text-xs">
                  No language activity recorded yet.
                </div>
              ) : (
                githubAnalytics?.languages || []
              ).map((lang) => (
                <div key={lang.language} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-theme-primary">{lang.language}</span>
                    <span className="text-theme-muted font-mono">
                      {lang.count} events ({lang.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-theme-elevated rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-theme-accent h-2 rounded-full"
                      style={{ width: `${Math.min(100, lang.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LEETCODE ANALYTICS
         ========================================================================= */}
      {activeTab === 'leetcode' && (
        <div className="space-y-6">
          {/* Deduplication Guarantee Banner */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-200">Strict Problem Deduplication Guarantee: </span>
              StreakForge tracks all individual submissions, but strictly counts unique problems solved.
              Multiple accepted solutions for the same problem are recorded for auditability but never inflate your solved problem count.
            </div>
          </div>

          {/* Top LeetCode Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Unique Solved
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {leetcodeAnalytics?.uniqueProblemsSolved ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Distinct problem IDs</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Total Submissions
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-1">
                {leetcodeAnalytics?.totalSubmissions ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">
                {leetcodeAnalytics?.acceptedSubmissions ?? 0} accepted ({leetcodeAnalytics?.acceptanceRate ?? 0}%)
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Avg. Submissions / Problem
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {leetcodeAnalytics?.avgSubmissionsPerSolved ?? 0}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Attempts per solved problem</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Solving Streak
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {leetcodeAnalytics?.problemSolvingConsistency?.currentStreakDays ?? 0} Days
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Consecutive calendar days</div>
            </div>
          </div>

          {/* Difficulty Donut & Topic Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Difficulty Donut */}
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                  Difficulty Distribution (Unique Solved)
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Easy, Medium, and Hard problem balance
                </p>
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={diffData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {diffData.map((entry, index) => (
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
                    <Legend
                      formatter={(val) => <span className="text-xs text-theme-secondary">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Topic Progress */}
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
              <div className="mb-2">
                <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                  Algorithm & Data Structure Topics
                </h3>
                <p className="text-[11px] text-theme-muted mt-0.5">
                  Classified problem categories solved
                </p>
              </div>

              <div className="space-y-2 mt-2">
                {(leetcodeAnalytics?.topicDistribution || []).length === 0 ? (
                  <div className="py-8 text-center text-theme-muted text-xs">
                    No LeetCode topic breakdown recorded yet. Connect LeetCode or sync an Accepted submission.
                  </div>
                ) : (
                  leetcodeAnalytics?.topicDistribution || []
                ).map((t) => (
                  <div key={t.topic} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-theme-primary">{t.topic}</span>
                      <span className="text-theme-muted font-mono">{t.solvedCount} solved</span>
                    </div>
                    <div className="w-full bg-theme-elevated rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, t.percentage * 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CODING ANALYTICS & TRUTH IN REPORTING
         ========================================================================= */}
      {activeTab === 'coding' && (
        <div className="space-y-6">
          {/* Truth Notice: Never Infer From Timestamps */}
          <div className="p-3.5 bg-theme-elevated border border-theme-border rounded-xl text-xs text-theme-secondary flex items-start gap-3">
            <Info className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-theme-primary">Engineering Measurement Standard: </span>
              {codingAnalytics?.durationNotice ||
                'StreakForge strictly refrains from guessing or estimating coding duration from commit timestamps. Duration is only reported when verified active sessions are logged by the desktop companion daemon.'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Daily Coding Duration
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-1">
                {codingAnalytics?.trackedDurationAvailable && codingAnalytics.dailyCodingDurationMinutes
                  ? `${Math.floor(codingAnalytics.dailyCodingDurationMinutes / 60)}h ${codingAnalytics.dailyCodingDurationMinutes % 60}m`
                  : 'Not Tracked'}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">
                {codingAnalytics?.trackedDurationAvailable ? 'Verified daemon logs' : 'Install companion agent'}
              </div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Weekly Coding Duration
              </div>
              <div className="text-2xl font-bold text-theme-primary mt-1">
                {codingAnalytics?.trackedDurationAvailable && codingAnalytics.weeklyCodingDurationMinutes
                  ? `${Math.floor(codingAnalytics.weeklyCodingDurationMinutes / 60)}h`
                  : 'Not Tracked'}
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Trailing 7 days active focus</div>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
              <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider">
                Active Coding Days
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {codingAnalytics?.activeCodingDays ?? 0} Days
              </div>
              <div className="text-[10px] text-theme-muted mt-0.5">Days with confirmed engineering work</div>
            </div>
          </div>

          {/* Local Repository Activity */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-3">
              Monitored Local Workspace Activity
            </h3>
            <div className="divide-y divide-theme-border text-xs">
              {(codingAnalytics?.repositoryActivity || []).length === 0 ? (
                <div className="py-4 text-center text-theme-muted text-xs">
                  No monitored local workspace sessions recorded yet.
                </div>
              ) : (
                codingAnalytics?.repositoryActivity || []
              ).map((repo) => (
                <div key={repo.repoName} className="py-2.5 flex items-center justify-between">
                  <div className="font-mono text-theme-primary truncate max-w-md">{repo.repoName}</div>
                  <div className="text-theme-muted font-mono text-[11px]">
                    {repo.sessionCount} sessions • {repo.filesModified} files modified
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: EXECUTIVE REPORTS & EXPORT
         ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Period Selector & Export Actions */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-theme-muted mr-1">Report Period:</span>
              {(['daily', 'weekly', 'monthly', 'quarterly', 'annual'] as ReportPeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    reportPeriod === p
                      ? 'bg-theme-accent text-slate-950'
                      : 'bg-theme-elevated text-theme-secondary hover:text-theme-primary border border-theme-border'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-semibold text-theme-primary transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-semibold text-theme-primary transition"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export JSON</span>
              </button>
            </div>
          </div>

          {/* Generated Report Card */}
          {report && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-theme-border pb-3">
                <div>
                  <h3 className="text-sm font-bold text-theme-primary">{report.title}</h3>
                  <p className="text-xs text-theme-muted mt-0.5">
                    Range: {report.startDate} to {report.endDate} • Generated at {new Date(report.generatedAt).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  VERIFIED_GROUND_TRUTH
                </span>
              </div>

              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-theme-elevated p-3 rounded-lg border border-theme-border">
                  <div className="text-[10px] text-theme-muted font-medium uppercase">Total Activities</div>
                  <div className="text-xl font-bold text-theme-primary mt-1">{report.summary.totalActivities}</div>
                </div>

                <div className="bg-theme-elevated p-3 rounded-lg border border-theme-border">
                  <div className="text-[10px] text-theme-muted font-medium uppercase">GitHub Commits</div>
                  <div className="text-xl font-bold text-indigo-400 mt-1">{report.summary.githubCommits}</div>
                </div>

                <div className="bg-theme-elevated p-3 rounded-lg border border-theme-border">
                  <div className="text-[10px] text-theme-muted font-medium uppercase">Unique Solved</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{report.summary.uniqueProblemsSolved}</div>
                </div>

                <div className="bg-theme-elevated p-3 rounded-lg border border-theme-border">
                  <div className="text-[10px] text-theme-muted font-medium uppercase">Consistency Score</div>
                  <div className="text-xl font-bold text-purple-400 mt-1">{report.summary.consistencyScore}%</div>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div className="border border-theme-border rounded-lg overflow-hidden text-xs">
                <div className="bg-theme-elevated p-2.5 font-semibold text-theme-primary border-b border-theme-border">
                  Calendar Day Breakdown ({report.activityBreakdown.length} days recorded)
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-theme-border">
                  {report.activityBreakdown.map((row) => (
                    <div key={row.date} className="p-2.5 flex items-center justify-between hover:bg-theme-elevated/40">
                      <span className="font-mono text-theme-primary">{row.date}</span>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-theme-muted">
                        <span>{row.commits} Commits</span>
                        <span>{row.leetCode} Solved</span>
                        <span className="font-semibold text-theme-primary">{row.total} Total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
