#!/bin/bash

# AI Hub - Startup Script
# This script initializes and starts the development environment

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║         AI Hub - Startup Script        ║"
echo "╔════════════════════════════════════════╗"
echo -e "${NC}"

# Check if Node.js is installed
echo -e "${BLUE}[1/4]${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"

# Check if dependencies are installed
echo -e "\n${BLUE}[2/4]${NC} Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules not found${NC}"
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
    
    # Check if package.json has changed
    if [ "package.json" -nt "node_modules" ]; then
        echo -e "${YELLOW}⚠ package.json is newer than node_modules${NC}"
        echo "Updating dependencies..."
        npm install
        echo -e "${GREEN}✓ Dependencies updated${NC}"
    fi
fi

# Clean Next.js cache if needed
echo -e "\n${BLUE}[3/4]${NC} Checking Next.js cache..."
if [ -d ".next" ]; then
    echo -e "${YELLOW}⚠ Removing old build cache...${NC}"
    rm -rf .next
    echo -e "${GREEN}✓ Cache cleared${NC}"
else
    echo -e "${GREEN}✓ No cache to clear${NC}"
fi

# Function to find an available port
find_available_port() {
    local port=$1
    local max_attempts=10
    
    while [ $max_attempts -gt 0 ]; do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo $port
            return 0
        fi
        port=$((port + 1))
        max_attempts=$((max_attempts - 1))
    done
    
    echo -e "${RED}✗ Could not find an available port${NC}" >&2
    exit 1
}

# Check if ports 3000 and 3333 are available
echo -e "\n${BLUE}[4/4]${NC} Checking required ports..."

# Check port 3000 (Next.js) - find alternative if in use
NEXT_PORT=$(find_available_port 3000)
if [ "$NEXT_PORT" != "3000" ]; then
    echo -e "${YELLOW}⚠ Port 3000 is already in use${NC}"
    echo -e "${GREEN}✓ Using alternative port ${NEXT_PORT}${NC}"
else
    echo -e "${GREEN}✓ Port 3000 is available${NC}"
fi

# Check port 3333 (WebSocket bus)
if lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port 3333 is already in use${NC}"
    echo "Attempting to kill process..."
    lsof -ti:3333 | xargs kill -9 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Port 3333 is now available${NC}"
else
    echo -e "${GREEN}✓ Port 3333 is available${NC}"
fi

# Display startup information
echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "\n${BLUE}Starting AI Hub development environment...${NC}"
echo ""
echo -e "📍 Web UI:   ${GREEN}http://localhost:${NEXT_PORT}${NC}"
echo -e "🔌 WS Bus:   ${GREEN}ws://localhost:3333${NC}"
echo -e "📱 Network:  Check terminal output below"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""
echo -e "${BLUE}────────────────────────────────────────${NC}"
echo ""

# Open Chrome once Next.js is actually serving (instead of a fixed sleep)
wait_and_open() {
  local port=$1
  local max_wait=30
  local waited=0
  while [ $waited -lt $max_wait ]; do
    if curl -s -o /dev/null -w '' "http://localhost:${port}" 2>/dev/null; then
      open -a "Google Chrome" "http://localhost:${port}"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  echo -e "${YELLOW}⚠ Next.js did not respond within ${max_wait}s — opening browser anyway${NC}"
  open -a "Google Chrome" "http://localhost:${port}"
}
(wait_and_open ${NEXT_PORT}) &

# Start both the Next.js app and WebSocket bus
PORT=${NEXT_PORT} npm run dev:all
