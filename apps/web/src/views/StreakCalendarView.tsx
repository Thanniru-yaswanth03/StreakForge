'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  GitCommit,
  Laptop,
  FolderGit2,
  Clock,
  ExternalLink,
  RotateCw,
  Globe,
  Archive,
  GitPullRequest,
  AlertCircle
} from 'lucide-react';
import type { HeatmapDay, ActivityRecord } from '@streakforge/shared-types';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';

export function StreakCalendarView() {
  const { heatmap, overview, user, refreshData } = useData();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'GITHUB' | 'AGENT' | 'LEETCODE' | 'MAINTENANCE'>('ALL');
  const [selectedDate, setSelectedDate] = useState<HeatmapDay | null>(null);
  const [dayRecords, setDayRecords] = useState<ActivityRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  // Month labels mapping
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  // Load granular activity records when a date is selected
  useEffect(() => {
    if (!selectedDate?.date) return;
    setIsLoadingRecords(true);
    api.analytics
      .getDayDetails(selectedDate.date)
      .then((records) => setDayRecords(records))
      .catch(() => setDayRecords([]))
      .finally(() => setIsLoadingRecords(false));
  }, [selectedDate]);

  // Recalculate streaks trigger
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const res = await api.analytics.recalculate(user?.timezone);
      alert(res.message);
      await refreshData();
    } catch (err: any) {
      alert(`Recalculation failed: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Filter calculations
  const filteredHeatmap = heatmap.map((d) => {
    let effectiveCount = d.count;
    if (activeFilter === 'GITHUB') effectiveCount = d.verifiedGitHub?.commits ?? d.gitCommits;
    else if (activeFilter === 'LEETCODE') effectiveCount = d.leetCode?.submissions ?? d.leetCodeSubmissions;
    else if (activeFilter === 'AGENT') effectiveCount = d.localDev?.sessions ?? Math.floor(d.gitCommits * 0.7);
    else if (activeFilter === 'MAINTENANCE') effectiveCount = d.maintenance?.backups ?? 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (effectiveCount >= 5) level = 4;
    else if (effectiveCount >= 3) level = 3;
    else if (effectiveCount >= 2) level = 2;
    else if (effectiveCount >= 1) level = 1;

    return {
      ...d,
      count: effectiveCount,
      level
    };
  });

  // Split into 53 weeks
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  for (const day of filteredHeatmap) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-[#0e4429] border border-[#0e4429] text-emerald-200';
      case 2:
        return 'bg-[#006d32] border border-[#006d32] text-white';
      case 3:
        return 'bg-[#26a641] border border-[#26a641] text-slate-950';
      case 4:
        return 'bg-[#39d353] border border-[#39d353] text-slate-950 shadow-xs shadow-emerald-400/20';
      default:
        return 'bg-[#161b22] border border-[#21262d]/60 hover:border-slate-500';
    }
  };

  const totalFilteredCount = filteredHeatmap.reduce((acc, cur) => acc + cur.count, 0);

  return (
    <div className="space-y-6">
      {/* Top Controls & Category Filters */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-theme-primary uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-theme-accent" />
              Verified Contribution Calendar
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-theme-accent-subtle text-theme-accent">
              {totalFilteredCount} events in {selectedYear}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-theme-muted mt-1">
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Globe className="w-3 h-3 text-theme-accent" />
              Timezone: <strong className="text-theme-secondary">{user?.timezone || 'UTC'}</strong>
            </span>
            <span>•</span>
            <span>Differentiating official GitHub contributions, local desktop agent sessions, and LeetCode activity</span>
          </div>
        </div>

        {/* Action Controls & Year Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-medium text-theme-primary transition disabled:opacity-50"
            title="Recalculate streak history and daily snapshots"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>Recalculate Streaks</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1.5 border border-theme-border hover:bg-theme-elevated rounded-lg text-theme-muted hover:text-theme-primary transition"
              title="Previous Year"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-theme-primary px-2">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear((y) => Math.min(2026, y + 1))}
              disabled={selectedYear >= 2026}
              className="p-1.5 border border-theme-border hover:bg-theme-elevated rounded-lg text-theme-muted hover:text-theme-primary transition disabled:opacity-40"
              title="Next Year"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'All Activities', icon: Filter },
          { id: 'GITHUB', label: 'Verified GitHub Contributions', icon: GitCommit },
          { id: 'AGENT', label: 'Local Coding Sessions', icon: Laptop },
          { id: 'LEETCODE', label: 'LeetCode Submissions', icon: CheckCircle2 },
          { id: 'MAINTENANCE', label: 'Repository Maintenance', icon: FolderGit2 }
        ].map((f) => {
          const Icon = f.icon;
          const isSelected = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isSelected
                ? 'bg-theme-accent text-slate-950 font-semibold shadow-xs'
                : 'bg-theme-surface border border-theme-border text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar 365-Day Matrix Container */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 overflow-hidden">
        {/* Month labels header */}
        <div className="flex justify-between text-[11px] font-semibold text-theme-muted pb-2 pl-7 max-w-[840px]">
          {monthLabels.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        {/* Heatmap Grid with Weekday Labels */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-[800px]">
            {/* Weekday indicators */}
            <div className="flex flex-col justify-between text-[10px] text-theme-muted font-mono pr-1 select-none">
              {dayLabels.map((d, i) => (
                <span key={i} className="h-3 leading-3">
                  {d}
                </span>
              ))}
            </div>

            {/* Weeks */}
            <div className="flex gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((day, dIdx) => {
                    const isSelected = selectedDate?.date === day.date;
                    return (
                      <button
                        key={dIdx}
                        onClick={() => setSelectedDate(day)}
                        title={`${day.date}: ${day.count} activities`}
                        className={`w-3 h-3 rounded-xs transition-all ${getCellColor(
                          day.level
                        )} ${isSelected ? 'ring-2 ring-emerald-500 scale-125 z-10' : 'hover:scale-125'}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Intensity Legend & Disclaimer */}
        <div className="mt-4 pt-3 border-t border-theme-border flex flex-col sm:flex-row items-center justify-between text-xs text-theme-muted gap-2">
          <div className="flex items-center gap-2 text-[11px]">
            <span>Activity Intensity:</span>
            <span>Less</span>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#161b22] border border-[#21262d]/60" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#0e4429]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#006d32]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#26a641]" />
              <div className="w-2.5 h-2.5 rounded-xs bg-[#39d353]" />
            </div>
            <span>More</span>
          </div>

          <span className="text-[11px] text-theme-muted">
            Click any square to inspect verified underlying activity records for that date.
          </span>
        </div>
      </div>

      {/* Daily Detail Panel: Granular Activity Records */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-theme-primary">
              Daily Activity Breakdown: {selectedDate?.date || 'Select a Date Above'}
            </h3>
            <p className="text-xs text-theme-muted mt-0.5">
              Granular audit log of genuine coding events verified in {user?.timezone || 'UTC'} calendar day
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-theme-accent-subtle text-theme-accent">
            {selectedDate?.count || 0} Total Actions
          </span>
        </div>

        {/* Summary Metric Badges */}
        {selectedDate && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-theme-elevated border border-theme-border rounded-lg">
              <div className="text-[11px] text-theme-muted font-semibold uppercase">GitHub</div>
              <div className="text-lg font-bold text-indigo-400 mt-0.5">
                {selectedDate.verifiedGitHub?.commits ?? selectedDate.gitCommits} Commits
              </div>
              <div className="text-[11px] text-theme-muted">
                {selectedDate.verifiedGitHub?.prs || 0} PRs • {selectedDate.verifiedGitHub?.issues || 0} Issues
              </div>
            </div>

            <div className="p-3 bg-theme-elevated border border-theme-border rounded-lg">
              <div className="text-[11px] text-theme-muted font-semibold uppercase">LeetCode</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">
                {selectedDate.leetCode?.accepted ?? selectedDate.leetCodeSubmissions} Solved
              </div>
              <div className="text-[11px] text-theme-muted">
                {selectedDate.leetCode?.uniqueProblems || 0} Unique Problems
              </div>
            </div>

            <div className="p-3 bg-theme-elevated border border-theme-border rounded-lg">
              <div className="text-[11px] text-theme-muted font-semibold uppercase">Local Dev</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">
                {selectedDate.localDev?.sessions || 0} Sessions
              </div>
              <div className="text-[11px] text-theme-muted">
                {selectedDate.localDev?.filesChanged || 0} Files Modified
              </div>
            </div>

            <div className="p-3 bg-theme-elevated border border-theme-border rounded-lg">
              <div className="text-[11px] text-theme-muted font-semibold uppercase">Maintenance</div>
              <div className="text-lg font-bold text-purple-400 mt-0.5">
                {selectedDate.maintenance?.backups || 0} Backups
              </div>
              <div className="text-[11px] text-theme-muted">Excluded from streak</div>
            </div>
          </div>
        )}

        {/* Underlying Activity Records List */}
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            Verified Event Records:
          </div>

          {isLoadingRecords ? (
            <div className="text-center py-6 text-xs text-theme-muted">Loading activity events...</div>
          ) : dayRecords.length === 0 ? (
            <div className="text-center py-6 text-xs text-theme-muted bg-theme-elevated/40 rounded-xl border border-dashed border-theme-border">
              {selectedDate
                ? `No granular records stored for ${selectedDate.date}. Click "Recalculate Streaks" to synchronize.`
                : 'Click any square on the 365-day calendar to inspect underlying records.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {dayRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {rec.category === 'GITHUB' && <GitCommit className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                    {rec.category === 'LEETCODE' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    {rec.category === 'LOCAL_DEV' && <Laptop className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                    {rec.category === 'MAINTENANCE' && <Archive className="w-4 h-4 text-purple-400 flex-shrink-0" />}

                    <div className="truncate">
                      <div className="font-semibold text-theme-primary truncate">
                        {rec.reference}
                      </div>
                      <div className="text-[11px] text-theme-muted font-sans">
                        {rec.eventType} • Source: {rec.source}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {rec.verificationStatus}
                    </span>
                    <span className="text-[11px] text-theme-muted">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
