'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, ShieldCheck, Laptop, RefreshCw } from 'lucide-react';
import type { LocalAgentInstance } from '@streakforge/shared-types';
import { api } from '../lib/api';

interface AgentManagerProps {
  agents: LocalAgentInstance[];
  onRefresh: () => void;
}

export function AgentManager({ agents, onRefresh }: AgentManagerProps) {
  const [agentName, setAgentName] = useState<string>('');
  const [createdAgent, setCreatedAgent] = useState<{ agentId: string; apiKey: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const getPairCommand = () => {
    if (!createdAgent) return '';
    return `streakforge-agent pair --server http://localhost:4000 --key ${createdAgent.apiKey} --agent-id ${createdAgent.agentId}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPairCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Registered Desktop Agents */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Active Desktop Agents</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Local background daemons monitoring your real Git repositories
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-sm text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              No desktop agents registered yet. Register an agent below to automate local commits safely.
            </div>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{agent.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {agent.hostname} ({agent.os}) • v{agent.agentVersion}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      agent.status === 'ONLINE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg">
                  <span className="font-semibold text-slate-300">Watched paths:</span>{' '}
                  {agent.watchedPaths.length > 0 ? agent.watchedPaths.join(', ') : 'None configured yet'}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
                  <span>Last Heartbeat: {new Date(agent.lastHeartbeatAt).toLocaleTimeString()}</span>
                  <span>Idle Timer: {agent.rules?.idleAutoCommitMinutes || 15}m</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Register New Agent */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-base font-bold text-white tracking-tight">Register New Desktop Agent</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Generate pairing credentials for your local machine daemon
        </p>

        <form onSubmit={handleRegister} className="mt-4 flex gap-3 max-w-lg">
          <input
            type="text"
            placeholder="Agent Name (e.g. MacBook Pro, Workstation)"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            required
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isRegistering || !agentName}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Terminal className="w-4 h-4" />
            <span>{isRegistering ? 'Generating...' : 'Pair Agent'}</span>
          </button>
        </form>

        {createdAgent && (
          <div className="mt-4 p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Pairing Credentials Ready
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Command'}</span>
              </button>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg text-xs font-mono text-emerald-400 break-all select-all">
              {getPairCommand()}
            </div>
            <p className="text-[11px] text-slate-400">
              Run this command in your local terminal where the StreakForge desktop agent is installed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
