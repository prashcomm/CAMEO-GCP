@echo off
echo ======================================
echo   Event Photo Gallery - Starting App
echo ======================================
echo.

REM Check if setup was run
if not exist "backend\venv" (
    if not exist "frontend\node_modules" (
        echo [33m⚠ Setup not detected. Running setup first...[0m
        call setup.bat
        if errorlevel 1 (
            echo [31mSetup failed. Please fix errors and try again.[0m
            pause
            exit /b 1
        )
    )
)

REM Start Backend
echo [34mStarting Backend (FastAPI)...[0m
cd backend

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Start backend in new window
start "Backend Server" cmd /k "python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload"

echo [32m✓ Backend started[0m
echo [32m  → http://localhost:8000[0m
echo [32m  → API docs: http://localhost:8000/docs[0m

cd ..

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend
echo.
echo [34mStarting Frontend (React)...[0m
cd frontend

REM Start frontend in new window
start "Frontend Server" cmd /k "npm start"

echo [32m✓ Frontend starting[0m
echo [32m  → http://localhost:3000[0m

cd ..

echo.
echo ======================================
echo [32m  Application is running![0m
echo ======================================
echo.
echo Access the application:
echo   [34mFrontend:[0m http://localhost:3000
echo   [34mBackend API:[0m http://localhost:8000
echo   [34mAPI Docs:[0m http://localhost:8000/docs
echo   [34mAdmin Dashboard:[0m http://localhost:3000/admin
echo.
echo Default admin credentials:
echo   Email: admin@event.com
echo   Password: admin123
echo.
echo [33mTwo windows will open - DO NOT CLOSE THEM[0m
echo [33mClose this window or press Ctrl+C when done[0m
echo.
pause