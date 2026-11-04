'use client';

import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';

export function NotificationsView() {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications
  } = useData();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'WARNINGS'>('ALL');

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

