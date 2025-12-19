@echo off
REM Build frontend and start backend using venv python (Windows)

echo Building frontend (if needed)...
cd frontend

















venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port %PORT% --reloadREM Use venv python to run uvicorn so it uses installed packages and models)  call venv\Scripts\activate.batif exist "venv\Scripts\activate.bat" (cd backendecho Starting backend (serving frontend build)...cd ..)  echo Frontend build already exists.) else (  npm run build  echo Building frontend...  npm ci  echo Installing frontend dependencies...n
nif not exist "build" (