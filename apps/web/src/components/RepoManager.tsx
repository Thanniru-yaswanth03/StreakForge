'use client';

import React, { useState } from 'react';
import { GitBranch, FolderGit2, Check, ExternalLink, Plus } from 'lucide-react';
import type { RepositoryConnection } from '@streakforge/shared-types';
import { api } from '../lib/api';

interface RepoManagerProps {
  connected: RepositoryConnection[];
  githubAvailable: any[];
  onRefresh: () => void;
}

export function RepoManager({ connected, githubAvailable, onRefresh }: RepoManagerProps) {
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [pathPattern, setPathPattern] = useState<string>('solutions/{difficulty}/{id}-{slug}');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;

    try {
      setIsSubmitting(true);
      const chosen = githubAvailable.find((r) => r.fullName === selectedRepo) || {
        fullName: selectedRepo,
        id: Math.floor(Math.random() * 1000000)
      };

      await api.repos.connect({
        repoFullName: chosen.fullName,
        githubRepoId: chosen.id,
        defaultBranch: branch,
        solutionPathPattern: pathPattern,
        isTargetForLeetCode: true
      });

      onRefresh();
    } catch (err: any) {
      alert(`Failed to connect repository: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Target Repositories */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-white tracking-tight">Active Target Repositories</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Repositories configured to receive genuine LeetCode solutions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {connected.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-sm text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              No repositories connected yet. Select one below to begin synchronizing!
            </div>
          ) : (
            connected.map((repo) => (
              <div
                key={repo.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="font-semibold text-white text-sm">{repo.repoFullName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        branch: {repo.defaultBranch}
                      </div>
                    </div>
                  </div>
                  {repo.isTargetForLeetCode && (
                    <span className="bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                      Primary Target
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg font-mono truncate">
                  Pattern: {repo.solutionPathPattern}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                  <span>
                    Last synced: {repo.lastSyncedAt ? new Date(repo.lastSyncedAt).toLocaleString() : 'Never'}
                  </span>
                  <a
                    href={`https://github.com/${repo.repoFullName}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Connect Repository Form */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-white tracking-tight">Connect a GitHub Repository</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Designate an existing GitHub repository to store your genuine solutions
        </p>

        <form onSubmit={handleConnect} className="mt-4 space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select GitHub Repository
            </label>
            {githubAvailable.length > 0 ? (
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">Choose a repository...</option>
                {githubAvailable.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName} {r.isPrivate ? '(Private)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. username/leetcode-solutions"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Solution Folder Pattern
              </label>
              <input
                type="text"
                value={pathPattern}
                onChange={(e) => setPathPattern(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !selectedRepo}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Connecting...' : 'Set as Solution Target'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
