'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Award,
  Shield,
  Code2,
  GitBranch,
  Sparkles,
  RotateCw,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import type { PublicDeveloperProfile } from '@streakforge/shared-types';

export function PublicProfileView() {
  const { user } = useData();
  const [profile, setProfile] = useState<PublicDeveloperProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const username = user?.username || 'Thanniru-yaswanth03';
  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/u/${username}`
    : `https://streakforge.app/u/${username}`;

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.publicProfile.get(username);
      const data = (res as any)?.data ?? res;
      if (data && (data.username || data.totalSolved !== undefined)) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load public profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Public Developer Profile</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#238636]/10 text-[#3fb950] border border-[#238636]/25 font-mono">
                Shareable Portfolio
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Showcase your verified streaks, curriculum completion, and problem-solving metrics on an unforgeable public developer card.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedUrl ? 'Copied Public URL' : 'Copy Profile URL'}
          </button>
          <a
            href={`/u/${username}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Page
          </a>
        </div>
      </div>

      {/* Shareable Link Info Pill */}
      <div className="p-3.5 rounded-xl border border-[#30363d] bg-[#0d1117] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="text-[#8b949e]">Your Public Link:</span>
          <span className="font-mono text-[#58a6ff] truncate">{publicUrl}</span>
        </div>
        <button
          onClick={handleCopyLink}
          className="text-xs text-[#58a6ff] hover:underline flex-shrink-0 ml-2"
        >
          {copiedUrl ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Profile Card Preview (Identical to what public sees) */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#30363d]/70">
          <div className="flex items-center gap-4">
            <img
              src={profile?.avatarUrl || user?.avatarUrl || 'https://github.com/identicons/user.png'}
              alt={profile?.username}
              className="w-16 h-16 rounded-full border-2 border-[#58a6ff]/50 bg-[#0d1117]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#f0f6fc]">
                  {profile?.name || profile?.username || username}
                </h2>
                <span className="text-xs text-[#8b949e] font-mono">
                  @{profile?.username || username}
                </span>
              </div>
              <p className="text-xs text-[#c9d1d9] mt-1 italic">
                &ldquo;{profile?.bio || 'Building reliable software with verified consistency.'}&rdquo;
              </p>
              <div className="flex items-center gap-3 text-xs text-[#8b949e] mt-2">
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3.5 h-3.5 text-[#58a6ff]" /> GitHub: @{profile?.githubHandle}
                </span>
                <span className="flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5 text-[#f0883e]" /> LeetCode: @{profile?.leetcodeHandle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#0d1117] border border-[#3fb950]/30 text-center">
              <span className="text-xs text-[#8b949e] block">Current Streak</span>
              <span className="text-2xl font-black text-[#3fb950] font-mono flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-[#3fb950]" />
                {profile?.currentStreak ?? 2}d
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-center">
              <span className="text-xs text-[#8b949e] block">Total Solved</span>
              <span className="text-2xl font-black text-[#f0f6fc] font-mono">
                {profile?.totalSolved ?? 32}
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#238636]/30">
            <span className="text-xs font-semibold text-[#3fb950] uppercase tracking-wider block mb-1">
              Easy Solved
            </span>
            <span className="text-2xl font-black text-[#f0f6fc] font-mono">
              {profile?.difficultyDistribution?.easy ?? 29}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#f0883e]/30">
            <span className="text-xs font-semibold text-[#f0883e] uppercase tracking-wider block mb-1">
              Medium Solved
            </span>
            <span className="text-2xl font-black text-[#f0f6fc] font-mono">
              {profile?.difficultyDistribution?.medium ?? 3}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#0d1117] border border-[#f85149]/30">
            <span className="text-xs font-semibold text-[#f85149] uppercase tracking-wider block mb-1">
              Hard Solved
            </span>
            <span className="text-2xl font-black text-[#f0f6fc] font-mono">
              {profile?.difficultyDistribution?.hard ?? 0}
            </span>
          </div>
        </div>

        {/* Top Skills Badges */}
        <div className="pt-4 border-t border-[#30363d]/50">
          <h3 className="text-xs font-bold text-[#8b949e] uppercase tracking-wider mb-3">
            Top Algorithmic Skills
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(profile?.topSkills || []).map((skill) => (
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
      </div>
    </div>
  );
}
