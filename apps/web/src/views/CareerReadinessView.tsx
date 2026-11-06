'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  RotateCw,
  Layers,
  Brain,
  Flame,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../lib/api';
import type { CareerReadinessScore } from '@streakforge/shared-types';

export function CareerReadinessView() {
  const [readiness, setReadiness] = useState<CareerReadinessScore | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReadiness = async () => {
    try {
      setLoading(true);
      const res = await api.career.getReadiness();
      const data = (res as any)?.data ?? res;
      if (data && (data.overallScore !== undefined || data.components)) {
        setReadiness(data);
      }
    } catch (err) {
      console.error('Failed to load career readiness score:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#3fb950]';
    if (score >= 60) return 'text-[#58a6ff]';
    if (score >= 40) return 'text-[#f0883e]';
    return 'text-[#f85149]';
  };

  const getTierLabel = (tier?: string) => {
    switch (tier) {
      case 'READY_FOR_SCREEN':
        return 'Interview Ready (Tier-1 Tech)';
      case 'INTERVIEW_READY':
        return 'Competitive Momentum';
      case 'COMPETITIVE':
        return 'Solid Foundational Coverage';
      default:
        return 'Early Foundational';
    }
  };

  const comps = readiness?.components;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Career Readiness Dashboard</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/25 font-mono">
                Multivariate Model
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Holistic readiness index calibrated across DSA breadth, spaced retention, coding consistency, and mock interview performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReadiness}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recalculate
          </button>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 text-center md:text-left flex flex-col items-center md:items-start">
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Overall Readiness Index
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-6xl font-black font-mono ${getScoreColor(readiness?.overallScore ?? 50)}`}>
                {readiness?.overallScore ?? 0}%
              </span>
              <span className="text-xs text-[#8b949e] font-mono">/ 100</span>
            </div>
            <span className="text-sm font-semibold text-[#f0f6fc] mt-2">
              {getTierLabel(readiness?.tier)}
            </span>
            <p className="text-xs text-[#8b949e] mt-1 max-w-xs">
              Weighted composite evaluating real-time curriculum coverage and active retention.
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Component Quick Stats */}
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
              <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                <span>DSA Breadth</span>
                <span className="font-mono text-[10px] text-[#58a6ff]">35% max</span>
              </div>
              <div className="text-lg font-bold text-[#f0f6fc] font-mono">
                {comps?.dsaCurriculumCoverage?.score ?? 0} / 35
              </div>
              <div className="text-[10px] text-[#8b949e] truncate mt-1">
                {comps?.dsaCurriculumCoverage?.details}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
              <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                <span>SRS Retention</span>
                <span className="font-mono text-[10px] text-[#bc8cff]">20% max</span>
              </div>
              <div className="text-lg font-bold text-[#f0f6fc] font-mono">
                {comps?.spacedRepetitionRetention?.score ?? 0} / 20
              </div>
              <div className="text-[10px] text-[#8b949e] truncate mt-1">
                {comps?.spacedRepetitionRetention?.details}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
              <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                <span>Consistency</span>
                <span className="font-mono text-[10px] text-[#3fb950]">20% max</span>
              </div>
              <div className="text-lg font-bold text-[#f0f6fc] font-mono">
                {comps?.codingConsistency?.score ?? 0} / 20
              </div>
              <div className="text-[10px] text-[#8b949e] truncate mt-1">
                {comps?.codingConsistency?.details}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60">
              <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                <span>Mock Interviews</span>
                <span className="font-mono text-[10px] text-[#f0883e]">15% max</span>
              </div>
              <div className="text-lg font-bold text-[#f0f6fc] font-mono">
                {comps?.mockInterviewPerformance?.score ?? 0} / 15
              </div>
              <div className="text-[10px] text-[#8b949e] truncate mt-1">
                {comps?.mockInterviewPerformance?.details}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]/60 sm:col-span-2">
              <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1">
                <span>GitHub Portfolio</span>
                <span className="font-mono text-[10px] text-[#58a6ff]">10% max</span>
              </div>
              <div className="text-lg font-bold text-[#f0f6fc] font-mono">
                {comps?.githubPortfolioCompleteness?.score ?? 0} / 10
              </div>
              <div className="text-[10px] text-[#8b949e] truncate mt-1">
                {comps?.githubPortfolioCompleteness?.details}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations List */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
        <h2 className="text-base font-bold text-[#f0f6fc] mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#58a6ff]" />
          Priority Recommendations to Advance Readiness
        </h2>
        <div className="space-y-2.5">
          {(readiness?.recommendedNextActions || []).map((rec, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-[#30363d]/80 bg-[#0d1117] flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/25 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>
              <p className="text-xs text-[#c9d1d9] leading-relaxed">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Transparent Disclaimer Alert */}
      <div className="p-4 rounded-xl border border-[#30363d]/60 bg-[#0d1117] flex items-start gap-3 text-xs text-[#8b949e]">
        <Info className="w-4 h-4 text-[#58a6ff] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#c9d1d9]">Methodology &amp; Transparency Notice:</strong> {readiness?.disclaimer || 'The Career Readiness Index is mathematically derived from tracked solutions across canonical interview sets, spaced retention discipline, verified commit activity, and mock interview completion.'}
        </div>
      </div>
    </div>
  );
}
