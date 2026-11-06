'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  GitBranch,
  Code2,
  Trophy,
  CheckCircle2,
  ExternalLink,
  RotateCw,
  Plus,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  GitCommit
} from 'lucide-react';
import { api } from '../lib/api';
import type { PlatformProfile, UnifiedActivityItem } from '@streakforge/shared-types';

export function MultiPlatformView() {
  const [profiles, setProfiles] = useState<PlatformProfile[]>([]);
  const [timeline, setTimeline] = useState<UnifiedActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cfHandle, setCfHandle] = useState<string>('');
  const [isConnectingCf, setIsConnectingCf] = useState<boolean>(false);
  const [savingCf, setSavingCf] = useState<boolean>(false);
  const [cfError, setCfError] = useState<string | null>(null);

  const fetchPlatformData = async () => {
    try {
      setLoading(true);
      const res = await api.platforms.getProfiles();
      const data = (res as any)?.data ?? res;
      if (data && (data.profiles || data.timeline)) {
        setProfiles(data.profiles || []);
        setTimeline(data.timeline || []);
      }
    } catch (err) {
      console.error('Failed to load multi-platform profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleConnectCodeforces = async () => {
    if (!cfHandle.trim()) return;
    try {
      setSavingCf(true);
      setCfError(null);
      const res = await api.platforms.connect('codeforces', cfHandle.trim());
      if (res.success) {
        setIsConnectingCf(false);
        setCfHandle('');
        await fetchPlatformData();
      } else {
        setCfError(res.error?.message || 'Failed to connect Codeforces handle');
      }
    } catch (err: any) {
      setCfError(err.message || 'Error connecting to Codeforces API');
    } finally {
      setSavingCf(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'github':
        return <GitBranch className="w-5 h-5 text-[#f0f6fc]" />;
      case 'leetcode':
        return <Code2 className="w-5 h-5 text-[#f0883e]" />;
      case 'codeforces':
        return <Trophy className="w-5 h-5 text-[#58a6ff]" />;
      default:
        return <Globe className="w-5 h-5 text-[#8b949e]" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-[#30363d] bg-[#161b22]/70 backdrop-blur-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#f0f6fc]">Multi-Platform Coding Ecosystem</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#388bfd]/10 text-[#58a6ff] border border-[#388bfd]/25 font-mono">
                Unified Telemetry
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">
              Synchronize competitive programming telemetry across GitHub, LeetCode, and Codeforces via official open APIs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConnectingCf(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Codeforces
          </button>
          <button
            onClick={fetchPlatformData}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg transition flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Connect Codeforces Modal / Inline Form */}
      {isConnectingCf && (
        <div className="p-5 rounded-xl border border-[#58a6ff]/50 bg-[#161b22] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#58a6ff]" />
              Connect Codeforces Handle
            </h3>
            <button
              onClick={() => setIsConnectingCf(false)}
              className="text-xs text-[#8b949e] hover:text-[#c9d1d9]"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-[#8b949e]">
            StreakForge queries the official public Codeforces REST API (<code>codeforces.com/api/user.info</code>). No password or tokens required.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={cfHandle}
              onChange={(e) => setCfHandle(e.target.value)}
              placeholder="e.g. tourist, petr, your_handle"
              className="flex-1 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#f0f6fc] focus:outline-none focus:border-[#58a6ff]"
            />
            <button
              onClick={handleConnectCodeforces}
              disabled={savingCf || !cfHandle.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] rounded-lg transition disabled:opacity-50"
            >
              {savingCf ? 'Verifying...' : 'Link Handle'}
            </button>
          </div>
          {cfError && (
            <p className="text-xs text-[#f85149] font-medium">{cfError}</p>
          )}
        </div>
      )}

      {/* Platform Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {profiles.map((p) => (
          <div
            key={p.platform}
            className="p-5 rounded-xl border border-[#30363d] bg-[#161b22]/50 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d]">
                    {getPlatformIcon(p.platform)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#f0f6fc] capitalize">
                      {p.platform}
                    </h3>
                    <span className="text-xs text-[#8b949e] font-mono">
                      @{p.handle || 'Not Connected'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                    p.connected
                      ? 'text-[#3fb950] bg-[#238636]/10 border-[#3fb950]/30'
                      : 'text-[#8b949e] bg-[#21262d] border-[#30363d]'
                  }`}
                >
                  {p.connected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>

              {/* Platform metrics */}
              <div className="space-y-2 py-3 border-y border-[#30363d]/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8b949e]">Problems Solved</span>
                  <span className="font-bold text-[#f0f6fc] font-mono">
                    {p.totalSolved ?? 0}
                  </span>
                </div>
                {p.rating !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">Current Rating</span>
                    <span className="font-bold text-[#58a6ff] font-mono">
                      {p.rating}
                    </span>
                  </div>
                )}
                {p.rank && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8b949e]">Rank / Title</span>
                    <span className="font-semibold text-[#bc8cff] font-mono text-[11px]">
                      {p.rank}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-[#8b949e]">
              <span>Last Synced</span>
              <span className="font-mono">
                {p.lastSyncedAt
                  ? new Date(p.lastSyncedAt).toLocaleDateString()
                  : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Unified Chronological Activity Timeline */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22]/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#f0f6fc] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#58a6ff]" />
            Unified Activity Feed
          </h2>
          <span className="text-xs text-[#8b949e] font-mono">
            Chronological across all platforms
          </span>
        </div>

        {timeline.length === 0 ? (
          <p className="text-xs text-[#8b949e] py-8 text-center">
            No activity events recorded yet. Solve a LeetCode problem or push a commit to populate this feed.
          </p>
        ) : (
          <div className="space-y-2.5">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-[#30363d]/70 bg-[#0d1117] flex items-center justify-between hover:border-[#58a6ff]/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#161b22] border border-[#30363d]/60">
                    {getPlatformIcon(item.platform)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#f0f6fc]">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#8b949e]">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#21262d] text-[#3fb950] font-mono border border-[#3fb950]/20">
                    Verified
                  </span>
                  <div className="text-[10px] text-[#8b949e] font-mono mt-1">
                    {new Date(item.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
