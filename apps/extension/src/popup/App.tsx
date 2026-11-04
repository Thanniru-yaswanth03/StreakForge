import React, { useEffect, useState, useCallback } from 'react';
import {
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  KeyRound,
  FolderGit2,
  Settings,
  AlertTriangle,
  XCircle,
  Code2,
  GitBranch,
  Play,
  RotateCw
} from 'lucide-react';
import type {
  ExtensionConfig,
  DetectedSubmission,
  ActiveProblemContext
} from '../shared/types';
import { StorageManager } from '../shared/storage';

export function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [activeProblem, setActiveProblem] = useState<ActiveProblemContext | undefined>();
  const [pendingQueue, setPendingQueue] = useState<DetectedSubmission[]>([]);
  const [syncedHistory, setSyncedHistory] = useState<DetectedSubmission[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Load state from Chrome Storage / Background Worker
  const loadState = useCallback(async () => {
    if (typeof chrome === 'undefined') return;
    try {
      const cfg = await StorageManager.getConfig();
      const prob = await StorageManager.getActiveProblem();
      const pending = await StorageManager.getPendingQueue();
      const history = await StorageManager.getSyncedHistory();

      setConfig(cfg);
      setActiveProblem(prob);
      setPendingQueue(pending);
      setSyncedHistory(history);
    } catch (err) {
      console.warn('Failed to load extension state:', err);
    }
  }, []);

  useEffect(() => {
    loadState();
    const interval = setInterval(loadState, 3000);
    return () => clearInterval(interval);
  }, [loadState]);

  // Toggle Auto-Sync
  const handleToggleAutoSync = async () => {
    if (!config) return;
    const newVal = !config.autoSyncEnabled;
    const updated = await StorageManager.updateConfig({ autoSyncEnabled: newVal });
    setConfig(updated);
    showNotice(newVal ? 'Auto-sync enabled' : 'Auto-sync paused');
  };

  // Force Sync Pending Queue
  const handleForceSync = () => {
    setIsSyncing(true);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'FORCE_SYNC_PENDING' }, () => {
        setTimeout(() => {
          loadState();
          setIsSyncing(false);
          showNotice('Synchronized pending queue');
        }, 800);
      });
    } else {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // Manual Capture & Sync from Current Tab
  const handleManualCapture = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    setIsCapturing(true);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url?.includes('leetcode.')) {
        showNotice('Please navigate to a LeetCode problem page');
        setIsCapturing(false);
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_CAPTURE_REQUEST' }, async (res) => {
        if (res && res.success && res.payload) {
          const { code, language, problem } = res.payload;
          if (!code || code.trim().length === 0) {
            showNotice('No code found in Monaco editor');
            setIsCapturing(false);
            return;
          }

          const submissionPayload: DetectedSubmission = {
            submissionId: `manual-${problem.slug}-${Date.now().toString().slice(-6)}`,
            questionId: problem.id,
            questionTitle: problem.title,
            questionSlug: problem.slug,
            difficulty: problem.difficulty,
            language,
            code,
            runtimeMs: 50,
            runtimePercentile: 80,
            memoryBytes: 16 * 1024 * 1024,
            memoryPercentile: 75,
            verdict: 'Accepted',
            topicTags: problem.topicTags || ['Algorithms'],
            submittedAt: new Date().toISOString(),
            state: 'DETECTED'
          };

          chrome.runtime.sendMessage(
            { type: 'LEETCODE_SUBMISSION_DETECTED', payload: submissionPayload },
            () => {
              loadState();
              setIsCapturing(false);
              showNotice(`Exporting manual capture for ${problem.title}...`);
            }
          );
        } else {
          showNotice('Could not connect to LeetCode page. Refresh page and retry.');
          setIsCapturing(false);
        }
      });
    } catch (err: any) {
      showNotice(`Capture failed: ${err.message}`);
      setIsCapturing(false);
    }
  };

  const showNotice = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const openOptionsPage = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  const openDashboard = () => {
    const url = config?.serverUrl || 'http://localhost:3000';
    window.open(url, '_blank');
  };

  // Count unique problems solved
  const uniqueProblemIds = new Set(syncedHistory.map((s) => s.questionId));
  const latestSubmission = syncedHistory[0];

  return (
    <div className="p-4 flex flex-col gap-3.5 text-xs bg-slate-950 text-slate-100 w-[380px] min-h-[520px] font-sans select-none">
      {/* Top App Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs shadow-xs">
            SF
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block leading-none">
              StreakForge
            </span>
            <span className="text-[10px] text-slate-400">LeetCode Sync</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status pill */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              config?.authToken
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                config?.authToken ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{config?.authToken ? 'Linked' : 'Not Linked'}</span>
          </div>

          <button
            onClick={openOptionsPage}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Open Extension Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Action Notice Banner */}
      {actionMessage && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-[11px] font-medium animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* Auth Setup Callout if Token Missing */}
      {!config?.authToken && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Connect to StreakForge Dashboard</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Authentication token required to push genuine LeetCode solutions to your GitHub repository.
          </p>
          <button
            onClick={openOptionsPage}
            className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition"
          >
            Configure Token &amp; Target Repo
          </button>
        </div>
      )}

      {/* Status Bar: GitHub Target & LeetCode Account */}
      {config?.authToken && (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">Target GitHub Repo</div>
              <div className="font-mono text-slate-200 font-semibold truncate">
                {config.targetRepoFullName || 'Auto-detecting...'}
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">Unique Solved</div>
              <div className="font-semibold text-slate-200">
                {uniqueProblemIds.size} Problems
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Active Problem on Screen */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-medium">Currently Viewed Problem</span>
          {activeProblem ? (
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeProblem.difficulty === 'Easy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : activeProblem.difficulty === 'Medium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {activeProblem.difficulty}
            </span>
          ) : (
            <span className="text-slate-500 font-mono text-[10px]">No Tab Active</span>
          )}
        </div>

        {activeProblem ? (
          <div>
            <div className="font-bold text-slate-100 text-xs truncate">
              {activeProblem.id}. {activeProblem.title}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
              <span>Lang: {activeProblem.language}</span>
              <span>•</span>
              <span>Topic: {activeProblem.topicTags?.[0] || 'Algorithms'}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            Navigate to any problem on leetcode.com to begin automatic tracking.
          </p>
        )}

        <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
          <button
            onClick={handleManualCapture}
            disabled={isCapturing}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition disabled:opacity-50"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCapturing ? 'Capturing...' : 'Capture Editor & Sync'}</span>
          </button>
        </div>
      </div>

      {/* Sync Controls & Queue Overview */}
      <div className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAutoSync}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
              config?.autoSyncEnabled
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {config?.autoSyncEnabled ? 'Auto-Sync ON' : 'Auto-Sync PAUSED'}
          </button>
          <span className="text-[11px] text-slate-400">
            {pendingQueue.length} pending
          </span>
        </div>

        <button
          onClick={handleForceSync}
          disabled={isSyncing}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Now</span>
        </button>
      </div>

      {/* Recent Submissions History */}
      <div className="flex-1 flex flex-col min-h-0 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
          <span>Recent Submissions ({syncedHistory.length})</span>
          <span className="text-[10px] text-slate-500">Auto-Committed</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[170px] space-y-1.5 pr-0.5">
          {syncedHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-500 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 text-[11px]">
              No submissions synchronized yet. Solve a problem on LeetCode to see genuine commits!
            </div>
          ) : (
            syncedHistory.slice(0, 5).map((sub, idx) => (
              <div
                key={sub.submissionId || idx}
                className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2 hover:bg-slate-800/40 transition"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex-shrink-0 ${
                      sub.difficulty === 'Easy'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : sub.difficulty === 'Medium'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {sub.difficulty}
                  </span>
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 text-xs truncate">
                      {sub.questionTitle}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {sub.language} • {sub.runtimeMs}ms
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {sub.commitUrl ? (
                    <a
                      href={sub.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-emerald-400 rounded transition"
                      title="View GitHub Commit"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                      Synced
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer link to Web Dashboard */}
      <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px] text-slate-400">
        <button
          onClick={openDashboard}
          className="hover:text-emerald-400 transition font-medium flex items-center gap-1"
        >
          <span>Open Web Dashboard</span>
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={openOptionsPage}
          className="hover:text-white transition"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
