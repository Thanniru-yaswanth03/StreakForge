import React from 'react';
import type { AnalyticsOverview } from '@streakforge/shared-types';

interface DifficultyBreakdownProps {
  overview: AnalyticsOverview | null;
}

export function DifficultyBreakdown({ overview }: DifficultyBreakdownProps) {
  if (!overview) return null;

  const total = overview.totalLeetCodeSolved || 1; // Prevent div by 0
  const easy = overview.difficultyDistribution.Easy || 0;
  const medium = overview.difficultyDistribution.Medium || 0;
  const hard = overview.difficultyDistribution.Hard || 0;

  const easyPercent = Math.round((easy / total) * 100);
  const mediumPercent = Math.round((medium / total) * 100);
  const hardPercent = Math.round((hard / total) * 100);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold text-white tracking-tight">LeetCode Solved Breakdown</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {overview.totalLeetCodeSolved} total problems exported to GitHub
        </p>

        {/* Progress Bar Stack */}
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex mt-4">
          <div style={{ width: `${easyPercent}%` }} className="bg-emerald-500 transition-all" title={`Easy: ${easy}`} />
          <div style={{ width: `${mediumPercent}%` }} className="bg-amber-500 transition-all" title={`Medium: ${medium}`} />
          <div style={{ width: `${hardPercent}%` }} className="bg-rose-500 transition-all" title={`Hard: ${hard}`} />
        </div>

        {/* Details List */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Easy
            </div>
            <div className="text-xl font-bold text-white mt-1">{easy}</div>
            <div className="text-[10px] text-slate-500">{easyPercent}% of solved</div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Medium
            </div>
            <div className="text-xl font-bold text-white mt-1">{medium}</div>
            <div className="text-[10px] text-slate-500">{mediumPercent}% of solved</div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Hard
            </div>
            <div className="text-xl font-bold text-white mt-1">{hard}</div>
            <div className="text-[10px] text-slate-500">{hardPercent}% of solved</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-3 mt-4 text-xs text-slate-400 flex items-center justify-between">
        <span>Git Commits Monitored:</span>
        <span className="font-semibold text-slate-200">{overview.totalGitCommitsTracked} commits</span>
      </div>
    </div>
  );
}

