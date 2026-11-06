'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Plus,
  RefreshCw,
  ArrowUpRight,
  GitCommit,
  Flame,
  FolderGit2,
  Check,
  Activity,
  History,
  Info
} from 'lucide-react';
import type { AutomationType, JobRecord } from '@streakforge/shared-types';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';

interface AutomationRuleState {
  id: string;
  name: string;
  description: string;
  type: AutomationType;
  enabled: boolean;
  schedule: string;
  triggerType: string;
  lastExecution?: {
    timestamp: string;
    status: string;
    summary: string;
    durationMs?: number;
  };
  nextExecution?: string;
}

export function AutomationCenterView() {
  const { submissions, connectedRepos, refreshData } = useData();
  const [rules, setRules] = useState<AutomationRuleState[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [triggeringRuleId, setTriggeringRuleId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newRuleName, setNewRuleName] = useState<string>('Custom Auto-Sync');
  const [newRuleType, setNewRuleType] = useState<AutomationType>('LEETCODE_EXPORT');
  const [newRuleSchedule, setNewRuleSchedule] = useState<string>('every 15m');

  const targetRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  const fetchAutomationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rulesRes, jobsRes] = await Promise.all([
        api.automations.getRules(),
        api.automations.getJobs(1, 15)
      ]);
      setRules((rulesRes as any) || []);
      setRecentJobs(jobsRes?.jobs || []);
    } catch (err) {
      console.warn('Failed to fetch automations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomationData();
  }, [fetchAutomationData]);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await api.automations.toggleRule(ruleId);
      setRules((prev) =>
        prev.map((r) => ((r.id === ruleId || (r as any)._id === ruleId) ? { ...r, enabled: res.enabled } : r))
      );
      showNotice(res.enabled ? 'Automation rule resumed.' : 'Automation rule paused.');
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const handleTriggerNow = async (ruleId: string, ruleName: string) => {
    setTriggeringRuleId(ruleId);
    try {
      await api.automations.triggerRule(ruleId);
      await Promise.all([
        fetchAutomationData(),
        refreshData()
      ]);
      setTriggeringRuleId(null);
      showNotice(`⚡ Executed "${ruleName}" successfully! Live results and activities updated across the app.`);
    } catch (err: any) {
      alert(`Trigger failed: ${err.message}`);
      setTriggeringRuleId(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.automations.createRule({
        name: newRuleName,
        type: newRuleType,
        schedule: newRuleSchedule,
        triggerType: 'CRON',
        repositoryScope: 'DEFAULT'
      });
      setIsCreateModalOpen(false);
      showNotice(`Created automation rule "${newRuleName}".`);
      await fetchAutomationData();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    }
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Action Notification Toast */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-400/60 hover:text-emerald-300 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Automations & Activity Sync Engines
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero-fabrication automated background routines that eliminate manual work, protect your streak, and push verified code to GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAutomationData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#238636] hover:bg-[#2ea043] border border-white/10 text-white font-medium text-xs rounded-md transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Custom Rule</span>
          </button>
        </div>
      </div>

      {/* Executive Automation Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0e1217] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Automated Commits
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <GitCommit className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {submissions.filter((s) => s.syncStatus === 'SYNCED').length}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <Check className="w-3 h-3" />
            <span>Solutions pushed to GitHub</span>
          </div>
        </div>

        <div className="bg-[#0e1217] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Streak Sentinel
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4 fill-amber-400/20" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            Active Watchdog
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Evaluates streak before midnight</span>
          </div>
        </div>

        <div className="bg-[#0e1217] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Target Solutions Repo
            </span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white mt-2 truncate" title={targetRepo?.repoFullName || 'None'}>
            {targetRepo?.repoFullName ? targetRepo.repoFullName.split('/')[1] || targetRepo.repoFullName : 'Not Designated'}
          </div>
          <div className="text-[11px] text-cyan-400 flex items-center gap-1 mt-1 truncate">
            {targetRepo?.repoFullName ? (
              <a
                href={`https://github.com/${targetRepo.repoFullName}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                <span>{targetRepo.repoFullName}</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <span>Connect in Repositories</span>
            )}
          </div>
        </div>

        <div className="bg-[#0e1217] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active Engines
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2">
            {activeCount} of {rules.length}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Autonomous background loops</span>
          </div>
        </div>
      </div>

      {/* Primary Automation Engines Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            Core Synchronization Engines & Schedulers
          </h2>
          <span className="text-[11px] text-slate-500">
            Click &ldquo;Execute Now&rdquo; to trigger an instant background sync run
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule, rIdx) => {
            const ruleKey = rule.id || (rule as any)._id || `rule-${rule.type}-${rIdx}`;
            const ruleIdentifier = rule.id || (rule as any)._id;
            const isExecuting = triggeringRuleId === ruleIdentifier;
            const isLeetCodeExport = rule.type === 'LEETCODE_EXPORT';
            const isStreakGuard = rule.type === 'DAILY_REMINDERS';
            const isActivitySync = rule.type === 'GITHUB_ACTIVITY_SYNC';
            const isHealthCheck = rule.type === 'REPO_HEALTH_CHECK';

            return (
              <div
                key={ruleKey}
                className={`bg-[#0e1217] border transition rounded-xl p-5 flex flex-col justify-between gap-4 ${
                  rule.enabled
                    ? 'border-white/[0.09] hover:border-amber-500/30'
                    : 'border-white/[0.04] opacity-60'
                }`}
              >
                <div>
                  {/* Card Header: Type Badge & Toggle Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          isLeetCodeExport
                            ? 'bg-amber-500/15 text-amber-400'
                            : isStreakGuard
                            ? 'bg-red-500/15 text-red-400'
                            : isActivitySync
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {isLeetCodeExport && <Zap className="w-5 h-5" />}
                        {isStreakGuard && <Flame className="w-5 h-5 fill-red-400/20" />}
                        {isActivitySync && <RefreshCw className="w-5 h-5" />}
                        {isHealthCheck && <ShieldCheck className="w-5 h-5" />}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          {rule.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300">
                            {rule.schedule}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              rule.enabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {rule.enabled ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => handleToggleRule(ruleIdentifier)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        rule.enabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                      title={rule.enabled ? 'Pause automation' : 'Resume automation'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-sm transition duration-200 ease-in-out ${
                          rule.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Impact Description */}
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {rule.description}
                  </p>

                  {/* Real-world Impact Callout */}
                  <div className="mt-3.5 p-2.5 rounded-lg bg-[#14181f] border border-white/[0.04] text-[11px] text-slate-300 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {isLeetCodeExport &&
                        `Destination: solutions/{difficulty}/{id}-{slug} in ${targetRepo?.repoFullName || 'target repo'}`}
                      {isStreakGuard &&
                        'Evaluates verified LeetCode & GitHub commits daily to prevent streak loss'}
                      {isActivitySync &&
                        `Monitors ${connectedRepos.length} connected repositories for genuine changes`}
                      {isHealthCheck &&
                        'Automated vulnerability, branch protection, and security review'}
                    </span>
                  </div>
                </div>

                {/* Card Footer: Last Execution & Manual Trigger */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {rule.lastExecution
                        ? `Last run: ${new Date(rule.lastExecution.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Scheduled for execution'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTriggerNow(ruleIdentifier, rule.name)}
                    disabled={isExecuting}
                    className="flex items-center gap-1.5 px-3 py-1 bg-[#1a212d] hover:bg-[#242f40] border border-white/10 text-amber-400 hover:text-amber-300 rounded-md text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <Play className={`w-3 h-3 ${isExecuting ? 'animate-spin' : 'fill-current'}`} />
                    <span>{isExecuting ? 'Running...' : 'Execute Now'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Execution Ledger */}
      <div className="bg-[#0e1217] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Live Automation Execution Ledger
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {recentJobs.length} Recent Runs
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {recentJobs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No background jobs executed recently. Use &ldquo;Execute Now&rdquo; above to run any routine.
            </div>
          ) : (
            recentJobs.map((job, idx) => {
              const itemKey = job.id || (job as any)._id || (job as any).jobId || `job-key-${idx}`;
              return (
                <div
                  key={itemKey}
                  className="p-3.5 hover:bg-white/[0.015] transition flex items-center justify-between text-xs gap-3"
                >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      job.status === 'COMPLETED'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                        : job.status === 'FAILED'
                        ? 'bg-red-400'
                        : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{job.jobType.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({(job.id || (job as any).jobId || '').slice(0, 8)})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>
                        {(job as any).result?.summary ||
                          (job as any).resultSummary ||
                          job.payload?.summary ||
                          'Executed background synchronization routine.'}
                      </span>
                      {((job as any).result?.data?.commitUrl || job.payload?.commitUrl) && (
                        <a
                          href={(job as any).result?.data?.commitUrl || job.payload?.commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded font-mono text-[10px] transition"
                        >
                          <span>Commit {((job as any).result?.data?.commitSha || '').slice(0, 7) || 'view'} ↗</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <div>{job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : 'In Progress'}</div>
                  <div className="text-emerald-400 font-mono text-[10px] mt-0.5">
                    {job.durationMs ? `${job.durationMs}ms` : '0ms'}
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Modal: Create Custom Automation */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0e1217] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Create Custom Automation Routine
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Workflow Type
                </label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as AutomationType)}
                  className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="LEETCODE_EXPORT">LeetCode Accepted-Solution Export</option>
                  <option value="GITHUB_ACTIVITY_SYNC">GitHub Activity Synchronization</option>
                  <option value="DAILY_REMINDERS">Daily Streak Protection Watchdog</option>
                  <option value="REPO_HEALTH_CHECK">Repository Health & Security Audit</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Schedule (Interval or Cron)
                </label>
                <input
                  type="text"
                  value={newRuleSchedule}
                  onChange={(e) => setNewRuleSchedule(e.target.value)}
                  placeholder="e.g. every 15m, every 1h, 0 20 * * *"
                  className="w-full bg-[#161b22] border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-amber-500"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Supports natural syntax (e.g. &ldquo;every 30m&rdquo;, &ldquo;every 2h&rdquo;) or standard 5-part cron.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
