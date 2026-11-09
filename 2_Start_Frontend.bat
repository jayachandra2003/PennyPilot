@echo off
title PennyPilot Frontend
cd /d "%~dp0frontend"
echo Building PennyPilot Frontend...
call npm run build
if errorlevel 1 (
    echo Frontend build failed.
    pause
    exit /b 1
)
echo Starting Vite Preview on port 5174...
call npm run preview
pause
