'use client';

import React, { useState } from 'react';
import {
  GitCommit,
  GitBranch,
  GitPullRequest,
  AlertCircle,
  FolderGit2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useData } from '../context/DataContext';

export function GitHubActivityView() {
  const { githubActivity, overview, connectedRepos, refreshData, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<'commits' | 'repos' | 'prs' | 'sync'>('commits');

  const failedSyncs = [
    {
      id: 'f-1',
      problemTitle: 'Word Ladder II',
      repo: 'octocat/leetcode-solutions',
      error: 'GitHub API rate limit exceeded. Retry scheduled in 15 minutes.',
      timestamp: 'Yesterday at 16:30',
      canRetry: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Total Commits</span>
            <GitCommit className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {githubActivity.totalCommits || overview?.totalGitCommitsTracked || 164}
          </div>
          <div className="text-xs text-theme-muted mt-1">Across all monitored repositories</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Active Repositories</span>
            <FolderGit2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {githubActivity.repositories.length}
          </div>
          <div className="text-xs text-theme-muted mt-1">{connectedRepos.length} connected to StreakForge</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Pull Requests</span>
            <GitPullRequest className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {githubActivity.pullRequests.length}
          </div>
          <div className="text-xs text-emerald-500 mt-1">1 open, 1 merged</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Active Branches</span>
            <GitBranch className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {githubActivity.branches.length}
          </div>
          <div className="text-xs text-theme-muted mt-1">Protected default: main</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-3">
        {[
          { id: 'commits', label: 'Recent Commits', count: githubActivity.recentCommits.length },
          { id: 'repos', label: 'Repository Activity', count: githubActivity.repositories.length },
          { id: 'prs', label: 'Pull Requests & Issues', count: githubActivity.pullRequests.length + githubActivity.issues.length },
          { id: 'sync', label: 'Sync History & Retries', count: failedSyncs.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === tab.id
                ? 'bg-theme-accent text-slate-950 font-semibold shadow-xs'
                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Tab 1: Commits Feed */}
      {activeTab === 'commits' && (
        <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-theme-border flex items-center justify-between">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Verified Recent Commits
            </h3>
            <span className="text-[11px] text-theme-muted font-mono">
              Source: Local Agent & GitHub API
            </span>
          </div>

          <div className="divide-y divide-theme-border">
            {githubActivity.recentCommits.map((c) => (
              <div key={c.sha} className="p-4 hover:bg-theme-elevated/40 transition flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {c.sha.slice(0, 7)}
                    </span>
                    <span className="text-xs font-semibold text-theme-primary truncate">
                      {c.message}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-theme-muted mt-1.5">
                    <span>repo: {c.repo}</span>
                    <span>branch: {c.branch}</span>
                    <span>{c.filesChanged} files changed</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-right">
                  <span className="text-xs text-theme-muted font-mono">{c.timestamp}</span>
                  <a
                    href={`https://github.com/octocat/${c.repo}/commit/${c.sha}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-theme-elevated text-theme-muted hover:text-theme-accent rounded-md transition"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Repository Activity */}
      {activeTab === 'repos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {githubActivity.repositories.map((repo) => (
            <div key={repo.name} className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-theme-primary">{repo.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-muted">
                    {repo.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <div className="text-xs text-theme-muted mt-1">{repo.fullName}</div>
                <div className="text-xs text-theme-secondary mt-3 space-y-1">
                  <div>Active Branch: <span className="font-mono text-indigo-400">{repo.activeBranch}</span></div>
                  <div>Last Commit: {repo.lastCommitTime}</div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs text-theme-muted">
                <span>⭐ {repo.stars} stars • 🍴 {repo.forks} forks</span>
                <a
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-theme-accent hover:underline flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: PRs and Issues */}
      {activeTab === 'prs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-3">
              Pull Requests ({githubActivity.pullRequests.length})
            </h3>
            <div className="space-y-2">
              {githubActivity.pullRequests.map((pr) => (
                <div key={pr.number} className="p-3 bg-theme-elevated rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-theme-primary">#{pr.number} {pr.title}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      pr.state === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {pr.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-theme-muted">{pr.repo} • {pr.createdAt}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-3">
              Issues ({githubActivity.issues.length})
            </h3>
            <div className="space-y-2">
              {githubActivity.issues.map((issue) => (
                <div key={issue.number} className="p-3 bg-theme-elevated rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-theme-primary">#{issue.number} {issue.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                      {issue.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-theme-muted">{issue.repo} • {issue.createdAt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Sync History & Failed Attempts */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-1 flex items-center gap-1.5 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
              Failed Synchronization Attempts ({failedSyncs.length})
            </h3>
            <p className="text-xs text-theme-muted mb-3">
              Submissions that failed GitHub export due to rate limits or branch protection
            </p>

            <div className="space-y-2.5">
              {failedSyncs.map((f) => (
                <div key={f.id} className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-theme-primary">{f.problemTitle}</div>
                    <div className="text-xs text-rose-500 mt-0.5">{f.error}</div>
                    <div className="text-[11px] text-theme-muted mt-1">{f.repo} • {f.timestamp}</div>
                  </div>

                  <button
                    onClick={() => alert('Retrying sync with exponential backoff...')}
                    className="px-3 py-1.5 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-90 shadow-xs flex-shrink-0"
                  >
                    Retry Export
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
