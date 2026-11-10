'use client';

import React, { useState } from 'react';
import {
  Code2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  ExternalLink,
  Layers,
  Code,
  Filter,
  Check,
  GitCommit,
  Sparkles,
  Zap
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import { LeetCodeStatsCard } from '../components/LeetCodeStatsCard';

export function LeetCodeActivityView() {
  const { overview, submissions, leetcodeStats, isDemoMode, refreshData } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [inspectCode, setInspectCode] = useState<{ title: string; code: string; lang: string } | null>(null);
  const [retryNotification, setRetryNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    actionText?: string;
  } | null>(null);

  // Derive authentic scraped & archived counts
  const totalSubmissions = leetcodeStats?.totalSubmissions ?? (
    submissions.length > 0 ? submissions.length : 0
  );

  const totalSolved = leetcodeStats?.totalSolved ?? (submissions.length > 0 ? submissions.length : 0);
  const easyCount = leetcodeStats?.easySolved ?? 0;
  const mediumCount = leetcodeStats?.mediumSolved ?? 0;
  const hardCount = leetcodeStats?.hardSolved ?? 0;

  const acceptanceRate = leetcodeStats?.acceptanceRate
    ? String(leetcodeStats.acceptanceRate)
    : totalSubmissions > 0
    ? ((totalSolved / totalSubmissions) * 100).toFixed(2)
    : '0.00';

  // Derive topic & language breakdown strictly from user's genuine synced/accepted submissions
  const topicColorPalette = ['#3fb950', '#58a6ff', '#a371f7', '#d29922', '#f85149', '#388bfd'];
  const langMap = new Map<string, number>();
  submissions.forEach((s) => {
    const lang = s.language || 'Unknown';
    langMap.set(lang, (langMap.get(lang) || 0) + 1);
  });
  const baseCategories = Array.from(langMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count], idx) => ({
      name,
      color: topicColorPalette[idx % topicColorPalette.length],
      count
    }));

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.questionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.questionId.toString().includes(searchQuery);
    const matchesDiff = selectedDifficulty === 'ALL' || sub.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      setRetryNotification(null);
      await api.sync.retry(id);
      await refreshData();
      setRetryNotification({
        type: 'success',
        message: 'Solution successfully synced and committed to your GitHub target repository!'
      });
      setTimeout(() => setRetryNotification(null), 6000);
    } catch (err: any) {
      const msg = err.message || '';
      const isBadCreds =
        msg.includes('Bad credentials') ||
        msg.includes('expired') ||
        msg.includes('401') ||
        msg.includes('credentials');

      if (isBadCreds) {
        setRetryNotification({
          type: 'error',
          message: 'GitHub Authentication Expired: Your GitHub token is invalid or expired.',
          actionText: 'Please update your Personal Access Token (PAT) or reconnect GitHub in Settings.'
        });
      } else {
        setRetryNotification({
          type: 'error',
          message: `Retry failed: ${msg}`
        });
      }
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 0. Live Scraped LeetCode User Profile Card */}
      <LeetCodeStatsCard />

      {/* 1. Performance Summary Cards (Glossy Rich Effect) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Submissions */}
        <div className="github-glossy-card p-3.5 hover:border-[#58a6ff]/50 transition-all">
          <div className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Total Submissions</div>
          <div className="text-xl sm:text-2xl font-bold text-[#f0f6fc] mt-1 tabular-nums">{totalSubmissions}</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">Recorded in Archive</div>
        </div>

        {/* Card 2: Acceptance Rate */}
        <div className="github-glossy-card p-3.5 hover:border-[#3fb950]/50 transition-all">
          <div className="text-[10px] font-bold text-[#3fb950] uppercase tracking-wider">Accepted Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-[#3fb950] mt-1 tabular-nums">{acceptanceRate}%</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">{totalSolved} passing</div>
        </div>

        {/* Card 3: Unique Solved */}
        <div className="github-glossy-card p-3.5 hover:border-[#a371f7]/50 transition-all">
          <div className="text-[10px] font-bold text-[#a371f7] uppercase tracking-wider">Unique Solved</div>
          <div className="text-xl sm:text-2xl font-bold text-[#f0f6fc] mt-1 tabular-nums">{totalSolved}</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">Distinct Problems</div>
        </div>

        {/* Card 4: Easy */}
        <div className="github-glossy-card p-3.5 hover:border-[#238636] transition-all">
          <div className="text-[10px] font-bold text-[#3fb950] uppercase tracking-wider flex items-center justify-between">
            <span>Easy</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] shadow-[0_0_6px_rgba(63,185,80,0.6)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#3fb950] mt-1 tabular-nums">{easyCount}</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">Passing solves</div>
        </div>

        {/* Card 5: Medium */}
        <div className="github-glossy-card p-3.5 hover:border-[#d29922] transition-all">
          <div className="text-[10px] font-bold text-[#d29922] uppercase tracking-wider flex items-center justify-between">
            <span>Medium</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#d29922] shadow-[0_0_6px_rgba(210,153,34,0.6)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#d29922] mt-1 tabular-nums">{mediumCount}</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">Data structures</div>
        </div>

        {/* Card 6: Hard */}
        <div className="github-glossy-card p-3.5 hover:border-[#f85149] transition-all">
          <div className="text-[10px] font-bold text-[#f85149] uppercase tracking-wider flex items-center justify-between">
            <span>Hard</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f85149] shadow-[0_0_6px_rgba(248,81,73,0.6)]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#f85149] mt-1 tabular-nums">{hardCount}</div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">Advanced algorithms</div>
        </div>
      </div>

      {/* 2. Topic Distribution (Glossy GitHub Cards) */}
      <div className="github-glossy-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-[#58a6ff]" />
          <h3 className="text-xs font-bold text-[#f0f6fc] uppercase tracking-wider">
            Algorithm &amp; Topic Distribution
          </h3>
        </div>
        <p className="text-[11px] text-[#8b949e] mb-3">
          Language distribution across your {submissions.length} synced submission{submissions.length === 1 ? '' : 's'}
        </p>

        {baseCategories.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8b949e] bg-[#0d1117]/60 border border-dashed border-[#30363d] rounded-lg">
            No synced submissions recorded yet. Solve a problem on LeetCode with the extension active to see your language distribution.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {baseCategories.map((t) => (
              <div
                key={t.name}
                className="p-3 bg-[#0d1117]/80 border border-[#30363d]/80 hover:border-[#58a6ff]/40 rounded-lg text-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default"
              >
                <div className="flex items-center gap-1.5 text-[#c9d1d9] font-medium truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="truncate text-[11px] font-mono">{t.name}</span>
                </div>
                <div className="text-base font-bold text-[#f0f6fc] mt-1.5 tabular-nums flex items-baseline gap-1">
                  <span>{t.count}</span>
                  <span className="text-[10px] font-normal text-[#8b949e]">exported</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-app Notification Banner */}
      {retryNotification && (
        <div
          className={`flex items-start justify-between p-3.5 rounded-xl border text-xs transition-all ${
            retryNotification.type === 'error'
              ? 'bg-[#f85149]/10 border-[#f85149]/40 text-[#ff7b72]'
              : 'bg-[#238636]/10 border-[#238636]/40 text-[#3fb950]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {retryNotification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#f85149] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
            )}
            <div>
              <span className="font-semibold">{retryNotification.message}</span>
              {retryNotification.actionText && (
                <div className="text-[11px] text-[#8b949e] mt-0.5">
                  {retryNotification.actionText}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setRetryNotification(null)}
            className="text-[#8b949e] hover:text-[#f0f6fc] ml-3 p-1 rounded cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Submissions Table & Export States (GitHub Table Style) */}
      <div className="github-glossy-card overflow-hidden">
        <div className="p-4 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22]/90">
          <div>
            <h3 className="text-xs font-bold text-[#f0f6fc] uppercase tracking-wider flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-[#3fb950]" />
              Submission History &amp; GitHub Export
            </h3>
            <p className="text-[11px] text-[#8b949e] mt-0.5">
              Verified accepted solutions committed to your target repository
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search problem or language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] placeholder:text-[#8b949e] focus:outline-none focus:border-[#58a6ff] w-48 font-sans"
              />
            </div>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] font-sans"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c9d1d9]">
            <thead className="bg-[#161b22] text-[10px] uppercase tracking-wider text-[#8b949e] border-b border-[#30363d]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Problem</th>
                <th className="px-4 py-2.5 font-semibold">Difficulty</th>
                <th className="px-4 py-2.5 font-semibold">Language</th>
                <th className="px-4 py-2.5 font-semibold">Runtime / Memory</th>
                <th className="px-4 py-2.5 font-semibold">Export Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#8b949e] text-xs">
                    No submissions matching your filter. Solve any problem on LeetCode with the extension active to export automatically!
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const status = sub.syncStatus || 'SYNCED';
                  const isFailed = status === 'FAILED';
                  const isExported = status === 'SYNCED';
                  const isSkipped = status === 'SKIPPED';
                  const isPending = status === 'PENDING';
                  const rowKey = sub.id || (sub as any)._id || sub.submissionId || `sub-row-${idx}`;

                  return (
                    <tr key={rowKey} className="hover:bg-[#21262d]/50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#f0f6fc] text-xs hover:text-[#58a6ff] transition cursor-pointer">
                          {sub.questionTitle}
                        </div>
                        <div className="text-[10px] text-[#8b949e] font-mono mt-0.5" suppressHydrationWarning>
                          #{sub.questionId} • {new Date(sub.submittedAt).toLocaleDateString('en-US')}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            sub.difficulty === 'Easy'
                              ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/30'
                              : sub.difficulty === 'Medium'
                              ? 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/30'
                              : 'bg-[#f85149]/15 text-[#f85149] border-[#f85149]/30'
                          }`}
                        >
                          {sub.difficulty}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#58a6ff] font-medium">
                        {sub.language}
                      </td>

                      <td className="px-4 py-3 text-[11px] tabular-nums">
                        <div className="font-medium text-[#f0f6fc]">{sub.runtimeMs} ms ({sub.runtimePercentile.toFixed(0)}%)</div>
                        <div className="text-[#8b949e]">
                          {(sub.memoryBytes / (1024 * 1024)).toFixed(1)} MB ({sub.memoryPercentile.toFixed(0)}%)
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isExported && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#3fb950]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Exported</span>
                          </span>
                        )}
                        {isFailed && (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#f85149]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                            {sub.syncErrorMessage && (
                              <div
                                className="text-[10px] text-[#8b949e] max-w-[200px] truncate mt-0.5"
                                title={sub.syncErrorMessage}
                              >
                                {sub.syncErrorMessage.includes('Bad credentials') || sub.syncErrorMessage.includes('expired')
                                  ? 'Token expired • Reconnect in Settings'
                                  : sub.syncErrorMessage}
                              </div>
                            )}
                          </div>
                        )}
                        {isSkipped && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#d29922]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Duplicate / Skipped</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#8b949e] font-mono">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isFailed && (
                            <button
                              onClick={() => handleRetry(sub.id)}
                              disabled={retryingId === sub.id}
                              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#f0f6fc] font-semibold rounded flex items-center gap-1 transition"
                              title="Retry failed sync"
                            >
                              <RotateCw className={`w-3 h-3 ${retryingId === sub.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}

                          <button
                            onClick={() =>
                              setInspectCode({
                                title: sub.questionTitle,
                                code: sub.code,
                                lang: sub.language
                              })
                            }
                            className="p-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] rounded transition cursor-pointer"
                            title="Inspect Solution Code"
                          >
                            <Code className="w-3.5 h-3.5" />
                          </button>

                          {sub.githubCommitUrl && (
                            <a
                              href={sub.githubCommitUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#58a6ff] rounded transition cursor-pointer"
                              title="View Commit on GitHub"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Inspector Modal */}
      {inspectCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-2xl w-full p-4 sm:p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#f0f6fc]">{inspectCode.title}</h4>
                <span className="text-[10px] text-[#58a6ff] font-mono">{inspectCode.lang}</span>
              </div>
              <button
                onClick={() => setInspectCode(null)}
                className="text-[#8b949e] hover:text-[#f0f6fc] text-xs font-semibold px-2 py-1 rounded bg-[#21262d] border border-[#30363d] transition cursor-pointer"
              >
                Close
              </button>
            </div>
            <pre className="p-3 bg-[#0d1117] text-[#3fb950] font-mono text-xs rounded-lg max-h-96 overflow-y-auto select-all leading-relaxed border border-[#30363d]">
              {inspectCode.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
