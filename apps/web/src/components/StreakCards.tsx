import React from 'react';
import { Flame, Trophy, Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { AnalyticsOverview } from '@streakforge/shared-types';

interface StreakCardsProps {
  overview: AnalyticsOverview | null;
}

export function StreakCards({ overview }: StreakCardsProps) {
  if (!overview) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-800/40 rounded-2xl border border-slate-800" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Current Streak',
      value: `${overview.currentStreak} Days`,
      subtitle: overview.hasSubmittedToday ? 'Completed for today' : `${overview.streakDeadlineHoursLeft}h left today`,
      icon: Flame,
      color: 'amber',
      status: overview.hasSubmittedToday ? 'complete' : 'pending'
    },
    {
      title: 'Longest Streak',
      value: `${overview.longestStreak} Days`,
      subtitle: 'Personal record',
      icon: Trophy,
      color: 'indigo',
      status: 'info'
    },
    {
      title: 'Weekly Consistency',
      value: `${overview.weeklyConsistencyPercent}%`,
      subtitle: 'Last 7 days active rate',
      icon: Activity,
      color: 'emerald',
      status: 'info'
    },
    {
      title: 'Today Activity',
      value: `${overview.todayCommitCount + overview.todayLeetCodeCount} Actions`,
      subtitle: `${overview.todayLeetCodeCount} LeetCode | ${overview.todayCommitCount} Commits`,
      icon: Clock,
      color: 'violet',
      status: 'info'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between transition relative overflow-hidden group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div
                className={`p-2 rounded-xl ${
                  card.color === 'amber'
                    ? 'bg-amber-500/10 text-amber-400'
                    : card.color === 'indigo'
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : card.color === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-violet-500/10 text-violet-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl font-black tracking-tight text-white">{card.value}</div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                {card.status === 'complete' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                {card.status === 'pending' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                <span>{card.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

