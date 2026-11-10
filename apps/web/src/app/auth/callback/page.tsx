'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { setStoredToken } from '../../../lib/utils';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import { GitHubConnectButton } from '../../../components/GitHubConnectButton';

function CallbackHandler() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const handledRef = useRef(false);
  const capturedTokenRef = useRef<string | null>(null);

  const handleProceed = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = capturedTokenRef.current || urlParams.get('token');
      if (token) {
        setStoredToken(token);
      }
    } catch {
      // ignore
    }
    window.location.replace('/');
  };

  useEffect(() => {
    if (handledRef.current) return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');
      const errorDesc = urlParams.get('error_description');

      if (error) {
        handledRef.current = true;
        setErrorCode(error);
        setErrorMessage(
          errorDesc ||
            (error === 'access_denied'
              ? 'GitHub authorization was denied or cancelled.'
              : `Authentication error: ${error}`)
        );
        return;
      }

      if (token) {
        handledRef.current = true;
        capturedTokenRef.current = token;
        setStoredToken(token);
        window.postMessage({ type: 'STREAKFORGE_TRIGGER_PAIR' }, window.location.origin);
        // Use window.location.replace('/') instead of history.replaceState before redirect:
        // Next.js App Router patches replaceState to emit searchParams updates, which can race with navigation.
        setTimeout(() => {
          window.location.replace('/');
        }, 120);
        return;
      }

      // No token and no error in params
      setErrorCode('NO_TOKEN');
      setErrorMessage('No authentication token received from authorization server.');
    } catch (err: any) {
      setErrorCode('CLIENT_ERROR');
      setErrorMessage(err?.message || 'An unexpected client error occurred during callback processing.');
    }
  }, []);

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="flex flex-col items-center gap-4 max-w-md w-full text-center p-6 rounded-xl border border-red-500/30 bg-slate-900/90 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">GitHub Authentication Issue</h2>
            {errorCode && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-red-500/20 text-red-300 border border-red-500/30">
                {errorCode}
              </span>
            )}
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {errorMessage}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full mt-2">
            <GitHubConnectButton
              label="Retry GitHub Login"
              className="w-full sm:flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
            />
            <button
              onClick={() => (window.location.href = '/')}
              className="w-full sm:flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Dashboard Home</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <div>
          <h2 className="text-base font-bold text-white">Completing GitHub Authentication</h2>
          <p className="text-xs text-slate-400 mt-1">
            Loading your authentic developer dashboard...
          </p>
        </div>
        <button
          onClick={handleProceed}
          className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-lg cursor-pointer flex items-center gap-1.5"
        >
          <span>Proceed to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
