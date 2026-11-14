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
  Award,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { GitHubConnectButton } from './GitHubConnectButton';

interface HeaderProps {
  currentTab: string;
  onMobileMenuOpen: () => void;
  onTabChange: (tab: string) => void;
  onOpenOnboarding?: () => void;
}

export function Header({ currentTab, onMobileMenuOpen, onTabChange }: HeaderProps) {
  const { effectiveTheme, toggleTheme } = useTheme();
  const {
    user,
    overview,
    refreshData,
    isLoading,
    isStaleData,
    lastUpdatedAt,
    backendError,
    connectedRepos,
    notifications
  } = useData();

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
    notifications: 'Notification Center',
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
  const verifiedStreak = user ? (overview?.currentStreak ?? 0) : 0;

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  return (
    <header className="sticky top-0 z-30 select-none bg-theme-bg/95 backdrop-blur-xl border-b border-theme-border shadow-xs">
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Hamburger + Breadcrumb + Target Repo Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-elevated rounded-md transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Clean App Breadcrumb */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold truncate">
            <span className="text-theme-muted font-medium hidden sm:inline">StreakForge</span>
            <span className="text-theme-border hidden sm:inline">/</span>
            <span className="text-theme-primary font-bold tracking-tight truncate">
              {tabTitles[currentTab] || 'Dashboard'}
            </span>
          </div>

          {/* Target Repo Sync Pill */}
          {primaryTargetRepo ? (
            <a
              href={`https://github.com/${primaryTargetRepo.repoFullName}`}
              target="_blank"
              rel="noreferrer"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface hover:bg-theme-elevated border border-theme-border rounded-full text-xs text-theme-muted hover:text-blue-500 transition font-mono group ml-2"
              title="Active target repository for LeetCode commits"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping" />
              <span className="text-theme-secondary font-medium">{primaryTargetRepo.repoFullName}</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ) : user ? (
            <button
              onClick={() => onTabChange('repos')}
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-theme-surface hover:bg-theme-elevated border border-dashed border-theme-border hover:border-blue-500 rounded-full text-xs text-theme-muted hover:text-blue-500 transition font-mono group ml-2 cursor-pointer"
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
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
              verifiedStreak > 0
                ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:scale-105 hover:border-emerald-500 shadow-xs'
                : 'bg-theme-surface border border-theme-border text-theme-muted hover:text-theme-primary'
            }`}
            title={verifiedStreak > 0 ? `${verifiedStreak} active days streak` : '0 active days verified'}
          >
            <Flame className={`w-3.5 h-3.5 ${verifiedStreak > 0 ? 'fill-emerald-500 text-emerald-500 animate-pulse' : 'text-theme-muted'}`} />
            <span className="tabular-nums font-mono">{verifiedStreak}d Streak</span>
          </div>

          {/* Last Synced / Cache Freshness Indicator */}
          {user && lastUpdatedAt && (
            <span
              className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                isStaleData
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-theme-surface border-theme-border text-theme-muted'
              }`}
              title={`Last synced at ${new Date(lastUpdatedAt).toLocaleString()}`}
            >
              {isStaleData ? 'Cached • ' : ''}
              {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* GitHub Token Health Warning if expired/revoked */}
          {user?.githubTokenHealth && !user.githubTokenHealth.valid && (
            <button
              type="button"
              onClick={() => onTabChange('settings')}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 cursor-pointer transition"
              title={user.githubTokenHealth.message || 'GitHub connection attention required'}
            >
              <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
              <span>
                {user.githubTokenHealth.status === 'REVOKED' ||
                user.githubTokenHealth.connectionStatus === 'AUTHORIZATION_REVOKED'
                  ? 'Reconnect GitHub'
                  : user.githubTokenHealth.status === 'INSUFFICIENT_PERMISSIONS'
                    ? 'Grant Repo Scope'
                    : user.githubTokenHealth.status === 'RATE_LIMITED'
                      ? 'GitHub Rate Limited'
                      : 'Check GitHub Access'}
              </span>
            </button>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={() => refreshData()}
            disabled={isLoading}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-md transition hover:bg-theme-elevated border border-transparent hover:border-theme-border disabled:opacity-50 cursor-pointer"
            title="Refresh GitHub & LeetCode telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => onTabChange('notifications')}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-md transition hover:bg-theme-elevated border border-transparent hover:border-theme-border relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-theme-bg" />
            )}
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-md transition hover:bg-theme-elevated border border-transparent hover:border-theme-border cursor-pointer"
            title="Toggle Theme"
          >
            {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-amber-500" />}
          </button>

          {/* User Profile Avatar with Connected Indicator */}
          {user ? (
            <div
              onClick={() => onTabChange('settings')}
              className="flex items-center gap-2 pl-2 border-l border-theme-border cursor-pointer group"
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
                    className="w-7 h-7 rounded-full border border-theme-border object-cover group-hover:border-blue-500 transition-all group-hover:scale-105"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-theme-elevated border border-theme-border flex items-center justify-center text-xs font-bold text-blue-500">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-theme-bg" />
              </div>
            </div>
          ) : (
            <GitHubConnectButton
              label="Connect GitHub"
              className="github-glossy-button-primary px-3 py-1 text-xs flex items-center gap-1.5"
            />
          )}
        </div>
      </div>

      {backendError && (
        <div className="px-4 sm:px-6 py-2 bg-amber-500/10 border-t border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-3">
          <span>{backendError}</span>
          <button
            type="button"
            onClick={() => refreshData()}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold text-[11px] transition shrink-0 cursor-pointer"
          >
            {isLoading ? 'Retrying...' : 'Retry Sync'}
          </button>
        </div>
      )}
    </header>
  );
}
