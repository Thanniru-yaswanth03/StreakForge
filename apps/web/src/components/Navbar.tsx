'use client';

import React from 'react';
import { Flame, GitBranch, Terminal, ShieldCheck, Settings, LogOut, CheckCircle2 } from 'lucide-react';
import type { User } from '@streakforge/shared-types';
import { clearStoredToken, API_BASE_URL } from '../lib/utils';

interface NavbarProps {
  user: User | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentStreak: number;
}

export function Navbar({ user, activeTab, onTabChange, currentStreak }: NavbarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Flame },
    { id: 'repos', label: 'Repositories', icon: GitBranch },
    { id: 'submissions', label: 'LeetCode Sync', icon: CheckCircle2 },
    { id: 'agents', label: 'Desktop Agents', icon: Terminal },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const handleLogout = () => {
    clearStoredToken();
    window.location.reload();
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/20">
              SF
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">StreakForge</span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                Zero-Fabrication
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-indigo-400 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Badge / Streak */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#238636]/15 border border-[#238636]/30 px-3 py-1 rounded-full text-[#3fb950]">
            <Flame className="w-4 h-4 text-[#3fb950]" />
            <span className="text-xs font-bold tracking-tight">{currentStreak} Day Streak</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-200">@{user.username}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <img
                src={user.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'}
                alt={user.username}
                width={32}
                height={32}
                style={{ width: 32, height: 32, maxWidth: 32, maxHeight: 32, objectFit: 'cover' }}
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <a
              href={`${API_BASE_URL}/auth/github`}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition shadow-md shadow-indigo-600/20"
            >
              <span>Connect GitHub</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
