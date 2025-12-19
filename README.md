Event Photo Gallery — Local run & Railway deploy

Summary
- Backend: FastAPI (Python) serving API and frontend static build.
- Frontend: React (Create React App with CRACO) — production build served by backend.

Local development (Windows PowerShell)

1) Create and activate Python venv (if not present):

```powershell
cd c:\\CAMEO\\backend
python -m venv venv
.\\venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
```

2) Build frontend (one-time or when changing frontend):

```powershell
cd c:\\CAMEO\\frontend
powershell -NoProfile -ExecutionPolicy Bypass -Command "npm ci; npm run build"
```

3) Run backend (serve built frontend + API). Set `MONGO_URL` and `DB_NAME` in environment or create `backend/.env` (DO NOT COMMIT real credentials):

```powershell
cd c:\\CAMEO\\backend
# Example (set env for current session):
$env:MONGO_URL='your-mongodb-uri'
$env:DB_NAME='EventPhotoGallery'
.\\venv\\Scripts\\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000
```

Open the app in your browser:
- Backend + static frontend served at: http://127.0.0.1:8000/
- API docs: http://127.0.0.1:8000/docs

Railway deployment notes
- Use Railway project settings to add environment variables (do NOT commit `.env`):
  - `MONGODB_URI` or `MONGO_URL` — your Atlas connection string (no surrounding quotes)
  - `DB_NAME` — EventPhotoGallery
  - `CORS_ORIGINS` — `*` or your frontend origin
  - `FRONTEND_URL` — your deployed frontend URL (optional)

- Railway will run the `web` process from `Procfile` which calls `start.sh` — `start.sh` builds the frontend if missing and starts Uvicorn on `$PORT`.

Notes about face-recognition native deps
- Packages like `dlib` and `face-recognition` require system build tools (CMake, visual build tools or build-essentials). For reliable deploys use a Dockerfile with the required system packages or use Railway's Docker deployment.

Cleaning up
- Run the cleanup script to remove Python caches:

```powershell
cd c:\\CAMEO
.\\venv\\Scripts\\python.exe scripts\\clean_pycache.py
```

If you want I can add a Dockerfile that installs system libs and makes a production-ready image for Railway.
# Here are your Instructions
