'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Brain,
  Calendar,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { api } from '../lib/api';
import type { SrsRating, StudyProgressItem, RevisionQueueSummary } from '@streakforge/shared-types';

export function RevisionQueueView() {
  const [queue, setQueue] = useState<RevisionQueueSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'due' | 'overdue' | 'upcoming'>('due');
  const [activeReviewItem, setActiveReviewItem] = useState<StudyProgressItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingRating, setSubmittingRating] = useState<boolean>(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.study.getRevisionQueue();
      setQueue(res);
      // Auto-select first due or overdue item
      if (res.overdue.length > 0) {
        setActiveTab('overdue');
        setActiveReviewItem(res.overdue[0]);
      } else if (res.dueToday.length > 0) {
        setActiveTab('due');
        setActiveReviewItem(res.dueToday[0]);
      } else if (res.upcoming.length > 0) {
        setActiveTab('upcoming');
        setActiveReviewItem(res.upcoming[0]);
      }
    } catch (err) {
      console.error('Failed to load revision queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleRecordReview = async (rating: SrsRating) => {
    if (!activeReviewItem) return;
    try {
      setSubmittingRating(true);
      await api.study.recordReview(activeReviewItem.questionSlug, rating, reviewNotes);
      await fetchQueue();
      setReviewNotes('');
    } catch (err) {
      console.error('Failed recording review:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  const currentList =
    activeTab === 'overdue'
      ? queue?.overdue || []
      : activeTab === 'due'
      ? queue?.dueToday || []
      : queue?.upcoming || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Card */}
      <div className="github-glossy-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#a371f7]" />
            <h2 className="text-xl font-extrabold text-[#f0f6fc] tracking-tight">
              Spaced Repetition Revision Queue
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#a371f7]/15 text-[#a371f7] border border-[#a371f7]/30 font-mono">
              SM-2 Engine
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Revisit previously solved problems at mathematically optimal intervals to prevent memory decay.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="github-glossy-button-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 self-start md:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#58a6ff]' : 'text-[#8b949e]'}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* 2. Top Queue Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Due Today */}
        <div
          onClick={() => setActiveTab('due')}
          className={`github-glossy-card p-4 cursor-pointer transition-all ${
            activeTab === 'due' ? 'border-[#3fb950] ring-1 ring-[#3fb950]/50' : 'hover:border-[#30363d]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
            <span>Due Today</span>
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#3fb950] font-mono">
            {queue?.dueToday.length || 0}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">Ready for scheduled recall</div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => setActiveTab('overdue')}
          className={`github-glossy-card p-4 cursor-pointer transition-all ${
            activeTab === 'overdue' ? 'border-[#f85149] ring-1 ring-[#f85149]/50' : 'hover:border-[#30363d]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
            <span>Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#f85149]" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#f85149] font-mono">
            {queue?.overdue.length || 0}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">Requires immediate attention</div>
        </div>

        {/* Upcoming */}
        <div
          onClick={() => setActiveTab('upcoming')}
          className={`github-glossy-card p-4 cursor-pointer transition-all ${
            activeTab === 'upcoming' ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/50' : 'hover:border-[#30363d]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
            <span>Upcoming (7 Days)</span>
            <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#58a6ff] font-mono">
            {queue?.upcoming.length || 0}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">Scheduled next week</div>
        </div>

        {/* Mastered */}
        <div className="github-glossy-card p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
            <span>Total Mastered</span>
            <Award className="w-3.5 h-3.5 text-[#a371f7]" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-[#a371f7] font-mono">
            {queue?.totalMastered || 0}
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">Interval &gt; 30 days</div>
        </div>
      </div>

      {/* 3. Review Workspace / Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Queue Items List (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="github-glossy-card overflow-hidden">
            <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-semibold text-[#8b949e]">
              <div className="flex items-center gap-1.5">
                <span className="capitalize">{activeTab}</span>
                <span>Queue ({currentList.length})</span>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-[#8b949e]">Loading items...</div>
            ) : currentList.length === 0 ? (
              <div className="p-8 text-center text-[#8b949e] space-y-1">
                <CheckCircle2 className="w-6 h-6 text-[#3fb950] mx-auto" />
                <p className="text-xs font-bold text-[#f0f6fc]">Queue Clear!</p>
                <p className="text-[11px]">No items due in this queue. Great job maintaining your retention!</p>
              </div>
            ) : (
              <div className="divide-y divide-[#30363d]/60 max-h-[500px] overflow-y-auto">
                {currentList.map((item) => {
                  const isSelected = activeReviewItem?.questionSlug === item.questionSlug;
                  return (
                    <div
                      key={item.questionSlug}
                      onClick={() => setActiveReviewItem(item)}
                      className={`p-3 cursor-pointer transition text-xs flex items-center justify-between gap-2 ${
                        isSelected ? 'bg-[#238636]/15 border-l-2 border-[#3fb950]' : 'hover:bg-[#161b22]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#f0f6fc] truncate">{item.title}</div>
                        <div className="text-[11px] text-[#8b949e] flex items-center gap-2 mt-0.5 font-mono">
                          <span
                            className={
                              item.difficulty === 'Easy'
                                ? 'text-[#3fb950]'
                                : item.difficulty === 'Medium'
                                ? 'text-[#d29922]'
                                : 'text-[#f85149]'
                            }
                          >
                            {item.difficulty}
                          </span>
                          <span>•</span>
                          <span>Lvl {item.repetitionLevel}</span>
                          <span>•</span>
                          <span>{item.nextReviewDate}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8b949e] flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Flashcard & Rating Action Card (7 cols) */}
        <div className="lg:col-span-7">
          {activeReviewItem ? (
            <div className="github-glossy-card p-5 space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[#30363d] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#8b949e]">
                      #{activeReviewItem.problemId}
                    </span>
                    <h3 className="text-lg font-bold text-[#f0f6fc]">
                      {activeReviewItem.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-[#8b949e]">
                    <span className="px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] font-mono text-[10px]">
                      {activeReviewItem.category}
                    </span>
                    <span>•</span>
                    <span className="font-mono">Current Interval: {activeReviewItem.intervalDays}d</span>
                    <span>•</span>
                    <span className="font-mono">Ease Factor: {activeReviewItem.easeFactor.toFixed(2)}</span>
                  </div>
                </div>

                <a
                  href={`https://leetcode.com/problems/${activeReviewItem.questionSlug}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="github-glossy-button-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <span>Solve on LeetCode</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Recall Prompt */}
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2">
                <div className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider font-mono">
                  Recall Prompt
                </div>
                <p className="text-xs text-[#c9d1d9] leading-relaxed">
                  Before clicking LeetCode or looking at solutions: What is the optimal time/space complexity? What core data structure or pattern (e.g., Two Pointers, Monotonic Stack, Sliding Window, DP) unlocks this problem?
                </p>
              </div>

              {/* Personal Notes / Approach Log */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#8b949e]">
                  Your Personal Study Notes / Key Takeaways:
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record your edge cases, pitfalls, or algorithmic approach..."
                  rows={3}
                  className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition font-mono"
                />
              </div>

              {/* SuperMemo-2 Rating Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#30363d]">
                <div className="text-xs font-semibold text-[#8b949e]">
                  Grade Your Recall (SuperMemo-2 Spaced Repetition):
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Again (Reset) */}
                  <button
                    onClick={() => handleRecordReview('AGAIN')}
                    disabled={submittingRating}
                    className="p-2.5 bg-[#f85149]/15 hover:bg-[#f85149]/25 border border-[#f85149]/40 rounded-lg text-left transition disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-[#f85149]">Again</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Reset to 1 day</div>
                  </button>

                  {/* Hard (Slow) */}
                  <button
                    onClick={() => handleRecordReview('HARD')}
                    disabled={submittingRating}
                    className="p-2.5 bg-[#d29922]/15 hover:bg-[#d29922]/25 border border-[#d29922]/40 rounded-lg text-left transition disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-[#d29922]">Hard</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">1.2x Interval</div>
                  </button>

                  {/* Good (Normal) */}
                  <button
                    onClick={() => handleRecordReview('GOOD')}
                    disabled={submittingRating}
                    className="p-2.5 bg-[#238636]/15 hover:bg-[#238636]/25 border border-[#238636]/40 rounded-lg text-left transition disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-[#3fb950]">Good</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Standard Progress</div>
                  </button>

                  {/* Easy (Fast) */}
                  <button
                    onClick={() => handleRecordReview('EASY')}
                    disabled={submittingRating}
                    className="p-2.5 bg-[#388bfd]/15 hover:bg-[#388bfd]/25 border border-[#388bfd]/40 rounded-lg text-left transition disabled:opacity-50"
                  >
                    <div className="text-xs font-bold text-[#58a6ff]">Easy</div>
                    <div className="text-[10px] text-[#8b949e] mt-0.5">Bonus Factor</div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="github-glossy-card p-12 text-center text-[#8b949e] space-y-2">
              <Brain className="w-8 h-8 text-[#58a6ff] mx-auto opacity-70" />
              <p className="text-sm font-bold text-[#f0f6fc]">Select a Problem to Review</p>
              <p className="text-xs max-w-sm mx-auto">
                Select any item from the left queue to test your memory recall and advance its Spaced Repetition level.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

