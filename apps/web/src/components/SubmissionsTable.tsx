'use client';

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { LeetCodeSubmission } from '@streakforge/shared-types';
import { api } from '../lib/api';

interface SubmissionsTableProps {
  submissions: LeetCodeSubmission[];
  onRefresh: () => void;
}

export function SubmissionsTable({ submissions, onRefresh }: SubmissionsTableProps) {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      await api.sync.retry(id);
      onRefresh();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Synchronized LeetCode Solutions</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified accepted submissions exported directly to GitHub
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Problem</th>
              <th className="px-5 py-3.5 font-semibold">Difficulty</th>
              <th className="px-5 py-3.5 font-semibold">Language</th>
              <th className="px-5 py-3.5 font-semibold">Performance</th>
              <th className="px-5 py-3.5 font-semibold">Sync Status</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">
                  No submissions imported yet. Use the StreakForge Chrome extension on LeetCode to synchronize!
                </td>
              </tr>
            ) : (
              submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{sub.questionTitle}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      #{sub.questionId} • {new Date(sub.submittedAt).toLocaleDateString()}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        sub.difficulty === 'Easy'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : sub.difficulty === 'Medium'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {sub.difficulty}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-mono text-xs text-indigo-300">
                    {sub.language}
                  </td>

                  <td className="px-5 py-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-200">{sub.runtimeMs} ms</span>{' '}
                      <span className="text-slate-500">({sub.runtimePercentile.toFixed(0)}%)</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      {formatBytes(sub.memoryBytes)}{' '}
                      <span className="text-slate-500">({sub.memoryPercentile.toFixed(0)}%)</span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {sub.syncStatus === 'SYNCED' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Synced</span>
                      </span>
                    )}
                    {sub.syncStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                        <Clock className="w-4 h-4" />
                        <span>Pending</span>
                      </span>
                    )}
                    {sub.syncStatus === 'FAILED' && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium" title={sub.syncErrorMessage}>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {sub.githubCommitUrl && (
                        <a
                          href={sub.githubCommitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-indigo-400 rounded-lg transition"
                          title="View Commit on GitHub"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {sub.syncStatus === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(sub.id)}
                          disabled={retryingId === sub.id}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                        >
                          {retryingId === sub.id ? 'Retrying...' : 'Retry'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
