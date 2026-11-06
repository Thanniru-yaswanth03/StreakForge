import React from 'react';
import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex items-center justify-center p-4 selection:bg-[#238636] selection:text-white font-sans">
      <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="w-12 h-12 rounded-full bg-[#388bfd]/10 border border-[#388bfd]/20 text-[#58a6ff] mx-auto flex items-center justify-center">
          <FileQuestion className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <div className="text-3xl font-extrabold text-white font-mono">404</div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Page Not Found
          </h2>
          <p className="text-xs text-[#8b949e] leading-relaxed">
            The page or resource you requested does not exist or has been moved.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Link
            href="/"
            className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] border border-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

