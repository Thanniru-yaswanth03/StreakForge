<#
.SYNOPSIS
    StreakForge Desktop Agent Windows Uninstaller
.DESCRIPTION
    Safely shuts down running agent daemons, cleans up user registry autostart,
    removes user PATH entry, and removes installed agent files without requiring admin privileges.
#>

[CmdletBinding()]
param(
    [switch]$KeepConfig
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   StreakForge Local Desktop Agent Windows Uninstaller  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$configDir = Join-Path $env:USERPROFILE ".streakforge"
$binDir = Join-Path $configDir "bin"
$pidFile = Join-Path $configDir "agent.pid"

# 1. Stop Running Daemon
Write-Host "`n[1/4] Stopping active StreakForge background daemon..." -ForegroundColor Yellow
if (Test-Path $pidFile) {
    try {
        $pidContent = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($pidContent -match '^\d+$') {
            $agentPid = [int]$pidContent
            $proc = Get-Process -Id $agentPid -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $agentPid -Force
                Write-Host "  ✓ Terminated active process (PID: $agentPid)." -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "  ℹ Process was not active." -ForegroundColor Gray
    }
    Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "  ✓ No active daemon process detected." -ForegroundColor Green
}

# 2. Remove Windows Autostart Registry Key
Write-Host "`n[2/4] Removing automatic startup configuration..." -ForegroundColor Yellow
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$keyName = "StreakForgeAgent"
try {
    $existing = Get-ItemProperty -Path $regPath -Name $keyName -ErrorAction SilentlyContinue
    if ($existing) {
        Remove-ItemProperty -Path $regPath -Name $keyName -Force
        Write-Host "  ✓ Removed StreakForgeAgent from user autostart registry." -ForegroundColor Green
    } else {
        Write-Host "  ✓ Autostart registry key not present." -ForegroundColor Green
    }
} catch {
    Write-Host "  ℹ Autostart key cleanup skipped." -ForegroundColor Gray
}

# 3. Clean up User PATH
Write-Host "`n[3/4] Removing binary directory from user PATH..." -ForegroundColor Yellow
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -like "*$binDir*") {
    $cleanedPath = ($userPath -split ';' | Where-Object { $_ -ne $binDir -and $_ -ne '' }) -join ';'
    [Environment]::SetEnvironmentVariable("PATH", $cleanedPath, "User")
    Write-Host "  ✓ Removed $binDir from user PATH." -ForegroundColor Green
} else {
    Write-Host "  ✓ Binary directory was not in user PATH." -ForegroundColor Green
}

# 4. Remove Files
Write-Host "`n[4/4] Cleaning up agent directory..." -ForegroundColor Yellow
if (Test-Path $configDir) {
    if ($KeepConfig) {
        # Keep config.json and log, remove bin and runtime files
        if (Test-Path $binDir) { Remove-Item -Path $binDir -Recurse -Force }
        Write-Host "  ✓ Preserved configuration and logs at $configDir (-KeepConfig specified)." -ForegroundColor Green
    } else {
        Remove-Item -Path $configDir -Recurse -Force
        Write-Host "  ✓ Removed $configDir entirely." -ForegroundColor Green
    }
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   StreakForge Desktop Agent uninstalled successfully!   " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

