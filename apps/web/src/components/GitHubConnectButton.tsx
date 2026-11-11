'use client';

import React, { useState } from 'react';
import { Github, RotateCw, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/utils';

// Prevent multiple simultaneous OAuth initiation attempts across components
let oauthLaunchLock = false;

interface GitHubConnectButtonProps {
  label?: string;
  wakingLabel?: string;
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

/**
 * Cold-start resilient GitHub OAuth initiator.
 * Pre-warms the API server's idempotent /health endpoint with timeout and retry
 * feedback so sleeping Render dynos wake gracefully instead of showing raw proxy loading screens.
 * Never retries /auth/github/callback or authorization codes.
 */
export function GitHubConnectButton({
  label = 'Connect GitHub',
  wakingLabel = 'Waking server',
  className = 'github-glossy-button-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5',
  iconClassName = 'w-3.5 h-3.5',
  children
}: GitHubConnectButtonProps) {
  const [status, setStatus] = useState<'idle' | 'waking' | 'redirecting' | 'error'>('idle');
  const [attempt, setAttempt] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiHost = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

  const initiateOAuth = async () => {
    if (oauthLaunchLock || status === 'waking' || status === 'redirecting') return;
    oauthLaunchLock = true;

    setStatus('waking');
    setErrorMsg(null);
    setAttempt(1);

    const maxAttempts = 6;
    let awake = false;

    for (let i = 1; i <= maxAttempts; i++) {
      setAttempt(i);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${apiHost}/health`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          awake = true;
          break;
        }
      } catch {
        // Container still booting or transient timeout
      }

      if (i < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!awake) {
      oauthLaunchLock = false;
      setStatus('error');
      setErrorMsg(
        'Render backend is taking longer than expected to wake up. Wait a few seconds and click Connect GitHub again.'
      );
      return;
    }

    setStatus('redirecting');
    const returnTo = typeof window !== 'undefined' ? window.location.origin : '';
    const oauthUrl = returnTo
      ? `${API_BASE_URL}/auth/github?return_to=${encodeURIComponent(returnTo)}`
      : `${API_BASE_URL}/auth/github`;

    window.location.href = oauthUrl;
  };

  return (
    <div className="inline-flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={initiateOAuth}
        disabled={status === 'waking' || status === 'redirecting'}
        className={`${className} disabled:opacity-70 cursor-pointer`}
      >
        {status === 'waking' || status === 'redirecting' ? (
          <RotateCw className={`${iconClassName} animate-spin`} />
        ) : (
          <Github className={iconClassName} />
        )}
        <span>
          {status === 'waking'
            ? `${wakingLabel}${attempt > 1 ? ` (${attempt}/4)` : ''}...`
            : status === 'redirecting'
              ? 'Opening GitHub...'
              : children || label}
        </span>
      </button>

      {errorMsg && (
        <div className="text-[10px] text-[#f85149] flex items-center gap-1 max-w-xs">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

