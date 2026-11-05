# PowerShell Development Startup Script for PennyPilot
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Starting PennyPilot Full-Stack Services     " -ForegroundColor Cyan
Write-Host "  Budget: Strict `₹0 | Platform: Local-First   " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; `$env:PYTHONPATH='.'; uvicorn app.main:app --reload --port 8000" -PassThru
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru

Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Services running in background terminals." -ForegroundColor Yellow
