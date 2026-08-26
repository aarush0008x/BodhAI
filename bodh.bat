@echo off
setlocal enabledelayedexpansion
title Bodh AI - Terminal Assistant

set "BACKEND_DIR=C:\Users\aarushsingh\.gemini\antigravity\scratch\bodhai\backend"

:: 1. Check and Start Ollama Server if not running
curl -s http://127.0.0.1:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [*] Starting Ollama Engine in background...
    start "Ollama Engine" /min cmd /c "ollama serve"
    ping 127.0.0.1 -n 4 >nul
)

:: 2. Launch Bodh AI Terminal Assistant directly in the current terminal window
cd /d "%BACKEND_DIR%"
python -m app.cli

if errorlevel 1 (
    echo.
    echo [!] Bodh AI closed with an error. Press any key to exit.
    pause >nul
)
