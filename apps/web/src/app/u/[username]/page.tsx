'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Flame,
  GitBranch,
  Code2,
  Award,
  Globe,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Trophy
} from 'lucide-react';
import { api } from '../../../lib/api';
import type { PublicDeveloperProfile } from '@streakforge/shared-types';

export default function PublicProfilePage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';

  const [profile, setProfile] = useState<PublicDeveloperProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  useEffect(() => {
    if (!username) return;

    const fetchPublicData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const res = await api.publicProfile.get(username);
        const data = (res as any)?.data ?? res;
        if (data && (data.username || data.totalSolved !== undefined)) {
          setProfile(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-[#8b949e]">
        <RotateCw className="w-8 h-8 animate-spin text-[#58a6ff]" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-6 text-center">
        <Globe className="w-12 h-12 text-[#8b949e] opacity-40 mb-3" />
        <h1 className="text-xl font-bold text-[#f0f6fc]">Profile Not Found</h1>
        <p className="text-xs text-[#8b949e] mt-1 max-w-sm">
          The public profile for @{username} either does not exist or has been configured as private by the developer.
        </p>
        <Link
          href="/"
          className="mt-4 px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition"
        >
          Return to StreakForge
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* StreakForge Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#30363d]/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#238636] flex items-center justify-center text-white font-bold text-xs">
              SF
            </div>
            <span className="text-sm font-bold text-[#f0f6fc]">StreakForge</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#21262d] text-[#3fb950] font-mono border border-[#3fb950]/30">
              Verified Developer
            </span>
          </div>

          <Link
            href="/"
            className="text-xs text-[#58a6ff] hover:underline"
          >
            Create Your Profile &rarr;
          </Link>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#30363d]/70">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatarUrl || 'https://github.com/identicons/user.png'}
                alt={profile.username}
                className="w-20 h-20 rounded-full border-2 border-[#58a6ff] bg-[#0d1117] shadow-md"
              />
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-[#f0f6fc]">
                    {profile.name || profile.username}
                  </h1>
                  <span className="text-xs text-[#8b949e] font-mono">
                    @{profile.username}
                  </span>
                </div>
                <p className="text-xs text-[#c9d1d9] mt-1 italic max-w-md">
                  &ldquo;{profile.bio || 'Building reliable software with verified consistency.'}&rdquo;
                </p>

                <div className="flex items-center gap-4 text-xs text-[#8b949e] mt-3">
                  <a
                    href={`https://github.com/${profile.githubHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-[#58a6ff] transition"
                  >
                    <GitBranch className="w-4 h-4 text-[#58a6ff]" />
                    <span>github/{profile.githubHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://leetcode.com/${profile.leetcodeHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 hover:text-[#f0883e] transition"
                  >
                    <Code2 className="w-4 h-4 text-[#f0883e]" />
                    <span>leetcode/{profile.leetcodeHandle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center justify-around sm:justify-center gap-3">
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#3fb950]/40 text-center min-w-[110px]">
                <span className="text-[11px] text-[#8b949e] block font-mono">Current Streak</span>
                <span className="text-2xl font-black text-[#3fb950] font-mono flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5 fill-[#3fb950]" />
                  {profile.currentStreak}d
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#30363d] text-center min-w-[110px]">
                <span className="text-[11px] text-[#8b949e] block font-mono">Total Solved</span>
                <span className="text-2xl font-black text-[#f0f6fc] font-mono">
                  {profile.totalSolved}
                </span>
              </div>
            </div>
          </div>

          {/* Difficulty Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#238636]/30 text-center sm:text-left">
              <span className="text-xs font-semibold text-[#3fb950] uppercase tracking-wider block mb-1">
                Easy Problems
              </span>
              <span className="text-3xl font-black text-[#f0f6fc] font-mono">
                {profile.difficultyDistribution?.easy ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#f0883e]/30 text-center sm:text-left">
              <span className="text-xs font-semibold text-[#f0883e] uppercase tracking-wider block mb-1">
                Medium Problems
              </span>
              <span className="text-3xl font-black text-[#f0f6fc] font-mono">
                {profile.difficultyDistribution?.medium ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#f85149]/30 text-center sm:text-left">
              <span className="text-xs font-semibold text-[#f85149] uppercase tracking-wider block mb-1">
                Hard Problems
              </span>
              <span className="text-3xl font-black text-[#f0f6fc] font-mono">
                {profile.difficultyDistribution?.hard ?? 0}
              </span>
            </div>
          </div>

          {/* Top Skills Badges */}
          <div className="pt-4 border-t border-[#30363d]/50">
            <h2 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-3">
              Top Algorithmic Skills
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(profile.topSkills || []).map((skill) => (
                <div
                  key={skill.topic}
                  className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d]/60 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-[#f0f6fc]">
                      {skill.topic}
                    </div>
                    <div className="text-[11px] text-[#8b949e]">
                      {skill.count} problems solved
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#58a6ff] font-mono border border-[#58a6ff]/20">
                    {skill.level}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Authenticity Footer */}
          <div className="pt-4 border-t border-[#30363d]/50 flex items-center justify-between text-xs text-[#8b949e]">
            <div className="flex items-center gap-1.5 text-[#3fb950]">
              <ShieldCheck className="w-4 h-4" />
              <span>Authentic Telemetry Verified by StreakForge</span>
            </div>
            <span className="font-mono text-[11px]">
              Powered by StreakForge 3.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
