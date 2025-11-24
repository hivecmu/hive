#!/bin/bash

# Hive Platform - Stop Local Development
# This script stops all running services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}================================${NC}"
echo -e "${YELLOW}   Stopping Hive Platform       ${NC}"
echo -e "${YELLOW}================================${NC}"
echo

# Navigate to project directory
cd "$(dirname "$0")"

# Stop Node processes
echo -e "${BLUE}[*]${NC} Stopping Node.js servers..."

# Find and kill processes on ports 3000 and 3001
if lsof -ti:3000 > /dev/null 2>&1; then
    kill -9 $(lsof -ti:3000) 2>/dev/null
    echo -e "${GREEN}[✓]${NC} Stopped frontend server (port 3000)"
else
    echo -e "${YELLOW}[!]${NC} Frontend server not running"
fi

if lsof -ti:3001 > /dev/null 2>&1; then
    kill -9 $(lsof -ti:3001) 2>/dev/null
    echo -e "${GREEN}[✓]${NC} Stopped backend server (port 3001)"
else
    echo -e "${YELLOW}[!]${NC} Backend server not running"
fi

# Stop Docker services
echo -e "${BLUE}[*]${NC} Stopping Docker services..."
cd backend
if docker-compose ps | grep -q "Up"; then
    docker-compose down
    echo -e "${GREEN}[✓]${NC} Docker services stopped"
else
    echo -e "${YELLOW}[!]${NC} Docker services were not running"
fi
cd ..

echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}   All services stopped!        ${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${BLUE}To restart:${NC} ${GREEN}./run-local.sh${NC}"
