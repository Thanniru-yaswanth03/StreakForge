'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to monitoring service
    console.error('[StreakForge Web Error Boundary Captured]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex items-center justify-center p-4 selection:bg-[#238636] selection:text-white font-sans">
      <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Something went wrong
          </h2>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            StreakForge encountered an unexpected UI rendering error. Your data and verified synchronizations remain completely safe.
          </p>
        </div>

        {error.digest && (
          <div className="py-1 px-2 bg-[#0d1117] border border-[#30363d] rounded text-[10px] font-mono text-[#8b949e]">
            Error Code: {error.digest}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-4 py-2 bg-[#238636] hover:bg-[#2ea043] border border-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full sm:w-auto px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}

