@echo off
echo Starting PennyPilot Development Services...
echo ==============================================
echo Strict Budget: ₹0 | Architecture: Local-First
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo ==============================================

start "PennyPilot Backend" cmd /k "cd backend && set PYTHONPATH=. && uvicorn app.main:app --reload --port 8000"
start "PennyPilot Frontend" cmd /k "cd frontend && npm run dev"

echo Services launched in separate terminal windows.
