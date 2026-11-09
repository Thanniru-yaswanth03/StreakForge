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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-theme-primary">Weekly Developer Report</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-mono">
                Automated Digest
              </span>
            </div>
            <p className="text-xs text-theme-muted mt-1">
              Deterministic retrospective analyzing verified commits, problem-solving momentum, and topic coverage for {weekRange}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            disabled={!report?.markdownSummary}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Markdown' : 'Copy Markdown Report'}
          </button>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Problems Solved */}
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
            <span>Problems Solved</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-theme-primary font-mono">
              {report?.problemsSolved ?? 0}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                (report?.deltaPreviousWeek?.solves ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {(report?.deltaPreviousWeek?.solves ?? 0) >= 0 ? '+' : ''}
              {report?.deltaPreviousWeek?.solves ?? 0} vs last week
            </span>
          </div>
        </div>

        {/* Git Commits */}
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
            <span>Verified Commits</span>
            <GitCommit className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-theme-primary font-mono">
              {report?.gitCommits ?? 0}
            </span>
            <span
              className={`text-xs font-bold font-mono ${
                (report?.deltaPreviousWeek?.commits ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {(report?.deltaPreviousWeek?.commits ?? 0) >= 0 ? '+' : ''}
              {report?.deltaPreviousWeek?.commits ?? 0} vs last week
            </span>
          </div>
        </div>

        {/* Active Days */}
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
            <span>Active Days This Week</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-theme-primary font-mono">
              {report?.activeDaysCount ?? 0} / 7
            </span>
            <span className="text-xs text-theme-muted font-mono">
              {Math.round(((report?.activeDaysCount ?? 0) / 7) * 100)}% active
            </span>
          </div>
        </div>

        {/* Goal Completion */}
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <div className="flex items-center justify-between text-xs text-theme-muted mb-2">
            <span>Weekly Goal Completion</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {report?.goalCompletionPercent ?? 0}%
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
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
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <h2 className="text-sm font-bold text-theme-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Primary Focus Topic
          </h2>
          <div className="p-4 rounded-lg bg-theme-elevated border border-theme-border">
            <span className="text-xs text-theme-muted block mb-1">Most Practiced Domain:</span>
            <span className="text-base font-bold text-blue-600 dark:text-blue-400">
              {report?.topFocusTopic || 'General Algorithmic Patterns'}
            </span>
            <div className="mt-3 text-xs text-theme-muted">
              Completed {report?.srsRevisionsCompleted ?? 0} spaced repetition review sessions this week.
            </div>
          </div>
        </div>

        {/* Weaknesses Tackled */}
        <div className="p-5 rounded-xl border border-theme-border bg-theme-surface shadow-xs">
          <h2 className="text-sm font-bold text-theme-primary mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Weaknesses Targeted
          </h2>
          <div className="space-y-2">
            {(report?.weaknessesTackled || []).length > 0 ? (
              report?.weaknessesTackled.map((w, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-theme-elevated border border-theme-border flex items-center gap-2 text-xs text-theme-secondary"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span>{w}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-theme-muted py-4 text-center">
                All scheduled topics in good standing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Raw Markdown Export Preview */}
      <div className="rounded-xl border border-theme-border bg-theme-surface shadow-xs p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
            Markdown Export Preview
          </span>
          <button
            onClick={handleCopyMarkdown}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="p-4 rounded-lg bg-theme-elevated border border-theme-border text-xs text-theme-primary font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
          {report?.markdownSummary || 'Generating weekly summary...'}
        </pre>
      </div>
    </div>
  );
}
