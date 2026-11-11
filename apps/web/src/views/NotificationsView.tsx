'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  ShieldCheck,
  Clock,
  RotateCw
} from 'lucide-react';
import type { StreakReminder } from '@streakforge/shared-types';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';

export function NotificationsView() {
  const {
    user,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    refreshData
  } = useData();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'WARNINGS'>('ALL');
  const [reminders, setReminders] = useState<StreakReminder[]>([]);
  const [isLoadingReminders, setIsLoadingReminders] = useState<boolean>(false);
  const [browserPerm, setBrowserPerm] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const np = user?.notificationPreferences || ({} as any);
  const [savingPref, setSavingPref] = useState<boolean>(false);

  const toggleNotifCategory = async (key: string) => {
    setSavingPref(true);
    try {
      await api.auth.updatePreferences({
        notificationPreferences: {
          [key]: np[key] === false ? true : false
        }
      });
      await refreshData();
    } finally {
      setSavingPref(false);
    }
  };

  const requestBrowserNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserPerm(perm);
    }
  };

  useEffect(() => {
    setIsLoadingReminders(true);
    api.analytics
      .getReminders()
      .then((rems) => setReminders(rems))
      .catch(() => setReminders([]))
      .finally(() => setIsLoadingReminders(false));
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'WARNINGS') return n.type === 'STREAK_WARNING' || n.type === 'EXPORT_FAILURE';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'STREAK_WARNING':
        return <Flame className="w-4 h-4 text-amber-500" />;
      case 'EXPORT_SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'EXPORT_FAILURE':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'AGENT_ALERT':
        return <Laptop className="w-4 h-4 text-indigo-500" />;
      case 'SECURITY':
        return <ShieldCheck className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-theme-muted" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header & Batch Controls */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-theme-primary uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-theme-accent" />
            Notification Center
          </h2>
          <p className="text-xs text-theme-muted mt-0.5">
            Real-time alerts for streak warnings, automated export jobs, and agent events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-medium text-theme-primary transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>

          <button
            onClick={clearNotifications}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-rose-500/10 border border-theme-border rounded-lg text-xs font-medium text-theme-muted hover:text-rose-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Category & Browser Permission Settings */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold text-theme-primary uppercase tracking-wider">
            Notification Categories &amp; Browser Alerts
          </div>
          {browserPerm !== 'granted' && browserPerm !== 'unsupported' ? (
            <button
              type="button"
              onClick={requestBrowserNotifications}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
            >
              Enable Browser Notifications ({browserPerm})
            </button>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400">
              Browser permission: {browserPerm}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            { key: 'problemSolved', label: 'Problem Solved' },
            { key: 'syncSuccess', label: 'GitHub Sync Success' },
            { key: 'syncFailure', label: 'GitHub Sync Failure' },
            { key: 'dailySummary', label: 'Daily Summary' },
            { key: 'weeklyReport', label: 'Weekly Report' },
            { key: 'streakWarning', label: 'Streak Warning' }
          ].map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-2 p-2 bg-theme-elevated rounded-lg border border-theme-border cursor-pointer"
            >
              <input
                type="checkbox"
                disabled={savingPref}
                checked={np[c.key] !== false}
                onChange={() => toggleNotifCategory(c.key)}
              />
              <span className="text-theme-secondary">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'ALL', label: 'All Alerts', count: notifications.length },
          { id: 'UNREAD', label: 'Unread', count: notifications.filter((n) => !n.isRead).length },
          { id: 'WARNINGS', label: 'Streak & Warnings', count: notifications.filter((n) => n.type === 'STREAK_WARNING' || n.type === 'EXPORT_FAILURE').length }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === f.id
                ? 'bg-theme-accent text-slate-950 font-semibold shadow-xs'
                : 'bg-theme-surface border border-theme-border text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Active Streak Reminders Engine Section */}
      {reminders.length > 0 && (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
              Active Streak Reminders ({reminders.length})
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              TIMEZONE_AWARE_WATCHDOG
            </span>
          </div>

          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                  r.urgency === 'CRITICAL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : r.urgency === 'WARNING'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-theme-elevated border-theme-border text-theme-secondary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.type === 'NO_ACTIVITY_TODAY' && <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  {r.type === 'PENDING_LEETCODE_EXPORT' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                  {r.type === 'FAILED_GITHUB_SYNC' && <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                  {r.type === 'LOCAL_AGENT_DISCONNECTED' && <Laptop className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                  {r.type === 'UPCOMING_BACKUP' && <RotateCw className="w-4 h-4 text-purple-400 flex-shrink-0" />}

                  <div className="truncate">
                    <div className="font-semibold text-theme-primary truncate">{r.title}</div>
                    <div className="text-[11px] text-theme-muted mt-0.5">{r.message}</div>
                  </div>
                </div>

                {r.actionLink && (
                  <a
                    href={r.actionLink}
                    className="flex-shrink-0 px-2.5 py-1 bg-theme-surface hover:bg-theme-elevated border border-theme-border rounded-lg text-xs font-semibold text-theme-primary transition flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-theme-muted text-xs">
            No notifications matching the selected filter.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationAsRead(item.id)}
              className={`p-4 transition flex items-start justify-between gap-4 cursor-pointer ${
                item.isRead ? 'hover:bg-theme-elevated/40' : 'bg-theme-accent-subtle/30 hover:bg-theme-accent-subtle/50'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-theme-elevated rounded-lg flex-shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs ${item.isRead ? 'font-medium text-theme-primary' : 'font-bold text-theme-primary'}`}>
                      {item.title}
                    </h4>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-theme-accent" />
                    )}
                  </div>
                  <p className="text-xs text-theme-secondary mt-1">{item.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 text-right">
                <span className="text-[11px] text-theme-muted font-mono">{item.timestamp}</span>
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 hover:bg-theme-elevated text-theme-muted hover:text-theme-accent rounded transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

