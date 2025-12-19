#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Create uploads directories
echo "Creating upload directories..."
mkdir -p /app/uploads/original /app/uploads/users /app/uploads/temp /app/uploads/faces

# Build frontend if build folder missing (helps in Heroku / Railway deployments)
if [ ! -d "/app/frontend/build" ]; then
	echo "Frontend build not found — building frontend..."
	if [ -d "/app/frontend" ]; then
		cd /app/frontend
		if command -v npm >/dev/null 2>&1; then
			npm ci --silent
			npm run build --silent
		else
			echo "npm not available — ensure frontend is built before deployment"
		fi
		cd - >/dev/null
	fi
fi

# Check installations
echo "Python version:"
python --version || python3 --version

echo "pip version:"
pip --version || pip3 --version

# Start services
echo "Starting FastAPI server..."

# Railway only exposes one port, so we'll run backend on that port
# and serve frontend static files from FastAPI
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}

echo "Service started on port ${PORT:-8000}"
