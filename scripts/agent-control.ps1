<#
.SYNOPSIS
    StreakForge Agent Daemon Control Script
.DESCRIPTION
    Controls the background agent process on Windows (start, stop, restart, status, logs).
#>

param(
    [Parameter(Position=0)]
    [ValidateSet("start", "stop", "restart", "status", "sync", "watch")]
    [string]$Action = "status",

    [Parameter(Position=1)]
    [string]$Path
)

$cli = Join-Path $env:USERPROFILE ".streakforge\bin\streakforge-agent.cmd"
if (-not (Test-Path $cli)) {
    $cli = "node " + (Join-Path $PSScriptRoot "..\apps\desktop-agent\dist\cli.js")
}

switch ($Action) {
    "start" {
        & cmd /c $cli start
    }
    "stop" {
        & cmd /c $cli stop
    }
    "restart" {
        & cmd /c $cli stop
        Start-Sleep -Seconds 1
        & cmd /c $cli start
    }
    "status" {
        & cmd /c $cli status
    }
    "sync" {
        & cmd /c $cli sync $Path
    }
    "watch" {
        & cmd /c $cli watch list
    }
}

