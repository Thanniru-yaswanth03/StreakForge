'use client';

import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, X, GitCommit } from 'lucide-react';

export interface SyncToastData {
  title: string;
  language?: string;
  difficulty?: string;
  commitSha?: string;
  commitUrl?: string;
  repo?: string;
}

export function SyncToast() {
  const [toast, setToast] = useState<SyncToastData | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    // Request native browser desktop notification permissions gracefully
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission().catch(() => {});
      } catch {
        // Notification permission request skipped
      }
    }

    const showNotification = (data: SyncToastData) => {
      setToast(data);
      setVisible(true);

      // Trigger native browser notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const shortSha = data.commitSha ? data.commitSha.slice(0, 7) : 'verified';
          new Notification('StreakForge • Synced to GitHub!', {
            body: `${data.title} (${data.language || 'solution'}) committed [${shortSha}] to ${data.repo || 'LeetCodeHustle'}`,
            icon: '/favicon.ico'
          });
        } catch {
          // Native notification fallback
        }
      }

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setToast(null), 300);
      }, 6000);

      return () => clearTimeout(timer);
    };

    // 1. PostMessage from Chrome Extension Web Bridge
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STREAKFORGE_LIVE_SYNC_COMPLETED') {
        showNotification(event.data.payload || {
          title: 'LeetCode Solution',
          language: 'python3',
          repo: 'Thanniru-yaswanth03/LeetCodeHustle'
        });
      }
    };

    // 2. Custom DOM event dispatched within Web App
    const handleCustomSync = (event: Event) => {
      const customEvent = event as CustomEvent<SyncToastData>;
      if (customEvent.detail) {
        showNotification(customEvent.detail);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('streakforge:sync-success', handleCustomSync as EventListener);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('streakforge:sync-success', handleCustomSync as EventListener);
    };
  }, []);

  if (!toast) return null;

  const shortSha = toast.commitSha ? toast.commitSha.slice(0, 7) : 'verified';
  const commitLink = toast.commitUrl || (toast.repo ? `https://github.com/${toast.repo}` : 'https://github.com/Thanniru-yaswanth03/LeetCodeHustle');

  return (
    <div
      className={`fixed top-5 right-5 z-50 transition-all duration-300 ease-out transform ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="bg-[#0d1117] border border-[#238636] rounded-xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.8),0_0_24px_rgba(35,134,54,0.35)] text-slate-200 min-w-[320px] max-w-[420px] font-sans">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[#238636] flex items-center justify-center text-white shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span className="text-xs font-bold text-[#3fb950] tracking-wide">
              StreakForge Synced to GitHub!
            </span>
          </div>

          <button
            onClick={() => {
              setVisible(false);
              setTimeout(() => setToast(null), 300);
            }}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 text-xs font-semibold text-white flex items-center gap-2">
          <span>{toast.title}</span>
          {toast.language && (
            <span className="text-[10px] font-normal text-slate-400 font-mono bg-white/[0.05] px-1.5 py-0.5 rounded">
              {toast.language}
            </span>
          )}
          {toast.difficulty && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                toast.difficulty.toLowerCase() === 'easy'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : toast.difficulty.toLowerCase() === 'medium'
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-red-400 bg-red-500/10'
              }`}
            >
              {toast.difficulty}
            </span>
          )}
        </div>

        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 truncate max-w-[220px]">
            <GitCommit className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">{toast.repo || 'Thanniru-yaswanth03/LeetCodeHustle'}</span>
          </div>

          <a
            href={commitLink}
            target="_blank"
            rel="noreferrer"
            className="text-[#58a6ff] hover:text-[#79c0ff] font-medium flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Commit {shortSha}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

