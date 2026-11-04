'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Laptop,
  RefreshCw,
  FolderGit2,
  GitCommit,
  GitBranch,
  Play,
  Archive,
  Trash2,
  AlertTriangle,
  Clock,
  Key,
  ShieldAlert,
  ChevronRight,
  Plus,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import type {
  LocalAgentInstance,
  SyncMode,
  SyncProposal,
  WatchedRepositoryConfig
} from '@streakforge/shared-types';
import {
  api,
  getStoredLoopbackToken,
  setStoredLoopbackToken,
  LOCAL_AGENT_URL
} from '../lib/api';

interface AgentManagerProps {
  agents: LocalAgentInstance[];
  onRefresh: () => void;
}

interface LocalAgentStatus {
  status: string;
  agentId: string;
  version: string;
  pid: number;
  port: number;
  watchedRepositories: number;
  pendingProposals: number;
  lastHeartbeatAt: string;
}

export function AgentManager({ agents, onRefresh }: AgentManagerProps) {
  // Central API agent registration states
  const [agentName, setAgentName] = useState<string>('');
  const [createdAgent, setCreatedAgent] = useState<{ agentId: string; apiKey: string } | null>(null);
  const [copiedPairCmd, setCopiedPairCmd] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Local Loopback Agent States (127.0.0.1:4545)
  const [localStatus, setLocalStatus] = useState<LocalAgentStatus | null>(null);
  const [isLocalOnline, setIsLocalOnline] = useState<boolean>(false);
  const [isCheckingLocal, setIsCheckingLocal] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Loopback Auth Token
  const [loopbackToken, setLoopbackToken] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  // Watched Local Repositories
  const [watchedRepos, setWatchedRepos] = useState<WatchedRepositoryConfig[]>([]);
  const [syncingRepo, setSyncingRepo] = useState<string | null>(null);
  const [backingUpRepo, setBackingUpRepo] = useState<string | null>(null);

  // Proposals (Approval Mode)
  const [proposals, setProposals] = useState<SyncProposal[]>([]);
  const [proposalCommitMsgs, setProposalCommitMsgs] = useState<Record<string, string>>({});
  const [processingProposalId, setProcessingProposalId] = useState<string | null>(null);

  // Add Repository Form
  const [showAddRepo, setShowAddRepo] = useState<boolean>(false);
  const [newRepoPath, setNewRepoPath] = useState<string>('');
  const [newRepoMode, setNewRepoMode] = useState<SyncMode>('APPROVAL');
  const [newRepoAutoPush, setNewRepoAutoPush] = useState<boolean>(false);
  const [newRepoBranches, setNewRepoBranches] = useState<string>('main, master');
  const [isAddingRepo, setIsAddingRepo] = useState<boolean>(false);

  // Quick Notification Banner
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setActionNotice({ text, type });
    setTimeout(() => setActionNotice(null), 5000);
  };

  // Load stored loopback token on mount
  useEffect(() => {
    setLoopbackToken(getStoredLoopbackToken());
  }, []);

  const handleSaveLoopbackToken = (token: string) => {
    setLoopbackToken(token);
    setStoredLoopbackToken(token);
    checkLocalAgent();
  };

  // Probe local agent on 127.0.0.1:4545
  const checkLocalAgent = useCallback(async () => {
    setIsCheckingLocal(true);
    setLocalError(null);
    try {
      const statusData = await api.agentLocal.getStatus();
      setLocalStatus(statusData);
      setIsLocalOnline(true);

      // Fetch repos & proposals in parallel
      const [repos, propList] = await Promise.all([
        api.agentLocal.getRepos().catch(() => []),
        api.agentLocal.getProposals().catch(() => [])
      ]);

      setWatchedRepos(repos);
      setProposals(propList);

      // Initialize proposal message editor map
      const msgMap: Record<string, string> = {};
      propList.forEach((p) => {
        msgMap[p.id] = p.suggestedMessage;
      });
      setProposalCommitMsgs(msgMap);
    } catch (err: any) {
      setIsLocalOnline(false);
      setLocalStatus(null);
      setLocalError(err.message || 'Cannot connect to 127.0.0.1:4545');
    } finally {
      setIsCheckingLocal(false);
    }
  }, []);

  // Poll local agent status on mount and periodic interval
  useEffect(() => {
    checkLocalAgent();
    const interval = setInterval(checkLocalAgent, 10000);
    return () => clearInterval(interval);
  }, [checkLocalAgent]);

  // Central Agent Registration
  const handleRegisterCentral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName) return;

    try {
      setIsRegistering(true);
      const res = await api.agent.register({
        name: agentName,
        hostname: 'developer-workstation',
        os: 'desktop',
        agentVersion: '1.0.0'
      });
      setCreatedAgent(res);
      setAgentName('');
      onRefresh();
      showNotice('Agent pairing credentials generated successfully', 'success');
    } catch (err: any) {
      showNotice(`Registration failed: ${err.message}`, 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const getPairCommand = () => {
    if (!createdAgent) return '';
    return `streakforge-agent pair --server http://localhost:4000 --key ${createdAgent.apiKey} --agent-id ${createdAgent.agentId}`;
  };

  const handleCopyPairCmd = () => {
    navigator.clipboard.writeText(getPairCommand());
    setCopiedPairCmd(true);
    setTimeout(() => setCopiedPairCmd(false), 2000);
  };

  // Add Local Watched Repo
  const handleAddWatchedRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoPath.trim()) return;

    try {
      setIsAddingRepo(true);
      const branches = newRepoBranches
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean);

      await api.agentLocal.watchRepo({
        repoPath: newRepoPath.trim(),
        mode: newRepoMode,
        autoPush: newRepoAutoPush,
        allowedBranches: branches.length > 0 ? branches : ['main']
      });

      showNotice(`Started watching repository at ${newRepoPath}`, 'success');
      setNewRepoPath('');
      setShowAddRepo(false);
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Failed to watch repository: ${err.message}`, 'error');
    } finally {
      setIsAddingRepo(false);
    }
  };

  // Unwatch Repo
  const handleUnwatchRepo = async (repoPath: string) => {
    if (!confirm(`Are you sure you want to stop watching ${repoPath}?`)) return;
    try {
      await api.agentLocal.unwatchRepo(repoPath);
      showNotice(`Unwatched ${repoPath}`, 'info');
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Failed to unwatch: ${err.message}`, 'error');
    }
  };

  // Trigger Immediate Manual Sync
  const handleSyncNow = async (repoPath: string) => {
    setSyncingRepo(repoPath);
    try {
      const res = await api.agentLocal.syncNow(repoPath);
      if (res.success) {
        showNotice(`Sync complete: ${res.message}${res.commitSha ? ` (SHA: ${res.commitSha.slice(0, 7)})` : ''}`, 'success');
      } else {
        showNotice(`Sync skipped or no changes: ${res.message}`, 'info');
      }
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncingRepo(null);
    }
  };

  // Trigger Immediate Backup Snapshot
  const handleBackupNow = async (repoPath: string) => {
    setBackingUpRepo(repoPath);
    try {
      const res = await api.agentLocal.backupNow(repoPath);
      if (res.success) {
        showNotice(`Backup snapshot created${res.commitSha ? ` (${res.commitSha.slice(0, 7)})` : ''}`, 'success');
      } else {
        showNotice(`Backup skipped: ${res.message}`, 'info');
      }
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Backup failed: ${err.message}`, 'error');
    } finally {
      setBackingUpRepo(null);
    }
  };

  // Approve Proposal
  const handleApproveProposal = async (proposalId: string) => {
    setProcessingProposalId(proposalId);
    try {
      const customMsg = proposalCommitMsgs[proposalId];
      const res = await api.agentLocal.approveProposal(proposalId, customMsg);
      showNotice(`Proposal approved & committed: ${res.message}`, 'success');
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Approval failed: ${err.message}`, 'error');
    } finally {
      setProcessingProposalId(null);
    }
  };

  // Reject Proposal
  const handleRejectProposal = async (proposalId: string) => {
    setProcessingProposalId(proposalId);
    try {
      await api.agentLocal.rejectProposal(proposalId);
      showNotice(`Proposal rejected and dismissed.`, 'info');
      checkLocalAgent();
    } catch (err: any) {
      showNotice(`Rejection failed: ${err.message}`, 'error');
    } finally {
      setProcessingProposalId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : actionNotice.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {actionNotice.type === 'error' && <ShieldAlert className="w-4 h-4" />}
            {actionNotice.type === 'info' && <HelpCircle className="w-4 h-4" />}
            <span className="font-medium">{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Live Local Daemon Health Status Bar */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isLocalOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
              }`}
            >
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-theme-primary">
                  Local Desktop Agent (Git Companion)
                </h3>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isLocalOnline
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  }`}
                >
                  {isLocalOnline ? 'Daemon Online (127.0.0.1:4545)' : 'Daemon Offline'}
                </span>
              </div>
              <p className="text-xs text-theme-muted mt-0.5">
                {isLocalOnline
                  ? `Active PID: ${localStatus?.pid} • Version: v${localStatus?.version} • Watched Repos: ${watchedRepos.length} • Pending Proposals: ${proposals.length}`
                  : 'Start your desktop agent to monitor local coding folders and safely sync authentic Git commits.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-medium text-theme-secondary transition"
              title="Configure local loopback security token"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Token Config</span>
            </button>

            <button
              onClick={checkLocalAgent}
              disabled={isCheckingLocal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-medium text-theme-primary transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingLocal ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Local Loopback Token Setting Drawer */}
        {showTokenInput && (
          <div className="mt-4 pt-4 border-t border-theme-border flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="text-xs text-theme-muted flex-shrink-0">
              <span className="font-semibold text-theme-primary">Loopback Token:</span> (from{' '}
              <code className="text-theme-accent">~/.streakforge/config.json</code>)
            </div>
            <input
              type="password"
              placeholder="Paste loopbackToken from your local ~/.streakforge/config.json"
              value={loopbackToken}
              onChange={(e) => setLoopbackToken(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-theme-elevated border border-theme-border rounded-lg text-xs font-mono text-theme-primary outline-none focus:border-theme-accent"
            />
            <button
              onClick={() => handleSaveLoopbackToken(loopbackToken)}
              className="px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg hover:opacity-90 transition"
            >
              Save Token
            </button>
          </div>
        )}

        {/* Daemon Offline Quick Startup Guide */}
        {!isLocalOnline && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-1.5">
            <div className="font-semibold text-amber-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Desktop Daemon is Not Connected
            </div>
            <p className="text-theme-secondary text-[11px]">
              StreakForge desktop agent communicates strictly over authenticated loopback (
              <code className="text-theme-accent font-mono">127.0.0.1:4545</code>). Run the following in your terminal or use the Windows Installer below:
            </p>
            <div className="p-2 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded select-all">
              streakforge-agent run
            </div>
          </div>
        )}
      </div>

      {/* 2. Pending Commit Proposals (Approval Mode Review Queue) */}
      {proposals.length > 0 && (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                <GitCommit className="w-4 h-4 text-theme-accent" />
                Pending Commit Proposals (Approval Mode)
              </h3>
              <p className="text-[11px] text-theme-muted mt-0.5">
                Review genuine local changes detected by your desktop agent before staging & committing
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-theme-accent text-slate-950 rounded-full font-mono">
              {proposals.length} Pending
            </span>
          </div>

          <div className="space-y-3 mt-3">
            {proposals.map((prop) => (
              <div
                key={prop.id}
                className="p-4 bg-theme-elevated border border-theme-border rounded-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-theme-accent" />
                    <span className="font-mono text-xs font-semibold text-theme-primary">
                      {prop.repoPath}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-muted flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {prop.branch}
                    </span>
                  </div>
                  <span className="text-[11px] text-theme-muted font-mono">
                    {new Date(prop.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Changed Files Summary */}
                <div className="text-xs text-theme-secondary">
                  <div className="font-semibold text-theme-primary mb-1 text-[11px] uppercase tracking-wider">
                    Eligible Changed Files ({prop.files.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {prop.files.map((f, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-theme-surface border border-theme-border rounded text-[11px] font-mono text-theme-secondary"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Diff Summary / Stat */}
                {prop.diffSummary && (
                  <div className="text-[11px] font-mono text-theme-muted bg-theme-surface p-2 rounded border border-theme-border">
                    {prop.diffSummary}
                  </div>
                )}

                {/* Commit Message Editor */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider block">
                    Conventional Commit Message:
                  </label>
                  <input
                    type="text"
                    value={proposalCommitMsgs[prop.id] ?? prop.suggestedMessage}
                    onChange={(e) =>
                      setProposalCommitMsgs((prev) => ({
                        ...prev,
                        [prop.id]: e.target.value
                      }))
                    }
                    className="w-full px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono text-theme-primary outline-none focus:border-theme-accent"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-theme-border">
                  <button
                    onClick={() => handleRejectProposal(prop.id)}
                    disabled={processingProposalId === prop.id}
                    className="px-3 py-1.5 bg-theme-surface hover:bg-rose-500/10 border border-theme-border rounded-lg text-xs font-semibold text-theme-secondary hover:text-rose-500 transition disabled:opacity-50"
                  >
                    Reject & Dismiss
                  </button>
                  <button
                    onClick={() => handleApproveProposal(prop.id)}
                    disabled={processingProposalId === prop.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg hover:opacity-90 transition shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Commit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Connected Local Repositories */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-theme-accent" />
              Watched Local Repositories
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Local folders actively observed for authentic code modifications
            </p>
          </div>

          <button
            onClick={() => setShowAddRepo(!showAddRepo)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg transition hover:opacity-95 shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Watch Local Folder</span>
          </button>
        </div>

        {/* Add Repository Inline Form */}
        {showAddRepo && (
          <form
            onSubmit={handleAddWatchedRepo}
            className="p-4 bg-theme-elevated border border-theme-border rounded-xl mb-4 space-y-3"
          >
            <div className="text-xs font-bold text-theme-primary">Watch New Local Git Repository</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-1">
                  Absolute Local Path
                </label>
                <input
                  type="text"
                  placeholder="e.g. C:\Users\name\projects\my-app or /home/user/code/repo"
                  value={newRepoPath}
                  onChange={(e) => setNewRepoPath(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono text-theme-primary outline-none focus:border-theme-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-1">
                  Synchronization Mode
                </label>
                <select
                  value={newRepoMode}
                  onChange={(e) => setNewRepoMode(e.target.value as SyncMode)}
                  className="w-full px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs text-theme-primary outline-none focus:border-theme-accent"
                >
                  <option value="APPROVAL">Approval Mode (Review diffs before commit)</option>
                  <option value="AUTOMATIC">Automatic Mode (Safe auto-commit on idle)</option>
                  <option value="MANUAL">Manual Mode (Trigger sync only on demand)</option>
                  <option value="BACKUP">Backup Mode (Periodic safety snapshots)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-1">
                  Allowed Target Branches
                </label>
                <input
                  type="text"
                  placeholder="main, master, dev"
                  value={newRepoBranches}
                  onChange={(e) => setNewRepoBranches(e.target.value)}
                  className="w-full px-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono text-theme-primary outline-none focus:border-theme-accent"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-theme-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRepoAutoPush}
                    onChange={(e) => setNewRepoAutoPush(e.target.checked)}
                    className="rounded text-theme-accent"
                  />
                  <span>Automatically push committed changes to remote</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-border">
              <button
                type="button"
                onClick={() => setShowAddRepo(false)}
                className="px-3 py-1.5 bg-theme-surface hover:bg-theme-elevated text-xs font-semibold rounded-lg text-theme-secondary transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAddingRepo || !newRepoPath.trim()}
                className="px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {isAddingRepo ? 'Adding...' : 'Start Watching'}
              </button>
            </div>
          </form>
        )}

        {/* Repositories Cards */}
        {watchedRepos.length === 0 ? (
          <div className="text-center py-8 text-xs text-theme-muted bg-theme-elevated/40 rounded-xl border border-dashed border-theme-border">
            No local repositories watched yet. Click &quot;Watch Local Folder&quot; above or use the CLI command{' '}
            <code className="text-theme-accent font-mono">streakforge-agent watch add &lt;path&gt;</code>.
          </div>
        ) : (
          <div className="space-y-3">
            {watchedRepos.map((repo) => (
              <div
                key={repo.path}
                className="p-4 bg-theme-elevated border border-theme-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-theme-primary break-all">
                      {repo.path}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-theme-surface border border-theme-border text-theme-secondary">
                      Mode: {repo.mode || 'APPROVAL'}
                    </span>
                    {repo.autoPush && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Auto-Push
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-theme-muted mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-theme-accent" />
                      Branch: <strong className="text-theme-secondary">{repo.branch || 'main'}</strong>
                    </span>
                    {repo.lastCommitSha && (
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3 text-emerald-500" />
                        Last Commit: <code className="text-theme-secondary">{repo.lastCommitSha.slice(0, 7)}</code>
                      </span>
                    )}
                    {repo.lastSyncedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Synced: {new Date(repo.lastSyncedAt).toLocaleTimeString()}
                      </span>
                    )}
                    {repo.nextBackupAt && (
                      <span className="flex items-center gap-1">
                        <Archive className="w-3 h-3 text-purple-400" />
                        Next Backup: {new Date(repo.nextBackupAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>

                  {repo.lastError && (
                    <div className="mt-2 text-[11px] text-rose-400 font-mono flex items-center gap-1.5 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{repo.lastError}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSyncNow(repo.path)}
                    disabled={syncingRepo === repo.path}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface hover:bg-theme-elevated border border-theme-border rounded-lg text-xs font-semibold text-theme-primary transition disabled:opacity-50"
                    title="Run 15-step authentic Git synchronization"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingRepo === repo.path ? 'animate-spin' : ''}`} />
                    <span>{syncingRepo === repo.path ? 'Syncing...' : 'Sync Now'}</span>
                  </button>

                  <button
                    onClick={() => handleBackupNow(repo.path)}
                    disabled={backingUpRepo === repo.path}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-surface hover:bg-theme-elevated border border-theme-border rounded-lg text-xs font-semibold text-purple-400 transition disabled:opacity-50"
                    title="Create immediate backup snapshot commit"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Backup</span>
                  </button>

                  <button
                    onClick={() => handleUnwatchRepo(repo.path)}
                    className="p-1.5 bg-theme-surface hover:bg-rose-500/10 border border-theme-border rounded-lg text-theme-muted hover:text-rose-500 transition"
                    title="Stop watching repository"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Windows Installer & Autostart Quick Controls */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-theme-accent" />
            Desktop Agent Installation & Autostart
          </h3>
          <p className="text-[11px] text-theme-muted mt-0.5">
            Cross-platform background daemon with 1-click Windows installer and system startup persistence
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-theme-elevated border border-theme-border rounded-xl space-y-2">
            <div className="font-semibold text-theme-primary flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-theme-accent" />
              Windows 1-Click Installer
            </div>
            <p className="text-[11px] text-theme-muted">
              Installs binary wrapper and builds dependencies in <code>%LOCALAPPDATA%\StreakForge</code>:
            </p>
            <div className="p-2 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded select-all">
              powershell -ExecutionPolicy Bypass -File scripts\install-agent.ps1
            </div>
          </div>

          <div className="p-3.5 bg-theme-elevated border border-theme-border rounded-xl space-y-2">
            <div className="font-semibold text-theme-primary flex items-center gap-1.5">
              <Play className="w-4 h-4 text-theme-accent" />
              Windows Boot Autostart Configuration
            </div>
            <p className="text-[11px] text-theme-muted">
              Configure automatic background startup via Windows Registry (<code>HKCU\...\Run</code>):
            </p>
            <div className="p-2 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded select-all">
              streakforge-agent autostart enable
            </div>
          </div>
        </div>
      </div>

      {/* 5. Central Cloud Multi-Device Pairing */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
          <Laptop className="w-4 h-4 text-theme-accent" />
          Central Cloud Agent Pairing (Optional Remote Sync)
        </h3>
        <p className="text-[11px] text-theme-muted mt-0.5">
          Connect your desktop agent to StreakForge cloud server for multi-device dashboard telemetry
        </p>

        <form onSubmit={handleRegisterCentral} className="mt-4 flex gap-3 max-w-lg">
          <input
            type="text"
            placeholder="Agent Name (e.g. Workstation, MacBook Pro)"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
            className="flex-1 px-3 py-2 bg-theme-elevated border border-theme-border rounded-lg text-theme-primary text-xs focus:outline-none focus:border-theme-accent"
          />
          <button
            type="submit"
            disabled={isRegistering || !agentName}
            className="px-4 py-2 bg-theme-accent text-slate-950 font-semibold text-xs rounded-lg transition hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Terminal className="w-4 h-4" />
            <span>{isRegistering ? 'Generating...' : 'Pair Agent'}</span>
          </button>
        </form>

        {createdAgent && (
          <div className="mt-4 p-4 bg-theme-elevated border border-theme-accent/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-theme-accent font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Pairing Credentials Ready
              </span>
              <button
                onClick={handleCopyPairCmd}
                className="flex items-center gap-1 text-theme-secondary hover:text-theme-primary"
              >
                {copiedPairCmd ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedPairCmd ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg text-xs font-mono text-emerald-400 break-all select-all">
              {getPairCommand()}
            </div>
            <p className="text-[11px] text-theme-muted">
              Run this command in your local terminal where the StreakForge desktop agent is installed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}