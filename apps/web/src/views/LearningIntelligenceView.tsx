'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  Award,
  Flame,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  TrendingUp,
  Layers,
  ArrowRight,
  Sparkles,
  BarChart2,
  Check
} from 'lucide-react';
import { api } from '../lib/api';
import type { LearningIntelligenceSummary } from '@streakforge/shared-types';

export function LearningIntelligenceView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<LearningIntelligenceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      const res = await api.study.getIntelligence();
      setData(res);
    } catch (err) {
      console.error('Failed loading learning intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Card */}
      <div className="github-glossy-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#a371f7]" />
            <h2 className="text-xl font-extrabold text-[#f0f6fc] tracking-tight">
              Learning Intelligence &amp; Skill Radar
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#a371f7]/15 text-[#a371f7] border border-[#a371f7]/30 font-mono">
              StreakForge 2.0
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Holistic analytics synthesizing verified Git telemetry, authentic LeetCode solves, Spaced Repetition retention, and curriculum mastery.
          </p>
        </div>

        <button
          onClick={fetchIntelligence}
          disabled={loading}
          className="github-glossy-button-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 self-start md:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#58a6ff]' : 'text-[#8b949e]'}`} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-[#8b949e] space-y-2">
          <RotateCw className="w-8 h-8 animate-spin mx-auto text-[#58a6ff]" />
          <p className="text-xs font-mono">Synthesizing learning intelligence across curricula and submissions...</p>
        </div>
      ) : data ? (
        <>
          {/* 2. Top 4 Macro Intelligence Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Metric 1: Verified Streak */}
            <div className="github-glossy-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
                <span>Consistency Streak</span>
                <Flame className="w-4 h-4 text-[#3fb950] fill-[#3fb950]" />
              </div>
              <div className="mt-2.5">
                <div className="text-3xl font-extrabold text-[#3fb950] font-mono">
                  {data.authenticStreakDays} <span className="text-xs text-[#8b949e] font-normal">days</span>
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1 font-mono">
                  Longest: <strong className="text-[#f0f6fc]">{data.longestStreakDays} days</strong>
                </div>
              </div>
            </div>

            {/* Metric 2: Authentic Solved */}
            <div className="github-glossy-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
                <span>LeetCode Solved</span>
                <Award className="w-4 h-4 text-[#58a6ff]" />
              </div>
              <div className="mt-2.5">
                <div className="text-3xl font-extrabold text-[#58a6ff] font-mono">
                  {data.totalSolvedLeetCode}
                </div>
                <div className="text-[11px] text-[#3fb950] mt-1 font-mono">&check; Verified LeetCode Account</div>
              </div>
            </div>

            {/* Metric 3: SRS Retention Rate */}
            <div className="github-glossy-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
                <span>SRS Retention Rate</span>
                <Brain className="w-4 h-4 text-[#a371f7]" />
              </div>
              <div className="mt-2.5">
                <div className="text-3xl font-extrabold text-[#a371f7] font-mono">
                  {data.srsHealth.retentionRatePercent}%
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1 font-mono">
                  {data.srsHealth.masteredCount} Mastered • {data.srsHealth.dueTodayCount} Due Today
                </div>
              </div>
            </div>

            {/* Metric 4: Solutions Cataloged */}
            <div className="github-glossy-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-[#8b949e]">
                <span>Catalog Solutions</span>
                <FileText className="w-4 h-4 text-[#e3b341]" />
              </div>
              <div className="mt-2.5">
                <div className="text-3xl font-extrabold text-[#e3b341] font-mono">
                  {data.catalogStatus.totalSolutionsCataloged}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1 truncate font-mono">
                  {data.catalogStatus.repoFullName.split('/')[1] || 'Repo'} README
                </div>
              </div>
            </div>
          </div>

          {/* 3. Curriculum Completion Grid */}
          <div className="github-glossy-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#58a6ff]" />
                <span>Interview Curricula Progression</span>
              </h3>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('curriculum')}
                  className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open Curricula</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Blind 75 */}
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#f0f6fc]">Blind 75</span>
                  <span className="font-mono text-[#58a6ff] font-bold">
                    {data.curriculumProgress.blind75.percentage}%
                  </span>
                </div>
                <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2ea043] h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.curriculumProgress.blind75.percentage}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8b949e] flex justify-between font-mono">
                  <span>Solved: {data.curriculumProgress.blind75.solved}</span>
                  <span>Total: {data.curriculumProgress.blind75.total}</span>
                </div>
              </div>

              {/* NeetCode 150 */}
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#f0f6fc]">NeetCode 150</span>
                  <span className="font-mono text-[#58a6ff] font-bold">
                    {data.curriculumProgress.neetcode150.percentage}%
                  </span>
                </div>
                <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2ea043] h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.curriculumProgress.neetcode150.percentage}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8b949e] flex justify-between font-mono">
                  <span>Solved: {data.curriculumProgress.neetcode150.solved}</span>
                  <span>Total: {data.curriculumProgress.neetcode150.total}</span>
                </div>
              </div>

              {/* Top Interview 150 */}
              <div className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#f0f6fc]">Top Interview 150</span>
                  <span className="font-mono text-[#58a6ff] font-bold">
                    {data.curriculumProgress.topInterview150.percentage}%
                  </span>
                </div>
                <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2ea043] h-full rounded-full transition-all duration-500"
                    style={{ width: `${data.curriculumProgress.topInterview150.percentage}%` }}
                  />
                </div>
                <div className="text-[11px] text-[#8b949e] flex justify-between font-mono">
                  <span>Solved: {data.curriculumProgress.topInterview150.solved}</span>
                  <span>Total: {data.curriculumProgress.topInterview150.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Topic Strengths & Weaknesses Breakdown */}
          <div className="github-glossy-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#58a6ff]" />
              <span>Algorithmic Domain Strengths &amp; Preparation Status</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.topicStrengths.map((topic) => {
                const statusBadge =
                  topic.status === 'STRONG'
                    ? 'text-[#3fb950] bg-[#238636]/15 border-[#238636]/30'
                    : topic.status === 'GROWING'
                    ? 'text-[#d29922] bg-[#d29922]/15 border-[#d29922]/30'
                    : 'text-[#8b949e] bg-[#21262d] border-[#30363d]';

                return (
                  <div
                    key={topic.topic}
                    className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#f0f6fc] truncate">{topic.topic}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${statusBadge}`}>
                        {topic.status}
                      </span>
                    </div>

                    <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          topic.status === 'STRONG'
                            ? 'bg-[#2ea043]'
                            : topic.status === 'GROWING'
                            ? 'bg-[#d29922]'
                            : 'bg-[#58a6ff]'
                        }`}
                        style={{ width: `${Math.max(5, topic.accuracyPercent)}%` }}
                      />
                    </div>

                    <div className="text-[11px] text-[#8b949e] flex justify-between font-mono">
                      <span>{topic.solved} solved of {topic.total}</span>
                      <span>{topic.accuracyPercent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

