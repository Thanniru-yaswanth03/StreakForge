'use client';

import React, { useState } from 'react';
import {
  Award,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Palette,
  Code2,
  Flame,
  Terminal,
  Sun,
  Moon
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { API_BASE_URL } from '../lib/utils';
import type { BadgeTheme } from '@streakforge/shared-types';

export function ProfileBadgesView() {
  const { user } = useData();
  const [selectedTheme, setSelectedTheme] = useState<BadgeTheme>('dark');
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  const username = user?.username || 'developer';

  // Badge URL (points to API server base)
  const apiHost = API_BASE_URL.replace('/api/v1', '');

  const badgeUrl = `${apiHost}/api/v1/badge/streak.svg?user=${encodeURIComponent(username)}&theme=${selectedTheme}`;
  const markdownSnippet = `[![StreakForge Verified Progress](${badgeUrl})](https://github.com/${username})`;
  const htmlSnippet = `<a href="https://github.com/${username}"><img src="${badgeUrl}" alt="StreakForge Stats" /></a>`;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownSnippet);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(badgeUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const themes: Array<{ id: BadgeTheme; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
    { id: 'dark', label: 'Dark Primer', icon: Moon, desc: 'Classic GitHub dark theme with emerald highlights.' },
    { id: 'minimal', label: 'Minimal Outline', icon: Sparkles, desc: 'Subtle clean borders, ultra low-profile.' },
    { id: 'light', label: 'Crisp Light', icon: Sun, desc: 'High-contrast light background for white READMEs.' },
    { id: 'terminal', label: 'Hacker Terminal', icon: Terminal, desc: 'Retro phosphor green text on obsidian.' },
    { id: 'gradient', label: 'Vibrant Gradient', icon: Palette, desc: 'Deep cosmic backdrop with cyan/purple border.' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="github-glossy-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#58a6ff]" />
            <h2 className="text-xl font-extrabold text-[#f0f6fc] tracking-tight">
              Dynamic GitHub Profile SVG Badges
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#388bfd]/15 text-[#58a6ff] border border-[#388bfd]/30 font-mono">
              Live SVG
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Embed your real-time verified streak and LeetCode solve metrics directly into your personal GitHub profile README.
          </p>
        </div>

        <a
          href={badgeUrl}
          target="_blank"
          rel="noreferrer"
          className="github-glossy-button-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 self-start md:self-auto"
        >
          <span>Open Direct SVG</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* 2. Theme Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {themes.map((th) => {
          const Icon = th.icon;
          const isSelected = selectedTheme === th.id;
          return (
            <div
              key={th.id}
              onClick={() => setSelectedTheme(th.id)}
              className={`github-glossy-card p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-[#58a6ff] ring-1 ring-[#58a6ff]/50 bg-[#161b22]'
                  : 'hover:border-[#30363d]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
                  {isSelected && <span className="w-2 h-2 rounded-full bg-[#58a6ff]" />}
                </div>
                <div className="text-xs font-bold text-[#f0f6fc] mt-2">{th.label}</div>
                <div className="text-[10px] text-[#8b949e] mt-0.5 leading-relaxed">{th.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Live Badge Preview Card */}
      <div className="github-glossy-card p-6 flex flex-col items-center justify-center space-y-4 bg-[#010409]">
        <div className="text-xs font-mono text-[#8b949e] tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
          <span>Live Endpoint Render ({selectedTheme} theme)</span>
        </div>

        {/* Live Image render directly from endpoint */}
        <div className="p-2 rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl max-w-full overflow-x-auto">
          <img
            key={badgeUrl}
            src={badgeUrl}
            alt="StreakForge Badge Preview"
            className="w-full max-w-[495px] h-auto rounded-lg"
          />
        </div>

        <div className="text-[11px] text-[#8b949e] font-mono">
          Cached on edge: 30 minutes • Fast vector rendering • Responsive dimensions
        </div>
      </div>

      {/* 4. Embed Code Copy Card */}
      <div className="github-glossy-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#58a6ff]" />
          <span>Embed in your GitHub Profile README</span>
        </h3>

        {/* Markdown Embed Snippet */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#8b949e]">
            <span>Markdown (Recommended for profile README.md)</span>
            <button
              onClick={handleCopyMarkdown}
              className="text-[#58a6ff] hover:text-[#79c0ff] font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMarkdown ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
            </button>
          </div>
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-md font-mono text-xs text-[#c9d1d9] overflow-x-auto select-all">
            {markdownSnippet}
          </div>
        </div>

        {/* Direct SVG URL */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs text-[#8b949e]">
            <span>Direct SVG Endpoint URL</span>
            <button
              onClick={handleCopyUrl}
              className="text-[#58a6ff] hover:text-[#79c0ff] font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? 'Copied URL!' : 'Copy URL'}</span>
            </button>
          </div>
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-md font-mono text-xs text-[#8b949e] overflow-x-auto select-all truncate">
            {badgeUrl}
          </div>
        </div>
      </div>
    </div>
  );
}

