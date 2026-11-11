import React, { useEffect, useState, useCallback } from 'react';
import {
  ExternalLink,
  RotateCw,
  Check,
  Github,
  Globe,
  ShieldCheck,
  Settings,
  AlertTriangle,
  Flame,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type {
  ExtensionConfig,
  DetectedSubmission,
  ActiveProblemContext
} from '../shared/types';
import { StorageManager, DEFAULT_SERVER_URL, DEFAULT_WEB_APP_URL } from '../shared/storage';
import { fetchAndSyncCanonicalState } from '../shared/backendSync';

interface LeetCodeStats {
  username: string;
  realName?: string;
  avatarUrl?: string;
  ranking: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSubmissions?: number;
  acceptanceRate?: number;
  lastSyncedAt?: string;
}

export function App() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [activeProblem, setActiveProblem] = useState<ActiveProblemContext | undefined>();
  const [syncedHistory, setSyncedHistory] = useState<DetectedSubmission[]>([]);
  const [pendingQueue, setPendingQueue] = useState<DetectedSubmission[]>([]);
  const [leetcodeStats, setLeetcodeStats] = useState<LeetCodeStats | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnLeetCode, setIsOnLeetCode] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showQueueDetails, setShowQueueDetails] = useState<boolean>(false);

  const loadLocalState = useCallback(async () => {
    try {
      const [cfg, prob, history, queue] = await Promise.all([
        StorageManager.getConfig(),
        StorageManager.getActiveProblem(),
        StorageManager.getSyncedHistory(),
        StorageManager.getPendingQueue()
      ]);
      setConfig(cfg);
      setActiveProblem(prob);
      setSyncedHistory(history);
      setPendingQueue(queue);
    } catch (err) {
      console.warn('Failed to load local extension storage:', err);
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const [cfg, prob, history, queue] = await Promise.all([
        StorageManager.getConfig(),
        StorageManager.getActiveProblem(),
        StorageManager.getSyncedHistory(),
        StorageManager.getPendingQueue()
      ]);

      setConfig(cfg);
      setActiveProblem(prob);
      setSyncedHistory(history);
      setPendingQueue(queue);

      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          void chrome.runtime?.lastError;
          const url = tabs?.[0]?.url || '';
          setIsOnLeetCode(url.includes('leetcode.com'));
        });

        // If extension lacks a token, gently ask any already-open StreakForge dashboard tab to pair
        if (!cfg.authToken) {
          chrome.tabs.query({}, (allTabs) => {
            void chrome.runtime?.lastError;
            for (const t of allTabs || []) {
              if (
                t.id &&
                t.url &&
                (t.url.startsWith('https://streak-forge-six.vercel.app') ||
                  t.url.startsWith('http://localhost:3000'))
              ) {
                chrome.tabs.sendMessage(t.id, { type: 'REQUEST_BRIDGE_PAIR' }).catch(() => {});
              }
            }
          });
        }
      }

      const sUrl = (cfg.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
      if (cfg.authToken) {
        await Promise.allSettled([
          fetchAndSyncCanonicalState(cfg.authToken, sUrl, {
            fetchHistory: false,
            allowRefresh: false
          }).then(() => loadLocalState()),
          fetch(`${sUrl}/api/v1/sync/leetcode/profile-stats`, {
            headers: { Authorization: `Bearer ${cfg.authToken}` },
            signal: AbortSignal.timeout(10000)
          })
            .then(async (pRes) => {
              if (pRes.ok) {
                const pJson = await pRes.json();
                if (pJson.data) setLeetcodeStats(pJson.data);
              }
            })
            .catch(() => {})
        ]);
      }
    } catch (err) {
      console.warn('Failed to load extension popup state:', err);
    }
  }, [loadLocalState]);

  useEffect(() => {
    loadState();

    // Ask background worker to refresh full history + reconcile queue without blocking initial UI
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'SYNC_FROM_BACKEND' }, () => {
        void chrome.runtime?.lastError;
        loadLocalState();
      });
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && (changes.config || changes.pendingQueue || changes.syncedHistory)) {
        loadLocalState();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    const interval = setInterval(loadLocalState, 2500);
    return () => {
      clearInterval(interval);
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, [loadState, loadLocalState]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleToggleSetting = async (
    key: 'autoSyncEnabled' | 'exportNewOnly' | 'allowMultipleSubmissions' | 'addSolutionComments'
  ) => {
    if (!config) return;
    const nextVal = !Boolean(config[key]);
    let patchLocal: Partial<ExtensionConfig> = { [key]: nextVal };
    let backendPatch: Record<string, any> = {};

    if (key === 'autoSyncEnabled') {
      backendPatch = { autoSyncEnabled: nextVal };
    } else if (key === 'exportNewOnly') {
      patchLocal = {
        exportNewOnly: nextVal,
        allowMultipleSubmissions: nextVal ? false : config.allowMultipleSubmissions,
        exportPolicy: nextVal ? 'NEW_ONLY' : 'ALLOW_MULTIPLE'
      };
      backendPatch = { exportPolicy: nextVal ? 'NEW_ONLY' : 'ALLOW_MULTIPLE' };
    } else if (key === 'allowMultipleSubmissions') {
      patchLocal = {
        allowMultipleSubmissions: nextVal,
        exportNewOnly: nextVal ? false : config.exportNewOnly,
        exportPolicy: nextVal ? 'ALLOW_MULTIPLE' : 'LATEST_ONLY'
      };
      backendPatch = { exportPolicy: nextVal ? 'ALLOW_MULTIPLE' : 'LATEST_ONLY' };
    } else if (key === 'addSolutionComments') {
      backendPatch = { includeHeader: nextVal };
    }

    const updated = await StorageManager.updateConfig(patchLocal);
    setConfig(updated);

    if (config.authToken && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'PUSH_PREFERENCES_TO_BACKEND',
        payload: { syncPreferences: backendPatch }
      });
    }
    showStatus('Preference synced across devices');
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    const sUrl = (config?.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, '');
    if (!config?.authToken) {
      setIsSyncing(false);
      showStatus('Sign in on StreakForge dashboard to sync.');
      return;
    }

    try {
      // 1. Capture active LeetCode tab if viewing an Accepted verdict
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const activeTab = await new Promise<chrome.tabs.Tab | undefined>((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            void chrome.runtime?.lastError;
            resolve(tabs?.[0]);
          });
        });

        if (activeTab?.id && activeTab.url?.includes('leetcode.com')) {
          const captureResp = await new Promise<any>((resolve) => {
            chrome.tabs.sendMessage(
              activeTab.id!,
              { type: 'MANUAL_CAPTURE_REQUEST' },
              (resp) => {
                void chrome.runtime?.lastError;
                resolve(resp);
              }
            );
          });

          const p = captureResp?.payload;
          if (captureResp?.success && p?.problem && p?.code && p?.result?.verdict === 'Accepted') {
            await new Promise<void>((resolve) => {
              chrome.runtime.sendMessage(
                {
                  type: 'LEETCODE_SUBMISSION_DETECTED',
                  payload: {
                    submissionId: p.result.submissionId || `manual-${Date.now()}`,
                    questionId: p.problem.id,
                    questionTitle: p.problem.title,
                    questionSlug: p.problem.slug,
                    difficulty: p.problem.difficulty,
                    language: p.language,
                    code: p.code,
                    runtimeMs: p.result.runtimeMs || 0,
                    runtimePercentile: p.result.runtimePercentile || 0,
                    memoryBytes: p.result.memoryBytes || 0,
                    memoryPercentile: p.result.memoryPercentile || 0,
                    verdict: 'Accepted',
                    topicTags: p.problem.topicTags,
                    submittedAt: new Date().toISOString(),
                    state: 'DETECTED'
                  }
                },
                () => {
                  void chrome.runtime?.lastError;
                  resolve();
                }
              );
            });
          }
        }
      }

      // 2. Refresh LeetCode stats on backend
      await fetch(`${sUrl}/api/v1/sync/leetcode/profile-stats/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.authToken}`
        },
        body: JSON.stringify(config.leetcodeUsername ? { username: config.leetcodeUsername } : {}),
        signal: AbortSignal.timeout(12000)
      }).catch(() => {});

      // 3. Process pending retries in SW & reload full canonical state
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await new Promise<void>((resolve) => {
          chrome.runtime.sendMessage({ type: 'FORCE_SYNC_PENDING' }, () => {
            void chrome.runtime?.lastError;
            resolve();
          });
        });
      }

      await loadState();
      showStatus('Synchronization complete');
    } catch {
      showStatus('Sync failed — check connection and retry.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = async (submissionId?: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await new Promise<void>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_QUEUE', payload: { submissionId } }, () => {
          void chrome.runtime?.lastError;
          resolve();
        });
      });
    } else if (submissionId) {
      const q = await StorageManager.getPendingQueue();
      await StorageManager.setPendingQueue(q.filter((item) => item.submissionId !== submissionId));
    } else {
      await StorageManager.setPendingQueue([]);
    }
    await loadLocalState();
    showStatus(submissionId ? 'Removed queued item' : 'Cleared local retry queue');
  };

  const openUrl = (url: string) => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  const webAppUrl = config?.webAppUrl || DEFAULT_WEB_APP_URL;

  const openDashboard = () => openUrl(webAppUrl);
  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      openUrl(`${webAppUrl}/?tab=settings`);
    }
  };

  const handleLogout = async () => {
    if (confirm('Sign out from StreakForge extension?')) {
      const updated = await StorageManager.updateConfig({
        authToken: '',
        authState: 'UNAUTHENTICATED',
        userProfile: undefined,
        targetRepoFullName: '',
        metrics: undefined,
        lastSyncedSubmission: null,
        lastBackendSyncAt: undefined
      });
      await StorageManager.setSyncedHistory([]);
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'CLEAR_AUTH_TOKEN' }, () => {
          void chrome.runtime?.lastError;
        });
      }
      setConfig(updated);
      setSyncedHistory([]);
      setLeetcodeStats(null);
      showStatus('Signed out');
    }
  };

  const easyCount = leetcodeStats?.easySolved ?? 0;
  const mediumCount = leetcodeStats?.mediumSolved ?? 0;
  const hardCount = leetcodeStats?.hardSolved ?? 0;
  const uniqueSolved =
    config?.metrics?.uniqueProblemsSolved ??
    leetcodeStats?.totalSolved ??
    easyCount + mediumCount + hardCount;

  const verifiedExportedList = syncedHistory.filter(
    (s) => s.state === 'SYNCED' && Boolean(s.commitSha)
  );
  const exportedCount = config?.metrics?.exportedCount ?? verifiedExportedList.length;

  const localPendingItems = pendingQueue.filter((q) => q.state !== 'SYNCED');
  const localIds = new Set(localPendingItems.map((q) => String(q.submissionId)));
  const historyUnresolved = syncedHistory.filter(
    (h) =>
      (h.state === 'FAILED' || h.state === 'EXPORT_PENDING' || h.state === 'RETRY_PENDING') &&
      !localIds.has(String(h.submissionId))
  );
  const backendPendingTotal =
    (config?.metrics?.pendingCount ?? 0) + (config?.metrics?.failedCount ?? 0);
  const queuedPendingCount =
    syncedHistory.length > 0
      ? localPendingItems.length + historyUnresolved.length
      : Math.max(localPendingItems.length, backendPendingTotal);

  const lastSynced =
    verifiedExportedList.length > 0
      ? verifiedExportedList[0]
      : config?.lastSyncedSubmission
        ? {
            questionTitle: config.lastSyncedSubmission.questionTitle,
            language: config.lastSyncedSubmission.language,
            commitUrl: config.lastSyncedSubmission.commitUrl
          }
        : null;
  const username = config?.userProfile?.username;
  const targetRepo = config?.targetRepoFullName;
  const targetBranch = config?.targetBranch || 'main';
  const authState = !config?.authToken
    ? 'UNAUTHENTICATED'
    : config.authState === 'EXPIRED' || config.authState === 'NETWORK_ERROR'
      ? config.authState
      : 'AUTHENTICATED';

  return (
    <div className="w-[368px] bg-[#0d1117] text-[#f0f6fc] font-sans select-none flex flex-col shadow-2xl text-xs overflow-hidden border border-[#30363d]">
      {/* 1. Header */}
      <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-[#238636] flex items-center justify-center text-white">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span className="text-sm font-bold tracking-tight text-[#f0f6fc]">
            StreakForge <span className="text-[#3fb950] font-mono text-[10px]">v4.0</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={openOptions}
            className="text-[#8b949e] hover:text-[#f0f6fc] p-1 rounded hover:bg-[#21262d] transition cursor-pointer"
            title="Extension Settings, Notifications & Import"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={openDashboard}
            className="text-xs text-[#8b949e] hover:text-[#58a6ff] font-medium flex items-center gap-1 transition cursor-pointer"
            title="Open Web Dashboard"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-2.5">
        {/* Auth State Banner when unauthenticated, expired, or backend offline */}
        {authState !== 'AUTHENTICATED' && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
              authState === 'EXPIRED'
                ? 'bg-[#f85149]/10 border-[#f85149]/40 text-[#ff7b72]'
                : authState === 'NETWORK_ERROR'
                  ? 'bg-[#d29922]/10 border-[#d29922]/40 text-[#e3b341]'
                  : 'bg-[#1f6feb]/10 border-[#388bfd]/40 text-[#79c0ff]'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {config?.authErrorReason ||
                  (authState === 'UNAUTHENTICATED'
                    ? 'Sign in on web dashboard to link GitHub'
                    : 'Session attention required')}
              </span>
            </div>
            <button
              onClick={openDashboard}
              className="px-2 py-0.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#f0f6fc] font-semibold text-[10px] flex-shrink-0 cursor-pointer"
            >
              Open Web
            </button>
          </div>
        )}

        {/* 2. Authentic Profile & Difficulty Card */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full ${
                  config?.leetcodeUsername || leetcodeStats?.username
                    ? 'bg-[#3fb950]'
                    : 'bg-gray-500'
                }`}
              />
              <span className="font-semibold text-xs text-[#f0f6fc] truncate">
                {leetcodeStats?.username || config?.leetcodeUsername
                  ? `@${leetcodeStats?.username || config?.leetcodeUsername}`
                  : 'Connect LeetCode Profile'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span
                className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#f0883e] border border-[#30363d] flex items-center gap-1"
                title={`Current streak: ${config?.metrics?.currentStreak ?? 0}d • Best: ${config?.metrics?.longestStreak ?? 0}d`}
              >
                <Flame className="w-2.5 h-2.5" />
                {config?.metrics?.currentStreak ?? 0}d
              </span>
              {leetcodeStats?.ranking ? (
                <span className="px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                  #{leetcodeStats.ranking.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Easy / Medium / Hard + Exported */}
          <div className="grid grid-cols-4 gap-1.5 py-2.5 text-center">
            <div className="bg-[#0d1117] rounded-md p-1.5 border border-[#30363d]/60">
              <span className="text-[9px] text-[#8b949e] block">Easy</span>
              <span className="text-sm font-bold text-[#3fb950] tabular-nums">{easyCount}</span>
            </div>
            <div className="bg-[#0d1117] rounded-md p-1.5 border border-[#30363d]/60">
              <span className="text-[9px] text-[#8b949e] block">Med</span>
              <span className="text-sm font-bold text-[#d29922] tabular-nums">{mediumCount}</span>
            </div>
            <div className="bg-[#0d1117] rounded-md p-1.5 border border-[#30363d]/60">
              <span className="text-[9px] text-[#8b949e] block">Hard</span>
              <span className="text-sm font-bold text-[#f85149] tabular-nums">{hardCount}</span>
            </div>
            <div className="bg-[#0d1117] rounded-md p-1.5 border border-[#30363d]/60">
              <span className="text-[9px] text-[#8b949e] block">Pushed</span>
              <span className="text-sm font-bold text-[#58a6ff] tabular-nums">{exportedCount}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#8b949e] pt-1">
            <span>
              Unique Solved: <strong className="text-[#f0f6fc]">{uniqueSolved}</strong>
            </span>
            {queuedPendingCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowQueueDetails((v) => !v)}
                className="text-[#d29922] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                title="Inspect pending/failed queue items"
              >
                <span>{queuedPendingCount} pending/failed</span>
                {showQueueDetails ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="text-[#3fb950]">All caught up</span>
            )}
          </div>

          {showQueueDetails && (localPendingItems.length > 0 || queuedPendingCount > 0) && (
            <div className="mt-2 pt-2 border-t border-[#30363d] space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#8b949e] font-semibold">
                  Retry Queue ({localPendingItems.length} local)
                </span>
                {localPendingItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleClearQueue()}
                    className="text-[#f85149] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Clear Queue</span>
                  </button>
                )}
              </div>
              {localPendingItems.slice(0, 4).map((q) => (
                <div
                  key={q.submissionId}
                  className="p-1.5 rounded bg-[#0d1117] border border-[#30363d]/70 flex items-center justify-between gap-2 text-[10px]"
                >
                  <div className="min-w-0">
                    <div className="text-[#f0f6fc] font-medium truncate">
                      {q.questionTitle} ({q.language})
                    </div>
                    {q.errorMessage && (
                      <div className="text-[#d29922] truncate text-[9px]">{q.errorMessage}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleClearQueue(q.submissionId)}
                    className="text-[#8b949e] hover:text-[#f85149] flex-shrink-0 cursor-pointer"
                    title="Remove from local queue"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {localPendingItems.length === 0 && historyUnresolved.length > 0 && (
                <div className="text-[10px] text-[#8b949e]">
                  {historyUnresolved.length} unresolved record(s) tracked in dashboard LeetCode Activity.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active LeetCode Problem Context */}
        {isOnLeetCode && activeProblem && (
          <div className="px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-between text-[11px]">
            <span className="text-[#8b949e]">Active:</span>
            <span className="font-medium text-[#f0f6fc] truncate max-w-[240px]">
              {activeProblem.id !== '0' ? `${activeProblem.id}. ` : ''}
              {activeProblem.title}
            </span>
          </div>
        )}

        {statusMessage && (
          <div className="p-2 bg-[#238636]/15 border border-[#238636]/30 text-[#3fb950] text-[11px] rounded-md text-center font-medium">
            {statusMessage}
          </div>
        )}

        {/* 3. Essential Sync Toggles */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#8b949e] uppercase tracking-wider">
            <span>Auto-Sync Controls</span>
            <ShieldCheck className="w-3.5 h-3.5 text-[#3fb950]" />
          </div>

          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs text-[#c9d1d9]">Auto-sync accepted submissions</span>
            <input
              type="checkbox"
              checked={config?.autoSyncEnabled !== false}
              onChange={() => handleToggleSetting('autoSyncEnabled')}
              className="accent-[#238636] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs text-[#c9d1d9]">New problems only (skip re-solves)</span>
            <input
              type="checkbox"
              checked={Boolean(config?.exportNewOnly)}
              onChange={() => handleToggleSetting('exportNewOnly')}
              className="accent-[#238636] w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 cursor-pointer">
            <span className="text-xs text-[#c9d1d9]">Include header &amp; stats comments</span>
            <input
              type="checkbox"
              checked={config?.addSolutionComments !== false}
              onChange={() => handleToggleSetting('addSolutionComments')}
              className="accent-[#238636] w-4 h-4 cursor-pointer"
            />
          </label>

          <div className="pt-2 border-t border-[#30363d] flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#8b949e] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {config?.lastBackendSyncAt
                ? `Updated ${new Date(config.lastBackendSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Not synced yet'}
            </span>
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="px-3 py-1 bg-[#238636] hover:bg-[#2ea043] text-white rounded-md font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* 4. GitHub Identity, Repo & Last Synced Commit */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#8b949e]">GitHub Account</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[#f0f6fc]">
                {username ? `@${username}` : 'Not connected'}
              </span>
              {config?.tokenHealthStatus && config.tokenHealthStatus !== 'VALID' && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-[#f85149]/20 text-[#ff7b72]">
                  {config.tokenHealthStatus}
                </span>
              )}
              {config?.authToken && (
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-[#f85149] hover:underline cursor-pointer"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] gap-2">
            <span className="text-[#8b949e] flex-shrink-0">Repo</span>
            {targetRepo ? (
              <div className="flex items-center gap-1.5 min-w-0 justify-end">
                <a
                  href={`https://github.com/${targetRepo}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`${targetRepo} (${targetBranch})`}
                  className="font-mono text-[#58a6ff] hover:underline truncate"
                >
                  {targetRepo}
                </a>
                <span className="px-1 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[9px] font-mono text-[#8b949e] flex-shrink-0">
                  {targetBranch}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[#8b949e]">None selected</span>
            )}
          </div>

          <div className="pt-1.5 border-t border-[#30363d] flex items-center justify-between text-[11px] gap-2">
            <span className="text-[#8b949e] flex-shrink-0">Last Commit:</span>
            {lastSynced ? (
              <a
                href={
                  lastSynced.commitUrl ||
                  (targetRepo ? `https://github.com/${targetRepo}` : '#')
                }
                target="_blank"
                rel="noreferrer"
                className="text-[#3fb950] hover:underline font-semibold truncate flex items-center gap-1"
              >
                <span className="truncate">
                  {lastSynced.questionTitle} ({lastSynced.language})
                </span>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            ) : (
              <span className="text-[#8b949e]">None pushed yet</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Footer */}
      <div className="mt-auto px-4 py-2 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-[11px]">
        <button
          onClick={openOptions}
          className="text-[#c9d1d9] hover:text-[#58a6ff] font-medium cursor-pointer"
        >
          Notification &amp; Import Settings
        </button>

        {targetRepo ? (
          <a
            href={`https://github.com/${targetRepo}`}
            target="_blank"
            rel="noreferrer"
            className="text-[#58a6ff] hover:underline flex items-center gap-1 font-semibold"
          >
            <Github className="w-3.5 h-3.5" />
            <span>View Repo &rarr;</span>
          </a>
        ) : (
          <button
            onClick={() => openUrl(`${webAppUrl}/?tab=repos`)}
            className="text-[#58a6ff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Select Repo &rarr;</span>
          </button>
        )}
      </div>
    </div>
  );
}
