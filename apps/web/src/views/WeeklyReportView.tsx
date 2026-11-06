'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  TrendingUp,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Flame,
  GitCommit,
  BookOpen,
  RotateCw,
  Sparkles,
  Award
} from 'lucide-react';
import { api } from '../lib/api';
import type { WeeklyReport } from '@streakforge/shared-types';

export function WeeklyReportView() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.reports.getWeekly();
      const data = (res as any)?.data ?? res;
      if (data && (data.problemsSolved !== undefined || data.markdownSummary)) {
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to load weekly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleCopyMarkdown = () => {
    if (!report?.markdownSummary) return;
    navigator.clipboard.writeText(report.markdownSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const weekRange = report?.startDate && report?.endDate
    ? `${report.startDate} to ${report.endDate}`
    : 'Current Week';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Weekly Developer Report</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238636]/10 text-[#3fb950] border border-[#238636]/25 font-mono">
                Automated Digest
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Deterministic retrospective analyzing verified commits, problem-solving momentum, and topic coverage for {weekRange}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            disabled={!report?.markdownSummary}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Markdown' : 'Copy Markdown Report'}
          </button>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Problems Solved */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <div className="flex items-center justify-between text-xs text-[#8b949e] mb-2">
            <span>Problems Solved</span>
            <BookOpen className="w-4 h-4 text-[#58a6ff]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#f0f6fc] font-mono">
              {report?.problemsSolved ?? 0}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                (report?.deltaPreviousWeek?.solves ?? 0) >= 0
                  ? 'text-[#3fb950]'
                  : 'text-[#f85149]'
              }`}
            >
              {(report?.deltaPreviousWeek?.solves ?? 0) >= 0 ? '+' : ''}
              {report?.deltaPreviousWeek?.solves ?? 0} vs last week
            </span>
          </div>
        </div>

        {/* Git Commits */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <div className="flex items-center justify-between text-xs text-[#8b949e] mb-2">
            <span>Verified Commits</span>
            <GitCommit className="w-4 h-4 text-[#3fb950]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#f0f6fc] font-mono">
              {report?.gitCommits ?? 0}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                (report?.deltaPreviousWeek?.commits ?? 0) >= 0
                  ? 'text-[#3fb950]'
                  : 'text-[#f85149]'
              }`}
            >
              {(report?.deltaPreviousWeek?.commits ?? 0) >= 0 ? '+' : ''}
              {report?.deltaPreviousWeek?.commits ?? 0} vs last week
            </span>
          </div>
        </div>

        {/* Active Days */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <div className="flex items-center justify-between text-xs text-[#8b949e] mb-2">
            <span>Active Days This Week</span>
            <Calendar className="w-4 h-4 text-[#f0883e]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#f0f6fc] font-mono">
              {report?.activeDaysCount ?? 0} / 7
            </span>
            <span className="text-xs text-[#8b949e] font-mono">
              {Math.round(((report?.activeDaysCount ?? 0) / 7) * 100)}% active
            </span>
          </div>
        </div>

        {/* Goal Completion */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <div className="flex items-center justify-between text-xs text-[#8b949e] mb-2">
            <span>Weekly Goal Completion</span>
            <Flame className="w-4 h-4 text-[#f0883e]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-[#3fb950] font-mono">
              {report?.goalCompletionPercent ?? 0}%
            </span>
            <span className="text-xs text-[#3fb950] font-mono flex items-center gap-1">
              {report?.streakMaintained ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Streak Intact
                </>
              ) : (
                'Review Pacing'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Focus & Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Focus Topic */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <h2 className="text-sm font-bold text-[#f0f6fc] mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#58a6ff]" />
            Primary Focus Topic
          </h2>
          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
            <span className="text-xs text-[#8b949e] block mb-1">Most Practiced Domain:</span>
            <span className="text-base font-bold text-[#58a6ff]">
              {report?.topFocusTopic || 'General Algorithmic Patterns'}
            </span>
            <div className="mt-3 text-xs text-[#8b949e]">
              Completed {report?.srsRevisionsCompleted ?? 0} spaced repetition review sessions this week.
            </div>
          </div>
        </div>

        {/* Weaknesses Tackled */}
        <div className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50">
          <h2 className="text-sm font-bold text-[#f0f6fc] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f0883e]" />
            Weaknesses Targeted
          </h2>
          <div className="space-y-2">
            {(report?.weaknessesTackled || []).length > 0 ? (
              report?.weaknessesTackled.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]/60 flex items-center gap-2 text-xs text-[#c9d1d9]"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3fb950] flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#8b949e] py-4 text-center">
                All scheduled topics in good standing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Raw Markdown Export Preview */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
            Markdown Export Preview
          </span>
          <button
            onClick={handleCopyMarkdown}
            className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]/70 text-xs text-[#c9d1d9] font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
          {report?.markdownSummary || 'Generating weekly summary...'}
        </pre>
      </div>
    </div>
  );
}
