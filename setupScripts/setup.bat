@echo off
REM AggieAce Complete Setup Script - Windows
REM This script automates the entire installation and configuration process

setlocal enabledelayedexpansion

REM Get script and project directories
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

echo ========================================================================
echo AggieAce Setup Script - Windows
echo ========================================================================
echo.

REM =============================================================================
REM Step 1: Check Prerequisites
REM =============================================================================
echo [INFO] Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%i in ('node --version') do set NODE_MAJOR=%%i
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo [ERROR] Node.js version must be 18 or higher
    node --version
    pause
    exit /b 1
)
echo [SUCCESS] Node.js found:
node --version

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm not found. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo [SUCCESS] npm found:
npm --version

REM Check Python
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
echo [SUCCESS] Python found:
python --version

REM Check pip
where pip >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] pip not found. Please install Python from https://www.python.org/
    pause
    exit /b 1
)
echo [SUCCESS] pip found:
pip --version

REM Check PostgreSQL
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL not found. Please install PostgreSQL 14+ from https://www.postgresql.org/
    pause
    exit /b 1
)
echo [SUCCESS] PostgreSQL found:
psql --version

REM Check LibreOffice (optional)
where soffice >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] LibreOffice found
    set LIBREOFFICE_INSTALLED=true
) else (
    echo [WARNING] LibreOffice not found. DOCX conversion will not be available.
    echo [WARNING] Install from: https://www.libreoffice.org/
    set LIBREOFFICE_INSTALLED=false
)

echo.

REM =============================================================================
REM Step 2: Install Node.js Dependencies
REM =============================================================================
echo [INFO] Installing Node.js dependencies...
echo.

cd /d "%PROJECT_ROOT%"

REM Install root dependencies
if exist "package.json" (
    echo [INFO] Installing root dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install root dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Root dependencies installed
)

REM Install backend dependencies
if exist "backend\package.json" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Backend dependencies installed
)

REM Install frontend dependencies
if exist "frontend\package.json" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [SUCCESS] Frontend dependencies installed
)

echo.

REM =============================================================================
REM Step 3: Install Python Dependencies
REM =============================================================================
echo [INFO] Installing Python dependencies...
echo.

if exist "backend\requirements.txt" (
    cd "%PROJECT_ROOT%\backend"
    pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Python dependencies installation had issues
    ) else (
        echo [SUCCESS] Python dependencies installed
    )
    cd "%PROJECT_ROOT%"
) else (
    echo [WARNING] requirements.txt not found, skipping Python dependencies
)

echo.

REM =============================================================================
REM Step 4: Create .env Configuration File
REM =============================================================================
echo [INFO] Setting up environment configuration...
echo.

set "ENV_FILE=%PROJECT_ROOT%\backend\.env"
set "ENV_EXAMPLE=%PROJECT_ROOT%\backend\.env.example"

if exist "%ENV_FILE%" (
    echo [WARNING] .env file already exists
    set /p OVERWRITE="Do you want to overwrite it? (y/N): "
    if /i not "!OVERWRITE!"=="y" (
        echo [INFO] Keeping existing .env file
        set SKIP_ENV=true
    ) else (
        set SKIP_ENV=false
    )
) else (
    set SKIP_ENV=false
)

if "!SKIP_ENV!"=="false" (
    if exist "%ENV_EXAMPLE%" (
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo [SUCCESS] Created .env file from template

        REM Generate JWT secret (Windows doesn't have openssl easily, use PowerShell)
        echo [INFO] Generating secure JWT secret...
        powershell -Command "$bytes = New-Object Byte[] 48; (New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)" > temp_jwt.txt
        set /p JWT_SECRET=<temp_jwt.txt
        del temp_jwt.txt

        REM Replace JWT_SECRET in .env file using PowerShell
        powershell -Command "(Get-Content '%ENV_FILE%') -replace 'your_jwt_secret_key_minimum_32_characters_long_here', '%JWT_SECRET%' | Set-Content '%ENV_FILE%'"
        echo [SUCCESS] Generated secure JWT secret

        echo.
        echo [INFO] Please provide the following configuration values:
        echo.

        REM Prompt for Gemini API Key
        set /p GEMINI_KEY="Enter your Google Gemini API Key (get from https://aistudio.google.com/app/apikey): "
        if not "!GEMINI_KEY!"=="" (
            powershell -Command "(Get-Content '%ENV_FILE%') -replace 'your_gemini_api_key_here', '!GEMINI_KEY!' | Set-Content '%ENV_FILE%'"
            echo [SUCCESS] Gemini API key configured
        )

        REM Prompt for PostgreSQL credentials
        set /p DB_USER="Enter PostgreSQL username (default: postgres): "
        if "!DB_USER!"=="" set DB_USER=postgres

        set "DB_PASSWORD="
        set /p DB_PASSWORD="Enter PostgreSQL password: "

        set /p DB_NAME="Enter database name (default: aggieace): "
        if "!DB_NAME!"=="" set DB_NAME=aggieace

        REM Update database credentials using PowerShell
        powershell -Command "(Get-Content '%ENV_FILE%') -replace 'DB_USER=postgres', 'DB_USER=!DB_USER!' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace 'your_postgres_password_here', '!DB_PASSWORD!' | Set-Content '%ENV_FILE%'"
        powershell -Command "(Get-Content '%ENV_FILE%') -replace 'DB_NAME=aggieace', 'DB_NAME=!DB_NAME!' | Set-Content '%ENV_FILE%'"

        echo [SUCCESS] Database credentials configured

        REM Optional: Google OAuth
        echo.
        set /p OAUTH_SETUP="Do you want to configure Google OAuth now? (y/N): "
        if /i "!OAUTH_SETUP!"=="y" (
            set /p GOOGLE_CLIENT_ID="Enter Google Client ID: "
            set /p GOOGLE_CLIENT_SECRET="Enter Google Client Secret: "

            if not "!GOOGLE_CLIENT_ID!"=="" if not "!GOOGLE_CLIENT_SECRET!"=="" (
                powershell -Command "(Get-Content '%ENV_FILE%') -replace 'your_google_client_id_here', '!GOOGLE_CLIENT_ID!' | Set-Content '%ENV_FILE%'"
                powershell -Command "(Get-Content '%ENV_FILE%') -replace 'your_google_client_secret_here', '!GOOGLE_CLIENT_SECRET!' | Set-Content '%ENV_FILE%'"
                echo [SUCCESS] Google OAuth configured
            )
        ) else (
            echo [INFO] Skipping Google OAuth (you can configure it later in .env)
        )

    ) else (
        echo [ERROR] .env.example not found!
        pause
        exit /b 1
    )
)

echo.

REM =============================================================================
REM Step 5: Create PostgreSQL Database
REM =============================================================================
echo [INFO] Setting up PostgreSQL database...
echo.

REM Load DB credentials from .env
if exist "%ENV_FILE%" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%ENV_FILE%") do (
        if "%%a"=="DB_USER" set DB_USER=%%b
        if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
        if "%%a"=="DB_NAME" set DB_NAME=%%b
    )
)

REM Set PGPASSWORD environment variable for psql
set PGPASSWORD=%DB_PASSWORD%

REM Check if database exists
psql -h localhost -U %DB_USER% -lqt 2>nul | findstr /C:"%DB_NAME%" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Creating database '%DB_NAME%'...
    psql -h localhost -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to create database. Please ensure PostgreSQL is running and credentials are correct.
        echo [INFO] You can create the database manually with: psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"
        pause
        exit /b 1
    )
    echo [SUCCESS] Database '%DB_NAME%' created
) else (
    echo [SUCCESS] Database '%DB_NAME%' already exists
)

echo.

REM =============================================================================
REM Step 6: Initialize Database Schema
REM =============================================================================
echo [INFO] Initializing database schema...
echo.

cd "%PROJECT_ROOT%\backend"

if exist "scripts\setup-db.js" (
    node scripts\setup-db.js
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Database initialization failed
        echo [INFO] You can run it manually later with: cd backend ^&^& node scripts/setup-db.js
    )
) else (
    echo [WARNING] Database setup script not found, skipping schema initialization
)

cd "%PROJECT_ROOT%"

echo.

REM =============================================================================
REM Setup Complete
REM =============================================================================
echo ========================================================================
echo              AggieAce Setup Complete! [SUCCESS]
echo ========================================================================
echo.
echo Next steps:
echo.
echo   1. Review your configuration in backend\.env
echo   2. Start the application with: setupScripts\start.bat
echo      or: npm run dev
echo.
echo   The application will be available at:
echo     * Frontend: http://localhost:3000
echo     * Backend:  http://localhost:5000
echo.

if "%LIBREOFFICE_INSTALLED%"=="false" (
    echo [WARNING] Remember: LibreOffice is not installed. DOCX conversion will not work.
    echo            Install from: https://www.libreoffice.org/
    echo.
)

echo For help, see README.md or run: npm run dev
echo.
pause
