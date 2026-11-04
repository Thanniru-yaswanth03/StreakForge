import React, { useState, useEffect } from 'react';
import {
  Settings,
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
  Laptop,
  Flame,
  Archive,
  HelpCircle
} from 'lucide-react';
import { StorageManager } from '../shared/storage';
import { DuplicateRegistry } from '../shared/duplicateRegistry';
import { resolveSolutionPath } from '../shared/templateResolver';
import type {
  ExtensionConfig,
  StateTransitionLog,
  FailedSubmission
} from '../shared/types';

export function Options() {
  const [config, setConfig] = useState<ExtensionConfig | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('http://localhost:4000');
  const [targetRepo, setTargetRepo] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('main');
  const [template, setTemplate] = useState<string>(
    'leetcode-solutions/{Language}/{Topic}/{id}_{slug}{ext}'
  );
  const [archiveFailed, setArchiveFailed] = useState<boolean>(true);
  const [notifySuccess, setNotifySuccess] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);

  // Status & Telemetry
  const [registryCount, setRegistryCount] = useState<number>(0);
  const [transitionLogs, setTransitionLogs] = useState<StateTransitionLog[]>([]);
  const [failedArchive, setFailedArchive] = useState<FailedSubmission[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Load existing configuration
  useEffect(() => {
    (async () => {
      const cfg = await StorageManager.getConfig();
      setConfig(cfg);
      setAuthToken(cfg.authToken || '');
      setServerUrl(cfg.serverUrl || 'http://localhost:4000');
      setTargetRepo(cfg.targetRepoFullName || '');
      setTargetBranch(cfg.targetBranch || 'main');
      setTemplate(
        cfg.folderStructureTemplate ||
          'leetcode-solutions/{Language}/{Topic}/{id}_{slug}{ext}'
      );
      setArchiveFailed(cfg.archiveFailedSubmissionsLocally !== false);
      setNotifySuccess(cfg.notifyOnSuccess !== false);
      setAutoSync(cfg.autoSyncEnabled !== false);

      const count = await DuplicateRegistry.count();
      setRegistryCount(count);

      const logs = await StorageManager.getTransitionLogs();
      setTransitionLogs(logs.slice(0, 20));

      const failed = await StorageManager.getFailedArchive();
      setFailedArchive(failed.slice(0, 10));
    })();
  }, []);

  // Compute live path preview from template
  const previewPath = resolveSolutionPath(template, {
    language: 'python3',
    topic: 'Arrays',
    difficulty: 'Easy',
    questionId: '1',
    questionSlug: 'two-sum'
  });

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await StorageManager.updateConfig({
      authToken: authToken.trim(),
      serverUrl: serverUrl.trim().replace(/\/+$/, ''),
      targetRepoFullName: targetRepo.trim(),
      targetBranch: targetBranch.trim() || 'main',
      folderStructureTemplate: template.trim(),
      archiveFailedSubmissionsLocally: archiveFailed,
      notifyOnSuccess: notifySuccess,
      autoSyncEnabled: autoSync
    });
    setConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Test API Connection
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
        headers: {
          Authorization: `Bearer ${authToken.trim()}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Connected successfully as @${data.data?.user?.username || 'user'}`
        });

        // Save verified user profile
        if (data.data?.user) {
          await StorageManager.updateConfig({
            userProfile: {
              username: data.data.user.username,
              email: data.data.user.email,
              avatarUrl: data.data.user.avatarUrl
            }
          });
        }
      } else {
        setTestResult({
          success: false,
          message: data.error?.message || `Authentication failed with status ${res.status}`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Cannot connect to API server: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Clear duplicate cache
  const handleClearRegistry = async () => {
    if (confirm('Are you sure you want to clear the local duplicate registry?')) {
      await DuplicateRegistry.clear();
      setRegistryCount(0);
      alert('Duplicate registry cleared.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-sm">
            SF
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              StreakForge LeetCode Sync Settings
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure automatic authentic source-code export, path templates, and security rules
            </p>
          </div>
        </div>

        <a
          href={serverUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition"
        >
          <span>Open Web Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Authentication & API Endpoint */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>StreakForge API &amp; Authentication</span>
          </h2>
          <p className="text-xs text-slate-400">
            Copy your session token from the StreakForge web app (<span className="text-slate-200 font-mono">Settings &rarr; LeetCode Extension</span>).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                API Server URL
              </label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bearer Token
              </label>
              <input
                type="password"
                placeholder="Paste Bearer Token..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !authToken}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Verifying...' : 'Test Connection'}</span>
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

        {/* 2. Target Repository & Branch */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <span>Target GitHub Repository</span>
          </h2>
          <p className="text-xs text-slate-400">
            Specify the GitHub repository and branch where accepted LeetCode solutions will be committed.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Repository Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. username/leetcode-solutions"
                value={targetRepo}
                onChange={(e) => setTargetRepo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Branch
              </label>
              <input
                type="text"
                placeholder="main"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Folder Structure Customization with Live Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Folder Structure Template</span>
          </h2>
          <p className="text-xs text-slate-400">
            Customize how solution files and READMEs are structured in your GitHub repository.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Path Pattern Template
            </label>
            <input
              type="text"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Live Path Preview */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1 text-xs font-mono">
            <div className="text-[11px] text-slate-400 font-sans font-semibold">Live Preview (Example: Two Sum in Python):</div>
            <div className="text-emerald-400">📄 {previewPath.codeFilePath}</div>
            <div className="text-slate-400">📘 {previewPath.readmeFilePath}</div>
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            <div className="font-semibold text-slate-300">Available Template Variables:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
              <div><code className="text-emerald-400">&#123;Language&#125;</code> (e.g. Python3)</div>
              <div><code className="text-emerald-400">&#123;Topic&#125;</code> (e.g. Arrays)</div>
              <div><code className="text-emerald-400">&#123;Difficulty&#125;</code> (e.g. Easy)</div>
              <div><code className="text-emerald-400">&#123;id&#125;</code> (e.g. 001)</div>
              <div><code className="text-emerald-400">&#123;slug&#125;</code> (e.g. two-sum)</div>
              <div><code className="text-emerald-400">&#123;ext&#125;</code> (e.g. .py)</div>
            </div>
          </div>
        </div>

        {/* 4. Sync & Privacy Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Synchronization &amp; Privacy Preferences</span>
          </h2>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="mt-0.5 rounded text-emerald-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Enable Automatic Synchronization
                </span>
                <span className="text-[11px] text-slate-400">
                  Automatically export accepted solutions upon detection without requiring manual triggers.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={archiveFailed}
                onChange={(e) => setArchiveFailed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Archive Failed Attempts Locally in Extension
                </span>
                <span className="text-[11px] text-slate-400">
                  Maintains a private local record of Wrong Answer, TLE, and Compile Errors. Never pushed to GitHub.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifySuccess}
                onChange={(e) => setNotifySuccess(e.target.checked)}
                className="mt-0.5 rounded text-emerald-500"
              />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">
                  Desktop Notifications
                </span>
                <span className="text-[11px] text-slate-400">
                  Display a notification banner whenever a solution is committed to GitHub.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* 5. Duplicate Prevention Registry Telemetry */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Duplicate Prevention Registry
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Currently tracking <strong className="text-emerald-400 font-mono">{registryCount}</strong> unique synchronized submissions. Prevents duplicate commits.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearRegistry}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-xs font-semibold text-slate-300 rounded-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Cache</span>
          </button>
        </div>

        {/* 6. State Machine Audit Logs */}
        {transitionLogs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <RotateCw className="w-4 h-4 text-emerald-400" />
              State Machine Audit Logs (Recent Transitions)
            </h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
              {transitionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 bg-slate-950 border border-slate-800/80 rounded flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <span className="text-slate-400 font-semibold">{log.fromState}</span>
                    <span className="text-emerald-400 mx-1">&rarr;</span>
                    <span className="text-emerald-400 font-bold">{log.toState}</span>
                    {log.reason && (
                      <span className="text-slate-400 ml-2 italic truncate">({log.reason})</span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[10px] flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saveSuccess && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved Successfully
            </span>
          )}

          <button
            type="submit"
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-xs"
          >
            Save All Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
