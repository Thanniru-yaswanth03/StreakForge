'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCw,
  Search,
  Filter,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { api } from '../lib/api';
import type { PatternItem } from '@streakforge/shared-types';

export function PatternExplorerView() {
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [masteryFilter, setMasteryFilter] = useState<string>('ALL');

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      const res = await api.patterns.getOverview();
      if (res.success && res.data) {
        setPatterns(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch patterns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const filteredPatterns = patterns.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.coreTechnique.toLowerCase().includes(search.toLowerCase());
    const matchesMastery =
      masteryFilter === 'ALL' || p.masteryLevel === masteryFilter;
    return matchesSearch && matchesMastery;
  });

  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'ADVANCED':
        return 'text-[#3fb950] bg-[#238636]/15 border-[#3fb950]/30';
      case 'INTERMEDIATE':
        return 'text-[#58a6ff] bg-[#388bfd]/15 border-[#58a6ff]/30';
      default:
        return 'text-[#8b949e] bg-[#21262d] border-[#30363d]';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Canonical Pattern Recognition Engine</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238636]/10 text-[#3fb950] border border-[#238636]/25 font-mono">
                16 Core Archetypes
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Analyze problems through algorithmic templates rather than rote memorization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPatterns}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-[#30363d] bg-[#161b22]/40">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pattern by name or technique..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#8b949e] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['ALL', 'ADVANCED', 'INTERMEDIATE', 'BEGINNER'].map((m) => (
            <button
              key={m}
              onClick={() => setMasteryFilter(m)}
              className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition whitespace-nowrap ${
                masteryFilter === m
                  ? 'bg-[#388bfd] text-white shadow-sm'
                  : 'text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Patterns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPatterns.map((pattern) => {
          const masteryBadgeClass = getMasteryColor(pattern.masteryLevel);
          return (
            <div
              key={pattern.name}
              className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 hover:border-[#58a6ff]/40 transition flex flex-col justify-between"
            >
              <div>
                {/* Header with Pattern Name & Mastery */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <h3 className="text-sm font-bold text-[#f0f6fc]">
                    {pattern.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border font-semibold flex-shrink-0 ${masteryBadgeClass}`}
                  >
                    {pattern.masteryLevel}
                  </span>
                </div>

                {/* Big-O Complexity Badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#0d1117] text-[#58a6ff] border border-[#30363d] font-mono">
                    Time: {pattern.typicalTimeComplexity}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#0d1117] text-[#bc8cff] border border-[#30363d] font-mono">
                    {pattern.solvedCount}/{pattern.problemCount} Solved
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#8b949e] leading-relaxed mb-4">
                  {pattern.description}
                </p>

                {/* Core Technique */}
                <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60 mb-4">
                  <div className="text-[11px] font-semibold text-[#c9d1d9] mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#f0883e]" />
                    Core Algorithmic Technique:
                  </div>
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    {pattern.coreTechnique}
                  </p>
                </div>
              </div>

              {/* Sample Problems */}
              <div>
                <div className="text-[11px] font-semibold text-[#8b949e] uppercase tracking-wider mb-2">
                  Canonical Practice Problems:
                </div>
                <div className="space-y-1.5">
                  {(pattern.exampleProblems || []).map((prob) => (
                    <a
                      key={prob.slug}
                      href={`https://leetcode.com/problems/${prob.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-md bg-[#0d1117] hover:bg-[#21262d] border border-[#30363d]/50 hover:border-[#58a6ff]/30 transition group text-xs"
                    >
                      <span className="text-[#c9d1d9] group-hover:text-[#58a6ff] truncate">
                        {prob.title}
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            prob.difficulty === 'Easy'
                              ? 'text-[#3fb950] bg-[#238636]/10'
                              : prob.difficulty === 'Medium'
                              ? 'text-[#f0883e] bg-[#f0883e]/10'
                              : 'text-[#f85149] bg-[#da3633]/10'
                          }`}
                        >
                          {prob.difficulty}
                        </span>
                        <ExternalLink className="w-3 h-3 text-[#8b949e] group-hover:text-[#58a6ff]" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
