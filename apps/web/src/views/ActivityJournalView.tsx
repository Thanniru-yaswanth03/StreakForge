'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Save,
  Check,
  GitCommit,
  CheckCircle2,
  Laptop,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileCode
} from 'lucide-react';
import { useData } from '../context/DataContext';

export function ActivityJournalView() {
  const { journalEntries, updateJournalNote } = useData();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const currentEntry = journalEntries.find((j) => j.date === selectedDate) || {
    id: 'temp',
    date: selectedDate,
    codingDurationMinutes: 195,
    commitsCount: 4,
    problemsSolvedCount: 2,
    notes: '',
    syncEventsCount: 6,
    updatedAt: new Date().toISOString()
  };

  // Sync textarea with selected entry
  React.useEffect(() => {
    setNoteContent(currentEntry.notes || '');
  }, [selectedDate, currentEntry.notes]);

  const handleSaveNote = () => {
    updateJournalNote(selectedDate, noteContent);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-accent-subtle text-theme-accent rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-theme-primary uppercase tracking-wider">
              Developer Daily Journal
            </h2>
            <p className="text-xs text-theme-muted mt-0.5">
              Aggregated work record and manual engineering notes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            className="p-1.5 border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs font-mono font-semibold text-theme-primary">
            <Calendar className="w-3.5 h-3.5 text-theme-muted" />
            <span>{selectedDate}</span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            className="p-1.5 border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Metrics Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Active Coding
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1">
            {Math.floor(currentEntry.codingDurationMinutes / 60)}h {currentEntry.codingDurationMinutes % 60}m
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Tracked by local agent</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
            Commits Authored
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1">
            {currentEntry.commitsCount} Commits
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Across monitored branches</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Problems Solved
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1">
            {currentEntry.problemsSolvedCount} Accepted
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Exported to GitHub</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-purple-500" />
            Sync Events
          </div>
          <div className="text-xl font-bold text-theme-primary mt-1">
            {currentEntry.syncEventsCount} Events
          </div>
          <div className="text-[10px] text-theme-muted mt-0.5">Recorded in audit ledger</div>
        </div>
      </div>

      {/* Manual Developer Notes Editor */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Engineering Notes for {selectedDate}
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Record context, architecture decisions, or blockers alongside your automated commit logs
            </p>
          </div>

          <button
            onClick={handleSaveNote}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg transition hover:opacity-95 shadow-xs"
          >
            {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Saved!' : 'Save Note'}</span>
          </button>
        </div>

        <textarea
          rows={5}
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="Document today's key technical insights, refactors, algorithm approaches, or pull request links..."
          className="w-full p-3 bg-theme-elevated border border-theme-border rounded-xl text-xs text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-theme-accent font-sans leading-relaxed"
        />
      </div>

      {/* Timeline of Day's Concrete Actions */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-3">
          Chronological Activity Log for {selectedDate}
        </h3>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-theme-elevated rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <span className="font-semibold text-theme-primary">Accepted LeetCode: [146] LRU Cache</span>
              <span className="text-[10px] text-theme-muted font-mono">(TypeScript, 45ms, 58MB)</span>
            </div>
            <span className="text-theme-muted font-mono text-[11px]">14:15</span>
          </div>

          <div className="p-2.5 bg-theme-elevated rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-500/10 text-indigo-500">
                <GitCommit className="w-3 h-3" />
              </span>
              <span className="font-semibold text-theme-primary">Git Commit: feat(sync): add dual detection observer</span>
              <span className="text-[10px] text-theme-muted font-mono">(SHA: 8f7d9a1)</span>
            </div>
            <span className="text-theme-muted font-mono text-[11px]">12:30</span>
          </div>

          <div className="p-2.5 bg-theme-elevated rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500/10 text-amber-500">
                <Laptop className="w-3 h-3" />
              </span>
              <span className="font-semibold text-theme-primary">Desktop Agent Heartbeat: 3 modified files committed</span>
              <span className="text-[10px] text-theme-muted font-mono">(MacBook Pro)</span>
            </div>
            <span className="text-theme-muted font-mono text-[11px]">10:05</span>
          </div>
        </div>
      </div>
    </div>
  );
}

