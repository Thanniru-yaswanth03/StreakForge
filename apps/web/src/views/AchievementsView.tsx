'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Zap,
  Flame,
  Shield,
  CheckCircle2,
  Lock,
  Sparkles,
  RotateCw,
  TrendingUp,
  Star,
  Trophy
} from 'lucide-react';
import { api } from '../lib/api';
import type { GamificationProfile } from '@streakforge/shared-types';

export function AchievementsView() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.gamification.getProfile();
      const data = (res as any)?.data ?? res;
      if (data && (data.level !== undefined || data.achievements)) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load gamification profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const currentXp = profile?.currentXp ?? 0;
  const nextLevelXp = profile?.nextLevelXp ?? 500;
  const progressPercent = profile?.levelProgressPercent ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">XP &amp; Developer Achievements</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#bc8cff]/10 text-[#bc8cff] border border-[#bc8cff]/25 font-mono">
                Level Progression
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Earn authentic XP by solving algorithmic problems, adhering to spaced repetition review schedules, and sustaining daily momentum.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfile}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Level & XP Progression Card */}
      <div className="p-6 rounded-xl border border-[#30363d] bg-[#161b22]/50 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#30363d]/70">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#bc8cff]/20 to-[#58a6ff]/20 border border-[#bc8cff]/30 flex items-center justify-center text-xl font-black text-[#bc8cff] font-mono shadow-inner">
              L{profile?.level ?? 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#f0f6fc]">
                  {profile?.rankTitle ?? 'Novice Coder'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#58a6ff] font-mono">
                  {profile?.totalAchievementsUnlocked ?? 0} Badges
                </span>
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Current XP: <span className="font-mono text-[#f0f6fc] font-semibold">{currentXp} XP</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-[#8b949e]">XP to Level {(profile?.level ?? 1) + 1}</span>
            <div className="text-base font-bold text-[#f0f6fc] font-mono">
              {currentXp} / {nextLevelXp} XP
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="w-full h-3 bg-[#21262d] rounded-full overflow-hidden border border-[#30363d]/50">
            <div
              className="h-full bg-gradient-to-r from-[#8957e5] via-[#bc8cff] to-[#58a6ff] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8b949e] font-mono">
            <span>Current Level: L{profile?.level ?? 1}</span>
            <span>{100 - progressPercent}% remaining to advance</span>
            <span>Target: L{(profile?.level ?? 1) + 1}</span>
          </div>
        </div>

        {/* Anti-Spam / XP Rules Banner */}
        <div className="mt-5 pt-4 border-t border-[#30363d]/50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#8b949e]">
          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]/40 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#3fb950] flex-shrink-0" />
            <span><strong>+50 XP</strong> per accepted LeetCode solve</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]/40 flex items-center gap-2">
            <Star className="w-4 h-4 text-[#bc8cff] flex-shrink-0" />
            <span><strong>+25 XP</strong> per Spaced Review mastered</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d]/40 flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#f0883e] flex-shrink-0" />
            <span><strong>+10 XP</strong> per commit (capped at 50/day)</span>
          </div>
        </div>
      </div>

      {/* Achievements Showcase Grid */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
        <h2 className="text-base font-bold text-[#f0f6fc] mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-[#f0883e]" />
          Verified Engineering Achievements
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(profile?.achievements || []).map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                ach.unlocked
                  ? 'border-[#3fb950]/40 bg-[#0d1117]'
                  : 'border-[#30363d]/60 bg-[#161b22]/30 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <h3 className="text-xs font-bold text-[#f0f6fc]">
                        {ach.title}
                      </h3>
                      <span className="text-[10px] text-[#58a6ff] font-mono">
                        +{ach.xpReward} XP
                      </span>
                    </div>
                  </div>

                  {ach.unlocked ? (
                    <span className="p-1 rounded-full bg-[#238636]/20 text-[#3fb950]">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 rounded-full bg-[#21262d] text-[#8b949e]">
                      <Lock className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#8b949e] leading-relaxed mb-3">
                  {ach.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#30363d]/40 flex items-center justify-between text-[11px] text-[#8b949e]">
                <span>Status:</span>
                <span className={ach.unlocked ? 'text-[#3fb950] font-medium' : 'text-[#8b949e]'}>
                  {ach.unlocked
                    ? `Unlocked ${ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : ''}`
                    : `${ach.progress} / ${ach.target}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
