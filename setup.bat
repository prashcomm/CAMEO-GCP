@echo off
echo ======================================
echo   Event Photo Gallery - Setup Script
echo ======================================
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m✓ Python found[0m
    set PYTHON_CMD=python
) else (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [32m✓ Python found[0m
        set PYTHON_CMD=python3
    ) else (
        echo [31m✗ Python not found! Please install Python 3.11+[0m
        pause
        exit /b 1
    )
)

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m✓ Node.js found[0m
) else (
    echo [31m✗ Node.js not found! Please install Node.js 20+[0m
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [32m✓ npm found[0m
) else (
    echo [31m✗ npm not found![0m
    pause
    exit /b 1
)

echo.
echo ======================================
echo   Setting up Backend
echo ======================================
echo.

cd backend

REM Create virtual environment
echo Creating Python virtual environment...
%PYTHON_CMD% -m venv venv
if %errorlevel% equ 0 (
    echo [32m✓ Virtual environment created[0m
) else (
    echo [33m⚠ Could not create virtual environment, continuing without it[0m
)

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
    echo [32m✓ Virtual environment activated[0m
)

REM Upgrade pip
echo Upgrading pip...
pip install --upgrade pip --quiet

REM Install Python dependencies
echo Installing Python dependencies (this may take 5-10 minutes for dlib)...
echo [33mNote: dlib compilation requires cmake. If it fails, install cmake first.[0m
echo.

pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo [32m✓ Python dependencies installed[0m
) else (
    echo [31m✗ Failed to install Python dependencies[0m
    echo [33mIf dlib failed, make sure cmake is installed from https://cmake.org/download/[0m
    pause
    exit /b 1
)

cd ..

echo.
echo ======================================
echo   Setting up Frontend
echo ======================================
echo.

cd frontend

REM Install Node.js dependencies
echo Installing Node.js dependencies...
call npm install --legacy-peer-deps

if %errorlevel% equ 0 (
    echo [32m✓ Node.js dependencies installed[0m
) else (
    echo [31m✗ Failed to install Node.js dependencies[0m
    pause
    exit /b 1
)

cd ..

echo.
echo ======================================
echo   Creating Upload Directories
echo ======================================
echo.

if not exist "uploads" mkdir uploads
if not exist "uploads\original" mkdir uploads\original
if not exist "uploads\users" mkdir uploads\users
if not exist "uploads\temp" mkdir uploads\temp
if not exist "uploads\faces" mkdir uploads\faces

echo [32m✓ Upload directories created[0m

echo.
echo ======================================
echo   Setup Complete!
echo ======================================
echo.
echo [32m✓ All dependencies installed successfully![0m
echo.
echo Next steps:
echo 1. Configure MongoDB connection in backend\.env
echo 2. Run the application: run.bat
echo.
echo For detailed instructions, see LOCAL_SETUP.md
echo.
pause