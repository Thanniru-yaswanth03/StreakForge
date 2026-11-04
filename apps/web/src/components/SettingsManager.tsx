'use client';

import React, { useState } from 'react';
import { Settings, Globe, Bell, KeyRound, Copy, Check } from 'lucide-react';
import type { User } from '@streakforge/shared-types';
import { api } from '../lib/api';
import { getStoredToken } from '../lib/utils';

interface SettingsManagerProps {
  user: User | null;
  onRefresh: () => void;
}

export function SettingsManager({ user, onRefresh }: SettingsManagerProps) {
  const [timezone, setTimezone] = useState<string>(user?.timezone || 'UTC');
  const [goal, setGoal] = useState<number>(user?.streakGoalPerDay || 1);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const token = getStoredToken() || '';

  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Australia/Sydney'
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.auth.updatePreferences({
        timezone,
        streakGoalPerDay: goal
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      onRefresh();
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Timezone & Preferences */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          General Preferences
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure time boundaries and consistency thresholds
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-slate-400" />
              Primary Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            >
              {commonTimezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Used to calculate streak day cutoffs and midnight countdowns accurately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Daily Streak Goal (Minimum Activities)
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Number of verified Git commits or LeetCode solutions required per day to sustain your streak.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : savedSuccess ? 'Preferences Saved!' : 'Save Preferences'}
          </button>
        </form>
      </div>

      {/* Chrome Extension Token */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-400" />
          Chrome Extension Pairing
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Copy your session token and paste it into the StreakForge Chrome extension popup
        </p>

        <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
          <input
            type="password"
            readOnly
            value={token || 'Not logged in'}
            className="bg-transparent font-mono text-xs text-slate-400 flex-1 outline-none select-all truncate"
          />
          <button
            onClick={handleCopyToken}
            disabled={!token}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
