<#
.SYNOPSIS
    StreakForge Desktop Agent Windows Installer & Setup Script
.DESCRIPTION
    Installs the StreakForge local daemon, configures user permissions,
    sets up the CLI command in PATH, and optionally configures Windows auto-start.
#>

[CmdletBinding()]
param(
    [switch]$EnableAutoStart,
    [string]$ServerUrl = "http://localhost:4000",
    [string]$AgentKey,
    [string]$AgentId
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   StreakForge Local Desktop Agent Windows Installer    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Prerequisite Checks
Write-Host "`n[1/5] Checking prerequisites..." -ForegroundColor Yellow

# Check Git
try {
    $gitVer = git --version
    Write-Host "  ✓ Git detected: $gitVer" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Git is not installed or not in PATH. Please install Git for Windows." -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVer = node --version
    Write-Host "  ✓ Node.js detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js is not installed or not in PATH. Node.js >= 18 is required." -ForegroundColor Red
    exit 1
}

# 2. Workspace & Agent Directories
Write-Host "`n[2/5] Setting up StreakForge configuration directory..." -ForegroundColor Yellow
$configDir = Join-Path $env:USERPROFILE ".streakforge"
$binDir = Join-Path $configDir "bin"

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}
Write-Host "  ✓ User configuration directory: $configDir" -ForegroundColor Green

# 3. Build Agent
Write-Host "`n[3/5] Compiling Desktop Agent & Git Engine..." -ForegroundColor Yellow
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
    pnpm --filter @streakforge/git-engine build
    pnpm --filter @streakforge/desktop-agent build
    Write-Host "  ✓ Compilation successful." -ForegroundColor Green
} catch {
    Write-Host "  ✗ Build failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# 4. Create Windows Executable Wrapper
Write-Host "`n[4/5] Creating Windows CLI wrapper (streakforge-agent.cmd)..." -ForegroundColor Yellow
$cliJsPath = Join-Path $repoRoot "apps\desktop-agent\dist\cli.js"
$cmdWrapperPath = Join-Path $binDir "streakforge-agent.cmd"

$cmdContent = @"
@echo off
"$((Get-Command node).Source)" "$cliJsPath" %*
"@

Set-Content -Path $cmdWrapperPath -Value $cmdContent -Encoding ASCII
Write-Host "  ✓ CLI wrapper created at: $cmdWrapperPath" -ForegroundColor Green

# Add binDir to User PATH if not already present
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$binDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$userPath;$binDir", "User")
    $env:PATH = "$env:PATH;$binDir"
    Write-Host "  ✓ Added $binDir to User PATH environment variable." -ForegroundColor Green
} else {
    Write-Host "  ✓ $binDir already present in User PATH." -ForegroundColor Green
}

# 5. Optional Auto-Start Setup
Write-Host "`n[5/5] Configuring startup options..." -ForegroundColor Yellow
if ($EnableAutoStart) {
    node "$cliJsPath" autostart enable
} else {
    Write-Host "  ℹ Automatic startup on boot was not requested." -ForegroundColor Gray
    Write-Host "    You can enable it anytime via: streakforge-agent autostart enable" -ForegroundColor Gray
}

# Optional Pairing if keys provided
if ($AgentKey -and $AgentId) {
    Write-Host "`nPairing agent with StreakForge server ($ServerUrl)..." -ForegroundColor Yellow
    node "$cliJsPath" pair --server "$ServerUrl" --key "$AgentKey" --agent-id "$AgentId"
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   StreakForge Desktop Agent Installed Successfully!    " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "`nQuick Commands:" -ForegroundColor White
Write-Host "  streakforge-agent start          # Start background daemon" -ForegroundColor Cyan
Write-Host "  streakforge-agent status         # Check agent health & watched repos" -ForegroundColor Cyan
Write-Host "  streakforge-agent watch add <p>  # Watch a local coding directory" -ForegroundColor Cyan
Write-Host "  streakforge-agent sync           # Run immediate safe synchronization" -ForegroundColor Cyan
Write-Host "  streakforge-agent stop           # Stop background daemon" -ForegroundColor Cyan
Write-Host ""

