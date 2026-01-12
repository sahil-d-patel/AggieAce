@echo off
REM Clear User Data - Windows
REM Clears all user data from the database (users and calendar_history tables)

setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%\backend"
node "%SCRIPT_DIR%clear-user-data.js"

endlocal
pause
