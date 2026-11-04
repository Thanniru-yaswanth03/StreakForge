'use client';

import React, { useState } from 'react';
import {
  Bot,
  Play,
  Pause,
  Trash2,
  Edit,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Plus
} from 'lucide-react';
import { useData, AutomationJob } from '../context/DataContext';

export function AutomationCenterView() {
  const { automations, toggleAutomation, deleteAutomation } = useData();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<AutomationJob | null>(null);

  const activeCount = automations.filter((a) => a.status === 'ACTIVE').length;
  const pausedCount = automations.filter((a) => a.status === 'PAUSED').length;
  const totalSuccess = automations.reduce((acc, a) => acc + a.successCount, 0);
  const totalFailures = automations.reduce((acc, a) => acc + a.failureCount, 0);
  const successRate = totalSuccess + totalFailures > 0
    ? ((totalSuccess / (totalSuccess + totalFailures)) * 100).toFixed(1)
    : '100.0';

  // Execution history log entries
  const executionHistory = [
    {
      id: 'ex-101',
      jobName: 'Local Agent Idle Auto-Commit',
      trigger: 'File System Watcher',
      timestamp: 'Today at 14:22',
      duration: '420ms',
      status: 'SUCCESS',
      output: 'Committed 3 files in streakforge (SHA: 8f7d9a1)'
    },
    {
      id: 'ex-102',
      jobName: 'LeetCode Solution Exporter',
      trigger: 'GraphQL Observer',
      timestamp: 'Today at 12:45',
      duration: '850ms',
      status: 'SUCCESS',
      output: 'Pushed solutions/Medium/146-lru-cache/README.md & code'
    },
    {
      id: 'ex-103',
      jobName: 'End-of-Day Streak Wrap-Up',
      trigger: 'Scheduled Cron',
      timestamp: 'Yesterday at 23:00',
      duration: '180ms',
      status: 'SUCCESS',
      output: 'Verified daily goal satisfied (4 activities recorded)'
    }
  ];

  const handleDelete = (id: string) => {
    deleteAutomation(id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Active Automations</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">{activeCount}</div>
          <div className="text-[11px] text-theme-muted mt-0.5">{pausedCount} paused</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Scheduled Jobs</div>
          <div className="text-2xl font-bold text-theme-primary mt-1">{automations.length}</div>
          <div className="text-[11px] text-theme-muted mt-0.5">Automated Rules</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Success Rate</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1">{successRate}%</div>
          <div className="text-[11px] text-theme-muted mt-0.5">{totalSuccess} completed</div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">Failure Count</div>
          <div className="text-2xl font-bold text-theme-primary mt-1">{totalFailures}</div>
          <div className="text-[11px] text-rose-500 mt-0.5 font-medium">0 critical</div>
        </div>
      </div>

      {/* Automations Management Table */}
      <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-theme-border flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-theme-accent" />
              Configured Automations
            </h3>
            <p className="text-[11px] text-theme-muted mt-0.5">
              Zero-fabrication automated rules running locally or via server webhooks
            </p>
          </div>

          <button
            onClick={() => alert('New rule creator: Add a new watch path in Desktop Agent or configure webhook.')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-accent text-slate-950 text-xs font-semibold rounded-lg transition hover:opacity-95 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Rule</span>
          </button>
        </div>

        <div className="divide-y divide-theme-border">
          {automations.map((job) => (
            <div key={job.id} className="p-4 hover:bg-theme-elevated/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      job.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <h4 className="font-semibold text-sm text-theme-primary">{job.name}</h4>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      job.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>

                <p className="text-xs text-theme-secondary mt-1">{job.scheduleDescription}</p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-theme-muted mt-2 font-mono">
                  <span>Next: {job.nextExecution}</span>
                  <span>Last: {job.lastExecution}</span>
                  <span>Success: {job.successCount} runs</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleAutomation(job.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-xs font-medium text-theme-primary transition"
                >
                  {job.status === 'ACTIVE' ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => alert(`Executing immediate dry-run for "${job.name}"...`)}
                  className="p-2 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
                  title="Run Now"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setEditingJob(job)}
                  className="p-2 bg-theme-elevated hover:bg-theme-surface border border-theme-border rounded-lg text-theme-muted hover:text-theme-primary transition"
                  title="Edit Settings"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setDeleteConfirmId(job.id)}
                  className="p-2 bg-theme-elevated hover:bg-rose-500/10 border border-theme-border rounded-lg text-theme-muted hover:text-rose-500 transition"
                  title="Delete Automation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution History */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
        <h3 className="text-xs font-bold text-theme-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-theme-accent" />
          Execution History Log
        </h3>
        <p className="text-xs text-theme-muted mb-3">
          Detailed output and exit statuses for recent automated job runs
        </p>

        <div className="space-y-2">
          {executionHistory.map((ex) => (
            <div
              key={ex.id}
              className="p-3 bg-theme-elevated border border-theme-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-theme-primary">{ex.jobName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-theme-surface rounded text-theme-muted">
                    {ex.trigger}
                  </span>
                </div>
                <div className="text-[11px] text-theme-muted mt-0.5 font-mono">{ex.output}</div>
              </div>

              <div className="flex items-center gap-3 text-right flex-shrink-0">
                <span className="text-[11px] text-theme-muted font-mono">{ex.duration}</span>
                <span className="text-[11px] text-theme-muted font-mono">{ex.timestamp}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {ex.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Destructive Delete Action */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-theme-surface border border-theme-border rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-theme-primary">Confirm Deletion</h4>
                <p className="text-xs text-theme-muted">Destructive Action</p>
              </div>
            </div>

            <p className="text-xs text-theme-secondary">
              Are you sure you want to delete this automation rule? This will halt scheduled checks and local triggers for this task.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 bg-theme-elevated hover:bg-theme-surface text-xs font-semibold rounded-lg text-theme-primary transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-semibold rounded-lg text-white transition shadow-sm"
              >
                Yes, Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

