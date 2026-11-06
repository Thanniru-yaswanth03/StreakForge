import React from 'react';

export interface BrandLogoProps {
  variant?: 'horizontal' | 'symbol' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  variant = 'horizontal',
  size = 'sm',
  className = '',
  onClick
}: BrandLogoProps) {
  const sizeMap: Record<string, number> = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32
  };

  const symbolSize = typeof size === 'number' ? size : sizeMap[size] || 20;

  const symbol = (
    <svg
      width={symbolSize}
      height={symbolSize}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id="sf-ext-g1" x1="4" y1="28" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="sf-ext-g2" x1="12" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
      </defs>

      <path d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z" fill="url(#sf-ext-g1)" />
      <path d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z" fill="url(#sf-ext-g2)" />
      <path d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z" fill="#6EE7B7" />

      <path d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z" fill="url(#sf-ext-g2)" opacity="0.95" />
      <path d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z" fill="url(#sf-ext-g1)" />
      <path d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z" fill="#047857" />

      <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#090D16" />
    </svg>
  );

  if (variant === 'symbol') {
    return (
      <div onClick={onClick} className={`inline-flex items-center justify-center ${className}`}>
        {symbol}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex-shrink-0">{symbol}</div>
      <span className="font-bold tracking-tight text-white font-sans text-sm leading-none">
        Streak<span className="text-emerald-400 font-extrabold">Forge</span>
      </span>
    </div>
  );
}

