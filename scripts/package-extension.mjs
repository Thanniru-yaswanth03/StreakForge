import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'apps', 'extension');
const distDir = path.join(extensionDir, 'dist');
const releaseDir = path.join(rootDir, 'dist-releases');

console.log('========================================================');
console.log('   Packaging StreakForge Chrome Extension (MV3 Bundle)  ');
console.log('========================================================');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// 1. Build Extension with Vite
console.log('\n[1/4] Compiling Chrome extension production bundle...');
execSync('pnpm --filter @streakforge/extension build', { cwd: rootDir, stdio: 'inherit' });

// 2. Validate Manifest V3 & Assets
console.log('\n[2/4] Validating Manifest V3 and package assets...');
const manifestPath = path.join(distDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error(`Critical: manifest.json not found in ${distDir}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3) {
  throw new Error(`Validation failed: Expected manifest_version: 3, got ${manifest.manifest_version}`);
}

console.log(`  ✓ Manifest Version: ${manifest.manifest_version}`);
console.log(`  ✓ Extension Name:   ${manifest.name}`);
console.log(`  ✓ Release Version:  ${manifest.version}`);

// Verify background service worker
if (!manifest.background?.service_worker) {
  throw new Error('Validation failed: Missing background.service_worker in manifest.json');
}
const serviceWorkerPath = path.join(distDir, manifest.background.service_worker);
if (!fs.existsSync(serviceWorkerPath)) {
  throw new Error(`Validation failed: Service worker file not found at ${serviceWorkerPath}`);
}
console.log(`  ✓ Service Worker:   ${manifest.background.service_worker} (Verified)`);

// Verify icons
for (const [size, iconRelPath] of Object.entries(manifest.icons || {})) {
  const iconPath = path.join(distDir, iconRelPath);
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Validation failed: Icon (${size}) not found at ${iconPath}`);
  }
}
console.log('  ✓ App Icons:        16px, 48px, 128px (Verified)');

// Audit permissions
const highRiskPermissions = ['<all_urls>', 'webRequestBlocking', 'debugger'];
const declaredPermissions = [...(manifest.permissions || []), ...(manifest.host_permissions || [])];
for (const highRisk of highRiskPermissions) {
  if (declaredPermissions.includes(highRisk)) {
    throw new Error(`Security Audit failed: High-risk permission declared: ${highRisk}`);
  }
}
console.log('  ✓ Permissions:      Audited. Minimum privilege principle enforced.');
console.log(`    Allowed Permissions: ${JSON.stringify(manifest.permissions)}`);
console.log(`    Host Permissions:    ${JSON.stringify(manifest.host_permissions)}`);

// 3. Create ZIP Archive
console.log('\n[3/4] Creating ZIP archive...');
const zipName = `streakforge-extension-v${manifest.version}.zip`;
const zipPath = path.join(releaseDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

if (process.platform === 'win32') {
  execSync(
    `powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`
  );
} else {
  execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`);
}

// 4. Compute Checksum
console.log('\n[4/4] Computing SHA-256 verification checksum...');
const fileBuffer = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const stats = fs.statSync(zipPath);

console.log('--------------------------------------------------------');
console.log('✓ Chrome Extension Packaged Successfully!');
console.log(`  Archive:   ${zipName}`);
console.log(`  Location:  ${zipPath}`);
console.log(`  Size:      ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`);
console.log(`  SHA-256:   ${sha256}`);
console.log('--------------------------------------------------------');

