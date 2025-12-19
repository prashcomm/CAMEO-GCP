#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "  Event Photo Gallery - Setup Script"
echo "======================================"
echo ""

# Check Python
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"
    PYTHON_CMD=python
else
    echo -e "${RED}✗ Python not found! Please install Python 3.11+${NC}"
    exit 1
fi

# Check Node.js
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found! Please install Node.js 20+${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm found: v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found!${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo "  Setting up Backend"
echo "======================================"
echo ""

cd backend

# Create virtual environment
echo "Creating Python virtual environment..."
$PYTHON_CMD -m venv venv

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${YELLOW}⚠ Could not create virtual environment, continuing without it${NC}"
fi

# Activate virtual environment
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
fi

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip --quiet

# Install Python dependencies
echo "Installing Python dependencies (this may take 5-10 minutes for dlib)..."
echo -e "${YELLOW}Note: dlib compilation requires cmake. If it fails, install cmake first.${NC}"

pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install Python dependencies${NC}"
    echo -e "${YELLOW}If dlib failed, make sure cmake is installed:${NC}"
    echo "  macOS: brew install cmake"
    echo "  Linux: sudo apt-get install cmake build-essential"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "  Setting up Frontend"
echo "======================================"
echo ""

cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
    echo -e "${RED}✗ Failed to install Node.js dependencies${NC}"
    exit 1
fi

cd ..

echo ""
echo "======================================"
echo "  Creating Upload Directories"
echo "======================================"
echo ""

mkdir -p uploads/original uploads/users uploads/temp uploads/faces

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Upload directories created${NC}"
fi

echo ""
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo ""
echo -e "${GREEN}✓ All dependencies installed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure MongoDB connection in backend/.env"
echo "2. Run the application: ./run.sh"
echo ""
echo "For detailed instructions, see LOCAL_SETUP.md"
echo ""