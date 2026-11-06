'use client';

import React from 'react';

export interface BrandLogoProps {
  variant?: 'horizontal' | 'symbol' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'dark' | 'light' | 'auto' | 'mono';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  variant = 'horizontal',
  size = 'md',
  theme = 'auto',
  showTagline = false,
  className = '',
  onClick
}: BrandLogoProps) {
  // Dimension mapping
  const sizeMap: Record<string, { height: number; symbolSize: number }> = {
    xs: { height: 16, symbolSize: 16 },
    sm: { height: 20, symbolSize: 20 },
    md: { height: 28, symbolSize: 26 },
    lg: { height: 36, symbolSize: 32 },
    xl: { height: 44, symbolSize: 40 }
  };

  const dims = typeof size === 'number'
    ? { height: size, symbolSize: size }
    : sizeMap[size] || sizeMap.md;

  const isLight = theme === 'light';
  const isMono = theme === 'mono';

  // Standalone Symbol SVG
  const symbol = (
    <svg
      width={dims.symbolSize}
      height={dims.symbolSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 transition-transform duration-200"
    >
      <defs>
        <linearGradient id="sf-sym-g1" x1="4" y1="28" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? '#047857' : '#059669'} />
          <stop offset="100%" stopColor={isLight ? '#059669' : '#10B981'} />
        </linearGradient>
        <linearGradient id="sf-sym-g2" x1="12" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? '#059669' : '#10B981'} />
          <stop offset="100%" stopColor={isLight ? '#10B981' : '#34D399'} />
        </linearGradient>
      </defs>

      {/* Kinetic Left Stream / Version Control Node */}
      <path
        d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z"
        fill={isMono ? 'currentColor' : 'url(#sf-sym-g1)'}
        opacity={isMono ? 0.75 : 1}
      />
      <path
        d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z"
        fill={isMono ? 'currentColor' : 'url(#sf-sym-g2)'}
      />
      {/* Top Forward Apex */}
      <path
        d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z"
        fill={isMono ? 'currentColor' : isLight ? '#059669' : '#6EE7B7'}
      />

      {/* Kinetic Right Stream / Verification Loopback */}
      <path
        d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z"
        fill={isMono ? 'currentColor' : 'url(#sf-sym-g2)'}
        opacity={isMono ? 0.9 : 0.95}
      />
      <path
        d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z"
        fill={isMono ? 'currentColor' : 'url(#sf-sym-g1)'}
        opacity={isMono ? 0.7 : 1}
      />
      {/* Bottom Forward Anchor */}
      <path
        d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z"
        fill={isMono ? 'currentColor' : isLight ? '#065F46' : '#047857'}
      />

      {/* Central Diamond Precision Knockout */}
      <rect
        x="14.5"
        y="14.5"
        width="3"
        height="3"
        rx="0.75"
        transform="rotate(45 16 16)"
        fill={isLight ? '#FFFFFF' : '#090D16'}
      />
    </svg>
  );

  if (variant === 'symbol') {
    return (
      <div onClick={onClick} className={`inline-flex items-center justify-center ${className}`}>
        {symbol}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center rounded-lg p-1.5 bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800/80 shadow-xs ${className}`}
      >
        {symbol}
      </div>
    );
  }

  // Full Horizontal Brand (Symbol + Wordmark + Status dot)
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
        {symbol}
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold tracking-tight text-theme-primary font-sans text-sm sm:text-base leading-none">
            Streak<span className="text-emerald-500 font-extrabold">Forge</span>
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"
            title="Authentic Sync Active"
          />
        </div>

        {showTagline && (
          <span className="text-[9px] uppercase tracking-widest font-semibold text-theme-muted mt-0.5 leading-none">
            Authentic Sync
          </span>
        )}
      </div>
    </div>
  );
}

