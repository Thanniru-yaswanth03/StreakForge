'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { setStoredToken } from '../../../lib/utils';

function CallbackHandler() {
  const searchParams = useSearchParams();

  const handleProceed = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || searchParams.get('token');
      if (token) {
        setStoredToken(token);
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token') || searchParams.get('token');
      if (token) {
        setStoredToken(token);
      }
    } catch {
      // ignore
    }

    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 150);

    return () => clearTimeout(timer);
  }, [searchParams]);

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
          className="mt-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-lg cursor-pointer"
        >
          Proceed to Dashboard &rarr;
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
