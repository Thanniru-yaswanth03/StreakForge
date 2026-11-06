import type { BadgeTheme } from '@streakforge/shared-types';

interface BadgeStats {
  username: string;
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  lastActivityDate: string;
}

export class BadgeService {
  /**
   * Escape XML entities to prevent SVG injection
   */
  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate SVG string for given stats and theme
   */
  public static generateBadgeSvg(stats: BadgeStats, theme: BadgeTheme = 'dark'): string {
    const safeUser = this.escapeXml(stats.username);
    const width = 495;
    const height = 195;

    // Theme color palettes
    const palettes: Record<
      BadgeTheme,
      {
        bg: string;
        cardBg: string;
        border: string;
        titleColor: string;
        labelColor: string;
        valueColor: string;
        accentStreak: string;
        easyColor: string;
        medColor: string;
        hardColor: string;
        badgePillBg: string;
        badgePillBorder: string;
        fontFamily: string;
      }
    > = {
      dark: {
        bg: '#0d1117',
        cardBg: '#161b22',
        border: '#30363d',
        titleColor: '#f0f6fc',
        labelColor: '#8b949e',
        valueColor: '#f0f6fc',
        accentStreak: '#3fb950',
        easyColor: '#3fb950',
        medColor: '#d29922',
        hardColor: '#f85149',
        badgePillBg: 'rgba(35, 134, 54, 0.15)',
        badgePillBorder: 'rgba(56, 139, 253, 0.4)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      },
      minimal: {
        bg: '#090d13',
        cardBg: '#090d13',
        border: '#21262d',
        titleColor: '#e6edf3',
        labelColor: '#7d8590',
        valueColor: '#f0f6fc',
        accentStreak: '#2ea043',
        easyColor: '#2ea043',
        medColor: '#bb8009',
        hardColor: '#cf222e',
        badgePillBg: 'rgba(255, 255, 255, 0.05)',
        badgePillBorder: '#30363d',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      light: {
        bg: '#ffffff',
        cardBg: '#f6f8fa',
        border: '#d0d7de',
        titleColor: '#1f2328',
        labelColor: '#656d76',
        valueColor: '#1f2328',
        accentStreak: '#1a7f37',
        easyColor: '#1a7f37',
        medColor: '#9a6700',
        hardColor: '#cf222e',
        badgePillBg: 'rgba(26, 127, 55, 0.1)',
        badgePillBorder: 'rgba(26, 127, 55, 0.3)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      terminal: {
        bg: '#0c1017',
        cardBg: '#05080c',
        border: '#00ff66',
        titleColor: '#00ff66',
        labelColor: '#00cc55',
        valueColor: '#00ff66',
        accentStreak: '#00ff66',
        easyColor: '#00ff66',
        medColor: '#ffff00',
        hardColor: '#ff3366',
        badgePillBg: 'rgba(0, 255, 102, 0.1)',
        badgePillBorder: '#00ff66',
        fontFamily: "'Courier New', Courier, monospace"
      },
      gradient: {
        bg: '#0c0f1d',
        cardBg: '#13182e',
        border: 'url(#gradBorder)',
        titleColor: '#ffffff',
        labelColor: '#94a3b8',
        valueColor: '#f8fafc',
        accentStreak: '#38bdf8',
        easyColor: '#4ade80',
        medColor: '#fbbf24',
        hardColor: '#f87171',
        badgePillBg: 'rgba(56, 189, 248, 0.15)',
        badgePillBorder: 'rgba(56, 189, 248, 0.4)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }
    };

    const p = palettes[theme] || palettes.dark;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="gradBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <linearGradient id="streakGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.accentStreak}" stop-opacity="0.3" />
      <stop offset="100%" stop-color="${p.accentStreak}" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <style>
    .title { font-family: ${p.fontFamily}; font-size: 15px; font-weight: 700; fill: ${p.titleColor}; }
    .subtitle { font-family: ${p.fontFamily}; font-size: 11px; fill: ${p.labelColor}; }
    .stat-label { font-family: ${p.fontFamily}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; fill: ${p.labelColor}; }
    .stat-val { font-family: ${p.fontFamily}; font-size: 22px; font-weight: 800; fill: ${p.valueColor}; }
    .stat-sub { font-family: ${p.fontFamily}; font-size: 10px; fill: ${p.labelColor}; }
    .brand { font-family: ${p.fontFamily}; font-size: 10px; font-weight: 600; fill: ${p.labelColor}; }
    .streak-val { fill: ${p.accentStreak}; }
  </style>

  <!-- Container Box -->
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${p.bg}" stroke="${p.border}" stroke-width="1.5" />

  <!-- Header -->
  <g transform="translate(20, 24)">
    <!-- StreakForge Flame Icon -->
    <path d="M11.5 1.5C11.5 1.5 14 4.5 14 7.5C14 10.5 11.5 13 8 13C4.5 13 2 10.5 2 7.5C2 5.5 3.5 3.5 5 2.5C5 4.5 6.5 6 8.5 6C10.5 6 11.5 3.5 11.5 1.5Z" fill="${p.accentStreak}" />
    <text x="22" y="12" class="title">StreakForge <tspan font-weight="400" fill="${p.labelColor}">/ ${safeUser}</tspan></text>
    <text x="22" y="26" class="subtitle">Verified Coding Activity &amp; LeetCode Progress</text>

    <!-- Verified Pill -->
    <rect x="${width - 150}" y="-4" width="110" height="22" rx="11" fill="${p.badgePillBg}" stroke="${p.badgePillBorder}" stroke-width="1" />
    <circle cx="${width - 138}" cy="7" r="3.5" fill="${p.accentStreak}" />
    <text x="${width - 128}" y="11" font-family="${p.fontFamily}" font-size="10" font-weight="700" fill="${p.accentStreak}">100% VERIFIED</text>
  </g>

  <!-- Divider -->
  <line x1="20" y1="64" x2="${width - 20}" y2="64" stroke="${p.border}" stroke-width="1" opacity="0.6" />

  <!-- Stat Cards (3 Columns) -->
  <!-- Col 1: Streak -->
  <g transform="translate(20, 78)">
    <rect width="138" height="74" rx="8" fill="${p.cardBg}" stroke="${p.border}" stroke-width="1" />
    <text x="14" y="20" class="stat-label">Active Streak</text>
    <text x="14" y="48" class="stat-val streak-val">${stats.currentStreak} <tspan font-size="13" font-weight="500">Days</tspan></text>
    <text x="14" y="64" class="stat-sub">Record: <tspan font-weight="700" fill="${p.valueColor}">${stats.longestStreak}d</tspan></text>
  </g>

  <!-- Col 2: Problems Solved -->
  <g transform="translate(178, 78)">
    <rect width="138" height="74" rx="8" fill="${p.cardBg}" stroke="${p.border}" stroke-width="1" />
    <text x="14" y="20" class="stat-label">LeetCode Solved</text>
    <text x="14" y="48" class="stat-val">${stats.totalSolved}</text>
    <text x="14" y="64" class="stat-sub">
      <tspan fill="${p.easyColor}">${stats.easySolved}E</tspan> • 
      <tspan fill="${p.medColor}">${stats.mediumSolved}M</tspan> • 
      <tspan fill="${p.hardColor}">${stats.hardSolved}H</tspan>
    </text>
  </g>

  <!-- Col 3: Consistency Status -->
  <g transform="translate(336, 78)">
    <rect width="138" height="74" rx="8" fill="${p.cardBg}" stroke="${p.border}" stroke-width="1" />
    <text x="14" y="20" class="stat-label">Last Synced</text>
    <text x="14" y="46" font-family="${p.fontFamily}" font-size="14" font-weight="700" fill="${p.valueColor}">${stats.lastActivityDate}</text>
    <text x="14" y="64" class="stat-sub">Auto-Git Synced</text>
  </g>

  <!-- Footer Watermark -->
  <g transform="translate(20, 178)">
    <text x="0" y="0" class="brand">streakforge.io • Zero-Fabrication Metric Transparency</text>
  </g>
</svg>`;
  }
}

