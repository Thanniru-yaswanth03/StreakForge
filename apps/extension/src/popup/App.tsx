import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle, Clock, ExternalLink, RefreshCw, KeyRound, Globe } from 'lucide-react';
import type { LeetCodeSubmissionInput } from '@streakforge/shared-types';

export function App() {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:4000');
  const [inputToken, setInputToken] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncedList, setSyncedList] = useState<Array<LeetCodeSubmissionInput & { commitUrl?: string }>>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['authToken', 'serverUrl', 'pendingSubmissions', 'syncedSubmissions'], (res) => {
        if (res.authToken) setToken(res.authToken);
        if (res.serverUrl) setServerUrl(res.serverUrl);
        if (res.pendingSubmissions) setPendingCount(res.pendingSubmissions.length);
        if (res.syncedSubmissions) setSyncedList(res.syncedSubmissions);
      });
    }
  }, []);

  const handleSaveToken = () => {
    if (!inputToken.trim()) return;
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ authToken: inputToken.trim() }, () => {
        setToken(inputToken.trim());
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      });
    } else {
      setToken(inputToken.trim());
    }
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'FORCE_SYNC_PENDING' }, () => {
        setTimeout(() => {
          chrome.storage.local.get(['pendingSubmissions', 'syncedSubmissions'], (res) => {
            if (res.pendingSubmissions) setPendingCount(res.pendingSubmissions.length);
            if (res.syncedSubmissions) setSyncedList(res.syncedSubmissions);
            setIsSyncing(false);
          });
        }, 1000);
      });
    } else {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 text-sm bg-slate-900 text-slate-100 min-h-[440px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            SF
          </div>
          <span className="font-semibold text-base tracking-tight text-white">StreakForge</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-slate-400">{token ? 'Connected' : 'Setup Required'}</span>
        </div>
      </div>

      {/* Main Card */}
      {!token ? (
        <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-indigo-400 font-medium">
            <KeyRound className="w-4 h-4" />
            <span>Connect Account</span>
          </div>
          <p className="text-xs text-slate-400">
            Paste your StreakForge session token from the web dashboard to enable automatic GitHub synchronization.
          </p>
          <input
            type="password"
            placeholder="Paste Bearer Token..."
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSaveToken}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-medium text-xs transition"
          >
            {saveSuccess ? 'Saved!' : 'Save & Authenticate'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Active Sync</div>
              <div className="text-base font-bold text-slate-100">Verified</div>
            </div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Queue</div>
              <div className="text-base font-bold text-slate-100">{pendingCount} pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Recent Submissions</span>
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[160px] flex flex-col gap-1.5 pr-1">
          {syncedList.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              No recent solutions synced yet. Solve a problem on LeetCode to test!
            </div>
          ) : (
            syncedList.slice(0, 5).map((sub, i) => (
              <div
                key={i}
                className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-2 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sub.difficulty === 'Easy'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : sub.difficulty === 'Medium'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                        : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                    }`}
                  >
                    {sub.difficulty}
                  </span>
                  <span className="truncate text-xs font-medium text-slate-200">
                    {sub.questionTitle}
                  </span>
                </div>
                {sub.commitUrl ? (
                  <a
                    href={sub.commitUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-indigo-400 flex-shrink-0"
                    title="View GitHub Commit"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-slate-800 pt-3">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 rounded-lg font-medium text-xs transition border border-slate-700"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>Open StreakForge Dashboard</span>
        </a>
      </div>
    </div>
  );
}

