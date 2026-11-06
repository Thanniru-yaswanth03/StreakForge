'use client';

import React from 'react';
import {
  Menu,
  Flame,
  Bell,
  RefreshCw,
  Sun,
  Moon,
  Github,
  CheckCircle2,
  ExternalLink,
  Search,
  BookOpen,
  Brain,
  FileText,
  Award
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../lib/utils';

interface HeaderProps {
  currentTab: string;
  onMobileMenuOpen: () => void;
  onTabChange: (tab: string) => void;
  onOpenOnboarding?: () => void;
}

export function Header({ currentTab, onMobileMenuOpen, onTabChange }: HeaderProps) {
  const { effectiveTheme, toggleTheme } = useTheme();
  const { user, overview, refreshData, isLoading, connectedRepos, notifications } = useData();

  const tabTitles: Record<string, string> = {
    overview: 'Developer Overview',
    intelligence: 'Learning Intelligence',
    curriculum: 'Interview Curricula (Blind 75 & NeetCode)',
    revision: 'Spaced Repetition Queue',
    catalog: 'README Auto-Catalog',
    badges: 'Profile SVG Badges',
    leetcode: 'LeetCode Activity',
    github: 'GitHub Activity',
    calendar: 'Streak Calendar',
    repos: 'Connected Repositories',
    automation: 'Automations',
    settings: 'Settings',
    planner: 'Personal Coding Planner',
    vault: 'DSA Knowledge Vault',
    patterns: 'Canonical Pattern Recognition',
    mock: 'Mock Interview Practice Arena',
    career: 'Career Readiness Dashboard',
    achievements: 'XP & Developer Achievements',
    reports: 'Weekly Developer Report',
    platforms: 'Multi-Platform Sync (GH, LC, CF)',
    profile: 'Public Developer Profile'
  };

  const primaryTargetRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <header className="sticky top-0 z-30 select-none bg-[#0d1117]/95 backdrop-blur-xl border-b border-[#30363d]/80 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger + Breadcrumb + Target Repo Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Clean App Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold truncate">
            <span className="text-[#8b949e] font-medium hidden sm:inline">StreakForge</span>
            <span className="text-[#30363d] hidden sm:inline">/</span>
            <span className="text-[#f0f6fc] font-bold tracking-tight truncate">
              {tabTitles[currentTab] || 'Dashboard'}
            </span>
          </div>

          {/* Target Repo Sync Pill */}
          {primaryTargetRepo ? (
            <a
              href={`https://github.com/${primaryTargetRepo.repoFullName}`}
              target="_blank"
              rel="noreferrer"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-full text-xs text-[#8b949e] hover:text-[#58a6ff] transition font-mono group ml-2"
              title="Active target repository for LeetCode commits"
            >
              <span className="w-2 h-2 rounded-full bg-[#3fb950] group-hover:animate-ping" />
              <span className="text-[#c9d1d9] font-medium">{primaryTargetRepo.repoFullName}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ) : user ? (
            <button
              onClick={() => onTabChange('repos')}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#161b22] hover:bg-[#21262d] border border-dashed border-[#30363d] hover:border-[#58a6ff] rounded-full text-xs text-[#8b949e] hover:text-[#58a6ff] transition font-mono group ml-2 cursor-pointer"
              title="Select a target repository for LeetCode solution tracking"
            >
              <span>+ Select Target Repo</span>
            </button>
          ) : null}
        </div>

        {/* Right: Quick Action Status Pill, Refresh, Notifications, Profile */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Verified Streak Pill */}
          <div
            onClick={() => onTabChange('calendar')}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-1 bg-gradient-to-b from-[#2ea043]/20 to-[#238636]/10 border border-[#2ea043]/50 text-[#3fb950] rounded-full text-xs font-semibold transition hover:scale-105 hover:border-[#3fb950] shadow-[0_0_12px_rgba(46,160,67,0.25)]"
            title="Click to view Streak Calendar"
          >
            <Flame className="w-3.5 h-3.5 fill-[#3fb950] text-[#3fb950] animate-pulse" />
            <span className="tabular-nums font-mono">{overview?.currentStreak || 2}d Streak</span>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => refreshData()}
            disabled={isLoading}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-md transition hover:bg-[#21262d] border border-transparent hover:border-[#30363d] disabled:opacity-50 cursor-pointer"
            title="Refresh GitHub & LeetCode telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#58a6ff]' : ''}`} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => onTabChange('notifications')}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-md transition hover:bg-[#21262d] border border-transparent hover:border-[#30363d] relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#58a6ff] ring-2 ring-[#0d1117]" />
            )}
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-md transition hover:bg-[#21262d] border border-transparent hover:border-[#30363d] cursor-pointer"
            title="Toggle Theme"
          >
            {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-[#e3b341]" />}
          </button>

          {/* User Profile Avatar with Connected Indicator */}
          {user ? (
            <div
              onClick={() => onTabChange('settings')}
              className="flex items-center gap-2 pl-2 border-l border-[#30363d] cursor-pointer group"
              title={`Signed in as @${user.username}`}
            >
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    width={28}
                    height={28}
                    style={{ width: 28, height: 28, maxWidth: 28, maxHeight: 28, objectFit: 'cover' }}
                    className="w-7 h-7 rounded-full border border-[#30363d] object-cover group-hover:border-[#58a6ff] transition-all group-hover:scale-105"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-xs font-bold text-[#58a6ff]">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#238636] ring-2 ring-[#0d1117]" />
              </div>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/auth/github`}
              className="github-glossy-button-primary px-3 py-1 text-xs flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Connect GitHub</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
