'use client';

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  GitCommit
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useData } from '../context/DataContext';

export function AnalyticsView() {
  const { overview, heatmap } = useData();

  // Active hours of day distribution
  const hourlyData = [
    { hour: '08:00', actions: 2 },
    { hour: '10:00', actions: 8 },
    { hour: '12:00', actions: 14 },
    { hour: '14:00', actions: 19 },
    { hour: '16:00', actions: 12 },
    { hour: '18:00', actions: 16 },
    { hour: '20:00', actions: 22 },
    { hour: '22:00', actions: 9 }
  ];

  // Day of week distribution
  const dayOfWeekData = [
    { day: 'Monday', count: 28 },
    { day: 'Tuesday', count: 34 },
    { day: 'Wednesday', count: 31 },
    { day: 'Thursday', count: 38 },
    { day: 'Friday', count: 26 },
    { day: 'Saturday', count: 18 },
    { day: 'Sunday', count: 21 }
  ];

  const diffData = [
    { name: 'Easy', count: overview?.difficultyDistribution?.Easy || 28, color: '#10b981' },
    { name: 'Medium', count: overview?.difficultyDistribution?.Medium || 23, color: '#f59e0b' },
    { name: 'Hard', count: overview?.difficultyDistribution?.Hard || 7, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Velocity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Consistency Rating</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-500 mt-2">
            {overview?.weeklyConsistencyPercent || 86}%
          </div>
          <div className="text-xs text-theme-muted mt-1">Based on 7-day trailing window</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Daily Average</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            3.4 Actions
          </div>
          <div className="text-xs text-theme-muted mt-1">Commits + LeetCode solves/day</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Peak Coding Window</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            20:00 - 22:00
          </div>
          <div className="text-xs text-theme-muted mt-1">Evening focus period</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-medium uppercase tracking-wider">
            <span>Annual Target Progress</span>
            <Target className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-theme-primary mt-2">
            {overview?.totalLeetCodeSolved || 58} / 100
          </div>
          <div className="text-xs text-emerald-500 mt-1">58% of annual problem goal</div>
        </div>
      </div>

      {/* Hourly Heat & Day Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Distribution */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Active Hours Distribution
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Coding activity grouped by local time of day
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="currentColor" className="text-theme-muted text-[10px]" />
                <YAxis stroke="currentColor" className="text-theme-muted text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="actions" fill="#10b981" radius={[3, 3, 0, 0]} name="Actions Recorded" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider">
              Day of Week Velocity
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Total commits and verified submissions across calendar days
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="currentColor" className="text-theme-muted text-[10px]" />
                <YAxis stroke="currentColor" className="text-theme-muted text-[10px]" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

