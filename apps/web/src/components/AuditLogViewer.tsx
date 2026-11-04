'use client';

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { AuditLog, AuditComponent } from '@streakforge/shared-types';

interface AuditLogViewerProps {
  logs: AuditLog[];
  onRefresh: () => void;
  selectedComponent: string;
  onComponentChange: (comp: string) => void;
}

export function AuditLogViewer({
  logs,
  onRefresh,
  selectedComponent,
  onComponentChange
}: AuditLogViewerProps) {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const components: Array<{ id: string; label: string }> = [
    { id: '', label: 'All Components' },
    { id: 'API', label: 'API Gateway' },
    { id: 'EXTENSION', label: 'Chrome Extension' },
    { id: 'AGENT', label: 'Desktop Agent' },
    { id: 'WEB', label: 'Web Application' }
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Immutable Audit Trail
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically recorded ledger of every automated and manual activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedComponent}
            onChange={(e) => onComponentChange(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-800/60">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No audit records matching the current filter.
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="hover:bg-slate-800/20 transition p-4">
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-start gap-3">
                    <button className="text-slate-500 hover:text-slate-300 mt-0.5">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {log.component}
                        </span>
                        <span className="text-xs font-semibold text-white">{log.action}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{log.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 text-right">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : log.status === 'WARNING'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                      {log.status === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
                      {log.status === 'FAILURE' && <AlertCircle className="w-3 h-3" />}
                      <span>{log.status}</span>
                    </span>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-3 ml-7 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-400 overflow-x-auto">
                    <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

