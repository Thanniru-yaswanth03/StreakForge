'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  GitBranch,
  Code2,
  Calendar,
  FolderGit2,
  Bot,
  Settings,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  BookOpen,
  Brain,
  FileText,
  Award,
  Clock,
  Layers,
  Briefcase,
  Trophy,
  Target,
  Network,
  Globe,
  Timer
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeColor?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar({ currentTab, onTabChange, mobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { effectiveTheme, toggleTheme } = useTheme();
  const { user, overview, leetcodeStats, connectedRepos } = useData();

  const totalLeetCode = leetcodeStats?.totalSolved ?? 32;
  const currentStreak = overview?.currentStreak ?? 2;

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', label: 'Overview', icon: Flame, badge: `${currentStreak}d` },
        { id: 'calendar', label: 'Streak Calendar', icon: Calendar, badge: '365' },
        { id: 'reports', label: 'Weekly Report', icon: FileText, badge: 'New' }
      ]
    },
    {
      title: 'Learning & DSA',
      items: [
        {
          id: 'curriculum',
          label: 'Study Curricula',
          icon: BookOpen,
          badge: 'Blind 75',
          badgeColor: 'bg-[#388bfd]/15 text-[#58a6ff] border-[#388bfd]/30'
        },
        {
          id: 'revision',
          label: 'Revision Queue',
          icon: Clock,
          badge: 'SRS',
          badgeColor: 'bg-[#e3b341]/15 text-[#e3b341] border-[#e3b341]/30'
        },
        {
          id: 'patterns',
          label: 'Pattern Explorer',
          icon: Network,
          badge: '16',
          badgeColor: 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/30'
        },
        {
          id: 'vault',
          label: 'Knowledge Vault',
          icon: FileText
        },
        {
          id: 'intelligence',
          label: 'Learning Intelligence',
          icon: Brain,
          badge: '2.0',
          badgeColor: 'bg-[#a371f7]/15 text-[#a371f7] border-[#a371f7]/30'
        }
      ]
    },
    {
      title: 'Productivity',
      items: [
        {
          id: 'planner',
          label: 'Coding Planner',
          icon: Target,
          badge: 'Sprint'
        },
        {
          id: 'mock',
          label: 'Mock Interviews',
          icon: Timer,
          badge: 'Timed'
        }
      ]
    },
    {
      title: 'Integrations',
      items: [
        {
          id: 'platforms',
          label: 'Multi-Platform Sync',
          icon: Globe,
          badge: 'GH/LC/CF',
          badgeColor: 'bg-[#388bfd]/15 text-[#58a6ff] border-[#388bfd]/30'
        },
        {
          id: 'leetcode',
          label: 'LeetCode Activity',
          icon: Code2,
          badge: totalLeetCode,
          badgeColor: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/40'
        },
        { id: 'github', label: 'GitHub Activity', icon: GitBranch, badge: '409' },
        { id: 'catalog', label: 'README Catalog', icon: Layers, badge: 'Auto' },
        { id: 'repos', label: 'Repositories', icon: FolderGit2, badge: connectedRepos.length || 1 }
      ]
    },
    {
      title: 'Profile & Career',
      items: [
        { id: 'profile', label: 'Public Profile', icon: Globe },
        {
          id: 'career',
          label: 'Career Readiness',
          icon: Briefcase,
          badge: 'Score',
          badgeColor: 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/30'
        },
        {
          id: 'achievements',
          label: 'XP & Levels',
          icon: Trophy,
          badge: 'XP',
          badgeColor: 'bg-[#bc8cff]/15 text-[#bc8cff] border-[#bc8cff]/30'
        },
        { id: 'badges', label: 'Profile Badges', icon: Award, badge: 'SVG' }
      ]
    },
    {
      title: 'Settings',
      items: [
        {
          id: 'automation',
          label: 'Automations',
          icon: Bot,
          badge: '4',
          badgeColor: 'bg-[#58a6ff]/15 text-[#58a6ff] border-[#58a6ff]/30'
        },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === '[') {
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
    <div className="flex flex-col h-full justify-between select-none bg-[#0d1117] border-r border-[#30363d]/80">
      {/* Top: Brand Header */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#30363d] bg-[#010409]">
          <div
            onClick={() => handleSelect('overview')}
            className="flex items-center gap-2.5 cursor-pointer group py-1"
          >
            {/* Green Flame Shield */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2ea043] to-[#238636] border border-white/20 flex items-center justify-center text-white shadow-[0_2px_10px_rgba(35,134,54,0.4)] group-hover:scale-105 group-hover:shadow-[0_4px_16px_rgba(46,160,67,0.6)] transition-all">
              <Flame className="w-4 h-4 fill-white text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[#f0f6fc]">
                  Streak<span className="text-[#3fb950]">Forge</span>
                </span>
                <span className="text-[10px] text-[#8b949e] font-mono leading-none">
                  v2.0 Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#21262d] rounded-md transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="p-2 space-y-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7d8590]">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 relative group cursor-pointer ${
                      isActive
                        ? 'bg-[#21262d] text-[#f0f6fc] font-semibold border border-[#30363d] shadow-[0_2px_8px_rgba(0,0,0,0.35)]'
                        : 'text-[#c9d1d9] hover:text-[#f0f6fc] hover:bg-[#161b22] hover:border-[#30363d]/60 border border-transparent'
                    }`}
                  >
                    {/* Active Left Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1 bottom-1 w-1 bg-[#2ea043] rounded-r shadow-[0_0_8px_rgba(46,160,67,0.8)]" />
                    )}

                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors ${
                          isActive ? 'text-[#3fb950]' : 'text-[#8b949e] group-hover:text-[#f0f6fc]'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-left text-xs">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border flex-shrink-0 transition-all ${
                          item.badgeColor || 'bg-[#21262d] text-[#8b949e] border-[#30363d]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: User Card & Collapser */}
      <div className="p-3 border-t border-[#30363d] space-y-2 bg-[#161b22]/40">
        <div
          onClick={() => handleSelect('settings')}
          className="flex items-center gap-2.5 p-2 rounded-md hover:bg-[#21262d] border border-transparent hover:border-[#30363d] cursor-pointer transition-all group"
          title="Account Settings"
        >
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://avatars.githubusercontent.com/u/121496542?v=4'}
              alt={user?.username || 'user'}
              width={26}
              height={26}
              style={{ width: 26, height: 26, maxWidth: 26, maxHeight: 26, objectFit: 'cover' }}
              className="w-6 h-6 rounded-full border border-[#30363d] flex-shrink-0 group-hover:border-[#58a6ff] transition-colors"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#238636] ring-1 ring-[#0d1117]" />
          </div>

          {!isCollapsed && (
            <div className="truncate flex-1 text-left">
              <div className="text-xs font-bold text-[#f0f6fc] truncate group-hover:text-[#58a6ff] transition-colors">
                @{user?.username || 'Thanniru-yaswanth03'}
              </div>
              <div className="text-[10px] text-[#3fb950] font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#3fb950]" />
                <span>Verified Contributor</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={toggleTheme}
            className="p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-md transition hover:bg-[#21262d]"
            title={effectiveTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {effectiveTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 text-[#8b949e] hover:text-[#f0f6fc] rounded-md transition hover:bg-[#21262d] text-xs font-mono"
            title="Toggle sidebar [ ]"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block fixed left-0 top-0 bottom-0 z-40 transition-all duration-200 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Slide-Over Backdrop */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        />
      )}

      {/* Mobile Slide-Over Drawer */}
      <div
        className={`lg:hidden fixed top-0 bottom-0 left-0 w-72 z-50 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
}
