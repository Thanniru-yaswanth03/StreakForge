import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'dist-releases');
const stageDir = path.join(releaseDir, 'stage-agent');

console.log('========================================================');
console.log('   Packaging StreakForge Desktop Agent (Windows Bundle) ');
console.log('========================================================');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// 1. Build Agent & Dependencies
console.log('\n[1/4] Compiling agent and dependencies...');
execSync('pnpm --filter @streakforge/desktop-agent build', { cwd: rootDir, stdio: 'inherit' });

// 2. Stage files
console.log('\n[2/4] Staging distribution files...');
const agentAppDir = path.join(rootDir, 'apps', 'desktop-agent');
const stageDist = path.join(stageDir, 'dist');
fs.cpSync(path.join(agentAppDir, 'dist'), stageDist, { recursive: true });
fs.copyFileSync(path.join(agentAppDir, 'package.json'), path.join(stageDir, 'package.json'));

// Copy scripts
const scriptsDir = path.join(rootDir, 'scripts');
fs.copyFileSync(path.join(scriptsDir, 'install-agent.ps1'), path.join(stageDir, 'install.ps1'));
fs.copyFileSync(path.join(scriptsDir, 'uninstall-agent.ps1'), path.join(stageDir, 'uninstall.ps1'));
fs.copyFileSync(path.join(scriptsDir, 'agent-control.ps1'), path.join(stageDir, 'agent-control.ps1'));

// Create CMD wrapper
const cmdWrapper = '@echo off\r\nnode "%~dp0dist\\cli.js" %*\r\n';
fs.writeFileSync(path.join(stageDir, 'streakforge-agent.cmd'), cmdWrapper, 'ascii');

// Create README.txt
const readme = `========================================================================
StreakForge Local Desktop Agent & Git Engine (v1.0.0)
========================================================================

StreakForge Agent is a lightweight companion daemon that monitors your local
Git workspaces, enforces secret filters, and synchronizes authentic commits.

PREREQUISITES:
  1. Windows 10/11 (64-bit)
  2. Git for Windows (git --version >= 2.40)
  3. Node.js (node --version >= 20.0.0)

QUICK INSTALLATION (No Admin Rights Required):
  Open PowerShell in this folder and run:
    powershell -ExecutionPolicy Bypass -File .\\install.ps1 -ApiKey "YOUR_API_KEY" -AgentId "YOUR_AGENT_ID"

MANAGEMENT COMMANDS:
  streakforge-agent status             Check daemon status & watched repos
  streakforge-agent start              Start background daemon
  streakforge-agent stop               Stop background daemon
  streakforge-agent watch <path>       Register folder for monitoring
  streakforge-agent unwatch <path>     Stop watching folder
  streakforge-agent sync-now           Trigger immediate sync on watched repos
  streakforge-agent autostart enable   Enable startup on Windows user login
  streakforge-agent autostart disable  Disable startup on Windows login

LOGS & RECOVERY:
  Config file: %USERPROFILE%\\.streakforge\\agent-config.json
  Logs:        %USERPROFILE%\\.streakforge\\agent.log
  PID file:    %USERPROFILE%\\.streakforge\\agent.pid

To view live logs in PowerShell:
  Get-Content "$env:USERPROFILE\\.streakforge\\agent.log" -Tail 50 -Wait

UNINSTALLATION:
  powershell -ExecutionPolicy Bypass -File .\\uninstall.ps1
========================================================================
`;
fs.writeFileSync(path.join(stageDir, 'README.txt'), readme, 'utf8');

// 3. Create ZIP archive
console.log('\n[3/4] Creating ZIP archive...');
const zipName = 'streakforge-agent-windows-v1.0.0.zip';
const zipPath = path.join(releaseDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

if (process.platform === 'win32') {
  execSync(
    `powershell -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`
  );
} else {
  execSync(`cd "${stageDir}" && zip -r "${zipPath}" ./*`);
}

// Clean up staging folder
fs.rmSync(stageDir, { recursive: true, force: true });

// 4. Compute Checksum
console.log('\n[4/4] Computing SHA-256 verification checksum...');
const fileBuffer = fs.readFileSync(zipPath);
const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const stats = fs.statSync(zipPath);

console.log('--------------------------------------------------------');
console.log('✓ Windows Agent Bundle Packaged Successfully!');
console.log(`  Archive:   ${zipName}`);
console.log(`  Location:  ${zipPath}`);
console.log(`  Size:      ${(stats.size / 1024).toFixed(1)} KB (${stats.size} bytes)`);
console.log(`  SHA-256:   ${sha256}`);
console.log('--------------------------------------------------------');

