'use client';

import React, { useState } from 'react';
import {
  Flame,
  GitBranch,
  Code2,
  FolderGit2,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Sparkles,
  Puzzle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  GitPullRequest,
  PlayCircle,
  Shield,
  BarChart2,
  Settings as SettingsIcon,
  GitCommit,
  Zap,
  Terminal,
  BookOpen,
  Github,
  User as UserIcon,
  Clock,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { GitHubContributionGraph } from '../components/GitHubContributionGraph';
import { LeetCodeStatsCard } from '../components/LeetCodeStatsCard';
import { GitHubConnectButton } from '../components/GitHubConnectButton';

interface OverviewViewProps {
  onNavigate?: (tab: string) => void;
}

export function OverviewView({ onNavigate }: OverviewViewProps = {}) {
  const {
    user,
    overview,
    heatmap,
    connectedRepos,
    submissions,
    submissionMetrics,
    leetcodeStats,
    extensionStatus,
    refreshData,
    isLoading
  } = useData();

  const [heatmapFilter, setHeatmapFilter] = useState<'all' | 'github' | 'leetcode'>('all');
  const [guideCollapsed, setGuideCollapsed] = useState<boolean>(false);
  const [copiedExtensionPath, setCopiedExtensionPath] = useState<boolean>(false);
  const [activeRepoTab, setActiveRepoTab] = useState<string>('code');

  const primaryRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  // Derived metrics (strictly authentic, no inflation - 0 for unauthenticated guest)
  const totalSolved = user ? (leetcodeStats?.totalSolved ?? overview?.totalLeetCodeSolved ?? 0) : 0;
  const todayCommits = user ? (overview?.todayCommitCount ?? 0) : 0;
  const todayLeetCode = user ? (overview?.todayLeetCodeCount ?? 0) : 0;
  const currentStreak = user ? (overview?.currentStreak ?? (overview?.hasSubmittedToday ? 1 : 0)) : 0;
  const longestStreak = user ? (overview?.longestStreak ?? 0) : 0;

  // Authentic Onboarding Progress
  const isGithubConnected = Boolean(user);
  const isRepoConfigured = Boolean(primaryRepo);
  const isExtensionConnected = extensionStatus === 'CONNECTED' || (Boolean(user) && submissions.length > 0);
  const isSyncReady = isGithubConnected && isRepoConfigured && isExtensionConnected;
  const isFirstProblemSolved = submissions.length > 0;

  const completedSteps = [
    isGithubConnected,
    isExtensionConnected,
    isRepoConfigured,
    isSyncReady && isFirstProblemSolved
  ];

  const completedStepsCount = completedSteps.filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 4) * 100);

  const handleCopyPath = () => {
    navigator.clipboard.writeText('apps/extension/dist');
    setCopiedExtensionPath(true);
    setTimeout(() => setCopiedExtensionPath(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Profile & Quick Connection Bar (Glossy Rich Card) */}
      <div className="github-glossy-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                width={48}
                height={48}
                style={{ width: 48, height: 48, maxWidth: 48, maxHeight: 48, objectFit: 'cover' }}
                className="w-12 h-12 rounded-full border border-[#30363d] object-cover ring-2 ring-[#238636]/30 shadow-md"
              />
            ) : user ? (
              <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-sm font-bold text-[#58a6ff]">
                {user.username.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#8b949e]">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            {user && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#238636] ring-2 ring-[#161b22] animate-pulse" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-[#f0f6fc] tracking-tight">
                {user ? `@${user.username}` : 'Guest Developer'}
              </h2>
              {user ? (
                user.githubTokenHealth && !user.githubTokenHealth.valid ? (
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 cursor-pointer"
                    onClick={() => onNavigate?.('settings')}
                    title={user.githubTokenHealth.message || 'GitHub re-authentication required'}
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    {user.githubTokenHealth.status === 'RATE_LIMITED'
                      ? 'GitHub Rate Limited'
                      : user.githubTokenHealth.status === 'INSUFFICIENT_PERMISSIONS'
                        ? 'Insufficient Scopes'
                        : 'Re-auth Required'}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 flex items-center gap-1 shadow-[0_0_8px_rgba(35,134,54,0.3)]">
                    <CheckCircle2 className="w-3 h-3 text-[#3fb950]" />
                    Verified Contributor
                  </span>
                )
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#30363d]/40 text-[#8b949e] border border-[#30363d]">
                  Unauthenticated Session
                </span>
              )}
            </div>

            <div className="text-xs text-[#8b949e] mt-1 flex items-center gap-2 flex-wrap">
              {primaryRepo ? (
                <>
                  <span>Target Repository:</span>
                  <a
                    href={`https://github.com/${primaryRepo.repoFullName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[#58a6ff] hover:text-[#79c0ff] hover:underline flex items-center gap-1 font-semibold transition"
                  >
                    <span>{primaryRepo.repoFullName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span>•</span>
                  <span className="text-[#3fb950] font-mono text-[11px]">Branch: {primaryRepo.defaultBranch || 'main'}</span>
                </>
              ) : (
                <span>No target repository selected yet. Connect a repository below or in Repositories.</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {user?.githubTokenHealth && !user.githubTokenHealth.valid && (
            <a
              href="/api/v1/auth/github"
              className="github-glossy-button-primary px-3 py-1.5 text-xs flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold transition shadow-md cursor-pointer"
              title="Initiate clean GitHub OAuth authorization"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Reconnect GitHub</span>
            </a>
          )}
          {user ? (
            <button
              onClick={async () => {
                await refreshData();
              }}
              disabled={isLoading}
              className="github-glossy-button-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          ) : (
            <GitHubConnectButton
              label="Sign In with GitHub"
              className="github-glossy-button-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
            />
          )}
        </div>
      </div>

      {/* 2. Authentic Scraped LeetCode User Stats Card */}
      <LeetCodeStatsCard />

      {/* V4 Unified Sync Health & Progress Strip */}
      {user && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('leetcode')}
            className="github-glossy-card p-3.5 text-left hover:border-[#58a6ff]/50 transition cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b949e]">
              Unique Problems Solved
            </div>
            <div className="text-xl font-bold text-[#f0f6fc] mt-1 tabular-nums">
              {totalSolved}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-0.5 font-mono">
              {submissionMetrics.acceptedSubmissions} archived in DB
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('repos')}
            className="github-glossy-card p-3.5 text-left hover:border-[#3fb950]/50 transition cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#3fb950]">
              Exported to GitHub
            </div>
            <div className="text-xl font-bold text-[#3fb950] mt-1 tabular-nums">
              {submissionMetrics.exportedCount}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-0.5 font-mono truncate">
              {primaryRepo ? primaryRepo.repoFullName : 'No target repo selected'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('leetcode')}
            className="github-glossy-card p-3.5 text-left hover:border-[#d29922]/50 transition cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#d29922]">
              Pending / Failed Queue
            </div>
            <div className="text-xl font-bold text-[#f0f6fc] mt-1 tabular-nums">
              {submissionMetrics.pendingCount + submissionMetrics.failedCount}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-0.5 font-mono">
              {submissionMetrics.failedCount > 0
                ? `${submissionMetrics.failedCount} failed • Click to retry`
                : `${submissionMetrics.pendingCount} pending export`}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('calendar')}
            className="github-glossy-card p-3.5 text-left hover:border-[#f0883e]/50 transition cursor-pointer"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#f0883e]">
              Active Streak
            </div>
            <div className="text-xl font-bold text-[#f0f6fc] mt-1 tabular-nums">
              {currentStreak}d
            </div>
            <div className="text-[11px] text-[#8b949e] mt-0.5 font-mono">
              Best: {longestStreak}d • {todayCommits} commits today
            </div>
          </button>
        </div>
      )}

      {/* 3. Interactive Quick-Start Guide for New Users */}
      <div className="github-glossy-card overflow-hidden">
        {/* Guide Header with Progress Bar */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22]/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#238636]/20 border border-[#238636]/40 flex items-center justify-center text-[#3fb950] shadow-[0_0_12px_rgba(35,134,54,0.3)]">
              <Sparkles className="w-4 h-4 fill-[#3fb950]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#f0f6fc]">
                  Quick Start Guide: Setup StreakForge in 4 Steps
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 font-mono">
                  {progressPercent}% Ready
                </span>
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Automatically sync accepted LeetCode solutions to GitHub with zero fabrication.
              </p>
            </div>
          </div>

          <button
            onClick={() => setGuideCollapsed(!guideCollapsed)}
            className="text-xs text-[#8b949e] hover:text-[#f0f6fc] flex items-center gap-1.5 font-medium transition cursor-pointer self-start sm:self-auto"
          >
            <span>{guideCollapsed ? 'Show Full Guide' : 'Minimize'}</span>
            {guideCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-[#21262d] h-1.5">
          <div
            className="bg-gradient-to-r from-[#2ea043] to-[#238636] h-full transition-all duration-500 shadow-[0_0_8px_rgba(46,160,67,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 4 Step Cards */}
        {!guideCollapsed && (
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#0d1117]/60">
            {/* Step 1 */}
            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex flex-col justify-between space-y-2.5 hover:border-[#58a6ff]/40 transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] font-mono">
                    Step 01
                  </span>
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${user ? 'text-[#3fb950]' : 'text-[#8b949e]'}`}>
                    {user ? <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" /> : null}
                    {user ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#f0f6fc]">
                  Connect Genuine GitHub
                </div>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  {user ? `Linked to @${user.username}. Authorizes automated commit pushing to your repository.` : 'Link your GitHub account to authorize repository discovery and automated solutions sync.'}
                </p>
              </div>
              {user ? (
                <div className="text-[10px] text-[#3fb950] font-medium font-mono">
                  &check; OAuth 2.0 Authenticated
                </div>
              ) : (
                <GitHubConnectButton
                  label="Connect GitHub"
                  className="w-full py-1.5 px-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition"
                />
              )}
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex flex-col justify-between space-y-2.5 hover:border-[#58a6ff]/40 transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] font-mono">
                    Step 02
                  </span>
                  {extensionStatus === 'CONNECTED' ? (
                    <span className="text-[10px] font-bold text-[#3fb950] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                      Connected
                    </span>
                  ) : extensionStatus === 'INSTALLED_DISCONNECTED' ? (
                    <span className="text-[10px] font-bold text-[#d29922] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#d29922]" />
                      Installed (Unpaired)
                    </span>
                  ) : extensionStatus === 'SYNCHRONIZING' ? (
                    <span className="text-[10px] font-bold text-[#58a6ff] flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 text-[#58a6ff] animate-spin" />
                      Synchronizing
                    </span>
                  ) : extensionStatus === 'SYNC_FAILED' ? (
                    <span className="text-[10px] font-bold text-[#f85149] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-[#f85149]" />
                      Sync Failed
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
                      <Puzzle className="w-3.5 h-3.5 text-[#8b949e]" />
                      Not Installed
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#f0f6fc]">
                  Load Chrome Extension
                </div>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  {extensionStatus === 'CONNECTED'
                    ? 'Extension paired and actively observing LeetCode submissions.'
                    : extensionStatus === 'INSTALLED_DISCONNECTED'
                    ? 'Extension active in browser. Sign in to GitHub in Step 01 to pair your authentication session.'
                    : 'Open chrome://extensions, enable Developer mode, click Load unpacked, and pick folder:'}
                </p>
              </div>
              <button
                onClick={handleCopyPath}
                className="w-full py-1.5 px-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-[10px] font-mono text-[#c9d1d9] hover:text-[#f0f6fc] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copiedExtensionPath ? <Check className="w-3 h-3 text-[#3fb950]" /> : <Copy className="w-3 h-3 text-[#58a6ff]" />}
                <span>{copiedExtensionPath ? 'Path Copied!' : 'Copy: apps/extension/dist'}</span>
              </button>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex flex-col justify-between space-y-2.5 hover:border-[#58a6ff]/40 transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] font-mono">
                    Step 03
                  </span>
                  {primaryRepo ? (
                    <span className="text-[10px] font-bold text-[#3fb950] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                      Target Configured
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
                      <FolderGit2 className="w-3.5 h-3.5 text-[#8b949e]" />
                      Not Selected
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#f0f6fc]">
                  Designate Target Repo
                </div>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  {primaryRepo
                    ? `Solutions are committed into: ${primaryRepo.repoFullName} (${primaryRepo.defaultBranch || 'main'}).`
                    : 'Select a GitHub repository to store and catalog your verified solutions.'}
                </p>
              </div>
              {primaryRepo ? (
                <a
                  href={`https://github.com/${primaryRepo.repoFullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-[#58a6ff] hover:underline font-mono font-medium truncate flex items-center gap-1"
                >
                  <span>&rarr; {primaryRepo.repoFullName}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <button
                  onClick={() => onNavigate ? onNavigate('repos') : undefined}
                  className="w-full py-1.5 px-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-[10px] font-semibold text-[#58a6ff] flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <FolderGit2 className="w-3 h-3 text-[#58a6ff]" />
                  <span>Select Target Repo</span>
                </button>
              )}
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d] flex flex-col justify-between space-y-2.5 hover:border-[#58a6ff]/40 transition-all duration-200">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#58a6ff] font-mono">
                    Step 04
                  </span>
                  {isFirstProblemSolved ? (
                    <span className="text-[10px] font-bold text-[#3fb950] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                      Active &amp; Synced
                    </span>
                  ) : isSyncReady ? (
                    <span className="text-[10px] font-bold text-[#3fb950] flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-[#3fb950]" />
                      Ready to Sync
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#8b949e] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#8b949e]" />
                      Awaiting Setup
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[#f0f6fc]">
                  Solve &amp; Watch Sync
                </div>
                <p className="text-[11px] text-[#8b949e] leading-relaxed">
                  {isSyncReady
                    ? `Open any problem on LeetCode. Accepted verdicts will commit automatically to ${primaryRepo?.repoFullName || 'your repo'}!`
                    : 'Complete Steps 01 to 03 above to enable automated solution synchronization.'}
                </p>
              </div>
              {isSyncReady ? (
                <a
                  href="https://leetcode.com/problemset/"
                  target="_blank"
                  rel="noreferrer"
                  className="github-glossy-button-primary w-full py-1.5 px-2 text-[10px] flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>Open LeetCode.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="w-full py-1.5 px-2 bg-[#21262d]/50 border border-[#30363d]/50 rounded text-[10px] text-[#8b949e] font-mono text-center">
                  Requires Steps 01–03
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Key Metrics Bar (Glossy Rich GitHub Style Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Current Streak */}
        <div className="github-glossy-card p-4 sm:p-5 flex flex-col justify-between hover:border-[#238636] transition-all">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>Verified Streak</span>
            <div className="w-7 h-7 rounded-md bg-[#238636]/15 flex items-center justify-center text-[#3fb950] shadow-[0_0_8px_rgba(35,134,54,0.4)]">
              <Flame className="w-4 h-4 fill-[#3fb950] text-[#3fb950] animate-pulse" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#f0f6fc] tabular-nums tracking-tight">
              {currentStreak} <span className="text-xs font-normal text-[#8b949e]">days</span>
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1.5 flex items-center gap-1">
              <span>All-time record:</span>
              <strong className="text-[#3fb950] font-mono">{longestStreak} days</strong>
            </div>
          </div>
        </div>

        {/* Metric 2: Today's Git Commits */}
        <div className="github-glossy-card p-4 sm:p-5 flex flex-col justify-between hover:border-[#3fb950]/50 transition-all">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>Git Commits Today</span>
            <div className="w-7 h-7 rounded-md bg-[#238636]/15 flex items-center justify-center text-[#3fb950]">
              <GitBranch className="w-4 h-4 text-[#3fb950]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#f0f6fc] tabular-nums tracking-tight">
              {todayCommits}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1.5 font-mono">
              Verified GitHub default branches
            </div>
          </div>
        </div>

        {/* Metric 3: LeetCode Accepted Today */}
        <div className="github-glossy-card p-4 sm:p-5 flex flex-col justify-between hover:border-[#58a6ff]/50 transition-all">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>LeetCode Solved Today</span>
            <div className="w-7 h-7 rounded-md bg-[#388bfd]/15 flex items-center justify-center text-[#58a6ff]">
              <Code2 className="w-4 h-4 text-[#58a6ff]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#58a6ff] tabular-nums tracking-tight">
              {todayLeetCode}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1.5 font-mono">
              Accepted passing verdict only
            </div>
          </div>
        </div>

        {/* Metric 4: Total Unique Problems Solved */}
        <div className="github-glossy-card p-4 sm:p-5 flex flex-col justify-between hover:border-[#a371f7]/50 transition-all">
          <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
            <span>Total Problems Solved</span>
            <div className="w-7 h-7 rounded-md bg-[#a371f7]/15 flex items-center justify-center text-[#a371f7]">
              <Sparkles className="w-4 h-4 text-[#a371f7]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#f0f6fc] tabular-nums tracking-tight">
              {totalSolved}
            </div>
            <div className="text-[11px] text-[#8b949e] mt-1.5 font-mono">
              Authentic LeetCode archive
            </div>
          </div>
        </div>
      </div>

      {/* 5. Authentic GitHub 365-Day Contribution Graph */}
      <GitHubContributionGraph
        heatmapData={heatmap}
        filter={heatmapFilter}
        onFilterChange={setHeatmapFilter}
      />

      {/* 6. Recent Activity Feed (Glossy GitHub Table Style) */}
      <div className="github-glossy-card p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-[#3fb950]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc]">
              Recent Synchronizations &amp; Solution Commits
            </h3>
          </div>
          <span className="text-[11px] text-[#3fb950] font-mono flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Zero-Fabrication Validated
          </span>
        </div>

        <div className="divide-y divide-[#30363d]">
          {submissions.length === 0 ? (
            <div key="empty-recent-submissions" className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[#238636]/15 text-[#3fb950] flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(35,134,54,0.3)]">
                <Flame className="w-5 h-5 fill-[#3fb950]" />
              </div>
              <div className="text-xs font-bold text-[#f0f6fc]">
                Ready to track your coding activity
              </div>
              <p className="text-xs text-[#8b949e] max-w-sm mx-auto leading-relaxed">
                Open any question on <code className="text-[#58a6ff] font-mono">leetcode.com</code> with the StreakForge extension enabled. Hit Submit and your accepted solution will commit automatically to GitHub!
              </p>
            </div>
          ) : (
            submissions.slice(0, 6).map((sub, idx) => {
              const subKey = sub.id || (sub as any)._id || sub.submissionId || `recent-sub-${idx}`;
              const diffColor =
                sub.difficulty === 'Easy'
                  ? 'text-[#3fb950] bg-[#238636]/15 border-[#238636]/30'
                  : sub.difficulty === 'Medium'
                  ? 'text-[#d29922] bg-[#d29922]/15 border-[#d29922]/30'
                  : 'text-[#f85149] bg-[#f85149]/15 border-[#f85149]/30';

              return (
                <div
                  key={subKey}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#21262d]/60 px-2 rounded-md transition-all duration-150"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor} flex-shrink-0`}>
                      {sub.difficulty}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#f0f6fc] truncate hover:text-[#58a6ff] transition cursor-pointer">
                        {sub.questionTitle}
                      </div>
                      <div className="text-[11px] text-[#8b949e] flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[#58a6ff] font-semibold">{sub.language}</span>
                        <span>•</span>
                        <span suppressHydrationWarning>{new Date(sub.submittedAt).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {sub.syncStatus === 'SYNCED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Exported
                      </span>
                    ) : sub.syncStatus === 'FAILED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30">
                        Failed
                      </span>
                    ) : sub.syncStatus === 'SKIPPED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#d29922]/15 text-[#d29922] border border-[#d29922]/30">
                        Skipped
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#388bfd]/15 text-[#58a6ff] border border-[#388bfd]/30">
                        Pending
                      </span>
                    )}
                    {sub.githubCommitSha && (
                      <a
                        href={sub.githubCommitUrl || (primaryRepo ? `https://github.com/${primaryRepo.repoFullName}/commit/${sub.githubCommitSha}` : '#')}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[10px] text-[#8b949e] hover:text-[#58a6ff] hover:underline flex items-center gap-1 bg-[#21262d] px-1.5 py-0.5 rounded border border-[#30363d]"
                      >
                        <span>{sub.githubCommitSha.slice(0, 7)}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
