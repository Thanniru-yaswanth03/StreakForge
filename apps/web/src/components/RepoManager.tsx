'use client';

import React, { useState } from 'react';
import {
  GitBranch,
  FolderGit2,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Settings,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Layers,
  Lock,
  Globe
} from 'lucide-react';
import type {
  RepositoryConnection,
  RepoHealthDiagnosticsResult
} from '@streakforge/shared-types';
import { api } from '../lib/api';

interface RepoManagerProps {
  connected: RepositoryConnection[];
  githubAvailable: any[];
  onRefresh: () => void;
}

export function RepoManager({ connected, githubAvailable, onRefresh }: RepoManagerProps) {
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [singleRepo, setSingleRepo] = useState<string>('');
  const [category, setCategory] = useState<string>('LeetCode Solutions');
  const [branch, setBranch] = useState<string>('main');
  const [pathPattern, setPathPattern] = useState<string>('solutions/{difficulty}/{id}-{slug}');
  const [autoCommit, setAutoCommit] = useState<boolean>(false);
  const [autoPush, setAutoPush] = useState<boolean>(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Health Diagnostics Modal State
  const [diagnosticsResult, setDiagnosticsResult] = useState<RepoHealthDiagnosticsResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagnosingRepoName, setDiagnosingRepoName] = useState<string>('');

  const categories = ['LeetCode Solutions', 'Work', 'Personal Project', 'Open Source', 'Documentation'];

  // Toggle multi-select
  const toggleSelectRepo = (fullName: string) => {
    setSelectedRepos((prev) =>
      prev.includes(fullName) ? prev.filter((r) => r !== fullName) : [...prev, fullName]
    );
  };

  const handleConnectSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleRepo) return;

    try {
      setRepoError(null);
      setIsSubmitting(true);
      const chosen = githubAvailable.find((r) => r.fullName === singleRepo) || {
        fullName: singleRepo,
        id: 0,
        description: '',
        primaryLanguage: undefined,
        cloneUrl: `https://github.com/${singleRepo}.git`,
        permissions: { admin: false, push: true, pull: true }
      };

      await api.repos.connect({
        repoFullName: chosen.fullName,
        githubRepoId: chosen.id,
        description: chosen.description,
        primaryLanguage: chosen.primaryLanguage,
        cloneUrl: chosen.cloneUrl,
        defaultBranch: branch,
        solutionPathPattern: pathPattern,
        isTargetForLeetCode: category === 'LeetCode Solutions',
        category,
        autoCommitEnabled: autoCommit,
        permissions: chosen.permissions,
        syncPolicy: {
          autoCommit,
          autoPush,
          branch,
          pathPattern,
          intervalMinutes
        }
      });

      setSingleRepo('');
      onRefresh();
    } catch (err: any) {
      setRepoError(`Failed to connect repository: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchConnect = async () => {
    if (selectedRepos.length === 0) return;

    try {
      setRepoError(null);
      setIsSubmitting(true);
      for (const repoFullName of selectedRepos) {
        const chosen = githubAvailable.find((r) => r.fullName === repoFullName) || {
          fullName: repoFullName,
          id: 0,
          permissions: { admin: false, push: true, pull: true }
        };

        await api.repos.connect({
          repoFullName: chosen.fullName,
          githubRepoId: chosen.id,
          description: chosen.description,
          primaryLanguage: chosen.primaryLanguage,
          cloneUrl: chosen.cloneUrl,
          defaultBranch: chosen.defaultBranch || branch,
          solutionPathPattern: pathPattern,
          isTargetForLeetCode: false,
          category,
          autoCommitEnabled: autoCommit,
          permissions: chosen.permissions,
          syncPolicy: {
            autoCommit,
            autoPush,
            branch: chosen.defaultBranch || branch,
            pathPattern,
            intervalMinutes
          }
        });
      }

      setSelectedRepos([]);
      onRefresh();
    } catch (err: any) {
      setRepoError(`Batch connect failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}? StreakForge will stop monitoring it.`)) {
      return;
    }
    try {
      setRepoError(null);
      await api.repos.disconnect(id);
      onRefresh();
    } catch (err: any) {
      setRepoError(`Failed to disconnect: ${err.message}`);
    }
  };

  const handleRunDiagnostics = async (repoFullName: string) => {
    try {
      setRepoError(null);
      setDiagnosingRepoName(repoFullName);
      setIsDiagnosing(true);
      const res = await api.github.diagnoseRepo({ repoFullName });
      setDiagnosticsResult(res);
    } catch (err: any) {
      setRepoError(`Diagnostics failed: ${err.message}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="space-y-6">
      {repoError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{repoError}</span>
          </div>
          <button
            type="button"
            onClick={() => setRepoError(null)}
            className="text-[11px] font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {/* 1. Connected Repositories Section */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-theme-accent" />
              Connected Repositories ({connected.length})
            </h3>
            <p className="text-xs text-theme-muted mt-0.5">
              Active repositories managed by StreakForge with individual synchronization policies
            </p>
          </div>
        </div>

        {connected.length === 0 ? (
          <div className="text-center py-8 text-xs text-theme-muted bg-theme-elevated rounded-xl border border-dashed border-theme-border">
            No repositories connected yet. Discover or select repositories below to connect.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connected.map((repo, idx) => {
              const repoKey = repo.id || (repo as any)._id || repo.repoFullName || `conn-repo-${idx}`;
              const repoId = repo.id || (repo as any)._id || repo.repoFullName;

              return (
                <div
                  key={repoKey}
                  className="bg-theme-elevated border border-theme-border rounded-xl p-4 flex flex-col justify-between gap-3 transition hover:border-theme-accent/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-theme-primary truncate">
                          {repo.repoFullName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-theme-muted mt-0.5">
                          <span className="font-mono text-indigo-400">branch: {repo.defaultBranch}</span>
                          {repo.primaryLanguage && <span>• {repo.primaryLanguage}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-theme-accent-subtle text-theme-accent border border-theme-accent/20">
                          {repo.category || 'General'}
                        </span>
                        {repo.isTargetForLeetCode && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            LeetCode Target
                          </span>
                        )}
                      </div>
                    </div>

                    {repo.description && (
                      <p className="text-xs text-theme-secondary mt-2 line-clamp-2">
                        {repo.description}
                      </p>
                    )}

                    <div className="mt-3 p-2 bg-theme-surface rounded-lg text-[11px] font-mono text-theme-secondary space-y-1">
                      <div className="truncate">Pattern: {repo.solutionPathPattern}</div>
                      <div className="flex items-center justify-between text-theme-muted">
                        <span>Auto-commit: {repo.syncPolicy?.autoCommit ? 'Enabled' : 'Disabled'}</span>
                        <span>Push: {repo.syncPolicy?.autoPush ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-theme-border flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleRunDiagnostics(repo.repoFullName)}
                      disabled={isDiagnosing && diagnosingRepoName === repo.repoFullName}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface hover:bg-theme-elevated text-theme-secondary hover:text-theme-primary rounded-lg border border-theme-border font-medium text-[11px] transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isDiagnosing && diagnosingRepoName === repo.repoFullName ? 'Scanning...' : 'Health Scan'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://github.com/${repo.repoFullName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-theme-muted hover:text-theme-primary transition rounded"
                        title="View on GitHub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleDisconnect(repoId, repo.repoFullName)}
                        className="p-1.5 text-rose-500/80 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="Disconnect repository"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Connect New Repository & Policy Configuration */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
          <Plus className="w-4 h-4 text-theme-accent" />
          Connect & Configure Repository
        </h3>
        <p className="text-xs text-theme-muted mt-0.5">
          Select an authenticated repository, assign category tags, and establish synchronization policies
        </p>

        <form onSubmit={handleConnectSingle} className="mt-4 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-theme-primary mb-1">
                GitHub Repository
              </label>
              {githubAvailable.length > 0 ? (
                <select
                  value={singleRepo}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setSingleRepo(selected);
                    const match = githubAvailable.find((r) => r.fullName === selected);
                    if (match?.defaultBranch) {
                      setBranch(match.defaultBranch);
                    }
                  }}
                  required
                  className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
                >
                  <option value="">Select a repository...</option>
                  {githubAvailable.map((r, idx) => (
                    <option key={r.id || r.fullName || `opt-${idx}`} value={r.fullName}>
                      {r.fullName} {r.isPrivate ? '(Private)' : ''} {r.primaryLanguage ? `[${r.primaryLanguage}]` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. username/repo-name"
                  value={singleRepo}
                  onChange={(e) => setSingleRepo(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-primary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-theme-primary mb-1">
                Default Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs font-mono focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-primary mb-1">
                Sync Interval (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-theme-primary mb-1">
                Solution Path Pattern
              </label>
              <input
                type="text"
                value={pathPattern}
                onChange={(e) => setPathPattern(e.target.value)}
                required
                className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs font-mono focus:outline-none focus:border-theme-accent"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-theme-primary">
              <input
                type="checkbox"
                checked={autoCommit}
                onChange={(e) => setAutoCommit(e.target.checked)}
                className="rounded text-theme-accent"
              />
              <span>Enable Automatic Commits</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-theme-primary">
              <input
                type="checkbox"
                checked={autoPush}
                onChange={(e) => setAutoPush(e.target.checked)}
                className="rounded text-theme-accent"
              />
              <span>Enable Automatic Git Push</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !singleRepo}
            className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95 disabled:opacity-50 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Connecting...' : 'Connect Repository'}</span>
          </button>
        </form>
      </div>

      {/* 3. Discovered Repositories & Batch Selection */}
      {githubAvailable.length > 0 && (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                Discovered GitHub Repositories ({githubAvailable.length})
              </h3>
              <p className="text-xs text-theme-muted mt-0.5">
                Repositories found via authenticated GitHub OAuth. Select multiple to connect in batch.
              </p>
            </div>

            {selectedRepos.length > 0 && (
              <button
                onClick={handleBatchConnect}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-3 py-1.5 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg shadow-xs hover:opacity-90 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Selected ({selectedRepos.length})</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-theme-border border border-theme-border rounded-xl overflow-hidden max-h-96 overflow-y-auto">
            {githubAvailable.map((repo, idx) => {
              const isConnected = connected.some((c) => c.repoFullName === repo.fullName);
              const isSelected = selectedRepos.includes(repo.fullName);
              const itemKey = repo.id || repo.fullName || `gh-item-${idx}`;

              return (
                <div
                  key={itemKey}
                  className={`p-3 text-xs flex items-center justify-between gap-4 transition ${
                    isConnected ? 'bg-theme-elevated/40 opacity-75' : 'hover:bg-theme-elevated/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {!isConnected ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRepo(repo.fullName)}
                        className="rounded text-theme-accent"
                      />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-theme-primary truncate">
                          {repo.fullName}
                        </span>
                        {repo.isPrivate ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-muted flex items-center gap-1 font-mono">
                            <Lock className="w-2.5 h-2.5" /> Private
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-theme-elevated text-theme-muted font-mono">
                            Public
                          </span>
                        )}
                        {repo.primaryLanguage && (
                          <span className="text-[10px] text-theme-muted font-mono">
                            {repo.primaryLanguage}
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-[11px] text-theme-muted truncate mt-0.5">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-theme-muted font-mono">
                      branch: {repo.defaultBranch}
                    </span>
                    {isConnected ? (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSingleRepo(repo.fullName);
                          window.scrollTo({ top: 300, behavior: 'smooth' });
                        }}
                        className="text-[11px] text-theme-accent hover:underline font-semibold"
                      >
                        Configure & Connect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Repository Health Diagnostics Modal */}
      {diagnosticsResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="text-base font-bold text-theme-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Health Diagnostics: {diagnosticsResult.repoFullName}
                </h3>
                <span className="text-xs text-theme-muted">
                  Comprehensive repository hygiene, branch protection, and credential scan
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-theme-accent">
                  {diagnosticsResult.healthScore}/100
                </div>
                <span className="text-[10px] text-theme-muted uppercase font-bold tracking-wider">
                  Health Score
                </span>
              </div>
            </div>

            {/* Scanned Scope Disclaimer */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial Inspection Scope Disclaimer
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {diagnosticsResult.scannedScope}
              </p>
            </div>

            {/* Checklist Results */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">README.md</div>
                <div className="font-bold text-theme-primary flex items-center gap-1">
                  {diagnosticsResult.hasReadme ? (
                    <span className="text-emerald-500">Present</span>
                  ) : (
                    <span className="text-rose-500">Missing</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">.gitignore</div>
                <div className="font-bold text-theme-primary flex items-center gap-1">
                  {diagnosticsResult.hasGitignore ? (
                    <span className="text-emerald-500">Present</span>
                  ) : (
                    <span className="text-rose-500">Missing</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">License</div>
                <div className="font-bold text-theme-primary truncate">
                  {diagnosticsResult.hasLicense ? (
                    <span className="text-emerald-500">{diagnosticsResult.licenseName || 'Detected'}</span>
                  ) : (
                    <span className="text-rose-500">None</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">Branch Protection</div>
                <div className="font-bold text-theme-primary">
                  {diagnosticsResult.branchProtection?.isProtected ? (
                    <span className="text-emerald-500">Enforced</span>
                  ) : (
                    <span className="text-amber-500">Not Protected</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">Days Since Activity</div>
                <div className="font-bold text-theme-primary">
                  {diagnosticsResult.daysSinceLastActivity} days
                </div>
              </div>

              <div className="p-3 bg-theme-elevated rounded-xl border border-theme-border space-y-1">
                <div className="text-theme-muted font-medium">Secret Scan</div>
                <div className="font-bold text-theme-primary">
                  {diagnosticsResult.secretScanResult.safe ? (
                    <span className="text-emerald-500">Safe</span>
                  ) : (
                    <span className="text-rose-500">Risk Found</span>
                  )}
                </div>
              </div>
            </div>

            {/* Secret Scan Findings if Any */}
            {diagnosticsResult.secretScanResult.findings.length > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-rose-500">Secret Scanning Alerts Detected:</div>
                <ul className="list-disc list-inside text-[11px] text-rose-400 space-y-0.5">
                  {diagnosticsResult.secretScanResult.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Recommendations
              </h4>
              <div className="space-y-1.5">
                {diagnosticsResult.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-theme-elevated rounded-lg text-xs text-theme-secondary flex items-start gap-2"
                  >
                    <span className="text-theme-accent font-bold">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-theme-border flex justify-end">
              <button
                onClick={() => setDiagnosticsResult(null)}
                className="px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-xl shadow-xs hover:opacity-90 transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
