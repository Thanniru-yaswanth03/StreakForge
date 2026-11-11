'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Search,
  ExternalLink,
  Code,
  GitCommit,
  Trash2,
  DownloadCloud,
  UploadCloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { LeetCodeSubmission } from '@streakforge/shared-types';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import { LeetCodeStatsCard } from '../components/LeetCodeStatsCard';

export function LeetCodeActivityView() {
  const { user, leetcodeStats, extensionStatus, submissionMetrics, refreshData } = useData();

  const [rows, setRows] = useState<LeetCodeSubmission[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [metrics, setMetrics] = useState(submissionMetrics);
  const [languages, setLanguages] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState<boolean>(false);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedTopic, setSelectedTopic] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Actions & selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [isImportingPublic, setIsImportingPublic] = useState<boolean>(false);
  const [isImportingExt, setIsImportingExt] = useState<boolean>(false);
  const [inspectCode, setInspectCode] = useState<{
    title: string;
    code: string;
    lang: string;
  } | null>(null);
  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    actionText?: string;
  } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setIsLoadingRows(true);
    try {
      const res = await api.sync.queryHistory({
        page,
        limit: 15,
        status: selectedStatus,
        difficulty: selectedDifficulty,
        language: selectedLanguage,
        topic: selectedTopic,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        search: searchQuery || undefined,
        sort: sortBy
      });
      setRows(res.data || []);
      setTotal(res.meta?.total ?? (res.data?.length || 0));
      setTotalPages(res.meta?.totalPages ?? 1);
      if (res.meta?.metrics) setMetrics(res.meta.metrics);
      if (res.meta?.facets?.languages) setLanguages(res.meta.facets.languages);
      if (res.meta?.facets?.topics) setTopics(res.meta.facets.topics);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Failed loading submission history' });
    } finally {
      setIsLoadingRows(false);
    }
  }, [
    user,
    page,
    selectedStatus,
    selectedDifficulty,
    selectedLanguage,
    selectedTopic,
    fromDate,
    toDate,
    searchQuery,
    sortBy
  ]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Listen for extension historical session import completions
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'STREAKFORGE_HISTORY_IMPORT_RESULT') {
        setIsImportingExt(false);
        const res = event.data.payload;
        if (!res?.success) {
          setBanner({
            type: 'error',
            message: res?.error || 'Extension LeetCode session import failed.'
          });
          return;
        }
        const d = res.data || {};
        setBanner({
          type: 'success',
          message: `Imported ${d.importedCount || 0} accepted submission(s) with source code (${d.skippedDuplicates || 0} already tracked).`
        });
        loadHistory();
        refreshData();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadHistory, refreshData]);

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      setBanner(null);
      await api.sync.retry(id);
      await Promise.all([loadHistory(), refreshData()]);
      setBanner({
        type: 'success',
        message: 'Solution pushed and verified on your target GitHub repository!'
      });
    } catch (err: any) {
      const msg = err.message || '';
      const isBadCreds =
        msg.includes('Bad credentials') || msg.includes('expired') || msg.includes('401');
      setBanner({
        type: 'error',
        message: isBadCreds
          ? 'GitHub Authorization Expired: Please reconnect GitHub in Settings.'
          : `Push failed: ${msg}`,
        actionText: isBadCreds ? 'Go to Settings -> Reconnect GitHub' : undefined
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleImportPublic = async () => {
    setIsImportingPublic(true);
    setBanner(null);
    try {
      const res = await api.sync.importPublic(user?.leetcodeUsername || undefined);
      setBanner({
        type: 'info',
        message: `Fetched public recent activity for @${res.username}: imported ${res.importedCount} new record(s), skipped ${res.skippedDuplicates} duplicates. (${res.missingCodeCount} public record(s) lack source code — run Extension Import to backfill code.)`
      });
      await Promise.all([loadHistory(), refreshData()]);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err.message || 'Failed importing recent public submissions.'
      });
    } finally {
      setIsImportingPublic(false);
    }
  };

  const handleImportViaExtension = () => {
    if (extensionStatus === 'NOT_INSTALLED') {
      setBanner({
        type: 'error',
        message:
          'Chrome extension bridge not detected on this tab. Load StreakForge V4 in Chrome and make sure you are signed into leetcode.com.'
      });
      return;
    }
    setIsImportingExt(true);
    setBanner({
      type: 'info',
      message: 'Fetching accepted submissions and source code via your Chrome LeetCode session...'
    });
    window.postMessage(
      {
        type: 'STREAKFORGE_START_HISTORY_IMPORT',
        payload: { limit: 100, autoExportToGitHub: false }
      },
      window.location.origin
    );
  };

  const handleDeleteSingle = async (id: string, title: string) => {
    if (
      !confirm(
        `Remove "${title}" from StreakForge problem history? GitHub commits in your repository will NOT be deleted.`
      )
    ) {
      return;
    }
    try {
      await api.sync.deleteSubmission(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      await Promise.all([loadHistory(), refreshData()]);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} selected submission(s) from StreakForge database? Existing GitHub repository commits remain untouched.`
      )
    ) {
      return;
    }
    try {
      await api.sync.bulkDeleteSubmissions(selectedIds);
      setSelectedIds([]);
      await Promise.all([loadHistory(), refreshData()]);
    } catch (err: any) {
      setBanner({ type: 'error', message: err.message || 'Bulk delete failed' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalSolvedProfile = leetcodeStats?.totalSolved ?? metrics.uniqueProblemsSolved;

  return (
    <div className="space-y-6">
      <LeetCodeStatsCard />

      {/* 1. Separated Authentic V4 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#a371f7] uppercase tracking-wider">
            Unique Solved
          </div>
          <div className="text-xl font-bold text-[#f0f6fc] mt-1 tabular-nums">
            {totalSolvedProfile}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">
            {metrics.uniqueProblemsSolved} tracked in DB
          </div>
        </div>

        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#58a6ff] uppercase tracking-wider">
            Accepted Runs
          </div>
          <div className="text-xl font-bold text-[#f0f6fc] mt-1 tabular-nums">
            {metrics.acceptedSubmissions}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">
            Total archived logs
          </div>
        </div>

        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#3fb950] uppercase tracking-wider">
            Exported to GH
          </div>
          <div className="text-xl font-bold text-[#3fb950] mt-1 tabular-nums">
            {metrics.exportedCount}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">
            Verified commits
          </div>
        </div>

        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#d29922] uppercase tracking-wider">
            Pending Push
          </div>
          <div className="text-xl font-bold text-[#d29922] mt-1 tabular-nums">
            {metrics.pendingCount}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">
            Awaiting export
          </div>
        </div>

        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#f85149] uppercase tracking-wider">
            Failed Syncs
          </div>
          <div className="text-xl font-bold text-[#f85149] mt-1 tabular-nums">
            {metrics.failedCount}
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5 font-mono">
            Retry available
          </div>
        </div>

        <div className="github-glossy-card p-3.5">
          <div className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">
            E / M / H Split
          </div>
          <div className="text-sm font-bold text-[#f0f6fc] mt-1.5 tabular-nums font-mono">
            <span className="text-[#3fb950]">{leetcodeStats?.easySolved ?? 0}</span> /{' '}
            <span className="text-[#d29922]">{leetcodeStats?.mediumSolved ?? 0}</span> /{' '}
            <span className="text-[#f85149]">{leetcodeStats?.hardSolved ?? 0}</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1 font-mono">
            Rate: {leetcodeStats?.acceptanceRate != null ? `${leetcodeStats.acceptanceRate.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* 2. Historical Problem Import Panel */}
      <div className="github-glossy-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#f0f6fc] flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-[#58a6ff]" />
            <span>Backfill Historical LeetCode Problems</span>
          </h3>
          <p className="text-[11px] text-[#8b949e] max-w-2xl leading-relaxed">
            Public LeetCode API exposes your recent 20 solved problem metadata without source code.
            Use <strong className="text-[#f0f6fc]">Extension Session Import</strong> while logged into{' '}
            <code>leetcode.com</code> to fetch historical source code as well.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleImportPublic}
            disabled={isImportingPublic || !user?.leetcodeUsername}
            className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-semibold text-[#f0f6fc] flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <DownloadCloud className={`w-3.5 h-3.5 text-[#58a6ff] ${isImportingPublic ? 'animate-pulse' : ''}`} />
            <span>{isImportingPublic ? 'Fetching Public...' : 'Import Public Recent (20)'}</span>
          </button>

          <button
            type="button"
            onClick={handleImportViaExtension}
            disabled={isImportingExt}
            className="px-3.5 py-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isImportingExt ? 'animate-bounce' : ''}`} />
            <span>{isImportingExt ? 'Importing via Chrome...' : 'Extension Session Import (Code)'}</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`flex items-start justify-between p-3.5 rounded-xl border text-xs ${
            banner.type === 'error'
              ? 'bg-[#f85149]/10 border-[#f85149]/40 text-[#ff7b72]'
              : banner.type === 'info'
                ? 'bg-[#388bfd]/10 border-[#388bfd]/40 text-[#79c0ff]'
                : 'bg-[#238636]/10 border-[#238636]/40 text-[#3fb950]'
          }`}
        >
          <div>
            <span className="font-semibold">{banner.message}</span>
            {banner.actionText && (
              <div className="text-[11px] opacity-80 mt-0.5">{banner.actionText}</div>
            )}
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-[#8b949e] hover:text-[#f0f6fc] ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Filterable, Paginated Submissions Table */}
      <div className="github-glossy-card overflow-hidden">
        <div className="p-4 border-b border-[#30363d] space-y-3 bg-[#161b22]/90">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-[#f0f6fc] uppercase tracking-wider flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-[#3fb950]" />
                <span>Problem &amp; Submission History ({total})</span>
              </h3>
              <p className="text-[11px] text-[#8b949e] mt-0.5">
                Deleting history rows removes records from StreakForge DB only — GitHub commits are never touched.
              </p>
            </div>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 rounded-lg bg-[#f85149]/15 hover:bg-[#f85149]/25 border border-[#f85149]/40 text-[#ff7b72] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            <div className="relative col-span-2 sm:col-span-1 lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search title, #ID, slug..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
              />
            </div>

            <select
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
            >
              <option value="ALL">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SYNCED">Exported</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>

            <select
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
            >
              <option value="ALL">All Languages</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
            >
              <option value="ALL">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc]"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="recentlySynced">Sort: Recently Synced</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="questionId">Sort: Problem #</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8b949e]">
            <span>Date Range:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#f0f6fc]"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#f0f6fc]"
            />
            {(fromDate || toDate || selectedTopic !== 'ALL' || selectedLanguage !== 'ALL' || selectedStatus !== 'ALL' || selectedDifficulty !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDifficulty('ALL');
                  setSelectedStatus('ALL');
                  setSelectedLanguage('ALL');
                  setSelectedTopic('ALL');
                  setFromDate('');
                  setToDate('');
                  setPage(1);
                }}
                className="text-[#58a6ff] hover:underline ml-2 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c9d1d9]">
            <thead className="bg-[#161b22] text-[10px] uppercase tracking-wider text-[#8b949e] border-b border-[#30363d]">
              <tr>
                <th className="px-3 py-2.5 w-8"></th>
                <th className="px-4 py-2.5 font-semibold">Problem</th>
                <th className="px-3 py-2.5 font-semibold">Difficulty</th>
                <th className="px-3 py-2.5 font-semibold">Language</th>
                <th className="px-3 py-2.5 font-semibold">Metrics</th>
                <th className="px-3 py-2.5 font-semibold">GitHub Sync Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {isLoadingRows && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8b949e]">
                    Loading submissions...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#8b949e]">
                    No submissions match your filters. Solve a problem or run Historical Import above.
                  </td>
                </tr>
              ) : (
                rows.map((sub, idx) => {
                  const rowId = sub.id || (sub as any)._id || sub.submissionId;
                  const status = sub.syncStatus || 'PENDING';
                  const hasCode = Boolean(sub.code && sub.code.trim().length > 0);
                  const canPush = (status === 'FAILED' || status === 'PENDING') && hasCode;

                  return (
                    <tr key={rowId || idx} className="hover:bg-[#21262d]/50 transition">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rowId)}
                          onChange={() => toggleSelect(rowId)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={sub.problemUrl || `https://leetcode.com/problems/${sub.questionSlug}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[#f0f6fc] hover:text-[#58a6ff] hover:underline"
                        >
                          {sub.questionId !== '0' ? `${sub.questionId}. ` : ''}
                          {sub.questionTitle}
                        </a>
                        <div className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                          {new Date(sub.submittedAt).toLocaleString()}
                          {sub.topicTags && sub.topicTags.length > 0
                            ? ` • ${sub.topicTags.slice(0, 2).join(', ')}`
                            : ''}
                        </div>
                      </td>

                      <td className="px-3 py-3">
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

                      <td className="px-3 py-3 font-mono text-[11px] text-[#58a6ff]">
                        {sub.language}
                      </td>

                      <td className="px-3 py-3 text-[11px] tabular-nums">
                        {sub.runtimeMs > 0 || sub.memoryBytes > 0 ? (
                          <>
                            <div className="text-[#f0f6fc]">
                              {sub.runtimeMs > 0 ? `${sub.runtimeMs} ms` : 'N/A'}
                            </div>
                            <div className="text-[#8b949e]">
                              {sub.memoryBytes > 0
                                ? `${(sub.memoryBytes / (1024 * 1024)).toFixed(1)} MB`
                                : ''}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#8b949e]">N/A</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {status === 'SYNCED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#3fb950]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Exported</span>
                            </span>
                            {sub.targetRepoFullName && (
                              <div className="text-[10px] text-[#8b949e] font-mono truncate max-w-[160px]">
                                {sub.targetRepoFullName}
                              </div>
                            )}
                          </div>
                        )}
                        {status === 'FAILED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#f85149]">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                            {sub.syncErrorMessage && (
                              <div
                                className="text-[10px] text-[#8b949e] max-w-[190px] truncate"
                                title={sub.syncErrorMessage}
                              >
                                {sub.syncErrorMessage}
                              </div>
                            )}
                          </div>
                        )}
                        {status === 'SKIPPED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#d29922]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Skipped</span>
                            </span>
                            {sub.syncErrorMessage && (
                              <div
                                className="text-[10px] text-[#8b949e] max-w-[190px] truncate"
                                title={sub.syncErrorMessage}
                              >
                                {sub.syncErrorMessage}
                              </div>
                            )}
                          </div>
                        )}
                        {status === 'PENDING' && (
                          <div>
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#58a6ff]">
                              Pending
                            </span>
                            {sub.syncErrorMessage && (
                              <div
                                className="text-[10px] text-[#8b949e] max-w-[190px] truncate"
                                title={sub.syncErrorMessage}
                              >
                                {sub.syncErrorMessage}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canPush && (
                            <button
                              onClick={() => handleRetry(rowId)}
                              disabled={retryingId === rowId}
                              className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs text-[#f0f6fc] font-semibold rounded flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCw
                                className={`w-3 h-3 ${retryingId === rowId ? 'animate-spin' : ''}`}
                              />
                              <span>{status === 'FAILED' ? 'Retry' : 'Push'}</span>
                            </button>
                          )}

                          {hasCode && (
                            <button
                              onClick={() =>
                                setInspectCode({
                                  title: sub.questionTitle,
                                  code: sub.code,
                                  lang: sub.language
                                })
                              }
                              className="p-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#f0f6fc] rounded cursor-pointer"
                              title="Inspect Code"
                            >
                              <Code className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {sub.githubCommitUrl && (
                            <a
                              href={sub.githubCommitUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-[#21262d] text-[#8b949e] hover:text-[#58a6ff] rounded"
                              title="View GitHub Commit"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => handleDeleteSingle(rowId, sub.questionTitle)}
                            className="p-1.5 hover:bg-[#f85149]/15 text-[#8b949e] hover:text-[#f85149] rounded cursor-pointer"
                            title="Delete from DB history (keeps GitHub commit)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] bg-[#161b22]/80">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#f0f6fc] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded bg-[#21262d] border border-[#30363d] text-[#f0f6fc] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
                className="text-[#8b949e] hover:text-[#f0f6fc] text-xs font-semibold px-2 py-1 rounded bg-[#21262d] border border-[#30363d] cursor-pointer"
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
