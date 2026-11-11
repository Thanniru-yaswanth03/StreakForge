import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Trash2,
  Bell,
  Code2,
  ExternalLink,
  History
} from 'lucide-react';
import { SOLUTION_STRUCTURE_PRESETS } from '@streakforge/config';
import { StorageManager, DEFAULT_SERVER_URL, DEFAULT_WEB_APP_URL } from '../shared/storage';
import { DuplicateRegistry } from '../shared/duplicateRegistry';
import { resolveSolutionPath } from '../shared/templateResolver';
import type {
  ExtensionConfig,
  StateTransitionLog,
  ExtensionNotificationItem,
  DetectedSubmission
} from '../shared/types';

export function Options() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>(DEFAULT_SERVER_URL);
  const [targetRepo, setTargetRepo] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('main');
  const [template, setTemplate] = useState<string>('solutions/{difficulty}/{id}-{slug}');
  const [archiveFailed, setArchiveFailed] = useState<boolean>(true);
  const [notifySolved, setNotifySolved] = useState<boolean>(true);
  const [notifySuccess, setNotifySuccess] = useState<boolean>(true);
  const [notifyFailure, setNotifyFailure] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  const [permissionLevel, setPermissionLevel] = useState<string>('checking');
  const [notifications, setNotifications] = useState<ExtensionNotificationItem[]>([]);
  const [pendingQueue, setPendingQueue] = useState<DetectedSubmission[]>([]);
  const [registryCount, setRegistryCount] = useState<number>(0);
  const [transitionLogs, setTransitionLogs] = useState<StateTransitionLog[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadAll = useCallback(async () => {
    const [cfg, count, logs, notifs, queue] = await Promise.all([
      StorageManager.getConfig(),
      DuplicateRegistry.count(),
      StorageManager.getTransitionLogs(),
      StorageManager.getNotificationHistory(),
      StorageManager.getPendingQueue()
    ]);

    setConfig(cfg);
    setAuthToken(cfg.authToken || '');
    setServerUrl(cfg.serverUrl || DEFAULT_SERVER_URL);
    setTargetRepo(cfg.targetRepoFullName || '');
    setTargetBranch(cfg.targetBranch || 'main');
    setTemplate(cfg.folderStructureTemplate || 'solutions/{difficulty}/{id}-{slug}');
    setArchiveFailed(cfg.archiveFailedSubmissionsLocally !== false);
    setNotifySolved(cfg.notifyOnSolved !== false);
    setNotifySuccess(cfg.notifyOnSuccess !== false);
    setNotifyFailure(cfg.notifyOnSyncFailure !== false);
    setAutoSync(cfg.autoSyncEnabled !== false);
    setRegistryCount(count);
    setTransitionLogs(logs.slice(0, 20));
    setNotifications(notifs.slice(0, 25));
    setPendingQueue(queue);

    if (typeof chrome !== 'undefined' && chrome.notifications?.getPermissionLevel) {
      chrome.notifications.getPermissionLevel((level) => setPermissionLevel(level));
    } else {
      setPermissionLevel('unavailable');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const previewPath = resolveSolutionPath(template, {
    language: 'java',
    topic: 'Arrays',
    difficulty: 'Easy',
    questionId: '1',
    questionSlug: 'two-sum'
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await StorageManager.updateConfig({
      authToken: authToken.trim(),
      serverUrl: serverUrl.trim().replace(/\/+$/, ''),
      targetRepoFullName: targetRepo.trim(),
      targetBranch: targetBranch.trim() || 'main',
      folderStructureTemplate: template.trim(),
      archiveFailedSubmissionsLocally: archiveFailed,
      notifyOnSolved: notifySolved,
      notifyOnSuccess: notifySuccess,
      notifyOnSyncFailure: notifyFailure,
      autoSyncEnabled: autoSync
    });
    setConfig(updated);

    if (authToken.trim() && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'PUSH_PREFERENCES_TO_BACKEND',
        payload: {
          syncPreferences: {
            autoSyncEnabled: autoSync,
            folderPattern: template.trim()
          },
          notificationPreferences: {
            problemSolved: notifySolved,
            syncSuccess: notifySuccess,
            syncFailure: notifyFailure
          }
        }
      });
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!authToken.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid Bearer token.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const url = `${serverUrl.trim().replace(/\/+$/, '')}/api/v1/auth/me`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken.trim()}` },
        signal: AbortSignal.timeout(12000)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Authenticated as @${data.data?.user?.username || 'user'} (GitHub token: ${data.data?.user?.githubTokenHealth?.status || 'checked'})`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error?.message || `Authentication failed with status ${res.status}`
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: `Cannot reach API server: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestNotification = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'TEST_NOTIFICATION' }, () => {
        setTimeout(loadAll, 400);
      });
    }
  };

  const handleImportHistory = () => {
    if (!config?.authToken) {
      setImportStatus('Authenticate with StreakForge first before importing LeetCode history.');
      return;
    }
    setIsImporting(true);
    setImportStatus('Fetching accepted LeetCode submissions from your active leetcode.com session...');
    chrome.runtime.sendMessage(
      { type: 'IMPORT_LEETCODE_HISTORY', payload: { limit: 100, autoExportToGitHub: false } },
      (res) => {
        setIsImporting(false);
        if (!res?.success) {
          setImportStatus(res?.error || 'History import failed.');
          return;
        }
        const d = res.data || {};
        setImportStatus(
          `Imported ${d.importedCount || 0} accepted submission(s) (${d.skippedDuplicates || 0} already tracked). Visit LeetCode Sync on the dashboard to review or push to GitHub.`
        );
        loadAll();
      }
    );
  };

  const handleClearQueue = async () => {
    if (confirm('Clear local extension retry queue? Server records on the dashboard are unaffected.')) {
      await StorageManager.setPendingQueue([]);
      loadAll();
    }
  };

  const handleClearNotifications = async () => {
    await StorageManager.clearNotifications();
    setNotifications([]);
  };

  const handleClearRegistry = async () => {
    if (confirm('Clear local duplicate cache?')) {
      await DuplicateRegistry.clear();
      setRegistryCount(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-7 font-sans bg-slate-950 text-slate-100 min-h-screen">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-sm">
            SF
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              StreakForge V4 Extension Settings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Persistent auth, notifications, LeetCode session import, and GitHub path formatting
            </p>
          </div>
        </div>

        <a
          href={config?.webAppUrl || DEFAULT_WEB_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition"
        >
          <span>Open Web Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Auth & Server */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>StreakForge API &amp; Session Status</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Backend Server URL
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Session Bearer Token (auto-paired via Dashboard)
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>Verify Connection &amp; GitHub Token</span>
            </button>
            {testResult && (
              <span
                className={`text-xs font-medium flex items-center gap-1.5 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <span>{testResult.message}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Repository & Folder Structure */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <span>Target Repository &amp; Structure</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Repository (owner/repo)
              </label>
              <input
                type="text"
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                placeholder="owner/repo"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Branch</label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Folder / File Path Pattern
            </label>
            <input
              type="text"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SOLUTION_STRUCTURE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setTemplate(`${preset.folderPattern}/${preset.fileNamingPattern}`)}
                  className="px-2 py-1 text-[11px] bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-slate-300"
                >
                  {preset.example}
                </button>
              ))}
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1">
              <div className="text-[11px] text-slate-400 font-sans">Live Preview:</div>
              <div className="text-emerald-400">{previewPath.codeFilePath}</div>
              <div className="text-slate-400">{previewPath.readmeFilePath}</div>
            </div>
          </div>
        </div>

        {/* 3. Background Chrome Notifications & Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <span>Background Chrome Notifications</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300">
                Permission: <strong>{permissionLevel}</strong>
              </span>
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded text-emerald-400"
              >
                Send Test Notification
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySolved}
                onChange={(e) => setNotifySolved(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Notify when Accepted problem is detected</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySuccess}
                onChange={(e) => setNotifySuccess(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Notify on confirmed GitHub commit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyFailure}
                onChange={(e) => setNotifyFailure(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Notify on GitHub sync failure / auth expiry</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="accent-emerald-500"
              />
              <span>Automatic GitHub sync on solve</span>
            </label>
          </div>
        </div>

        {/* 4. Historical LeetCode Session Import */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Import Historical LeetCode Solutions</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Backfills previously solved accepted submissions with source code from your active{' '}
                <code>leetcode.com</code> browser session (up to 100 submissions per batch).
              </p>
            </div>
            <button
              type="button"
              onClick={handleImportHistory}
              disabled={isImporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Import Previous Solutions'}
            </button>
          </div>
          {importStatus && (
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
              {importStatus}
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Preferences Saved</span>
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* 5. Queue & Cache Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-amber-400" />
              Pending / Retry Queue ({pendingQueue.length})
            </h3>
            <button
              type="button"
              onClick={handleClearQueue}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Queued submissions retry automatically with exponential backoff every 5 minutes.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Duplicate Registry ({registryCount})
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Tracks verified commits to prevent redundant pushes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearRegistry}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-xs font-semibold rounded-lg"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* 6. Extension Notification History */}
      {notifications.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Notification History ({notifications.length})
            </h3>
            <button
              type="button"
              onClick={handleClearNotifications}
              className="text-xs text-slate-400 hover:text-rose-400"
            >
              Clear History
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-slate-200">{n.title}</span>
                  <span className="text-slate-400 ml-2">{n.message}</span>
                </div>
                <span className="text-[10px] text-slate-500 flex-shrink-0">
                  {new Date(n.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. State Transition Logs */}
      {transitionLogs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Recent Sync State Transitions
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto font-mono text-[11px]">
            {transitionLogs.map((log) => (
              <div
                key={log.id}
                className="p-1.5 bg-slate-950 border border-slate-800/80 rounded flex justify-between gap-2"
              >
                <span className="truncate">
                  {log.fromState} &rarr; <strong className="text-emerald-400">{log.toState}</strong>{' '}
                  {log.reason ? `(${log.reason})` : ''}
                </span>
                <span className="text-slate-500 text-[10px] flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
