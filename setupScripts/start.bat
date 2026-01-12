@echo off
REM Start AggieAce - Windows
REM Runs both the frontend and backend servers concurrently

setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%"

if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo Starting AggieAce...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo Press Ctrl+C to stop

call npm run dev

endlocal
