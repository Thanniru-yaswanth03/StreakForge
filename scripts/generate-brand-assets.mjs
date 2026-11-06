import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const brandingDir = path.join(rootDir, 'branding');
const webBrandDir = path.join(rootDir, 'apps', 'web', 'public', 'brand');
const extIconsDir = path.join(rootDir, 'apps', 'extension', 'icons');
const extDistIconsDir = path.join(rootDir, 'apps', 'extension', 'dist', 'icons');

[brandingDir, webBrandDir, extIconsDir, extDistIconsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * 1. SVG Deliverables
 * A precision geometric mark representing continuous synchronization & developer momentum.
 * Two interlocking forward-kinetic chevrons with an inner negative-space notch.
 */

// Standalone Symbol (Dark Background / Neutral)
export const SYMBOL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="sf-grad-1" x1="4" y1="28" x2="20" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
    <linearGradient id="sf-grad-2" x1="12" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
  </defs>
  <!-- Base Geometry: Dual Interconnected Kinetic Nodes -->
  <!-- Left Chevron / Version Control Stream -->
  <path
    d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z"
    fill="url(#sf-grad-1)"
  />
  <path
    d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z"
    fill="url(#sf-grad-2)"
  />
  <!-- Top Forward Node -->
  <path
    d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z"
    fill="#6EE7B7"
  />
  <!-- Synchronizing Loop Loopback / Verification Stream -->
  <path
    d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z"
    fill="url(#sf-grad-2)"
    opacity="0.95"
  />
  <path
    d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z"
    fill="url(#sf-grad-1)"
  />
  <!-- Bottom Forward Node -->
  <path
    d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z"
    fill="#047857"
  />
  <!-- Center Precision Knockout (creates kinetic depth) -->
  <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#090D16" />
</svg>`;

// Symbol optimized for Light Background
export const SYMBOL_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="sf-grad-l1" x1="4" y1="28" x2="20" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="sf-grad-l2" x1="12" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#10B981" />
    </linearGradient>
  </defs>
  <path d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z" fill="url(#sf-grad-l1)" />
  <path d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z" fill="url(#sf-grad-l2)" />
  <path d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z" fill="#059669" />
  <path d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z" fill="url(#sf-grad-l2)" opacity="0.95" />
  <path d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z" fill="url(#sf-grad-l1)" />
  <path d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z" fill="#065F46" />
  <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#FFFFFF" />
</svg>`;

// Monochrome Symbol
export const SYMBOL_MONO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z" fill="currentColor" opacity="0.8" />
  <path d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z" fill="currentColor" />
  <path d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z" fill="currentColor" />
  <path d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z" fill="currentColor" opacity="0.9" />
  <path d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z" fill="currentColor" opacity="0.7" />
  <path d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z" fill="currentColor" opacity="0.6" />
</svg>`;

// Primary Horizontal Logo (Dark Theme)
export const LOGO_HORIZONTAL_DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" fill="none">
  <defs>
    <linearGradient id="sf-h-grad" x1="4" y1="34" x2="32" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="50%" stop-color="#10B981" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
  </defs>
  <!-- Symbol (left side, 36x36 at offset 2,2) -->
  <g transform="translate(2, 4) scale(1)">
    <path d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z" fill="#059669" />
    <path d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z" fill="#10B981" />
    <path d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z" fill="#6EE7B7" />
    <path d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z" fill="#34D399" opacity="0.95" />
    <path d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z" fill="#10B981" />
    <path d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z" fill="#047857" />
    <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#090D16" />
  </g>
  <!-- Wordmark -->
  <text x="44" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Geist', 'Segoe UI', sans-serif" font-size="17" font-weight="700" letter-spacing="-0.03em" fill="#F8FAFC">
    Streak<tspan fill="#10B981">Forge</tspan>
  </text>
  <!-- Subtle Tagline/Descriptor -->
  <text x="45" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Geist', 'Segoe UI', sans-serif" font-size="7.5" font-weight="600" letter-spacing="0.12em" fill="#64748B">
    AUTHENTIC SYNC
  </text>
  <!-- Sync Status Accent Dot -->
  <circle cx="152" cy="19" r="2.5" fill="#10B981" />
</svg>`;

// Primary Horizontal Logo (Light Theme)
export const LOGO_HORIZONTAL_LIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" fill="none">
  <defs>
    <linearGradient id="sf-hl-grad" x1="4" y1="34" x2="32" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <g transform="translate(2, 4) scale(1)">
    <path d="M 6 19.5 L 12.5 13 L 17 17.5 L 10.5 24 L 6 19.5 Z" fill="#047857" />
    <path d="M 12.5 13 L 19 6.5 L 23.5 11 L 17 17.5 L 12.5 13 Z" fill="#059669" />
    <path d="M 19 6.5 L 24 6.5 L 26 8.5 L 23.5 11 L 19 6.5 Z" fill="#10B981" />
    <path d="M 26 12.5 L 19.5 19 L 15 14.5 L 21.5 8 L 26 12.5 Z" fill="#059669" opacity="0.95" />
    <path d="M 19.5 19 L 13 25.5 L 8.5 21 L 15 14.5 L 19.5 19 Z" fill="#047857" />
    <path d="M 13 25.5 L 8 25.5 L 6 23.5 L 8.5 21 L 13 25.5 Z" fill="#065F46" />
    <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#FFFFFF" />
  </g>
  <text x="44" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Geist', 'Segoe UI', sans-serif" font-size="17" font-weight="700" letter-spacing="-0.03em" fill="#0F172A">
    Streak<tspan fill="#059669">Forge</tspan>
  </text>
  <text x="45" y="33" font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Geist', 'Segoe UI', sans-serif" font-size="7.5" font-weight="600" letter-spacing="0.12em" fill="#64748B">
    AUTHENTIC SYNC
  </text>
  <circle cx="152" cy="19" r="2.5" fill="#059669" />
</svg>`;

// Favicon SVG (optimized with dark background square + rounded corners)
export const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="7" fill="#090D16" />
  <rect width="30" height="30" x="1" y="1" rx="6" stroke="#1E293B" stroke-width="1" />
  <path d="M 7 19 L 13 13 L 17 17 L 11 23 L 7 19 Z" fill="#059669" />
  <path d="M 13 13 L 19 7 L 23 11 L 17 17 L 13 13 Z" fill="#10B981" />
  <path d="M 19 7 L 24 7 L 25 8 L 23 11 L 19 7 Z" fill="#6EE7B7" />
  <path d="M 25 13 L 19 19 L 15 15 L 21 9 L 25 13 Z" fill="#34D399" opacity="0.95" />
  <path d="M 19 19 L 13 25 L 9 21 L 15 15 L 19 19 Z" fill="#10B981" />
  <path d="M 13 25 L 8 25 L 7 24 L 9 21 L 13 25 Z" fill="#047857" />
  <rect x="14.5" y="14.5" width="3" height="3" rx="0.75" transform="rotate(45 16 16)" fill="#090D16" />
</svg>`;

// Write all SVGs to branding directory
fs.writeFileSync(path.join(brandingDir, 'logo-symbol.svg'), SYMBOL_SVG);
fs.writeFileSync(path.join(brandingDir, 'logo-symbol-dark.svg'), SYMBOL_SVG);
fs.writeFileSync(path.join(brandingDir, 'logo-symbol-light.svg'), SYMBOL_LIGHT_SVG);
fs.writeFileSync(path.join(brandingDir, 'logo-monochrome.svg'), SYMBOL_MONO_SVG);
fs.writeFileSync(path.join(brandingDir, 'logo-horizontal-dark.svg'), LOGO_HORIZONTAL_DARK_SVG);
fs.writeFileSync(path.join(brandingDir, 'logo-horizontal-light.svg'), LOGO_HORIZONTAL_LIGHT_SVG);
fs.writeFileSync(path.join(brandingDir, 'favicon.svg'), FAVICON_SVG);

// Copy directly to web app public directory
fs.writeFileSync(path.join(webBrandDir, 'logo-symbol.svg'), SYMBOL_SVG);
fs.writeFileSync(path.join(webBrandDir, 'logo-symbol-light.svg'), SYMBOL_LIGHT_SVG);
fs.writeFileSync(path.join(webBrandDir, 'logo-horizontal-dark.svg'), LOGO_HORIZONTAL_DARK_SVG);
fs.writeFileSync(path.join(webBrandDir, 'logo-horizontal-light.svg'), LOGO_HORIZONTAL_LIGHT_SVG);
fs.writeFileSync(path.join(webBrandDir, 'favicon.svg'), FAVICON_SVG);
fs.writeFileSync(path.join(rootDir, 'apps', 'web', 'public', 'favicon.svg'), FAVICON_SVG);

console.log('✓ Successfully generated all Brand SVG assets');

/**
 * 2. High-Fidelity PNG Rasterizer
 * Generates crisp antialiased PNGs for 16px, 32px, 48px, 128px, 512px
 */

// CRC-32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function rasterizeSymbol(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdr);

  const scanlineLength = 1 + size * 4;
  const rawData = Buffer.alloc(size * scanlineLength);

  const scale = size / 32;
  const cornerRadius = size >= 32 ? 6 * scale : 3 * scale;

  // Background: Deep dark slate badge with emerald icon
  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Coordinate in 32x32 space
      const sx = x / scale;
      const sy = y / scale;

      // Distance from rounded rectangle badge
      const dx = Math.max(Math.abs(x - size / 2) - (size / 2 - cornerRadius), 0);
      const dy = Math.max(Math.abs(y - size / 2) - (size / 2 - cornerRadius), 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= cornerRadius) {
        // Inside rounded badge
        // Badge background: #090D16 (9, 13, 22)
        let r = 9;
        let g = 13;
        let b = 22;
        let a = 255;

        // Subtle 1px inner border
        if (x === 0 || y === 0 || x === size - 1 || y === size - 1 || dist > cornerRadius - 1) {
          r = 30; g = 41; b = 59; // #1E293B
        }

        // Kinetic chevron mark geometry check in 32x32 space
        // Primary diagonal band: (sx + sy) in [23, 33] and |sx - sy| < 7
        const u = (sx + sy) / Math.SQRT2; // diagonal axis
        const v = (sx - sy) / Math.SQRT2; // perpendicular axis

        // Central diamond knockout
        const isCenterKnockout = Math.abs(sx - 16) + Math.abs(sy - 16) < 3.2;

        // Kinetic Ribbon 1 (Ascending streak)
        const isRibbon1 = Math.abs(v + 1.5) < 3.8 && u > 14 && u < 31 && !isCenterKnockout;
        // Kinetic Ribbon 2 (Descending streak)
        const isRibbon2 = Math.abs(v - 1.5) < 3.8 && u > 14 && u < 31 && !isCenterKnockout;

        // Apex node
        const isTopNode = sx >= 18 && sx <= 26 && sy >= 5.5 && sy <= 11.5 && (sx + sy) > 26 && (sx + sy) < 36;
        // Bottom node
        const isBottomNode = sx >= 6 && sx <= 14 && sy >= 20.5 && sy <= 26.5 && (sx + sy) > 28 && (sx + sy) < 38;

        if (isRibbon1 || isRibbon2 || isTopNode || isBottomNode) {
          // Emerald progression: #10B981 (16, 185, 129) to mint #34D399 (52, 211, 153)
          const prog = (sx + sy) / 48;
          r = Math.round(5 + prog * 47);
          g = Math.round(150 + prog * 61);
          b = Math.round(105 + prog * 48);

          if (isTopNode) {
            r = 110; g = 231; b = 183; // #6EE7B7 bright highlight
          } else if (isBottomNode) {
            r = 4; g = 120; b = 87; // #047857 deep anchor
          }
        }

        // Antialias outer border
        if (dist > cornerRadius - 1) {
          a = Math.round(Math.max(0, 1 - (dist - (cornerRadius - 1))) * 255);
        }

        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate PNG sizes: 16, 32, 48, 128, 512
const SIZES = [16, 32, 48, 128, 512];
SIZES.forEach((sz) => {
  const buf = rasterizeSymbol(sz);
  // Save to branding
  fs.writeFileSync(path.join(brandingDir, `icon-${sz}.png`), buf);
  // Save to web brand
  fs.writeFileSync(path.join(webBrandDir, `icon-${sz}.png`), buf);
  // Save to extension icons
  if ([16, 32, 48, 128].includes(sz)) {
    fs.writeFileSync(path.join(extIconsDir, `icon-${sz}.png`), buf);
    fs.writeFileSync(path.join(extDistIconsDir, `icon-${sz}.png`), buf);
  }
  console.log(`✓ Generated icon-${sz}.png (${buf.length} bytes)`);
});

// Create favicon.ico equivalent (copy 32px png)
fs.copyFileSync(path.join(brandingDir, 'icon-32.png'), path.join(rootDir, 'apps', 'web', 'public', 'favicon.ico'));
console.log('✓ Successfully configured favicon.ico');

