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
  AlertTriangle,
  Code2,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Activity,
  Database
} from 'lucide-react';
import {
  DEFAULT_DASHBOARD_MODULES,
  DEFAULT_UI_ENABLED_MODULES,
  DEFAULT_SIDEBAR_ORDER
} from '@streakforge/config';
import type { SyncDiagnosticsComparison } from '@streakforge/shared-types';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { getStoredToken, setStoredToken, clearStoredToken, API_BASE_URL } from '../lib/utils';
import { api } from '../lib/api';
import { AgentManager } from '../components/AgentManager';
import { GitHubConnectButton } from '../components/GitHubConnectButton';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { user, connectedRepos, submissions, journalEntries, auditLogs, refreshData, logout, clearNotifications } = useData();

  const [activeSection, setActiveSection] = useState<
    | 'github'
    | 'leetcode'
    | 'extension'
    | 'repos'
    | 'modules'
    | 'diagnostics'
    | 'agent'
    | 'automation'
    | 'notifications'
    | 'privacy'
    | 'theme'
    | 'data'
    | 'export'
    | 'danger'
  >('github');

  const [enabledModules, setEnabledModules] = useState<string[]>(
    user?.uiPreferences?.enabledModules?.length
      ? user.uiPreferences.enabledModules
      : [...DEFAULT_UI_ENABLED_MODULES]
  );
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(
    user?.uiPreferences?.sidebarOrder?.length
      ? user.uiPreferences.sidebarOrder
      : [...DEFAULT_SIDEBAR_ORDER]
  );
  const [modulesSavedMsg, setModulesSavedMsg] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SyncDiagnosticsComparison | null>(null);
  const [diagLoading, setDiagLoading] = useState<boolean>(false);
  const [tokenCheckMsg, setTokenCheckMsg] = useState<string | null>(null);
  const [dataActionMsg, setDataActionMsg] = useState<string | null>(null);

  const [copiedToken, setCopiedToken] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // PAT connection state
  const [patInput, setPatInput] = useState('');
  const [patLoading, setPatLoading] = useState(false);
  const [patError, setPatError] = useState('');

  // LeetCode connection state
  const [leetcodeInput, setLeetcodeInput] = useState(user?.leetcodeUsername || '');
  const [leetcodeLoading, setLeetcodeLoading] = useState(false);
  const [leetcodeError, setLeetcodeError] = useState('');
  const [leetcodeSuccess, setLeetcodeSuccess] = useState('');

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

  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    try {
      setPatLoading(true);
      setPatError('');
      const res = await api.auth.connectWithPAT(patInput.trim());
      setStoredToken(res.token);
      await refreshData();
      window.location.reload();
    } catch (err: any) {
      setPatError(err.message || 'Authentication failed. Please verify your token.');
    } finally {
      setPatLoading(false);
    }
  };

  const handleConnectLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leetcodeInput.trim()) return;
    try {
      setLeetcodeLoading(true);
      setLeetcodeError('');
      setLeetcodeSuccess('');
      await api.auth.linkLeetCode(leetcodeInput.trim());
      setLeetcodeSuccess('LeetCode profile linked and synchronized successfully!');
      await refreshData();
    } catch (err: any) {
      setLeetcodeError(err.message || 'Failed to link LeetCode profile');
    } finally {
      setLeetcodeLoading(false);
    }
  };

  const handleDisconnectLeetCode = async () => {
    if (!window.confirm('Are you sure you want to disconnect your LeetCode profile?')) return;
    try {
      setLeetcodeLoading(true);
      setLeetcodeError('');
      setLeetcodeSuccess('');
      await api.auth.disconnectLeetCode();
      setLeetcodeInput('');
      setLeetcodeSuccess('LeetCode profile disconnected.');
      await refreshData();
    } catch (err: any) {
      setLeetcodeError(err.message || 'Failed to disconnect LeetCode profile');
    } finally {
      setLeetcodeLoading(false);
    }
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    try {
      await api.auth.deleteAccount();
    } catch (err: any) {
      alert(`Account deletion failed: ${err.message || 'Please try again.'}`);
      return;
    }
    clearStoredToken();
    localStorage.removeItem('streakforge_journal');
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
    }
    window.location.href = '/';
  };

  const coreSections = [
    { id: 'github', label: 'GitHub Account', icon: Github },
    { id: 'leetcode', label: 'LeetCode Account', icon: Code2 },
    { id: 'extension', label: 'LeetCode Extension', icon: KeyRound },
    { id: 'repos', label: 'Target Repositories', icon: FolderGit2 },
    { id: 'modules', label: 'Dashboard Modules', icon: LayoutGrid },
    { id: 'diagnostics', label: 'Sync Diagnostics', icon: Activity },
    { id: 'automation', label: 'Automation Rules', icon: Bot },
    { id: 'notifications', label: 'Notification Settings', icon: Bell },
    { id: 'theme', label: 'Theme & Display', icon: Palette },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'export', label: 'Data Export', icon: Download }
  ];

  const advancedSections: {
    id: string;
    label: string;
    icon: any;
    badge?: string;
    danger?: boolean;
  }[] = [
    { id: 'danger', label: 'Account Deletion', icon: Trash2, danger: true }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation List */}
        <div className="md:col-span-1 space-y-4">
          <div>
            <div className="text-[10px] font-bold text-theme-muted uppercase tracking-wider px-3 mb-1.5">
              Core Settings
            </div>
            <div className="space-y-1">
              {coreSections.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id as any)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-theme-accent-subtle text-theme-accent font-semibold shadow-xs'
                        : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-theme-border">
            <div className="text-[10px] font-bold text-theme-muted uppercase tracking-wider px-3 mb-1.5">
              Advanced &amp; Optional
            </div>
            <div className="space-y-1">
              {advancedSections.map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id as any)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-theme-accent-subtle text-theme-accent font-semibold shadow-xs'
                        : s.danger
                        ? 'text-rose-500 hover:bg-rose-500/10'
                        : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{s.label}</span>
                    </div>
                    {s.badge && (
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-theme-surface border border-theme-border text-theme-muted">
                        {s.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
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
                        width={40}
                        height={40}
                        style={{ width: 40, height: 40, maxWidth: 40, maxHeight: 40, objectFit: 'cover' }}
                        className="w-10 h-10 rounded-full border border-theme-border"
                      />
                      <div>
                        <div className="font-bold text-sm text-theme-primary">@{user.username}</div>
                        <div className="text-xs text-theme-muted">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          user.githubTokenHealth?.valid !== false
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}
                      >
                        {user.githubTokenHealth?.status || 'Connected (OAuth 2.0)'}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const h = await api.auth.verifyGitHub();
                            setTokenCheckMsg(
                              h.valid
                                ? `GitHub token active for @${h.username} (scopes: ${h.scopes?.join(', ') || 'repo'})`
                                : h.message || `GitHub status: ${h.status}`
                            );
                            await refreshData();
                          } catch (err: any) {
                            setTokenCheckMsg(err.message);
                          }
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded border border-theme-border transition cursor-pointer"
                      >
                        Verify Health
                      </button>
                      <button
                        onClick={async () => {
                          await logout();
                        }}
                        className="text-xs text-theme-secondary hover:text-theme-primary font-medium px-2 py-1 rounded hover:bg-theme-surface border border-theme-border transition"
                      >
                        Log Out
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Disconnect GitHub account? Stored OAuth tokens will be purged.')) {
                            try {
                              await api.auth.disconnect();
                              clearStoredToken();
                              if (typeof window !== 'undefined') {
                                window.postMessage({ type: 'STREAKFORGE_LOGOUT' }, window.location.origin);
                              }
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

                  {tokenCheckMsg && (
                    <div className="p-2.5 bg-theme-elevated border border-theme-border rounded-lg text-xs text-theme-secondary">
                      {tokenCheckMsg}
                    </div>
                  )}

                  {/* Reconnect / Update GitHub PAT */}
                  <div className="p-4 bg-theme-elevated border border-theme-border rounded-xl space-y-3" id="settings-pat">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-theme-accent" />
                        Update GitHub Access Token / PAT
                      </div>
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=StreakForge"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-theme-accent hover:underline font-semibold"
                      >
                        Generate New Token &rarr;
                      </a>
                    </div>
                    <p className="text-[11px] text-theme-muted">
                      If your GitHub session expired or returned &quot;Bad credentials&quot;, generate a Personal Access Token with <code className="text-theme-accent">repo</code> scope and paste it below to restore synchronization immediately.
                    </p>
                    <form onSubmit={handleConnectPAT} className="space-y-2 pt-1">
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-mono text-theme-primary focus:outline-none focus:border-theme-accent"
                        />
                        <button
                          type="submit"
                          disabled={patLoading || !patInput.trim()}
                          className="px-4 py-2 bg-theme-accent text-slate-950 font-bold text-xs rounded-lg transition hover:opacity-95 shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
                        >
                          {patLoading ? 'Verifying...' : 'Update Token'}
                        </button>
                      </div>
                      {patError && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
                          {patError}
                        </div>
                      )}
                    </form>
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
                      <div><strong className="text-theme-primary font-sans">Payload URL:</strong> {API_BASE_URL}/github/webhook</div>
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
                <div className="space-y-4">
                  {/* Method 1: Connect with Personal Access Token (PAT) */}
                  <div className="p-5 bg-theme-elevated border border-theme-border rounded-xl space-y-3">
                    <div>
                      <div className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-theme-accent" />
                        Option 1: Connect via Personal Access Token (Instant)
                      </div>
                      <p className="text-[11px] text-theme-muted mt-0.5">
                        The easiest and most reliable way to connect your real GitHub account. Generates instant authenticated access without configuring an OAuth Application.
                      </p>
                    </div>

                    <form onSubmit={handleConnectPAT} className="space-y-3 pt-1">
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <label className="text-theme-secondary font-medium">GitHub Personal Access Token (classic or fine-grained)</label>
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=StreakForge"
                            target="_blank"
                            rel="noreferrer"
                            className="text-theme-accent hover:underline font-semibold"
                          >
                            Generate Token on GitHub &rarr;
                          </a>
                        </div>
                        <input
                          type="password"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-mono text-theme-primary focus:outline-none focus:border-theme-accent"
                        />
                        <p className="text-[10px] text-theme-muted mt-1">
                          Required scopes: <code className="text-theme-accent">repo</code> (for writing solution commits) and <code className="text-theme-accent">read:user</code> (for profile info).
                        </p>
                      </div>

                      {patError && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs">
                          {patError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={patLoading || !patInput.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-bold text-xs rounded-lg transition hover:opacity-95 shadow-xs disabled:opacity-50"
                      >
                        <Github className="w-4 h-4" />
                        <span>{patLoading ? 'Connecting to GitHub...' : 'Connect Real GitHub Account'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Method 2: Connect via OAuth App */}
                  <div className="p-4 bg-theme-elevated border border-theme-border rounded-xl space-y-2">
                    <div className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Github className="w-3.5 h-3.5 text-theme-secondary" />
                      Option 2: Connect via GitHub OAuth Application
                    </div>
                    <p className="text-[11px] text-theme-muted">
                      Requires registering an OAuth App under GitHub Settings &rarr; Developer settings &rarr; OAuth Apps with callback <code className="text-theme-accent">{API_BASE_URL}/auth/github/callback</code>.
                    </p>
                    <div className="mt-1">
                      <GitHubConnectButton label="Authorize via OAuth App" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 1.5. LeetCode Account Integration */}
          {activeSection === 'leetcode' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-theme-accent" />
                  LeetCode Account Integration
                </h3>
                <p className="text-xs text-theme-muted mt-0.5">
                  Link your authentic public LeetCode handle to sync problem solving statistics, acceptance rates, and streak records.
                </p>
              </div>

              {leetcodeSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{leetcodeSuccess}</span>
                </div>
              )}

              {leetcodeError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{leetcodeError}</span>
                </div>
              )}

              {user?.leetcodeUsername ? (
                <div className="p-5 bg-theme-elevated border border-theme-border rounded-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-theme-primary">{user.leetcodeUsername}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Linked
                          </span>
                        </div>
                        <a
                          href={`https://leetcode.com/u/${user.leetcodeUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-theme-accent hover:underline flex items-center gap-1 mt-0.5"
                        >
                          leetcode.com/u/{user.leetcodeUsername} &rarr;
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDisconnectLeetCode}
                        disabled={leetcodeLoading}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      >
                        {leetcodeLoading ? 'Disconnecting...' : 'Disconnect Profile'}
                      </button>
                    </div>
                  </div>

                  {user.leetcodeStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-theme-border">
                      <div className="p-2.5 bg-theme-surface rounded-lg border border-theme-border">
                        <div className="text-[10px] text-theme-muted uppercase font-bold">Solved</div>
                        <div className="text-base font-bold text-theme-primary">{user.leetcodeStats.totalSolved ?? 0}</div>
                      </div>
                      <div className="p-2.5 bg-theme-surface rounded-lg border border-theme-border">
                        <div className="text-[10px] text-theme-muted uppercase font-bold">Ranking</div>
                        <div className="text-base font-bold text-theme-primary">
                          {user.leetcodeStats.ranking ? `#${user.leetcodeStats.ranking.toLocaleString()}` : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2.5 bg-theme-surface rounded-lg border border-theme-border">
                        <div className="text-[10px] text-theme-muted uppercase font-bold">Acceptance Rate</div>
                        <div className="text-base font-bold text-theme-primary">
                          {user.leetcodeStats.acceptanceRate ? `${user.leetcodeStats.acceptanceRate.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="p-2.5 bg-theme-surface rounded-lg border border-theme-border">
                        <div className="text-[10px] text-theme-muted uppercase font-bold">Max Streak</div>
                        <div className="text-base font-bold text-theme-primary">{user.leetcodeStats.maxStreak ?? 0}d</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <label className="text-xs font-semibold text-theme-secondary block mb-1">Update LeetCode Username</label>
                    <form onSubmit={handleConnectLeetCode} className="flex gap-2">
                      <input
                        type="text"
                        value={leetcodeInput}
                        onChange={(e) => setLeetcodeInput(e.target.value)}
                        placeholder="Enter new LeetCode username"
                        className="flex-1 bg-theme-surface border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-primary focus:outline-none focus:border-theme-accent"
                      />
                      <button
                        type="submit"
                        disabled={leetcodeLoading || !leetcodeInput.trim() || leetcodeInput.trim() === user.leetcodeUsername}
                        className="px-3 py-1.5 bg-theme-accent text-slate-950 font-bold text-xs rounded-lg transition hover:opacity-95 disabled:opacity-50"
                      >
                        {leetcodeLoading ? 'Updating...' : 'Update Handle'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-theme-elevated border border-theme-border rounded-xl space-y-3">
                  <div className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-theme-accent" />
                    Connect LeetCode Account
                  </div>
                  <p className="text-[11px] text-theme-muted">
                    Enter your public LeetCode username (e.g. your username from leetcode.com/u/your_username). We will automatically query the GraphQL endpoint to retrieve your verified solve counts, difficulty breakdowns, and activity calendar.
                  </p>

                  <form onSubmit={handleConnectLeetCode} className="space-y-3 pt-1">
                    <div>
                      <input
                        type="text"
                        value={leetcodeInput}
                        onChange={(e) => setLeetcodeInput(e.target.value)}
                        placeholder="e.g. tourpran, neetcode, your_handle"
                        className="w-full bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-xs font-mono text-theme-primary focus:outline-none focus:border-theme-accent"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={leetcodeLoading || !leetcodeInput.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-bold text-xs rounded-lg transition hover:opacity-95 shadow-xs disabled:opacity-50"
                    >
                      <Code2 className="w-4 h-4" />
                      <span>{leetcodeLoading ? 'Linking & Syncing...' : 'Link LeetCode Account'}</span>
                    </button>
                  </form>
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

          {/* V4: Customizable Dashboard Modules & Sidebar Order */}
          {activeSection === 'modules' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-theme-accent" />
                    Customize Navigation &amp; Modules
                  </h3>
                  <p className="text-xs text-theme-muted mt-0.5">
                    Enable, disable, or reorder sidebar modules cleanly. Core pages stay pinned.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnabledModules([...DEFAULT_UI_ENABLED_MODULES]);
                      setSidebarOrder([...DEFAULT_SIDEBAR_ORDER]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-theme-elevated border border-theme-border text-xs font-medium text-theme-secondary flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.auth.updatePreferences({
                        uiPreferences: { enabledModules, sidebarOrder }
                      });
                      setModulesSavedMsg('Navigation layout saved!');
                      setTimeout(() => setModulesSavedMsg(null), 2500);
                      refreshData();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-theme-accent text-slate-950 font-semibold text-xs cursor-pointer"
                  >
                    Save Layout
                  </button>
                </div>
              </div>

              {modulesSavedMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                  {modulesSavedMsg}
                </div>
              )}

              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {[...DEFAULT_DASHBOARD_MODULES]
                  .sort((a, b) => {
                    const oa = sidebarOrder.indexOf(a.id);
                    const ob = sidebarOrder.indexOf(b.id);
                    return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
                  })
                  .map((mod, idx, arr) => {
                    const isEnabled = mod.core || enabledModules.includes(mod.id);
                    return (
                      <div
                        key={mod.id}
                        className="p-2.5 bg-theme-elevated border border-theme-border rounded-lg flex items-center justify-between gap-3 text-xs"
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            disabled={mod.core}
                            checked={isEnabled}
                            onChange={() => {
                              setEnabledModules((prev) =>
                                prev.includes(mod.id)
                                  ? prev.filter((x) => x !== mod.id)
                                  : [...prev, mod.id]
                              );
                            }}
                          />
                          <span className="font-semibold text-theme-primary">{mod.label}</span>
                          <span className="text-[10px] text-theme-muted font-mono">{mod.group}</span>
                          {mod.core && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                              Core
                            </span>
                          )}
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const nextOrder = arr.map((x) => x.id);
                              [nextOrder[idx - 1], nextOrder[idx]] = [nextOrder[idx], nextOrder[idx - 1]];
                              setSidebarOrder(nextOrder);
                            }}
                            className="p-1 rounded bg-theme-surface border border-theme-border disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => {
                              const nextOrder = arr.map((x) => x.id);
                              [nextOrder[idx + 1], nextOrder[idx]] = [nextOrder[idx], nextOrder[idx + 1]];
                              setSidebarOrder(nextOrder);
                            }}
                            className="p-1 rounded bg-theme-surface border border-theme-border disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* V4: Accuracy & Consistency Diagnostics */}
          {activeSection === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                    <Activity className="w-4 h-4 text-theme-accent" />
                    Cross-System Consistency Diagnostics
                  </h3>
                  <p className="text-xs text-theme-muted mt-0.5">
                    Compares StreakForge DB metrics against your LeetCode profile and live GitHub repository permissions
                  </p>
                </div>
                <button
                  type="button"
                  disabled={diagLoading}
                  onClick={async () => {
                    setDiagLoading(true);
                    try {
                      setDiagnostics(await api.sync.getDiagnostics());
                    } finally {
                      setDiagLoading(false);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-theme-accent text-slate-950 font-semibold text-xs disabled:opacity-50 cursor-pointer"
                >
                  {diagLoading ? 'Checking...' : 'Run Live Audit'}
                </button>
              </div>

              {diagnostics ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-theme-elevated rounded-lg border border-theme-border">
                      <div className="text-theme-muted text-[10px]">DB Unique Solved</div>
                      <div className="text-base font-bold text-theme-primary">
                        {diagnostics.dbMetrics.uniqueProblemsSolved}
                      </div>
                    </div>
                    <div className="p-3 bg-theme-elevated rounded-lg border border-theme-border">
                      <div className="text-theme-muted text-[10px]">LeetCode Profile</div>
                      <div className="text-base font-bold text-theme-primary">
                        {diagnostics.leetcodeProfileTotal ?? 'Unlinked'}
                      </div>
                    </div>
                    <div className="p-3 bg-theme-elevated rounded-lg border border-theme-border">
                      <div className="text-theme-muted text-[10px]">Exported Commits</div>
                      <div className="text-base font-bold text-emerald-400">
                        {diagnostics.dbMetrics.exportedCount}
                      </div>
                    </div>
                    <div className="p-3 bg-theme-elevated rounded-lg border border-theme-border">
                      <div className="text-theme-muted text-[10px]">Target Repo Push</div>
                      <div className="text-base font-bold">
                        {diagnostics.targetRepo?.canPush ? (
                          <span className="text-emerald-400">Verified</span>
                        ) : (
                          <span className="text-rose-400">Blocked</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {diagnostics.mismatches.length === 0 ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-medium">
                      All checks passed — Web, Database, and GitHub permissions are consistent.
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1">
                      <div className="font-bold text-amber-300">Discrepancies / Action Items Found:</div>
                      {diagnostics.mismatches.map((m, i) => (
                        <div key={i} className="text-amber-200 text-[11px]">
                          • {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-theme-muted bg-theme-elevated rounded-xl border border-dashed border-theme-border">
                  Click &ldquo;Run Live Audit&rdquo; to verify database counts, GitHub OAuth validity, and repository push permissions.
                </div>
              )}
            </div>
          )}

          {/* V4: Safe Data Management */}
          {activeSection === 'data' && (
            <div className="space-y-4 text-xs">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Database className="w-4 h-4 text-theme-accent" />
                Data Management &amp; Cleanup
              </h3>
              <p className="text-theme-muted leading-relaxed">
                Clean up StreakForge application records locally or in the database. Existing GitHub repository files and commits are <strong>never automatically deleted</strong>.
              </p>

              {dataActionMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  {dataActionMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    clearNotifications();
                    setDataActionMsg('Cleared all in-app notifications.');
                  }}
                  className="p-3 text-left bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-xl cursor-pointer"
                >
                  <div className="font-bold text-theme-primary">Clear Notification History</div>
                  <div className="text-[11px] text-theme-muted mt-0.5">
                    Remove in-app alert banners &amp; notification logs.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const r = await api.automations.clearJobs('finished');
                    setDataActionMsg(`Cleared ${r.deletedCount} finished automation job logs.`);
                  }}
                  className="p-3 text-left bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-xl cursor-pointer"
                >
                  <div className="font-bold text-theme-primary">Clear Automation Logs</div>
                  <div className="text-[11px] text-theme-muted mt-0.5">
                    Remove completed/failed historical job runs.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const r = await api.automations.clearJobs('queue');
                    setDataActionMsg(`Removed ${r.deletedCount} queued/retry job items.`);
                  }}
                  className="p-3 text-left bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-xl cursor-pointer"
                >
                  <div className="font-bold text-theme-primary">Clear Pending Sync Queue</div>
                  <div className="text-[11px] text-theme-muted mt-0.5">
                    Cancel queued retry jobs without deleting submissions.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Reset all StreakForge sync, notification, and layout preferences to defaults?')) {
                      await api.auth.resetPreferences();
                      setDataActionMsg('All preferences reset to defaults.');
                      refreshData();
                    }
                  }}
                  className="p-3 text-left bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-xl cursor-pointer"
                >
                  <div className="font-bold text-theme-primary">Reset All Settings</div>
                  <div className="text-[11px] text-theme-muted mt-0.5">
                    Restore default folder structure, notifications &amp; sidebar modules.
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 5. Automation Preferences */}
          {activeSection === 'automation' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-theme-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-theme-accent" />
                Automation Rules & Triggers
              </h3>
              <p className="text-xs text-theme-secondary leading-relaxed bg-theme-elevated border border-theme-border rounded-lg p-3">
                Per-repository automation rules (auto-README updates, scheduled maintenance, and sync frequency) are persisted directly in{' '}
                <strong className="text-theme-primary">Automation Center</strong> (sidebar &rarr; Automation). Account-wide{' '}
                <code className="text-theme-accent">timezone</code> and <code className="text-theme-accent">streakGoalPerDay</code> are configured below in <strong className="text-theme-primary">Preferences</strong> / Notification Settings.
              </p>
              <a
                href="/?tab=automation"
                className="inline-flex items-center gap-2 px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Open Automation Center</span>
              </a>
            </div>
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

