#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}[!]${NC} Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   Starting Hive Platform       ${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Start backend
echo -e "${GREEN}[*]${NC} Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}[*]${NC} Starting frontend server..."
cd hive-platform && npm run dev &
FRONTEND_PID=$!
cd ..

echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}   Platform is starting up!     ${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${BLUE}Frontend:${NC} http://localhost:3000"
echo -e "${BLUE}Backend:${NC}  http://localhost:3001"
echo -e "${BLUE}MinIO:${NC}    http://localhost:9001 (minioadmin/minioadmin)"
echo
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
