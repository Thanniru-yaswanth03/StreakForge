@echo off
TITLE StreakForge Agent Windows Installer
echo Starting StreakForge Desktop Agent Installation...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-agent.ps1" %*
pause

