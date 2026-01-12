@echo off
REM Clear Cache - Windows
REM Clears the syllabus cache from the database (syllabus_cache table)

setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

cd /d "%PROJECT_ROOT%\backend"
node "%SCRIPT_DIR%clear-cache.js"

endlocal
pause
