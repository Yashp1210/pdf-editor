@echo off
REM PDF Editor - Automated Setup Script for Windows
REM This script will set up and run your PDF editor

echo.
echo ========================================
echo  PDF Editor - Automated Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo [INFO] Please install Node.js from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detected: 
node -v
echo [OK] npm detected:
npm -v
echo.

REM Navigate to project directory
cd /d %~dp0

echo [INFO] Installing dependencies...
echo        (This may take 2-3 minutes)
echo.

call npm install

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Installation complete!
    echo.
    echo What would you like to do?
    echo.
    echo 1. Start development server (recommended for testing^)
    echo 2. Build for production
    echo 3. Exit and run manually
    echo.
    set /p choice="Enter choice (1-3): "

    if "%choice%"=="1" (
        echo.
        echo [INFO] Starting development server...
        echo [INFO] Your app will open at: http://localhost:5173
        echo [INFO] Press Ctrl+C to stop the server
        echo.
        timeout /t 2 >nul
        call npm run dev
    ) else if "%choice%"=="2" (
        echo.
        echo [INFO] Building for production...
        call npm run build
        if %errorlevel% equ 0 (
            echo.
            echo [SUCCESS] Build complete!
            echo [INFO] Files are in: dist\
            echo.
            echo Deploy options:
            echo    Vercel:  vercel
            echo    Netlify: netlify deploy --prod
            echo.
        )
    ) else if "%choice%"=="3" (
        echo.
        echo Manual commands:
        echo    Development: npm run dev
        echo    Build:       npm run build
        echo    Deploy:      vercel
        echo.
    ) else (
        echo.
        echo Invalid choice. Exiting.
    )
) else (
    echo.
    echo [ERROR] Installation failed!
    echo [INFO] Try running: npm install
    echo.
    pause
    exit /b 1
)

pause
