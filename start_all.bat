@echo off
echo 🎵 Starting Music App & Bot Services...
echo ==========================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Warning: Node.js is not installed or not in PATH
    echo Some services may not start properly
)

REM Check if Docker is available
docker --version >nul 2>&1
if errorlevel 1 (
    echo Warning: Docker is not installed or not in PATH
    echo Docker services will be skipped
)

echo.
echo Starting services...
echo.

REM Start the Python launcher script
python launch_bot.py

pause 