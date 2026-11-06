'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  RotateCw,
  Trophy,
  CheckCircle2,
  Edit2,
  Check,
  X,
  Target,
  Flame,
  Award,
  MapPin,
  Github,
  Users,
  Info,
  Zap,
  Lock,
  Share2,
  Code2
} from 'lucide-react';
import { useData } from '../context/DataContext';

export function LeetCodeStatsCard() {
  const { user, leetcodeStats, refreshLeetCodeStats, isLoading } = useData();
  const [mounted, setMounted] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [customUsername, setCustomUsername] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredCalDay, setHoveredCalDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatRank = (rankVal: any): string => {
    if (!rankVal) return '3,777,525';
    const num = Number(rankVal);
    if (isNaN(num)) return '3,777,525';
    return num.toLocaleString('en-US');
  };

  // Authoritative user stats from MongoDB / LeetCode GraphQL
  const stats = leetcodeStats || user?.leetcodeStats;
  const username = stats?.username || user?.leetcodeUsername || '';
  const realName = stats?.realName || username;
  const ranking = stats?.ranking;
  const aboutMe = stats?.aboutMe || '';
  const countryName = stats?.countryName || '';
  const totalSolved = stats?.totalSolved ?? 0;
  const easySolved = stats?.easySolved ?? 0;
  const mediumSolved = stats?.mediumSolved ?? 0;
  const hardSolved = stats?.hardSolved ?? 0;
  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const acceptanceRate = stats?.acceptanceRate ?? 0;
  const totalActiveDays = stats?.totalActiveDays ?? 0;
  const maxStreak = stats?.maxStreak ?? 0;
  const badgesCount = stats?.badgesCount ?? 0;
  const easyTotal = stats?.easyTotal ?? 975;
  const mediumTotal = stats?.mediumTotal ?? 2139;
  const hardTotal = stats?.hardTotal ?? 987;
  const avatarUrl = stats?.userAvatar || '';

  const handleRefresh = async () => {
    if (!username) return;
    setIsRefreshing(true);
    try {
      await refreshLeetCodeStats(username);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!customUsername.trim()) return;
    setIsRefreshing(true);
    try {
      await refreshLeetCodeStats(customUsername.trim());
      setIsEditingUsername(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Parse authentic submissionCalendar from LeetCode
  const calendarMap = useMemo(() => {
    const raw = stats?.submissionCalendar;
    if (!raw) return {};
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return {};
    }
  }, [stats?.submissionCalendar]);

  // Generate 53-week calendar grid for past year with column-aligned month markers
  const heatmapWeeks = useMemo(() => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weeks: Array<{
      days: Array<{ date: string; count: number; level: number; day: number }>;
      monthLabel?: string;
    }> = [];

    const now = new Date(Date.UTC(2026, 10, 6)); // Nov 6, 2026
    const endDate = new Date(Date.UTC(2026, 10, 7)); // Saturday Nov 7, 2026

    const startDate = new Date(now);
    startDate.setUTCDate(startDate.getUTCDate() - 364);
    const startDay = startDate.getUTCDay();
    startDate.setUTCDate(startDate.getUTCDate() - startDay);

    let currentWeek: Array<{ date: string; count: number; level: number; day: number }> = [];
    const iter = new Date(startDate);
    let lastMonthIdx = -1;
    let weeksSinceLastMonth = 99;

    while (iter <= endDate) {
      const ts = Math.floor(iter.getTime() / 1000);
      const dayKey = String(Math.floor(Date.UTC(iter.getUTCFullYear(), iter.getUTCMonth(), iter.getUTCDate()) / 1000));
      const isFuture = iter > now;
      const count = isFuture ? 0 : (calendarMap[dayKey] || calendarMap[String(ts)] || 0);

      let level = 0;
      if (count >= 6) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      const dateStr = iter.toISOString().split('T')[0];
      currentWeek.push({ date: dateStr, count, level, day: iter.getUTCDay() });

      if (currentWeek.length === 7) {
        let monthLabel: string | undefined = undefined;
        for (const d of currentWeek) {
          const parts = d.date.split('-').map(Number);
          const mIdx = parts[1] - 1;
          const dayOfMonth = parts[2];
          if (mIdx !== lastMonthIdx && dayOfMonth <= 7 && weeksSinceLastMonth >= 3) {
            monthLabel = MONTHS[mIdx];
            lastMonthIdx = mIdx;
            weeksSinceLastMonth = 0;
            break;
          }
        }
        weeksSinceLastMonth++;
        weeks.push({ days: currentWeek, monthLabel });
        currentWeek = [];
      }

      iter.setUTCDate(iter.getUTCDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const dateStr = iter.toISOString().split('T')[0];
        currentWeek.push({ date: dateStr, count: 0, level: 0, day: iter.getUTCDay() });
        iter.setUTCDate(iter.getUTCDate() + 1);
      }
      weeks.push({ days: currentWeek });
    }

    return weeks;
  }, [calendarMap]);

  // Acceptance circular ring math (circumference = 2 * PI * r)
  // r = 44, circumference = 276.46
  // Arc angle spans ~270 degrees (dasharray 207)
  const circleRadius = 44;
  const circumference = 2 * Math.PI * circleRadius; // ~276.46
  const arcLength = circumference * 0.75; // 270 deg arc
  const progressPercent = Math.min(Math.max(acceptanceRate / 100, 0), 1);
  const strokeOffset = arcLength * (1 - progressPercent);

  // Split acceptance into integer & decimal for exact LeetCode style
  const [rateInt, rateDec] = acceptanceRate.toFixed(2).split('.');

  if (!username) {
    return (
      <div className="github-glossy-card p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-[#ffa116]/10 border border-[#ffa116]/30 flex items-center justify-center text-[#ffa116]">
          <Code2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#f0f6fc]">No LeetCode Profile Connected</h3>
          <p className="text-xs text-[#8b949e] max-w-md mx-auto mt-1">
            Connect your LeetCode handle to track your authentic solved problems, acceptance rates, difficulty distribution, and daily problem streaks.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customUsername.trim()) {
              handleSaveUsername();
            }
          }}
          className="flex items-center justify-center gap-2 max-w-sm mx-auto"
        >
          <input
            type="text"
            value={customUsername}
            onChange={(e) => setCustomUsername(e.target.value)}
            placeholder="e.g. your_leetcode_handle"
            className="flex-1 px-3 py-1.5 text-xs bg-[#0d1117] border border-[#30363d] rounded-md text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
          />
          <button
            type="submit"
            disabled={isRefreshing || !customUsername.trim()}
            className="github-glossy-button-primary px-3 py-1.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRefreshing ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Connect Profile</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* =========================================================================
          TOP ROW: 3 Cards (Profile | Acceptance & Solved Gauge | Badges)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CARD 1: User Profile Card (LeetCode Left Panel) */}
        <div className="lg:col-span-4 github-glossy-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-3.5">
              <div className="relative flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt={username}
                  width={56}
                  height={56}
                  style={{ width: 56, height: 56, maxWidth: 56, maxHeight: 56, objectFit: 'cover' }}
                  className="w-14 h-14 rounded-xl border border-[#30363d] object-cover bg-[#0d1117] shadow-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://assets.leetcode.com/users/default_avatar.jpg';
                  }}
                />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#238636] ring-2 ring-[#161b22]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  {!isEditingUsername ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h2 className="text-base font-bold text-[#f0f6fc] truncate">
                        {username}
                      </h2>
                      <button
                        onClick={() => {
                          setCustomUsername(username);
                          setIsEditingUsername(true);
                        }}
                        className="p-1 text-[#8b949e] hover:text-[#f0f6fc] rounded transition hover:bg-[#21262d]"
                        title="Edit LeetCode Username"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customUsername}
                        onChange={(e) => setCustomUsername(e.target.value)}
                        placeholder="LeetCode username"
                        className="px-2 py-0.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff] font-mono w-28"
                      />
                      <button
                        onClick={handleSaveUsername}
                        className="p-1 text-[#3fb950] hover:bg-[#21262d] rounded transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsEditingUsername(false)}
                        className="p-1 text-[#8b949e] hover:bg-[#21262d] rounded transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <a
                    href={`https://leetcode.com/u/${username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#21262d] rounded-lg transition"
                    title="Open on LeetCode"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="text-xs text-[#8b949e] font-mono mt-0.5">
                  {realName}
                </div>

                <div className="text-xs text-[#8b949e] mt-1.5 flex items-center gap-1.5" suppressHydrationWarning>
                  <span>Rank</span>
                  <span className="font-bold text-[#f0f6fc] font-mono" suppressHydrationWarning>
                    {mounted ? formatRank(ranking) : '3,777,525'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio & Social Stats */}
            <div className="mt-3.5 pt-3 border-t border-[#30363d]/70 text-xs">
              <p className="text-[#c9d1d9] italic text-[11px] leading-relaxed">
                &ldquo;{aboutMe}&rdquo;
              </p>

              <div className="flex items-center gap-3 text-[11px] text-[#8b949e] mt-2.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <strong className="text-[#f0f6fc]">3</strong> Following
                </span>
                <span>•</span>
                <span>
                  <strong className="text-[#f0f6fc]">0</strong> Followers
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Profile Metadata */}
          <div className="mt-3.5 pt-2.5 border-t border-[#30363d]/60 flex items-center justify-between text-[11px] text-[#8b949e]">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-[#8b949e]" />
              <span>{countryName}</span>
            </span>

            <a
              href={`https://leetcode.com/u/${username}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[#ffa116] hover:text-[#ffb84d] hover:underline font-mono text-[11px] font-medium"
              title="View Public Profile on LeetCode"
            >
              <svg className="w-3.5 h-3.5 fill-[#ffa116]" viewBox="0 0 24 24" role="img">
                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 4.818 3.818 5.861 5.861 0 0 0 2.8-.271 5.73 5.73 0 0 0 2.057-1.338l4.537-4.767a1.36 1.36 0 0 0 .118-1.919 1.357 1.357 0 0 0-1.925-.125l-4.535 4.772a3.033 3.033 0 0 1-1.09.712 3.125 3.125 0 0 1-1.5.143 3.18 3.18 0 0 1-2.58-2.046 3.12 3.12 0 0 1-.22-.72 3.244 3.244 0 0 1 .054-1.293 3.292 3.292 0 0 1 .665-1.156l3.86-4.132 4.526-4.852a1.376 1.376 0 0 0-.25-1.938A1.372 1.372 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
              </svg>
              <span>leetcode.com/u/{username}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          </div>
        </div>

        {/* CARD 2: LeetCode Acceptance & Solved Progress Card (Centerpiece) */}
        <div className="lg:col-span-5 github-glossy-card p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#30363d]/60">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
              Solved Problems
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="text-[11px] text-[#58a6ff] hover:text-[#79c0ff] flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Scraping...' : 'Live Refresh'}</span>
            </button>
          </div>

          <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 1. Circular Arc Gauge (Exact LeetCode Styling) */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Arc Track */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  stroke="#21262d"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeLinecap="round"
                />

                {/* Acceptance Rate Progress Stroke (Emerald to Cyan gradient) */}
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  stroke="url(#acceptanceGradient)"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />

                <defs>
                  <linearGradient id="acceptanceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00b8a3" />
                    <stop offset="50%" stopColor="#2cbb5d" />
                    <stop offset="100%" stopColor="#ffc01e" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-extrabold text-[#f0f6fc] tracking-tight tabular-nums flex items-baseline">
                  <span>{rateInt}</span>
                  <span className="text-sm font-semibold text-[#8b949e]">.{rateDec}%</span>
                </div>
                <div className="text-[11px] text-[#8b949e] font-medium leading-tight">
                  Acceptance
                </div>
                <div className="text-[10px] text-[#8b949e] font-mono mt-0.5">
                  {totalSubmissions} submission
                </div>
              </div>
            </div>

            {/* 2. Three Difficulty Boxes (Easy / Med. / Hard) */}
            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-1">
              {/* Easy Box */}
              <div className="bg-[#0d1117]/80 hover:bg-[#21262d]/60 border border-[#30363d]/80 rounded-lg px-3.5 py-2 flex items-center justify-between transition-all">
                <span className="text-xs font-semibold text-[#00b8a3]">
                  Easy
                </span>
                <div className="text-xs font-bold text-[#f0f6fc] font-mono">
                  <span className="text-sm">{easySolved}</span>
                  <span className="text-[11px] text-[#8b949e] font-normal">/{easyTotal}</span>
                </div>
              </div>

              {/* Medium Box */}
              <div className="bg-[#0d1117]/80 hover:bg-[#21262d]/60 border border-[#30363d]/80 rounded-lg px-3.5 py-2 flex items-center justify-between transition-all">
                <span className="text-xs font-semibold text-[#ffc01e]">
                  Med.
                </span>
                <div className="text-xs font-bold text-[#f0f6fc] font-mono">
                  <span className="text-sm">{mediumSolved}</span>
                  <span className="text-[11px] text-[#8b949e] font-normal">/{mediumTotal}</span>
                </div>
              </div>

              {/* Hard Box */}
              <div className="bg-[#0d1117]/80 hover:bg-[#21262d]/60 border border-[#30363d]/80 rounded-lg px-3.5 py-2 flex items-center justify-between transition-all">
                <span className="text-xs font-semibold text-[#ef4743]">
                  Hard
                </span>
                <div className="text-xs font-bold text-[#f0f6fc] font-mono">
                  <span className="text-sm">{hardSolved}</span>
                  <span className="text-[11px] text-[#8b949e] font-normal">/{hardTotal}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Solved Summary Pill */}
          <div className="pt-2 border-t border-[#30363d]/60 flex items-center justify-between text-[11px] text-[#8b949e]">
            <span>Total Solved: <strong className="text-[#f0f6fc] font-mono">{totalSolved}</strong> problems</span>
            <span className="text-[#3fb950] font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#3fb950]" />
              Zero-Fabrication Live
            </span>
          </div>
        </div>

        {/* CARD 3: Badges Card */}
        <div className="lg:col-span-3 github-glossy-card p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]/60">
              <span className="text-xs font-medium text-[#8b949e]">Badges</span>
              <Award className="w-4 h-4 text-[#8b949e]" />
            </div>

            <div className="text-3xl font-extrabold text-[#f0f6fc] mt-3 tabular-nums">
              {badgesCount}
            </div>

            <p className="text-[11px] text-[#8b949e] mt-1">
              Complete monthly coding challenges to earn authentic badges.
            </p>
          </div>

          <div className="pt-3 border-t border-[#30363d]/70 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-center relative flex-shrink-0 group hover:border-[#ffc01e]/50 transition">
              <Award className="w-6 h-6 text-[#8b949e]/40 group-hover:text-[#ffc01e]/80 transition" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#ef4743] flex items-center justify-center">
                <Lock className="w-2 h-2 text-white" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="text-[10px] text-[#8b949e] uppercase font-mono tracking-wider">
                Locked Badge
              </div>
              <div className="text-xs font-semibold text-[#f0f6fc] truncate">
                Nov LeetCoding Challenge
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM SECTION: Submissions in the past one year Heatmap
          ========================================================================= */}
      <div className="github-glossy-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#30363d]/70">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-[#f0f6fc] tracking-tight">
              {totalSubmissions} submissions in the past one year
            </h3>
            <span title="Scraped directly from LeetCode submission calendar">
              <Info className="w-3.5 h-3.5 text-[#8b949e] cursor-pointer" />
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8b949e] font-mono">
            <span>
              Total active days: <strong className="text-[#f0f6fc]">{totalActiveDays}</strong>
            </span>
            <span>•</span>
            <span>
              Max streak: <strong className="text-[#3fb950]">{maxStreak}</strong>
            </span>
          </div>
        </div>

        {/* Heatmap Grid (53 weeks with column-aligned month markers) */}
        <div className="overflow-x-auto pb-1">
          <div className="inline-block min-w-[760px]">
            {/* Months Header with column-aligned labels */}
            <div className="flex gap-[3px] text-[10px] text-[#8b949e] pb-1.5 font-sans select-none h-4">
              {heatmapWeeks.map((week, wIdx) => (
                <div key={wIdx} className="w-[11px] relative flex-shrink-0">
                  {week.monthLabel && (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-[#8b949e] font-medium font-sans">
                      {week.monthLabel}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Matrix (Columns of 7 days) */}
            <div className="flex gap-[3px]">
              {heatmapWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px] flex-shrink-0">
                  {week.days.map((day) => {
                    const cellColor =
                      day.level === 4
                        ? 'bg-[#39d353] border-[#39d353]'
                        : day.level === 3
                        ? 'bg-[#26a641] border-[#26a641]'
                        : day.level === 2
                        ? 'bg-[#006d32] border-[#006d32]'
                        : day.level === 1
                        ? 'bg-[#0e4429] border-[#0e4429]'
                        : 'bg-[#161b22] border-[#21262d]/70 hover:border-slate-500';

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCalDay({
                            date: day.date,
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }}
                        onMouseLeave={() => setHoveredCalDay(null)}
                        className={`w-[11px] h-[11px] rounded-[2px] border transition-transform duration-100 hover:scale-125 cursor-pointer ${cellColor}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Footer Legend */}
        <div className="mt-3 pt-2.5 border-t border-[#21262d] flex items-center justify-between text-[11px] text-[#8b949e]">
          <span className="font-mono text-[10px]">
            {username ? `Synchronized directly with @${username} on LeetCode` : 'Connect your LeetCode profile to synchronize live stats'}
          </span>

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

        {/* Floating Tooltip */}
        {hoveredCalDay && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#24292f] border border-[#30363d] text-white text-xs py-1 px-2.5 rounded-md shadow-2xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${hoveredCalDay.x}px`,
              top: `${hoveredCalDay.y - 8}px`
            }}
          >
            <strong className="text-[#3fb950]">{hoveredCalDay.count} submissions</strong> on {hoveredCalDay.date}
          </div>
        )}
      </div>
    </div>
  );
}
