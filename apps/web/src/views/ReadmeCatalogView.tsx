'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RotateCw,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  Undo2,
  Check,
  Copy,
  AlertCircle,
  Eye,
  Code2
} from 'lucide-react';
import { api } from '../lib/api';
import { useData } from '../context/DataContext';
import type { CatalogPreview, CatalogSyncResult } from '@streakforge/shared-types';

export function ReadmeCatalogView() {
  const { connectedRepos } = useData();
  const [preview, setPreview] = useState<CatalogPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [rollingBack, setRollingBack] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'markdown'>('table');
  const [copied, setCopied] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<CatalogSyncResult | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const primaryRepo = connectedRepos.find((r) => r.isTargetForLeetCode) || {
    repoFullName: 'Thanniru-yaswanth03/LeetCodeHustle'
  };

  const fetchPreview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.catalog.preview(primaryRepo.repoFullName);
      setPreview(res);
    } catch (err: any) {
      console.error('Failed fetching catalog preview:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to fetch catalog preview' });
    } finally {
      setLoading(false);
    }
  }, [primaryRepo.repoFullName]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleSyncToGitHub = async () => {
    try {
      setSyncing(true);
      setActionMessage(null);
      const res = await api.catalog.sync(primaryRepo.repoFullName);
      setSyncResult(res);
      setActionMessage({
        type: 'success',
        text: `Successfully cataloged ${res.itemsCataloged} solutions to ${res.repoFullName} README.md!`
      });
      await fetchPreview();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Sync failed: ${err.message || 'Check GitHub token credentials in Settings'}`
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleRollback = async () => {
    try {
      setRollingBack(true);
      setActionMessage(null);
      const res = await api.catalog.rollback(primaryRepo.repoFullName);
      setActionMessage({ type: 'success', text: res.message || 'README rolled back successfully.' });
      await fetchPreview();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `Rollback failed: ${err.message || 'No previous snapshot found'}`
      });
    } finally {
      setRollingBack(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!preview?.markdownPreview) return;
    navigator.clipboard.writeText(preview.markdownPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* 1. Header Card */}
      <div className="github-glossy-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#3fb950]" />
            <h2 className="text-xl font-extrabold text-[#f0f6fc] tracking-tight">
              GitHub README Auto-Catalog
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30 font-mono">
              Auto-Index
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Automatically generates and maintains a structured solutions table in your repository README between safe delimiters.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <button
            onClick={handleSyncToGitHub}
            disabled={syncing || loading}
            className="github-glossy-button-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <GitCommit className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Committing...' : 'Sync Catalog to GitHub'}</span>
          </button>

          <button
            onClick={handleRollback}
            disabled={rollingBack || loading}
            className="github-glossy-button-secondary px-3 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
            title="Rollback README to previous version"
          >
            <Undo2 className="w-3.5 h-3.5 text-[#8b949e]" />
            <span>{rollingBack ? 'Reverting...' : 'Rollback'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-[#238636]/15 border-[#238636]/40 text-[#3fb950]'
              : 'bg-[#f85149]/15 border-[#f85149]/40 text-[#f85149]'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[#8b949e] hover:text-[#f0f6fc] text-xs font-bold px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Repository Metadata & Delimiter Safeguard Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="github-glossy-card p-4">
          <div className="text-xs text-[#8b949e] font-semibold">Target Repository</div>
          <div className="text-base font-bold text-[#58a6ff] font-mono mt-1 flex items-center gap-1.5 truncate">
            <a
              href={`https://github.com/${primaryRepo.repoFullName}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline truncate"
            >
              {primaryRepo.repoFullName}
            </a>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1 font-mono">Branch: main</div>
        </div>

        <div className="github-glossy-card p-4">
          <div className="text-xs text-[#8b949e] font-semibold">Tracked Solutions</div>
          <div className="text-2xl font-extrabold text-[#f0f6fc] font-mono mt-1">
            {preview?.totalCount || 0}
          </div>
          <div className="text-[11px] text-[#3fb950] mt-1 font-mono">&check; 100% Authentic LeetCode</div>
        </div>

        <div className="github-glossy-card p-4">
          <div className="text-xs text-[#8b949e] font-semibold">Delimiter Safeguard</div>
          <div className="text-xs font-mono text-[#a371f7] mt-1 truncate">
            &lt;!-- STREAKFORGE:START --&gt;
          </div>
          <div className="text-[11px] text-[#8b949e] mt-1">
            Preserves custom docs before and after the table.
          </div>
        </div>
      </div>

      {/* 3. Preview Box */}
      <div className="github-glossy-card overflow-hidden">
        {/* Sub-header with Table vs Markdown toggle */}
        <div className="p-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'table' ? 'bg-[#21262d] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              Formatted Catalog Table
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                viewMode === 'markdown' ? 'bg-[#21262d] text-[#f0f6fc]' : 'text-[#8b949e] hover:text-[#f0f6fc]'
              }`}
            >
              Raw README.md Preview
            </button>
          </div>

          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1 text-[#8b949e] hover:text-[#f0f6fc] transition font-mono text-[11px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3fb950]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-[#8b949e] space-y-2">
            <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#58a6ff]" />
            <p className="text-xs">Scanning repository and generating catalog preview...</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] bg-[#0d1117]/80 text-[#8b949e] font-mono text-[11px]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Problem</th>
                  <th className="py-2.5 px-4 w-24">Difficulty</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 w-28">Language</th>
                  <th className="py-2.5 px-4 w-28 text-right">Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/60 font-sans">
                {preview?.items?.map((item) => {
                  const diffColor =
                    item.difficulty === 'Easy'
                      ? 'text-[#3fb950] bg-[#238636]/15 border-[#238636]/30'
                      : item.difficulty === 'Medium'
                      ? 'text-[#d29922] bg-[#d29922]/15 border-[#d29922]/30'
                      : 'text-[#f85149] bg-[#f85149]/15 border-[#f85149]/30';

                  return (
                    <tr key={item.number} className="hover:bg-[#161b22]/70 transition">
                      <td className="py-2.5 px-4 text-center font-mono text-[#8b949e]">
                        {item.number}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#f0f6fc]">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffColor}`}>
                          {item.difficulty}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[#8b949e]">
                        {item.topics.join(', ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[#58a6ff]">
                        {item.language}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={item.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-[#58a6ff] hover:underline flex items-center gap-1 justify-end"
                        >
                          <span>View Code</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 bg-[#0d1117] font-mono text-xs text-[#c9d1d9] overflow-x-auto max-h-[500px]">
            <pre className="whitespace-pre-wrap leading-relaxed">{preview?.markdownPreview}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

