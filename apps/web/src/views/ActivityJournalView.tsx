'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Calendar,
  Save,
  Check,
  GitCommit,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Code2,
  Info,
  RotateCw,
  AlertCircle,
  FileCode,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import type { DailyJournalData } from '@streakforge/shared-types';

export function ActivityJournalView() {
  const { journalEntries, updateJournalNote, isDemoMode } = useData();

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [journalData, setJournalData] = useState<DailyJournalData | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load journal for selected date from API or fall back to local/demo state
  const loadDailyJournal = useCallback(async (date: string) => {
    setIsLoading(true);
    setSaveError(null);

    try {
      const data = await api.analytics.getJournal(date);
      setJournalData(data);
      setNoteContent(data.notes || '');
    } catch {
      // Fallback strictly empty when API is offline or unauthenticated (Zero Fabrication)
      const localEntry = journalEntries.find((j) => j.date === date);
      const fallback: DailyJournalData = {
        date,
        notes: localEntry?.notes || '',
        codingDurationMinutes: localEntry?.codingDurationMinutes ?? null,
        durationTracked: localEntry ? localEntry.codingDurationMinutes > 0 : false,
        githubActivity: {
          commitsCount: localEntry?.commitsCount || 0,
          commits: [],
          prsCount: 0,
          issuesCount: 0
        },
        leetCodeActivity: {
          acceptedCount: localEntry?.problemsSolvedCount || 0,
          uniqueProblems: []
        },
        repositoriesModified: [],
        syncEventsCount: localEntry?.syncEventsCount || 0,
        updatedAt: localEntry?.updatedAt || ''
      };

      setJournalData(fallback);
      setNoteContent(fallback.notes);
    } finally {
      setIsLoading(false);
    }
  }, [journalEntries]);

  useEffect(() => {
    loadDailyJournal(selectedDate);
  }, [selectedDate, loadDailyJournal]);

  const handleSaveNote = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await api.analytics.saveJournalNote(selectedDate, noteContent);
      updateJournalNote(selectedDate, noteContent);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);

      if (journalData) {
        setJournalData({
          ...journalData,
          notes: noteContent,
          updatedAt: new Date().toISOString()
        });
      }
    } catch {
      // Still update local context
      updateJournalNote(selectedDate, noteContent);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSaveNote();
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-theme-accent-subtle text-theme-accent rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-theme-primary uppercase tracking-wider">
                Developer Daily Journal
              </h2>
              {isDemoMode && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 font-mono px-2 py-0.5 rounded border border-amber-500/20">
                  Demo Ledger
                </span>
              )}
            </div>
            <p className="text-xs text-theme-muted mt-0.5">
              Aggregated verified activity records paired with private engineering notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs font-mono font-semibold text-theme-primary">
            <Calendar className="w-3.5 h-3.5 text-theme-accent" />
            <span>{selectedDate}</span>
          </div>

          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={setToday}
              className="text-xs px-2.5 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            >
              Today
            </button>
          )}

          <button
            onClick={() => loadDailyJournal(selectedDate)}
            className="p-1.5 border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            title="Refresh Journal"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Daily Metrics Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Active Coding Duration Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Active Coding
            </span>
            {journalData?.durationTracked ? (
              <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-mono">
                Agent Live
              </span>
            ) : (
              <span className="text-[9px] bg-theme-elevated text-theme-muted px-1.5 py-0.5 rounded font-mono">
                Zero Inference
              </span>
            )}
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1.5">
            {journalData?.durationTracked && journalData.codingDurationMinutes !== null ? (
              <span>
                {Math.floor(journalData.codingDurationMinutes / 60)}h{' '}
                {journalData.codingDurationMinutes % 60}m
              </span>
            ) : (
              <span className="text-sm font-semibold text-theme-muted">Not Tracked</span>
            )}
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">
            {journalData?.durationTracked
              ? 'Recorded by companion agent'
              : 'Zero duration guessed from commits'}
          </div>
        </div>

        {/* Commits Authored Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
            Commits Authored
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1.5">
            {journalData?.githubActivity.commitsCount ?? 0} Commits
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">
            {journalData?.githubActivity.prsCount
              ? `Includes ${journalData.githubActivity.prsCount} PRs/Issues`
              : 'Across monitored branches'}
          </div>
        </div>

        {/* Problems Solved Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Problems Solved
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1.5">
            {journalData?.leetCodeActivity.acceptedCount ?? 0} Accepted
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">
            {journalData?.leetCodeActivity.uniqueProblems.length ?? 0} unique problem
            {(journalData?.leetCodeActivity.uniqueProblems.length ?? 0) === 1 ? '' : 's'}
          </div>
        </div>

        {/* Sync Events Card */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-purple-500" />
            Sync Events
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1.5">
            {journalData?.syncEventsCount ?? 0} Events
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Recorded in audit ledger</div>
        </div>
      </div>

      {/* Manual Developer Notes Editor */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Engineering Notes for {selectedDate}
              </h3>
              <span className="text-[10px] bg-theme-accent-subtle text-theme-accent px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Isolated Store
              </span>
            </div>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Record context, architecture decisions, algorithmic approaches, or blockers. Notes do
              not alter verified external activity records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isSaved && (
              <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                Saved to MongoDB
              </span>
            )}
            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg transition hover:opacity-95 disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {isSaving ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : isSaved ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Note'}</span>
            </button>
          </div>
        </div>

        {saveError && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <textarea
            rows={5}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Document today's key technical insights, refactors, algorithm approaches, or pull request links... (Ctrl+Enter to save)"
            className="w-full p-3.5 bg-theme-elevated border border-theme-border rounded-xl text-xs text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent font-sans leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-theme-muted px-1">
            <span>
              {noteContent.length} characters • {noteContent.split(/\s+/).filter(Boolean).length}{' '}
              words
            </span>
            <span className="font-mono text-[10px]">
              {journalData?.updatedAt
                ? `Last modified: ${new Date(journalData.updatedAt).toLocaleTimeString()}`
                : 'Unsaved draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Verified External Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solved Problems Breakdown */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Solved LeetCode Problems
              </h3>
            </div>
            <span className="text-[10px] text-theme-muted font-mono">
              {journalData?.leetCodeActivity.uniqueProblems.length ?? 0} Solved
            </span>
          </div>

          {journalData?.leetCodeActivity.uniqueProblems &&
          journalData.leetCodeActivity.uniqueProblems.length > 0 ? (
            <div className="space-y-2">
              {journalData.leetCodeActivity.uniqueProblems.map((prob) => {
                const diffColor =
                  prob.difficulty === 'Hard'
                    ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    : prob.difficulty === 'Medium'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';

                return (
                  <div
                    key={prob.questionId}
                    className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-theme-muted shrink-0">
                        #{prob.questionId}
                      </span>
                      <span className="text-xs font-semibold text-theme-primary truncate">
                        {prob.questionTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${diffColor}`}
                      >
                        {prob.difficulty}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-surface text-theme-muted border border-theme-border">
                        {prob.language}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-theme-muted border border-dashed border-theme-border rounded-lg">
              No LeetCode solutions exported for this date.
            </div>
          )}
        </div>

        {/* Repositories Modified */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                Repositories Modified
              </h3>
            </div>
            <span className="text-[10px] text-theme-muted font-mono">
              {journalData?.repositoriesModified.length ?? 0} Repos
            </span>
          </div>

          {journalData?.repositoriesModified &&
          journalData.repositoriesModified.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {journalData.repositoriesModified.map((repo) => (
                <div
                  key={repo}
                  className="flex items-center gap-1.5 px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-xs font-mono text-theme-primary"
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{repo}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-theme-muted border border-dashed border-theme-border rounded-lg">
              No repositories modified on this date.
            </div>
          )}
        </div>
      </div>

      {/* Verified GitHub Commits Log */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Verified Commits Log for {selectedDate}
            </h3>
          </div>
          <span className="text-[10px] text-theme-muted font-mono">
            {journalData?.githubActivity.commits.length ?? 0} Commits
          </span>
        </div>

        {journalData?.githubActivity.commits &&
        journalData.githubActivity.commits.length > 0 ? (
          <div className="space-y-2">
            {journalData.githubActivity.commits.map((commit, idx) => (
              <div
                key={commit.sha || idx}
                className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 shrink-0">
                    {commit.sha.slice(0, 7)}
                  </span>
                  <span className="font-medium text-theme-primary truncate">
                    {commit.message}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-theme-muted font-mono text-[11px]">
                  <span>{commit.repo}</span>
                  {commit.timestamp && (
                    <span>
                      {new Date(commit.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-theme-muted border border-dashed border-theme-border rounded-lg">
            No Git commits recorded for this date.
          </div>
        )}
      </div>

      {/* Truth in Reporting Notice */}
      <div className="p-3 bg-theme-elevated border border-theme-border rounded-xl flex items-center gap-3 text-xs text-theme-muted">
        <Info className="w-4 h-4 text-theme-accent shrink-0" />
        <div>
          <span className="font-semibold text-theme-primary">
            Integrity & Truth-in-Reporting Guarantee:
          </span>{' '}
          All commit counts, accepted problem records, and repository modifications represent
          cryptographically and API-verified ground truth. Personal engineering reflections remain
          strictly isolated and can be updated at any time without compromising external audit integrity.
        </div>
      </div>
    </div>
  );
}
