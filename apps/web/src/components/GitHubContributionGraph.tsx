'use client';

import React, { useState, useMemo } from 'react';
import type { HeatmapDay } from '@streakforge/shared-types';
import { HelpCircle, Info, ChevronDown, Check } from 'lucide-react';

interface GitHubContributionGraphProps {
  heatmapData: HeatmapDay[];
  filter?: 'all' | 'github' | 'leetcode';
  onFilterChange?: (filter: 'all' | 'github' | 'leetcode') => void;
  title?: string;
  showFilterControls?: boolean;
}

interface WeekColumn {
  days: (HeatmapDay | null)[];
  monthLabel?: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export function GitHubContributionGraph({
  heatmapData,
  filter: controlledFilter,
  onFilterChange,
  showFilterControls = true
}: GitHubContributionGraphProps) {
  const [internalFilter, setInternalFilter] = useState<'all' | 'github' | 'leetcode'>('all');
  const [hoveredDay, setHoveredDay] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);
  const [showLearnModal, setShowLearnModal] = useState<boolean>(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState<boolean>(false);

  const activeFilter = controlledFilter !== undefined ? controlledFilter : internalFilter;

  const handleFilterSelect = (newFilter: 'all' | 'github' | 'leetcode') => {
    if (onFilterChange) {
      onFilterChange(newFilter);
    } else {
      setInternalFilter(newFilter);
    }
    setShowSettingsDropdown(false);
  };

  // Group days into columns of 7 (Sunday to Saturday), computing month labels
  const { weeks, totalContributions } = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return { weeks: [], totalContributions: 0 };
    }

    // Sort ascending by date
    const sorted = [...heatmapData].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate total contributions for the current active filter
    const total = sorted.reduce((acc, cur) => {
      const val =
        activeFilter === 'github'
          ? cur.gitCommits || 0
          : activeFilter === 'leetcode'
          ? (cur.leetCode?.submissions ?? cur.leetCode?.accepted ?? cur.leetCodeSubmissions ?? 0)
          : cur.count;
      return acc + val;
    }, 0);

    // Take the last ~365-371 days
    const slice = sorted.slice(-371);
    if (slice.length === 0) return { weeks: [], totalContributions: total };

    // Find the day of week of the first entry
    const firstDateParts = slice[0].date.split('-').map(Number);
    const firstDate = new Date(Date.UTC(firstDateParts[0], firstDateParts[1] - 1, firstDateParts[2]));
    const firstDayOfWeek = firstDate.getUTCDay(); // 0 = Sun, 1 = Mon ...

    const alignedDays: (HeatmapDay | null)[] = [];
    // Pad initial days of the first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      alignedDays.push(null);
    }
    for (const d of slice) {
      alignedDays.push(d);
    }

    // Chunk into 7-day columns
    const columns: WeekColumn[] = [];
    let lastMonthIdx = -1;
    let weeksSinceLastMonth = 99;

    for (let i = 0; i < alignedDays.length; i += 7) {
      const weekDays = alignedDays.slice(i, i + 7);
      while (weekDays.length < 7) {
        weekDays.push(null);
      }

      // Check if this week begins a new month
      let monthLabel: string | undefined = undefined;
      for (const d of weekDays) {
        if (d) {
          const parts = d.date.split('-').map(Number);
          const monthIdx = parts[1] - 1;
          const dayOfMonth = parts[2];

          // If it's early in the month and sufficiently spaced from last label
          if (monthIdx !== lastMonthIdx && dayOfMonth <= 7 && weeksSinceLastMonth >= 3) {
            monthLabel = MONTH_NAMES[monthIdx];
            lastMonthIdx = monthIdx;
            weeksSinceLastMonth = 0;
            break;
          }
        }
      }
      weeksSinceLastMonth++;

      columns.push({
        days: weekDays,
        monthLabel
      });
    }

    return { weeks: columns, totalContributions: total };
  }, [heatmapData, activeFilter]);

  // Color mapper based on GitHub reference screenshot
  const getCellColor = (day: HeatmapDay | null) => {
    if (!day) return 'bg-transparent';

    const count =
      activeFilter === 'github'
        ? day.gitCommits || 0
        : activeFilter === 'leetcode'
        ? (day.leetCode?.submissions ?? day.leetCode?.accepted ?? day.leetCodeSubmissions ?? 0)
        : day.count;

    if (count <= 0) {
      return 'bg-[#161b22] border border-[#21262d]/70 hover:border-slate-500';
    }

    // Classic authentic GitHub greens across all filters
    if (count >= 8) return 'bg-[#39d353] border border-[#39d353]';
    if (count >= 5) return 'bg-[#26a641] border border-[#26a641]';
    if (count >= 3) return 'bg-[#006d32] border border-[#006d32]';
    return 'bg-[#0e4429] border border-[#0e4429]';
  };

  const formatTooltipDate = (dateStr: string) => {
    const parts = dateStr.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  return (
    <div className="w-full select-none">
      {/* 1. Header: Total Count & Settings Filter */}
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-sm sm:text-base font-semibold text-theme-primary tracking-tight">
          {totalContributions} {totalContributions === 1 ? 'contribution' : 'contributions'} in the last year
        </h3>

        {showFilterControls && (
          <div className="relative">
            <button
              onClick={() => setShowSettingsDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-md text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <span>
                {activeFilter === 'all'
                  ? 'Contribution settings'
                  : activeFilter === 'github'
                  ? 'GitHub Only'
                  : 'LeetCode Only'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showSettingsDropdown && (
              <div className="absolute right-0 mt-1 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl py-1 z-30 text-xs text-slate-200">
                <button
                  onClick={() => handleFilterSelect('all')}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#21262d] transition"
                >
                  <span>Combined Activity</span>
                  {activeFilter === 'all' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => handleFilterSelect('github')}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#21262d] transition"
                >
                  <span>GitHub Commits Only</span>
                  {activeFilter === 'github' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => handleFilterSelect('leetcode')}
                  className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[#21262d] transition"
                >
                  <span>LeetCode Accepted Only</span>
                  {activeFilter === 'leetcode' && <Check className="w-3.5 h-3.5 text-[#3fb950]" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Box: GitHub Dark Surface Container */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 sm:p-5 relative shadow-sm">
        {/* Scrollable Container */}
        <div className="overflow-x-auto pb-1">
          <div className="inline-block min-w-[740px]">
            {/* Month Labels Header */}
            <div className="flex text-[10px] text-[#7d8590] pl-7 pb-1.5 font-sans h-4 select-none">
              {weeks.map((w, idx) => (
                <div key={idx} className="w-[14px] text-left shrink-0">
                  {w.monthLabel && <span>{w.monthLabel}</span>}
                </div>
              ))}
            </div>

            {/* Matrix with Day of Week Labels */}
            <div className="flex gap-1.5">
              {/* Day Labels Column (Mon, Wed, Fri) */}
              <div className="flex flex-col justify-between text-[10px] text-[#7d8590] w-6 shrink-0 py-[1px] select-none font-sans">
                {DAY_LABELS.map((label, idx) => (
                  <span key={idx} className="h-[10px] leading-[10px]">
                    {label}
                  </span>
                ))}
              </div>

              {/* Weeks (7-day vertical columns) */}
              <div className="flex gap-[3px]">
                {weeks.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-[3px]">
                    {col.days.map((day, rowIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={rowIdx}
                            className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] bg-transparent rounded-[2px]"
                          />
                        );
                      }

                      return (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredDay({
                              day,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] rounded-[2px] transition-transform duration-100 hover:scale-125 ${getCellColor(
                            day
                          )}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer: Learn How We Count & Legend */}
        <div className="mt-4 pt-3 border-t border-[#21262d] flex items-center justify-between text-[11px] text-[#7d8590]">
          <button
            onClick={() => setShowLearnModal(true)}
            className="hover:text-[#58a6ff] hover:underline flex items-center gap-1 transition cursor-pointer"
          >
            <span>Learn how we count contributions</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span>Less</span>
            <span className="w-[10px] h-[10px] rounded-[2px] bg-[#161b22] border border-[#21262d]" />
            <span className="w-[10px] h-[10px] rounded-[2px] bg-[#0e4429]" />
            <span className="w-[10px] h-[10px] rounded-[2px] bg-[#006d32]" />
            <span className="w-[10px] h-[10px] rounded-[2px] bg-[#26a641]" />
            <span className="w-[10px] h-[10px] rounded-[2px] bg-[#39d353]" />
            <span>More</span>
          </div>
        </div>

        {/* 4. Floating GitHub Tooltip */}
        {hoveredDay && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#24292f] border border-[#30363d] text-white text-xs py-1 px-2.5 rounded-md shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${hoveredDay.x}px`,
              top: `${hoveredDay.y - 8}px`
            }}
          >
            <div className="font-semibold text-slate-100">
              {(() => {
                const count =
                  activeFilter === 'github'
                    ? hoveredDay.day.gitCommits || 0
                    : activeFilter === 'leetcode'
                    ? (hoveredDay.day.leetCode?.submissions ?? hoveredDay.day.leetCode?.accepted ?? hoveredDay.day.leetCodeSubmissions ?? 0)
                    : hoveredDay.day.count;
                if (count === 0) {
                  return `No contributions on ${formatTooltipDate(hoveredDay.day.date)}`;
                }
                return `${count} ${count === 1 ? 'contribution' : 'contributions'} on ${formatTooltipDate(
                  hoveredDay.day.date
                )}`;
              })()}
            </div>
            {hoveredDay.day.count > 0 && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {hoveredDay.day.gitCommits || 0} git commits • {hoveredDay.day.leetCodeSubmissions || 0} LeetCode accepted
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. "Learn how we count contributions" Modal */}
      {showLearnModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setShowLearnModal(false)}
        >
          <div
            className="bg-[#161b22] border border-[#30363d] rounded-2xl max-w-md w-full p-5 text-slate-100 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Info className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">How StreakForge Counts Contributions</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                StreakForge enforces a strict <strong className="text-white">Zero-Fabrication</strong> policy. Every block in this graph represents verified, genuine development activity:
              </p>

              <div className="p-3 bg-[#0d1117] border border-[#21262d] rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <div>
                    <strong className="text-white">GitHub Commits:</strong> Authentic commits pushed to default branches (main/master) of connected repositories with verified author emails.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <div>
                    <strong className="text-white">LeetCode Submissions:</strong> Successfully accepted algorithmic solutions captured by the StreakForge Chrome Extension and exported to GitHub.
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                No simulated commits, synthetic streaks, or artificial padding are ever recorded.
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowLearnModal(false)}
                className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

