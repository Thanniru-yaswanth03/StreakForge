'use client';

import React, { useState } from 'react';
import type { HeatmapDay } from '@streakforge/shared-types';

interface HeatmapCalendarProps {
  heatmapData: HeatmapDay[];
}

export function HeatmapCalendar({ heatmapData }: HeatmapCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Group into weeks (7 days each)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  for (const day of heatmapData) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-950 border border-emerald-800/40';
      case 2:
        return 'bg-emerald-700 border border-emerald-600/50';
      case 3:
        return 'bg-emerald-500 border border-emerald-400/50';
      case 4:
        return 'bg-emerald-400 border border-emerald-300 shadow-sm shadow-emerald-400/30';
      default:
        return 'bg-slate-800/60 border border-slate-700/40 hover:border-slate-600';
    }
  };

  const totalAnnualActivities = heatmapData.reduce((acc, cur) => acc + cur.count, 0);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">Verified Contribution History</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalAnnualActivities} genuine activities recorded across GitHub and LeetCode
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-slate-800/60 border border-slate-700/40" />
          <div className="w-3 h-3 rounded-sm bg-emerald-950 border border-emerald-800/40" />
          <div className="w-3 h-3 rounded-sm bg-emerald-700 border border-emerald-600/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-400/50" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400 border border-emerald-300" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-[760px]">
          {weeks.map((week, wIndex) => (
            <div key={wIndex} className="flex flex-col gap-1">
              {week.map((day, dIndex) => (
                <div
                  key={dIndex}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125 ${getCellColor(
                    day.level
                  )}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip Bar */}
      <div className="h-6 mt-2 flex items-center text-xs text-slate-400">
        {hoveredDay ? (
          <span>
            <strong className="text-slate-200">{hoveredDay.date}</strong>: {hoveredDay.count} total activities (
            {hoveredDay.leetCodeSubmissions} LeetCode, {hoveredDay.gitCommits} Git commits)
          </span>
        ) : (
          <span className="text-slate-600">Hover over any day to inspect genuine recorded activities</span>
        )}
      </div>
    </div>
  );
}

