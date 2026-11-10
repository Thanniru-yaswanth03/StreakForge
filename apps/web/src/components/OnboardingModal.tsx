'use client';

import React, { useState } from 'react';
import {
  Github,
  CheckCircle2,
  FolderGit2,
  ArrowRight,
  ArrowLeft,
  X,
  ExternalLink,
  ShieldCheck,
  Code2,
  KeyRound,
  Download,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { api } from '../lib/api';
import { setStoredToken, API_BASE_URL } from '../lib/utils';
import { BrandLogo } from './BrandLogo';
import { GitHubConnectButton } from './GitHubConnectButton';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user, githubRepos, connectedRepos, refreshData } = useData();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(user ? 2 : 1);
  const [patInput, setPatInput] = useState('');
  const [patLoading, setPatLoading] = useState(false);
  const [patError, setPatError] = useState('');
  const [showPatInput, setShowPatInput] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const [savingRepo, setSavingRepo] = useState(false);

  if (!isOpen) return null;

  const isGitHubConnected = Boolean(user);
  const primaryRepo = connectedRepos.find((r) => r.isTargetForLeetCode);

  const handleConnectPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patInput.trim()) return;
    try {
      setPatLoading(true);
      setPatError('');
      const res = await api.auth.connectWithPAT(patInput.trim());
      localStorage.setItem('streakforge_token', res.token);
      document.cookie = `streakforge_token=${res.token}; path=/; max-age=604800; SameSite=Lax`;
      await refreshData();
      setCurrentStep(2);
    } catch (err: any) {
      setPatError(err.message || 'PAT authentication failed. Verify token scopes.');
    } finally {
      setPatLoading(false);
    }
  };

  const handleSelectTargetRepo = async (repo: any) => {
    try {
      setSavingRepo(true);
      setSelectedRepoId(repo.id);
      await api.repos.connect({
        repoFullName: repo.fullName,
        githubRepoId: repo.id,
        description: repo.description,
        primaryLanguage: repo.primaryLanguage,
        cloneUrl: repo.cloneUrl,
        defaultBranch: repo.defaultBranch || 'main',
        isTargetForLeetCode: true,
        category: 'LeetCode Solutions'
      });
      await refreshData();
    } catch (err) {
      console.error('Failed to set target repo:', err);
    } finally {
      setSavingRepo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo variant="symbol" size={24} />
            <div>
              <h2 className="text-sm font-bold text-theme-primary leading-tight">
                StreakForge Setup
              </h2>
              <p className="text-[11px] text-theme-muted">
                Zero-fabrication authentic activity tracking in 3 steps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-muted hover:text-theme-primary rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="grid grid-cols-3 border-b border-theme-border text-center text-xs font-semibold">
          <button
            onClick={() => setCurrentStep(1)}
            className={`py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
              currentStep === 1
                ? 'border-emerald-500 text-emerald-500 font-bold bg-theme-accent-subtle/30'
                : isGitHubConnected
                ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-theme-muted'
            }`}
          >
            {isGitHubConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">1</span>
            )}
            <span>1. GitHub</span>
          </button>

          <button
            onClick={() => setCurrentStep(2)}
            className={`py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
              currentStep === 2
                ? 'border-emerald-500 text-emerald-500 font-bold bg-theme-accent-subtle/30'
                : 'border-transparent text-theme-muted'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">2</span>
            <span>2. Extension</span>
          </button>

          <button
            onClick={() => setCurrentStep(3)}
            className={`py-2.5 px-3 border-b-2 flex items-center justify-center gap-1.5 transition ${
              currentStep === 3
                ? 'border-emerald-500 text-emerald-500 font-bold bg-theme-accent-subtle/30'
                : primaryRepo
                ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-theme-muted'
            }`}
          >
            {primaryRepo ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] flex items-center justify-center">3</span>
            )}
            <span>3. Repository</span>
          </button>
        </div>

        {/* Modal Body: Steps */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: CONNECT GITHUB */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-theme-primary">
                  Connect your genuine GitHub account
                </h3>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                  StreakForge reads your authentic commits, PRs, and verified emails to calculate true developer streaks. We never fabricate activity.
                </p>
              </div>

              {isGitHubConnected ? (
                <div className="p-4 rounded-xl bg-theme-elevated border border-theme-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.avatarUrl || 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'}
                      alt={user?.username}
                      className="w-10 h-10 rounded-full border border-theme-border"
                    />
                    <div>
                      <div className="text-xs font-bold text-theme-primary flex items-center gap-1.5">
                        <span>@{user?.username}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="text-[11px] text-theme-muted">
                        {user?.email || 'Verified Contributor'} • {user?.verifiedEmails?.length || 1} verified email(s)
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Connected
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <GitHubConnectButton
                    label="Authorize via GitHub OAuth"
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-xs"
                    iconClassName="w-4 h-4"
                  />

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowPatInput(!showPatInput)}
                      className="text-[11px] text-theme-muted hover:text-theme-primary underline"
                    >
                      {showPatInput ? 'Hide Token Input' : 'Or connect using Personal Access Token (PAT)'}
                    </button>
                  </div>

                  {showPatInput && (
                    <form onSubmit={handleConnectPAT} className="p-3 bg-theme-elevated border border-theme-border rounded-xl space-y-2">
                      <label className="text-[11px] font-semibold text-theme-muted block">
                        GitHub Token (classic `ghp_...` with repo &amp; read:user scopes)
                      </label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-1.5 text-xs text-theme-primary font-mono focus:outline-none focus:border-emerald-500"
                      />
                      {patError && <p className="text-[11px] text-rose-500">{patError}</p>}
                      <button
                        type="submit"
                        disabled={patLoading || !patInput.trim()}
                        className="w-full py-2 bg-theme-surface hover:bg-theme-border border border-theme-border text-theme-primary font-bold text-xs rounded-lg transition disabled:opacity-50"
                      >
                        {patLoading ? 'Verifying Token...' : 'Connect with Token'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 bg-theme-elevated hover:bg-theme-border border border-theme-border text-theme-primary font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: INSTALL LEETCODE EXTENSION */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-theme-primary">
                  Install the LeetCode Sync Extension
                </h3>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                  The extension detects only genuine <strong>Accepted</strong> submissions, extracts the solution from the Monaco editor, and exports it to your GitHub target.
                </p>
              </div>

              {/* Status Verification Checklist */}
              <div className="p-3.5 bg-theme-elevated border border-theme-border rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-theme-primary">Extension Integration</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-secondary">
                    Manifest V3
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] text-theme-muted">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Monitors submissions strictly on <code className="text-theme-primary font-mono">leetcode.com</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Zero duplicate exports via deterministic SHA-256 fingerprinting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Preserves runtime &amp; memory percentiles in git commit metadata</span>
                  </div>
                </div>
              </div>

              {/* Install / Load Steps */}
              <div className="p-3 bg-theme-bg border border-theme-border rounded-xl space-y-2 text-xs">
                <div className="font-bold text-theme-primary text-xs">
                  How to load in Chrome:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-theme-muted">
                  <li>Open <code className="text-emerald-500 font-mono">chrome://extensions</code> in your browser.</li>
                  <li>Enable <strong>Developer mode</strong> in the top-right corner.</li>
                  <li>Click <strong>Load unpacked</strong> and select the <code className="text-theme-primary font-mono">apps/extension/dist</code> folder.</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3.5 py-1.5 text-theme-muted hover:text-theme-primary text-xs font-medium flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 bg-theme-elevated hover:bg-theme-border border border-theme-border text-theme-primary font-bold text-xs rounded-lg flex items-center gap-1.5 transition"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SELECT REPOSITORY */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-sm font-bold text-theme-primary">
                  Select your LeetCode target repository
                </h3>
                <p className="text-xs text-theme-muted mt-1 leading-relaxed">
                  Choose which repository will receive your accepted solutions. StreakForge will organize them by difficulty:
                </p>
              </div>

              {/* Folder Structure Preview */}
              <div className="p-3 bg-theme-bg border border-theme-border rounded-xl font-mono text-[11px] text-theme-secondary space-y-0.5">
                <div className="text-emerald-500 font-bold">leetcode-solutions/</div>
                <div className="pl-4">├── Easy/</div>
                <div className="pl-4">│   └── 001-two-sum/solution.py</div>
                <div className="pl-4">├── Medium/</div>
                <div className="pl-4">│   └── 146-lru-cache/solution.py</div>
                <div className="pl-4">└── Hard/</div>
                <div className="pl-4">    └── 042-trapping-rain-water/solution.py</div>
              </div>

              {/* Repository Selector */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-theme-muted uppercase tracking-wider">
                  Available Repositories ({githubRepos.length})
                </div>

                {githubRepos.length === 0 ? (
                  <div className="p-3 text-center text-xs text-theme-muted border border-dashed border-theme-border rounded-xl">
                    No repositories discovered. Connect GitHub in Step 1 to auto-import repositories.
                  </div>
                ) : (
                  githubRepos.slice(0, 8).map((repo, idx) => {
                    const isSelected = selectedRepoId === repo.id || primaryRepo?.githubRepoId === repo.id;
                    return (
                      <div
                        key={repo.id || repo.fullName || `onb-repo-${idx}`}
                        onClick={() => handleSelectTargetRepo(repo)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isSelected
                            ? 'bg-theme-accent-subtle/40 border-emerald-500/50 shadow-2xs'
                            : 'bg-theme-elevated border-theme-border hover:border-theme-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderGit2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-emerald-500' : 'text-theme-muted'}`} />
                          <div className="truncate">
                            <div className="text-xs font-semibold text-theme-primary truncate">
                              {repo.fullName}
                            </div>
                            <div className="text-[10px] text-theme-muted">
                              {repo.primaryLanguage} • {repo.defaultBranch || 'main'}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Target
                          </span>
                        ) : (
                          <span className="text-[11px] text-theme-muted hover:text-theme-primary">
                            Select
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-theme-bg border border-theme-border text-[11px] text-theme-muted flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span>That&apos;s all you need! StreakForge runs completely via this Web Dashboard &amp; the Chrome Extension. (Local desktop agent is an optional add-on for advanced local folder monitoring).</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3.5 py-1.5 text-theme-muted hover:text-theme-primary text-xs font-medium flex items-center gap-1 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <span>Complete Setup &amp; Launch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

