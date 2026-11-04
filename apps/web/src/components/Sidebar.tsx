'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  GitBranch,
  CheckCircle2,
  FolderGit2,
  Bot,
  Calendar,
  BarChart3,
  BookOpen,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  X,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ currentTab, onTabChange, mobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { notifications, isDemoMode } = useData();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const navigationItems = [
    { id: 'overview', label: 'Overview', icon: Flame, shortcut: 'O' },
    { id: 'github', label: 'GitHub Activity', icon: GitBranch, shortcut: 'G' },
    { id: 'leetcode', label: 'LeetCode Activity', icon: CheckCircle2, shortcut: 'L' },
    { id: 'repos', label: 'Repository Manager', icon: FolderGit2, shortcut: 'R' },
    { id: 'automation', label: 'Automation Center', icon: Bot, shortcut: 'A' },
    { id: 'calendar', label: 'Streak Calendar', icon: Calendar, shortcut: 'C' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: 'N' },
    { id: 'journal', label: 'Activity Journal', icon: BookOpen, shortcut: 'J' },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      shortcut: 'B'
    },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'S' }
  ];

  // Global keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with '['
      if (e.key === '[' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
      if (e.key === 'Escape' && mobileOpen) {
        onMobileClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const handleSelect = (id: string) => {
    onTabChange(id);
    onMobileClose();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Brand & Top Bar */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-theme-border">
          <div
            onClick={() => handleSelect('overview')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
          >
            <div className="w-8 h-8 rounded-lg bg-theme-accent text-slate-950 flex items-center justify-center font-bold text-sm flex-shrink-0 transition-transform group-hover:scale-105">
              SF
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight text-theme-primary truncate">
                  StreakForge
                </span>
                <span className="text-[10px] text-theme-muted tracking-wider uppercase font-semibold truncate">
                  Authentic Sync
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-theme-muted hover:text-theme-primary rounded-lg transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode && !isCollapsed && (
          <div className="mx-3 mt-3 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-md text-[11px] text-amber-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">Dev Preview Mode</span>
          </div>
        )}

        {/* Nav Items */}
        <nav className="p-2 space-y-0.5 mt-2" aria-label="Main Navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? `${item.label} (${item.shortcut})` : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all relative group ${
                  isActive
                    ? 'bg-theme-accent-subtle text-theme-accent font-semibold shadow-sm'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-theme-accent rounded-r" />
                )}
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-theme-accent' : 'text-theme-muted group-hover:text-theme-primary'}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="bg-theme-accent text-slate-950 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: Theme & Collapse */}
      <div className="p-3 border-t border-theme-border space-y-2">
        {/* Theme Picker */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-1.5 bg-theme-elevated rounded-lg text-xs">
            <span className="text-[11px] text-theme-muted font-medium ml-1">Theme</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme('light')}
                title="Light Theme"
                className={`p-1 rounded ${theme === 'light' ? 'bg-theme-surface text-theme-primary shadow-xs' : 'text-theme-muted hover:text-theme-primary'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                title="Dark Theme"
                className={`p-1 rounded ${theme === 'dark' ? 'bg-theme-surface text-theme-primary shadow-xs' : 'text-theme-muted hover:text-theme-primary'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('system')}
                title="System Theme"
                className={`p-1 rounded ${theme === 'system' ? 'bg-theme-surface text-theme-primary shadow-xs' : 'text-theme-muted hover:text-theme-primary'}`}
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className="w-full flex items-center justify-center p-2 rounded-lg text-theme-muted hover:text-theme-primary hover:bg-theme-elevated"
          >
            {effectiveTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        )}

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 p-1.5 text-xs text-theme-muted hover:text-theme-primary hover:bg-theme-elevated rounded-lg transition"
          title="Toggle Sidebar ([)"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && <span className="text-[11px]">Collapse sidebar</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 bg-theme-surface border-r border-theme-border z-30 transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="relative w-64 max-w-[80vw] bg-theme-surface border-r border-theme-border shadow-2xl z-10 flex flex-col h-full animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}

