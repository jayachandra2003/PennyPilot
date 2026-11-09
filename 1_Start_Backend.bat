@echo off
title PennyPilot Backend
cd /d "%~dp0"
set "PYTHONPATH=%~dp0backend"
echo Starting PennyPilot FastAPI Backend...
"%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
