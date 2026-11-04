'use client';

import React from 'react';
import { Menu, Flame, Bell, RefreshCw, Sun, Moon, Github, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface HeaderProps {
  currentTab: string;
  onMobileMenuOpen: () => void;
  onTabChange: (tab: string) => void;
}

export function Header({ currentTab, onMobileMenuOpen, onTabChange }: HeaderProps) {
  const { effectiveTheme, toggleTheme } = useTheme();
  const { user, overview, notifications, refreshData, isLoading, connectedRepos } = useData();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const tabTitles: Record<string, string> = {
    overview: 'Developer Overview',
    github: 'GitHub Activity & Commits',
    leetcode: 'LeetCode Submissions & Solutions',
    repos: 'Connected Repositories',
    automation: 'Automation Center',
    calendar: 'Contribution Calendar',
    analytics: 'Coding Analytics',
    journal: 'Daily Activity Journal',
    notifications: 'Notifications',
    settings: 'Settings & Integrations'
  };

  const primaryTargetRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  return (
    <header className="h-16 border-b border-theme-border bg-theme-surface/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 text-theme-muted hover:text-theme-primary rounded-lg transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs font-semibold text-theme-muted uppercase tracking-wider">
            StreakForge
          </span>
          <span className="hidden sm:inline text-theme-muted text-xs">/</span>
          <h1 className="text-sm font-bold text-theme-primary tracking-tight">
            {tabTitles[currentTab] || 'Overview'}
          </h1>
        </div>
      </div>

      {/* Right: Quick Stats & Controls */}
      <div className="flex items-center gap-3">
        {/* Streak Pill */}
        <div
          onClick={() => onTabChange('calendar')}
          className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-semibold transition-transform hover:scale-105"
          title="Click to view full Streak Calendar"
        >
          <Flame className="w-3.5 h-3.5 animate-pulse" />
          <span>{overview?.currentStreak || 0}d Streak</span>
        </div>

        {/* Sync Status Badge */}
        {primaryTargetRepo && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-theme-accent-subtle border border-theme-accent/20 text-theme-accent-text rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-theme-accent" />
            <span className="truncate max-w-[140px]">{primaryTargetRepo.repoFullName}</span>
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={() => refreshData()}
          disabled={isLoading}
          className="p-2 text-theme-muted hover:text-theme-primary rounded-lg transition hover:bg-theme-elevated disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* Notifications Button */}
        <button
          onClick={() => onTabChange('notifications')}
          className="p-2 text-theme-muted hover:text-theme-primary rounded-lg transition hover:bg-theme-elevated relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-theme-accent ring-2 ring-theme-surface" />
          )}
        </button>

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-theme-muted hover:text-theme-primary rounded-lg transition hover:bg-theme-elevated"
          title="Toggle Dark/Light Mode"
        >
          {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User / Connect Profile */}
        {user ? (
          <div
            onClick={() => onTabChange('settings')}
            className="flex items-center gap-2 pl-2 border-l border-theme-border cursor-pointer"
          >
            <img
              src={user.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'}
              alt={user.username}
              className="w-7 h-7 rounded-full border border-theme-border object-cover"
            />
            <span className="hidden xl:inline text-xs font-medium text-theme-primary truncate max-w-[100px]">
              @{user.username}
            </span>
          </div>
        ) : (
          <a
            href="http://localhost:4000/api/v1/auth/github"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg transition hover:opacity-95 shadow-xs"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Connect GitHub</span>
          </a>
        )}
      </div>
    </header>
  );
}

