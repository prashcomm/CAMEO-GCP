#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "======================================"
echo "  Event Photo Gallery - Starting App"
echo "======================================"
echo ""

# Check if setup was run
if [ ! -d "backend/venv" ] && [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠ Setup not detected. Running setup first...${NC}"
    ./setup.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Setup failed. Please fix errors and try again.${NC}"
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Start Backend
echo -e "${BLUE}Starting Backend (FastAPI)...${NC}"
cd backend

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Start backend in background
if command -v python3 &> /dev/null; then
    python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
else
    python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
fi

BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}  → http://localhost:8000${NC}"
echo -e "${GREEN}  → API docs: http://localhost:8000/docs${NC}"

cd ..

# Wait a bit for backend to start
sleep 3

# Start Frontend
echo ""
echo -e "${BLUE}Starting Frontend (React)...${NC}"
cd frontend

# Start frontend in background
npm start &
FRONTEND_PID=$!

echo -e "${GREEN}✓ Frontend starting (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}  → http://localhost:3000${NC}"

cd ..

echo ""
echo "======================================"
echo -e "${GREEN}  Application is running!${NC}"
echo "======================================"
echo ""
echo "Access the application:"
echo -e "  ${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "  ${BLUE}Backend API:${NC} http://localhost:8000"
echo -e "  ${BLUE}API Docs:${NC} http://localhost:8000/docs"
echo -e "  ${BLUE}Admin Dashboard:${NC} http://localhost:3000/admin"
echo ""
echo "Default admin credentials:"
echo "  Email: admin@event.com"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the application${NC}"
echo ""

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID