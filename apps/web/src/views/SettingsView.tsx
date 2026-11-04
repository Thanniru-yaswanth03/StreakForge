'use client';

import React, { useState } from 'react';
import {
  Settings,
  Github,
  KeyRound,
  FolderGit2,
  Terminal,
  Bot,
  Bell,
  Shield,
  Palette,
  Download,
  Trash2,
  Copy,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { getStoredToken, clearStoredToken } from '../lib/utils';
import { api } from '../lib/api';
import { AgentManager } from '../components/AgentManager';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { user, connectedRepos, submissions, journalEntries, auditLogs, refreshData, agents } = useData();

  const [activeSection, setActiveSection] = useState<
    | 'github'
    | 'extension'
    | 'repos'
    | 'agent'
    | 'automation'
    | 'notifications'
    | 'privacy'
    | 'theme'
    | 'export'
    | 'danger'
  >('github');

  const [copiedToken, setCopiedToken] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Preference fields
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [streakGoal, setStreakGoal] = useState(user?.streakGoalPerDay || 1);
  const [idleMinutes, setIdleMinutes] = useState(15);
  const [autoPush, setAutoPush] = useState(false);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [warningHours, setWarningHours] = useState(3);
  const [isSaved, setIsSaved] = useState(false);

  const token = getStoredToken() || '';

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.auth.updatePreferences({
        timezone,
        streakGoalPerDay: streakGoal,
        notificationPreferences: {
          inApp: inAppNotif,
          streakWarningHoursBefore: warningHours
        }
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      refreshData();
    } catch (err: any) {
      alert(`Failed to save preferences: ${err.message}`);
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      exportDate: new Date().toISOString(),
      user,
      connectedRepositories: connectedRepos,
      submissions,
      journalEntries,
      auditLogs
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `streakforge-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText !== 'DELETE') return;
    clearStoredToken();
    localStorage.clear();
    alert('Account data purged. Returning to login screen.');
    window.location.reload();
  };

  const sections = [
    { id: 'github', label: 'GitHub Account', icon: Github },
    { id: 'extension', label: 'LeetCode Extension', icon: KeyRound },
    { id: 'repos', label: 'Connected Repositories', icon: FolderGit2 },
    { id: 'agent', label: 'Local Agent', icon: Terminal },
    { id: 'automation', label: 'Automation Preferences', icon: Bot },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'theme', label: 'Theme & Display', icon: Palette },
    { id: 'export', label: 'Data Export', icon: Download },
    { id: 'danger', label: 'Account Deletion', icon: Trash2, danger: true }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation List */}
        <div className="md:col-span-1 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-theme-accent-subtle text-theme-accent font-semibold shadow-xs'
                    : s.danger
                    ? 'text-rose-500 hover:bg-rose-500/10'
                    : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Content */}
        <div className="md:col-span-3 bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm min-h-[440px]">
          {/* 1. GitHub Account */}
          {activeSection === 'github' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Github className="w-4 h-4 text-theme-accent" />
                GitHub Account Connection
              </h3>
              <p className="text-xs text-theme-muted">
                OAuth token permissions and profile attribution
              </p>

              {user ? (
                <div className="space-y-4">
                  <div className="p-4 bg-theme-elevated border border-theme-border rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'}
                        alt={user.username}
                        className="w-10 h-10 rounded-full border border-theme-border"
                      />
                      <div>
                        <div className="font-bold text-sm text-theme-primary">@{user.username}</div>
                        <div className="text-xs text-theme-muted">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Connected (OAuth 2.0)
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm('Disconnect GitHub account? Stored OAuth tokens will be purged.')) {
                            try {
                              await api.auth.disconnect();
                              clearStoredToken();
                              window.location.reload();
                            } catch (err: any) {
                              alert(`Disconnect failed: ${err.message}`);
                            }
                          }
                        }}
                        className="text-xs text-rose-500 hover:text-rose-400 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Verified GitHub Emails */}
                  <div className="p-4 bg-theme-elevated border border-theme-border rounded-xl space-y-2">
                    <div className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                      Verified GitHub Emails for Contribution Attribution
                    </div>
                    <p className="text-[11px] text-theme-muted">
                      Commits authored with these email addresses will be recognized and attributed to your GitHub contribution graph.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(user.verifiedEmails || [user.email]).map((em) => (
                        <span
                          key={em}
                          className="font-mono text-xs px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border text-theme-secondary flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          {em}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* GitHub Webhook Configuration */}
                  <div className="p-4 bg-theme-elevated border border-theme-border rounded-xl space-y-3">
                    <div className="text-xs font-bold text-theme-primary uppercase tracking-wider">
                      Repository Webhook Integration
                    </div>
                    <p className="text-[11px] text-theme-muted">
                      To receive instantaneous push and PR synchronization events from GitHub, configure a repository webhook:
                    </p>
                    <div className="space-y-1.5 text-xs font-mono bg-theme-surface p-3 rounded-lg border border-theme-border text-theme-secondary">
                      <div><strong className="text-theme-primary font-sans">Payload URL:</strong> http://localhost:4000/api/v1/github/webhook</div>
                      <div><strong className="text-theme-primary font-sans">Content type:</strong> application/json</div>
                      <div><strong className="text-theme-primary font-sans">Secret:</strong> configured in .env (GITHUB_WEBHOOK_SECRET)</div>
                      <div><strong className="text-theme-primary font-sans">Events:</strong> Pushes, Pull Requests, Issues, Releases</div>
                    </div>
                    <div className="text-[11px] text-theme-muted">
                      Incoming events require HMAC-SHA256 signature verification (<code className="text-theme-accent">X-Hub-Signature-256</code>) and delivery deduplication.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-theme-elevated border border-theme-border rounded-xl space-y-3">
                  <div className="text-xs text-theme-secondary">
                    Connect your GitHub account to enable automated, verified solution commits.
                  </div>
                  <a
                    href="http://localhost:4000/api/v1/auth/github"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95 shadow-xs"
                  >
                    <Github className="w-4 h-4" />
                    <span>Authorize with GitHub</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 2. LeetCode Extension */}
          {activeSection === 'extension' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-theme-accent" />
                LeetCode Browser Extension Token
              </h3>
              <p className="text-xs text-theme-muted">
                Authenticate your Manifest V3 browser extension to capture accepted submissions
              </p>

              <div className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between gap-3">
                <input
                  type="password"
                  readOnly
                  value={token || 'Not authenticated'}
                  className="bg-transparent font-mono text-xs text-theme-primary flex-1 outline-none select-all truncate"
                />
                <button
                  onClick={handleCopyToken}
                  disabled={!token}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface hover:bg-theme-elevated border border-theme-border text-theme-primary rounded-lg text-xs font-medium transition disabled:opacity-50"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-xs text-theme-muted space-y-1">
                <div>1. Load unpacked extension from directory: <code className="bg-theme-elevated px-1 py-0.5 rounded font-mono">apps/extension/dist</code></div>
                <div>2. Open extension popup in Chrome and paste your token above.</div>
              </div>
            </div>
          )}

          {/* 3. Connected Repositories */}
          {activeSection === 'repos' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-theme-accent" />
                Target Repository Settings
              </h3>
              <p className="text-xs text-theme-muted">
                Default repository and folder template configuration
              </p>

              <div className="space-y-2">
                {connectedRepos.map((r) => (
                  <div key={r.id} className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-theme-primary">{r.repoFullName}</div>
                      <div className="text-theme-muted font-mono mt-0.5">{r.solutionPathPattern}</div>
                    </div>
                    {r.isTargetForLeetCode && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-theme-accent-subtle text-theme-accent">
                        Primary Target
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Local Desktop Agent */}
          {activeSection === 'agent' && (
            <div className="space-y-4">
              <AgentManager agents={agents} onRefresh={refreshData} />
            </div>
          )}

          {/* 5. Automation Preferences */}
          {activeSection === 'automation' && (
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-theme-accent" />
                Automation Rules & Triggers
              </h3>

              <div>
                <label className="block text-xs font-semibold text-theme-secondary mb-1">
                  Idle Auto-Commit Delay (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={idleMinutes}
                  onChange={(e) => setIdleMinutes(parseInt(e.target.value, 10) || 15)}
                  className="w-full px-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoPush"
                  checked={autoPush}
                  onChange={(e) => setAutoPush(e.target.checked)}
                  className="rounded text-theme-accent"
                />
                <label htmlFor="autoPush" className="text-xs text-theme-secondary">
                  Automatically push committed changes to remote origin branch
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95"
              >
                {isSaved ? 'Saved!' : 'Save Automation Rules'}
              </button>
            </form>
          )}

          {/* 6. Notifications */}
          {activeSection === 'notifications' && (
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Bell className="w-4 h-4 text-theme-accent" />
                Streak Warnings & Notifications
              </h3>

              <div>
                <label className="block text-xs font-semibold text-theme-secondary mb-1">
                  Streak Warning Window
                </label>
                <select
                  value={warningHours}
                  onChange={(e) => setWarningHours(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-primary"
                >
                  <option value={1}>1 Hour Before Midnight</option>
                  <option value={3}>3 Hours Before Midnight (Recommended)</option>
                  <option value={6}>6 Hours Before Midnight</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inApp"
                  checked={inAppNotif}
                  onChange={(e) => setInAppNotif(e.target.checked)}
                  className="rounded text-theme-accent"
                />
                <label htmlFor="inApp" className="text-xs text-theme-secondary">
                  Enable In-App Notification Center Alerts
                </label>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95"
              >
                {isSaved ? 'Saved!' : 'Save Notifications'}
              </button>
            </form>
          )}

          {/* 7. Privacy */}
          {activeSection === 'privacy' && (
            <div className="space-y-4 text-xs text-theme-secondary leading-relaxed">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Shield className="w-4 h-4 text-theme-accent" />
                Privacy & Data Principles
              </h3>
              <p>
                StreakForge enforces <strong>Zero Third-Party Telemetry</strong>. No proprietary source code, private git diffs, or personal tokens are sent to external analytics or AI models.
              </p>
              <p>
                All Git actions are executed natively via your local machine&apos;s Git binary.
              </p>
            </div>
          )}

          {/* 8. Theme */}
          {activeSection === 'theme' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Palette className="w-4 h-4 text-theme-accent" />
                Appearance & Theme
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Light Theme' },
                  { id: 'dark', label: 'Dark Theme' },
                  { id: 'system', label: 'System Match' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={`p-3 border rounded-xl text-xs font-semibold text-center transition ${
                      theme === t.id
                        ? 'border-theme-accent bg-theme-accent-subtle text-theme-accent'
                        : 'border-theme-border bg-theme-elevated text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 9. Data Export */}
          {activeSection === 'export' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Download className="w-4 h-4 text-theme-accent" />
                Data Portability & JSON Export
              </h3>
              <p className="text-xs text-theme-muted">
                Download a complete offline copy of your submissions, coding sessions, and activity logs.
              </p>
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Full JSON Export</span>
              </button>
            </div>
          )}

          {/* 10. Danger Zone */}
          {activeSection === 'danger' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-rose-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h3>
              <p className="text-xs text-theme-muted">
                Irreversible account deletion and local session purge.
              </p>

              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition shadow-xs"
              >
                Delete Account & Sessions
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-theme-surface border border-rose-500/40 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <h4 className="font-bold text-sm text-theme-primary text-rose-500">Confirm Irreversible Purge</h4>
            <p className="text-xs text-theme-secondary">
              Type <code className="font-bold text-rose-500">DELETE</code> below to confirm permanent removal of your StreakForge session:
            </p>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-primary font-mono"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-3 py-1.5 bg-theme-elevated text-xs font-semibold rounded-lg text-theme-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText !== 'DELETE'}
                className="px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
              >
                Permanently Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

