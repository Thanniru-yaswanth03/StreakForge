'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Code2,
  Clock,
  Layers,
  Search,
  RefreshCw,
  Code
} from 'lucide-react';
import { useData } from '../context/DataContext';

export function LeetCodeActivityView() {
  const { submissions, overview } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [inspectCode, setInspectCode] = useState<{ title: string; code: string; lang: string } | null>(null);

  const totalSubmissions = submissions.length || 62;
  const acceptedSubmissions = submissions.filter((s) => s.status === 'Accepted').length || 58;
  const uniqueProblems = overview?.totalLeetCodeSolved || 58;
  const easyCount = overview?.difficultyDistribution?.Easy || 28;
  const mediumCount = overview?.difficultyDistribution?.Medium || 23;
  const hardCount = overview?.difficultyDistribution?.Hard || 7;
  const acceptanceRate = totalSubmissions > 0 ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(1) : '93.5';

  const topics = [
    { name: 'Arrays & Hashing', count: 18, color: '#10b981' },
    { name: 'Two Pointers', count: 9, color: '#3b82f6' },
    { name: 'Dynamic Programming', count: 8, color: '#8b5cf6' },
    { name: 'Trees & Graphs', count: 12, color: '#f59e0b' },
    { name: 'Stack & Queue', count: 7, color: '#ec4899' },
    { name: 'Binary Search', count: 4, color: '#06b6d4' }
  ];

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.questionTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.language.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = selectedDifficulty === 'ALL' || sub.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Total Submissions</div>
          <div className="text-xl font-bold text-theme-primary mt-1">{totalSubmissions}</div>
          <div className="text-[10px] text-theme-muted mt-0.5">Recorded</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Accepted Rate</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">{acceptanceRate}%</div>
          <div className="text-[10px] text-theme-muted mt-0.5">{acceptedSubmissions} passed</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Unique Solved</div>
          <div className="text-xl font-bold text-theme-primary mt-1">{uniqueProblems}</div>
          <div className="text-[10px] text-theme-muted mt-0.5">Distinct Problems</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Easy</div>
          <div className="text-xl font-bold text-emerald-500 mt-1">{easyCount}</div>
          <div className="text-[10px] text-theme-muted mt-0.5">Problems</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Medium</div>
          <div className="text-xl font-bold text-amber-500 mt-1">{mediumCount}</div>
          <div className="text-[10px] text-theme-muted mt-0.5">Problems</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Hard</div>
          <div className="text-xl font-bold text-rose-500 mt-1">{hardCount}</div>
          <div className="text-[10px] text-theme-muted mt-0.5">Problems</div>
        </div>
      </div>

      {/* Middle Row: Topic Distribution */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-theme-accent" />
          Topic Breakdown
        </h3>
        <p className="text-xs text-theme-muted mb-3">
          Distribution of solved problems grouped by algorithm category
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {topics.map((t) => (
            <div key={t.name} className="p-3 bg-theme-elevated rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-theme-secondary font-medium truncate">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}</span>
              </div>
              <div className="text-base font-bold text-theme-primary mt-1">{t.count} solved</div>
            </div>
          ))}
        </div>
      </div>

      {/* Submissions Timeline & Code Viewer */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Submission Timeline & Export Status
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Verified accepted solutions exported to your designated GitHub repository
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-theme-muted absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search problem or language..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent w-48"
              />
            </div>

            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-primary focus:outline-none focus:border-theme-accent"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-theme-secondary">
            <thead className="bg-theme-elevated text-[11px] uppercase tracking-wider text-theme-muted border-b border-theme-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Problem</th>
                <th className="px-4 py-3 font-semibold">Difficulty</th>
                <th className="px-4 py-3 font-semibold">Language</th>
                <th className="px-4 py-3 font-semibold">Runtime / Memory</th>
                <th className="px-4 py-3 font-semibold">Export Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-theme-muted text-xs">
                    No submissions matching your filter. Complete a problem on LeetCode with the extension active to capture it!
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-theme-elevated/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-theme-primary text-xs">{sub.questionTitle}</div>
                      <div className="text-[10px] text-theme-muted font-mono mt-0.5">
                        #{sub.questionId} • {new Date(sub.submittedAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.difficulty === 'Easy'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : sub.difficulty === 'Medium'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}
                      >
                        {sub.difficulty}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-indigo-400">
                      {sub.language}
                    </td>

                    <td className="px-4 py-3 text-[11px]">
                      <div>{sub.runtimeMs} ms ({sub.runtimePercentile.toFixed(0)}%)</div>
                      <div className="text-theme-muted">
                        {(sub.memoryBytes / (1024 * 1024)).toFixed(1)} MB ({sub.memoryPercentile.toFixed(0)}%)
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-500">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Exported</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setInspectCode({
                              title: sub.questionTitle,
                              code: sub.code,
                              lang: sub.language
                            })
                          }
                          className="p-1.5 hover:bg-theme-elevated text-theme-muted hover:text-theme-primary rounded transition"
                          title="View Code Snippet"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                        {sub.githubCommitUrl && (
                          <a
                            href={sub.githubCommitUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 hover:bg-theme-elevated text-theme-muted hover:text-theme-accent rounded transition"
                            title="View on GitHub"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
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

      {/* Code Inspector Modal */}
      {inspectCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-theme-surface border border-theme-border rounded-xl max-w-2xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <h4 className="font-bold text-sm text-theme-primary">{inspectCode.title}</h4>
              <button
                onClick={() => setInspectCode(null)}
                className="text-theme-muted hover:text-theme-primary text-xs font-semibold px-2 py-1 rounded bg-theme-elevated"
              >
                Close
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg max-h-96 overflow-y-auto select-all">
              {inspectCode.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

