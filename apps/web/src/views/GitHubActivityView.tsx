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
  AlertTriangle,
  ShieldAlert,
  Search,
  Check,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import type { CommitDiagnosticsResult } from '@streakforge/shared-types';

export function GitHubActivityView() {
  const { user, githubActivity, overview, connectedRepos, submissions, refreshData, isLoading } = useData();
  const [activeTab, setActiveTab] = useState<'commits' | 'repos' | 'prs' | 'diagnostics' | 'sync'>('commits');

  // Attribution Diagnostic Tool State
  const [diagRepo, setDiagRepo] = useState<string>(connectedRepos[0]?.repoFullName || '');
  const [diagCommitSha, setDiagCommitSha] = useState<string>('');
  const [diagBranch, setDiagBranch] = useState<string>('main');
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [diagResult, setDiagResult] = useState<CommitDiagnosticsResult | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      const res = await api.github.sync();
      setSyncStatusMsg(res.message);
      refreshData();
      setTimeout(() => setSyncStatusMsg(''), 4000);
    } catch (err: any) {
      alert(`GitHub synchronization failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRetryFailedSync = async (id: string) => {
    try {
      setRetryingId(id);
      await api.sync.retry(id);
      await refreshData();
    } catch (err: any) {
      console.warn('Retry failed:', err?.message || err);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRunCommitDiagnostics = async (repoName: string, sha: string, branchName: string = 'main') => {
    if (!repoName || !sha) return;
    try {
      setDiagLoading(true);
      setDiagRepo(repoName);
      setDiagCommitSha(sha);
      const res = await api.github.diagnoseCommit({
        repoFullName: repoName,
        commitSha: sha,
        branch: branchName
      });
      setDiagResult(res);
      setActiveTab('diagnostics');
    } catch (err: any) {
      alert(`Commit attribution diagnosis failed: ${err.message}`);
    } finally {
      setDiagLoading(false);
    }
  };

  const failedSyncs = submissions
    .filter((s) => s.syncStatus === 'FAILED')
    .map((s) => ({
      id: s.id || s.submissionId,
      problemTitle: s.questionTitle,
      repo: connectedRepos[0]?.repoFullName || 'Configured Repository',
      error: s.syncErrorMessage || 'Synchronization encountered error',
      timestamp: new Date(s.submittedAt).toLocaleString(),
      canRetry: true
    }));

  return (
    <div className="space-y-6">
      {/* GitHub Truth & Contribution Graph Notice Banner */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-theme-accent flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold text-theme-primary">
              GitHub Contribution Graph Truth Policy:
            </span>
            <p className="text-theme-muted leading-relaxed">
              StreakForge tracks and synchronizes verified code activities using the GitHub REST API and local Git.
              Commits only register on GitHub&apos;s official contribution graph when authored with an email verified on your account,
              committed on the default branch (or gh-pages), and pushed to non-fork repositories.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-90 shadow-xs flex-shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync GitHub Activity'}</span>
        </button>
      </div>

      {syncStatusMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Total Commits</span>
            <GitCommit className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {githubActivity.totalCommits || overview?.totalGitCommitsTracked || 0}
          </div>
          <div className="text-xs text-theme-muted mt-1">Across all monitored repositories</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Connected Repositories</span>
            <FolderGit2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {connectedRepos.length > 0 ? connectedRepos.length : githubActivity.repositories.length}
          </div>
          <div className="text-xs text-theme-muted mt-1">Configured for synchronization</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-theme-muted font-medium uppercase tracking-wider">
            <span>Pull Requests &amp; Issues</span>
            <GitPullRequest className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-1 tabular-nums">
            {githubActivity.pullRequests.length + githubActivity.issues.length}
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">{githubActivity.pullRequests.length} PRs • {githubActivity.issues.length} Issues</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] text-theme-muted font-medium uppercase tracking-wider">
            <span>Sync Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">
            Healthy
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Automated cursor active</div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-3 overflow-x-auto">
        {[
          { id: 'commits', label: 'Recent Commits', count: githubActivity.recentCommits.length },
          { id: 'diagnostics', label: 'Attribution Diagnostics', count: diagResult ? 1 : 0 },
          { id: 'repos', label: 'Repository Activity', count: githubActivity.repositories.length },
          { id: 'prs', label: 'Pull Requests & Issues', count: githubActivity.pullRequests.length + githubActivity.issues.length },
          { id: 'sync', label: 'Sync History & Retries', count: failedSyncs.length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
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
              Verified Commits Feed
            </h3>
            <span className="text-[11px] text-theme-muted font-mono">
              Click &quot;Diagnose&quot; to test graph attribution eligibility
            </span>
          </div>

          <div className="divide-y divide-theme-border">
            {githubActivity.recentCommits.length === 0 ? (
              <div className="py-12 text-center text-theme-muted text-xs flex flex-col items-center justify-center gap-2">
                <FolderGit2 className="w-8 h-8 text-theme-muted opacity-40 mb-1" />
                <span className="font-semibold text-theme-primary">No commits detected in connected repositories</span>
                <p className="max-w-md text-[11px] text-theme-muted">
                  Commits will appear automatically as you push code to your verified default branches or when solutions are exported from LeetCode.
                </p>
              </div>
            ) : (
              githubActivity.recentCommits.map((c) => (
                <div
                  key={c.sha}
                  className="p-4 hover:bg-theme-elevated/40 transition flex items-center justify-between gap-4"
                >
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

                  <div className="flex items-center gap-2 flex-shrink-0 text-right">
                    <span className="text-xs text-theme-muted font-mono hidden sm:inline">{c.timestamp}</span>

                    <button
                      onClick={() => handleRunCommitDiagnostics(c.repo, c.sha, c.branch)}
                      disabled={diagLoading}
                      className="px-2.5 py-1 bg-theme-elevated hover:bg-theme-surface text-theme-secondary hover:text-theme-primary rounded-md border border-theme-border text-[11px] font-medium transition"
                    >
                      Diagnose
                    </button>

                    <a
                      href={c.repo.includes('/') ? `https://github.com/${c.repo}/commit/${c.sha}` : `https://github.com/${user?.username || 'Thanniru-yaswanth03'}/${c.repo}/commit/${c.sha}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-theme-elevated text-theme-muted hover:text-theme-accent rounded-md transition"
                      title="View on GitHub"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Commit Attribution Diagnostics */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-accent" />
              Commit Attribution Diagnostic Tool
            </h3>
            <p className="text-xs text-theme-muted mt-0.5">
              Verify if a specific commit satisfies all GitHub contribution graph requirements (author email, branch, fork status, and integrity).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunCommitDiagnostics(diagRepo, diagCommitSha, diagBranch);
              }}
              className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-theme-primary mb-1">
                  Target Repository
                </label>
                {connectedRepos.length > 0 ? (
                  <select
                    value={diagRepo}
                    onChange={(e) => setDiagRepo(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
                  >
                    {connectedRepos.map((r) => (
                      <option key={r.id} value={r.repoFullName}>
                        {r.repoFullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. owner/repo"
                    value={diagRepo}
                    onChange={(e) => setDiagRepo(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-theme-primary mb-1">
                  Commit SHA
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7b2e9a1"
                  value={diagCommitSha}
                  onChange={(e) => setDiagCommitSha(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs font-mono focus:outline-none focus:border-theme-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-theme-primary mb-1">
                  Branch Name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={diagBranch}
                    onChange={(e) => setDiagBranch(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs font-mono focus:outline-none focus:border-theme-accent"
                  />
                  <button
                    type="submit"
                    disabled={diagLoading || !diagRepo || !diagCommitSha}
                    className="px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-90 disabled:opacity-50 flex-shrink-0 shadow-xs"
                  >
                    {diagLoading ? 'Testing...' : 'Run Diagnostics'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {diagResult && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-theme-border">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-theme-primary">
                      {diagResult.commitSha.slice(0, 7)}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        diagResult.status === 'ELIGIBLE'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : diagResult.status === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}
                    >
                      {diagResult.status}
                    </span>
                  </div>
                  <div className="text-xs text-theme-muted mt-1">
                    Author Email: <span className="font-mono text-theme-primary">{diagResult.authorEmail || 'None'}</span> • Repo: {diagResult.repoFullName}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-theme-secondary">
                    {diagResult.checks.filter((c) => c.passed).length} of {diagResult.checks.length} Checks Passed
                  </span>
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl text-xs font-medium text-theme-primary">
                {diagResult.summary}
              </div>

              {/* Diagnostic Checklist */}
              <div className="space-y-3">
                {diagResult.checks.map((check, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition ${
                      check.passed
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-theme-primary flex items-center gap-2">
                        {check.passed ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        {check.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          check.passed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {check.passed ? 'PASSED' : 'ACTION REQUIRED'}
                      </span>
                    </div>

                    <p className="text-theme-secondary text-[11px] leading-relaxed">
                      {check.message}
                    </p>

                    {check.actionableFix && (
                      <div className="p-2 bg-theme-surface rounded-lg font-mono text-[11px] text-amber-500 border border-theme-border">
                        Fix: {check.actionableFix}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Repository Activity */}
      {activeTab === 'repos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {githubActivity.repositories.map((repo) => (
            <div
              key={repo.name}
              className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-theme-primary">{repo.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-elevated text-theme-muted">
                    {repo.isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                <div className="text-xs text-theme-muted mt-1">{repo.fullName}</div>
                <div className="text-xs text-theme-secondary mt-3 space-y-1">
                  <div>
                    Active Branch: <span className="font-mono text-indigo-400">{repo.activeBranch}</span>
                  </div>
                  <div>Last Commit: {repo.lastCommitTime}</div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-theme-border flex items-center justify-between text-xs text-theme-muted">
                <span>⭐ {repo.stars} stars • 🍴 {repo.forks} forks</span>
                <a
                  href={`https://github.com/${repo.fullName}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-theme-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: PRs and Issues */}
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
                    <span className="font-semibold text-theme-primary truncate">
                      #{pr.number} {pr.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        pr.state === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {pr.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-theme-muted">
                    {pr.repo} • {pr.createdAt}
                  </div>
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
                    <span className="font-semibold text-theme-primary truncate">
                      #{issue.number} {issue.title}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 flex-shrink-0">
                      {issue.state}
                    </span>
                  </div>
                  <div className="text-[11px] text-theme-muted">
                    {issue.repo} • {issue.createdAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Sync History & Failed Attempts */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-1 flex items-center gap-1.5 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
              Failed Synchronization Attempts ({failedSyncs.length})
            </h3>
            <p className="text-xs text-theme-muted mb-3">
              Submissions that encountered API rate limits or branch protection during automated export
            </p>

            {failedSyncs.length === 0 ? (
              <div className="p-8 text-center bg-theme-elevated rounded-xl border border-dashed border-theme-border my-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="text-sm font-semibold text-theme-primary">All Synchronizations Operational</div>
                <div className="text-xs text-theme-muted mt-1">
                  Zero failed exports recorded. All accepted submissions are properly synced.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {failedSyncs.map((f) => (
                  <div
                    key={f.id}
                    className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="font-bold text-sm text-theme-primary">{f.problemTitle}</div>
                      <div className="text-xs text-rose-500 mt-0.5">{f.error}</div>
                      <div className="text-[11px] text-theme-muted mt-1">
                        {f.repo} • {f.timestamp}
                      </div>
                    </div>

                    <button
                      disabled={retryingId === f.id}
                      onClick={() => handleRetryFailedSync(f.id)}
                      className="px-3 py-1.5 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-90 shadow-xs flex-shrink-0 disabled:opacity-50"
                    >
                      {retryingId === f.id ? 'Retrying...' : 'Retry Export'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
