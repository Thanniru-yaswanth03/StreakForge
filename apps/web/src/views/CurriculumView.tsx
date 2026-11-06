'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  RotateCw,
  Search,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Award,
  Zap,
  Filter,
  Check,
  Brain,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import type { CurriculumTrackId, StudyProblemStatus, Difficulty } from '@streakforge/shared-types';

export function CurriculumView() {
  const [activeTrack, setActiveTrack] = useState<CurriculumTrackId>('blind75');
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | Difficulty>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  const fetchTrack = async (track: CurriculumTrackId) => {
    try {
      setLoading(true);
      const res = await api.study.getCurriculum(track);
      const data = (res as any)?.data ?? res;
      setCurriculumData(data);
    } catch (err) {
      console.error('Failed to load curriculum:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrack(activeTrack);
  }, [activeTrack]);

  const handleStatusChange = async (slug: string, newStatus: StudyProblemStatus) => {
    try {
      setSavingSlug(slug);
      const todayStr = new Date().toISOString().slice(0, 10);

      // Instant optimistic local state recalculation
      setCurriculumData((prev: any) => {
        if (!prev) return prev;
        let solved = 0;
        let mastered = 0;
        let needsRevision = 0;
        let attempted = 0;

        const newDiffStats: Record<string, { total: number; solved: number }> = {
          Easy: { total: 0, solved: 0 },
          Medium: { total: 0, solved: 0 },
          Hard: { total: 0, solved: 0 }
        };

        const updatedProblems = prev.problems.map((p: any) => {
          const isTarget = p.slug === slug;
          const currentStatus = isTarget ? newStatus : p.status;

          let nextReviewDate = p.nextReviewDate;
          if (isTarget) {
            if (newStatus === 'NEEDS_REVISION') {
              nextReviewDate = todayStr;
            } else if (newStatus === 'SOLVED') {
              const d = new Date();
              d.setDate(d.getDate() + 3);
              nextReviewDate = d.toISOString().slice(0, 10);
            } else if (newStatus === 'MASTERED') {
              const d = new Date();
              d.setDate(d.getDate() + 30);
              nextReviewDate = d.toISOString().slice(0, 10);
            }
          }

          const isSolved =
            currentStatus === 'SOLVED' ||
            currentStatus === 'MASTERED' ||
            currentStatus === 'NEEDS_REVISION';

          if (isSolved) {
            solved++;
            if (newDiffStats[p.difficulty]) newDiffStats[p.difficulty].solved++;
          }
          if (currentStatus === 'MASTERED') mastered++;
          if (currentStatus === 'NEEDS_REVISION') needsRevision++;
          if (currentStatus === 'ATTEMPTED') attempted++;

          if (newDiffStats[p.difficulty]) newDiffStats[p.difficulty].total++;

          if (isTarget) {
            return {
              ...p,
              status: newStatus,
              nextReviewDate,
              repetitionLevel:
                newStatus === 'MASTERED'
                  ? Math.max(p.repetitionLevel || 0, 5)
                  : p.repetitionLevel || 1
            };
          }
          return p;
        });

        const completionPercent = Math.round((solved / (updatedProblems.length || 1)) * 100);

        return {
          ...prev,
          problems: updatedProblems,
          solvedCount: solved,
          masteredCount: mastered,
          needsRevisionCount: needsRevision,
          attemptedCount: attempted,
          completionPercent,
          diffStats: newDiffStats
        };
      });

      // Persist to backend API
      await api.study.updateStatus(slug, newStatus);

      // Reconcile with authoritative server state
      const fresh = await api.study.getCurriculum(activeTrack);
      const data = (fresh as any)?.data ?? fresh;
      if (data) {
        setCurriculumData(data);
      }
    } catch (err) {
      console.error('Failed updating status:', err);
      fetchTrack(activeTrack);
    } finally {
      setSavingSlug(null);
    }
  };

  // Categories list
  const categories = useMemo(() => {
    if (!curriculumData?.problems) return ['All'];
    const cats = new Set<string>();
    curriculumData.problems.forEach((p: any) => cats.add(p.category));
    return ['All', ...Array.from(cats).sort()];
  }, [curriculumData]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    if (!curriculumData?.problems) return [];
    return curriculumData.problems.filter((p: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesId = String(p.id).includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesId && !matchesCat) return false;
      }
      if (selectedDifficulty !== 'All' && p.difficulty !== selectedDifficulty) return false;
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && p.status !== selectedStatus) return false;
      return true;
    });
  }, [curriculumData, searchQuery, selectedDifficulty, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="github-glossy-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#58a6ff] animate-pulse" />
            <h2 className="text-xl font-extrabold text-[#f0f6fc] tracking-tight">
              Interview Study Curricula
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#388bfd]/15 text-[#58a6ff] border border-[#388bfd]/30 font-mono">
              Spaced Repetition
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Master high-signal interview question sets. Authentic LeetCode solves are reconciled automatically.
          </p>
        </div>

        {/* Track Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-[#161b22] p-1 rounded-lg border border-[#30363d] self-start md:self-auto">
          <button
            onClick={() => setActiveTrack('blind75')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTrack === 'blind75'
                ? 'bg-[#238636] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
            }`}
          >
            Blind 75
          </button>
          <button
            onClick={() => setActiveTrack('neetcode150')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTrack === 'neetcode150'
                ? 'bg-[#238636] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
            }`}
          >
            NeetCode 150
          </button>
          <button
            onClick={() => setActiveTrack('topInterview150')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTrack === 'topInterview150'
                ? 'bg-[#238636] text-white shadow-sm'
                : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
            }`}
          >
            Top Interview 150
          </button>
        </div>
      </div>

      {/* 2. Track Summary Statistics */}
      {curriculumData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Overall Progress */}
          <div className="github-glossy-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
              <span>Track Completion</span>
              <Award className="w-4 h-4 text-[#e3b341]" />
            </div>
            <div className="mt-2.5">
              <div className="text-3xl font-extrabold text-[#f0f6fc] tabular-nums font-mono">
                {curriculumData.completionPercent}%
              </div>
              <div className="w-full bg-[#21262d] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#2ea043] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${curriculumData.completionPercent}%` }}
                />
              </div>
              <div className="text-[11px] text-[#8b949e] mt-1.5">
                {curriculumData.solvedCount} of {curriculumData.totalProblems} Solved
              </div>
            </div>
          </div>

          {/* Card 2: Difficulty Distribution */}
          <div className="github-glossy-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
              <span>Difficulty Solved</span>
              <Layers className="w-4 h-4 text-[#58a6ff]" />
            </div>
            <div className="mt-2.5 space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center text-[#3fb950]">
                <span>Easy:</span>
                <span className="font-bold">
                  {curriculumData.diffStats?.Easy?.solved || 0}/{curriculumData.diffStats?.Easy?.total || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#d29922]">
                <span>Medium:</span>
                <span className="font-bold">
                  {curriculumData.diffStats?.Medium?.solved || 0}/{curriculumData.diffStats?.Medium?.total || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#f85149]">
                <span>Hard:</span>
                <span className="font-bold">
                  {curriculumData.diffStats?.Hard?.solved || 0}/{curriculumData.diffStats?.Hard?.total || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Mastered & Retention */}
          <div className="github-glossy-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
              <span>Mastered (SRS)</span>
              <Brain className="w-4 h-4 text-[#a371f7]" />
            </div>
            <div className="mt-2.5">
              <div className="text-3xl font-extrabold text-[#a371f7] tabular-nums font-mono">
                {curriculumData.masteredCount}
              </div>
              <div className="text-[11px] text-[#8b949e] mt-1">
                Problems retained in long-term memory
              </div>
              <div className="text-[10px] text-[#3fb950] font-mono mt-0.5">
                &uarr; SuperMemo-2 Algorithm
              </div>
            </div>
          </div>

          {/* Card 4: Needs Revision */}
          <div className="github-glossy-card p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-semibold">
              <span>Needs Revision</span>
              <Clock className="w-4 h-4 text-[#f85149]" />
            </div>
            <div className="mt-2.5">
              <div className="text-3xl font-extrabold text-[#f85149] tabular-nums font-mono">
                {curriculumData.needsRevisionCount}
              </div>
              <div className="text-[11px] text-[#8b949e] mt-1">
                Scheduled for recall practice
              </div>
              <div className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                Keep daily reviews fresh
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter and Search Bar */}
      <div className="github-glossy-card p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8b949e]" />
          <input
            type="text"
            placeholder="Search problems by name, number, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Difficulty Dropdown */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as any)}
            className="px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] max-w-[150px] truncate"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-md text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="All">All Statuses</option>
            <option value="SOLVED">Solved</option>
            <option value="MASTERED">Mastered</option>
            <option value="NEEDS_REVISION">Needs Revision</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>
        </div>
      </div>

      {/* 4. Problems Table */}
      <div className="github-glossy-card overflow-hidden">
        <div className="p-3.5 bg-[#161b22]/90 border-b border-[#30363d] flex items-center justify-between text-xs font-semibold text-[#8b949e]">
          <span>
            Showing <strong className="text-[#f0f6fc]">{filteredProblems.length}</strong> problems
          </span>
          <span className="text-[11px] font-mono">
            Click status to mark as solved or request SRS review
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#58a6ff]" />
            <p className="text-xs">Loading curriculum and reconciling LeetCode submissions...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <p className="text-sm font-semibold text-[#f0f6fc]">No problems match the selected filters</p>
            <p className="text-xs">Try clearing the search query or difficulty filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#30363d]/60">
            {filteredProblems.map((problem: any) => {
              const diffBadgeClass =
                problem.difficulty === 'Easy'
                  ? 'text-[#3fb950] bg-[#238636]/15 border-[#238636]/30'
                  : problem.difficulty === 'Medium'
                  ? 'text-[#d29922] bg-[#d29922]/15 border-[#d29922]/30'
                  : 'text-[#f85149] bg-[#f85149]/15 border-[#f85149]/30';

              const statusBadgeClass =
                problem.status === 'MASTERED'
                  ? 'text-[#a371f7] bg-[#a371f7]/15 border-[#a371f7]/40'
                  : problem.status === 'SOLVED'
                  ? 'text-[#3fb950] bg-[#238636]/15 border-[#238636]/30'
                  : problem.status === 'NEEDS_REVISION'
                  ? 'text-[#f85149] bg-[#f85149]/15 border-[#f85149]/30'
                  : 'text-[#8b949e] bg-[#21262d] border-[#30363d]';

              return (
                <div
                  key={problem.slug}
                  className="p-3.5 hover:bg-[#161b22]/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: ID + Title + Tags */}
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-[#8b949e] w-10 text-right flex-shrink-0 pt-0.5">
                      #{problem.id}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={problem.leetcodeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-[#f0f6fc] hover:text-[#58a6ff] hover:underline transition flex items-center gap-1.5"
                        >
                          <span>{problem.title}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${diffBadgeClass}`}
                        >
                          {problem.difficulty}
                        </span>

                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e]">
                          {problem.category}
                        </span>
                      </div>

                      {/* SRS Metadata */}
                      {problem.status !== 'NOT_STARTED' && (
                        <div className="text-[11px] text-[#8b949e] mt-1 flex items-center gap-3 font-mono">
                          <span>
                            SRS Level: <strong className="text-[#f0f6fc]">{problem.repetitionLevel}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Next Review: <strong className="text-[#58a6ff]">{problem.nextReviewDate}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Selector */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <select
                      value={problem.status}
                      disabled={savingSlug === problem.slug}
                      onChange={(e) => handleStatusChange(problem.slug, e.target.value as any)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition cursor-pointer ${statusBadgeClass} disabled:opacity-50`}
                    >
                      <option value="NOT_STARTED">Not Started</option>
                      <option value="ATTEMPTED">Attempted</option>
                      <option value="SOLVED">Solved</option>
                      <option value="NEEDS_REVISION">Needs Revision</option>
                      <option value="MASTERED">Mastered</option>
                    </select>

                    <a
                      href={problem.leetcodeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition"
                      title="Open on LeetCode"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

