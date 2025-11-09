#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Hive Platform with Docker...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
  exit 1
fi

# Start Docker services
echo -e "${YELLOW}📦 Starting Docker services (PostgreSQL, Redis, MinIO)...${NC}"
docker-compose up -d

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
until docker exec hive-postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo -e "${GREEN}✅ PostgreSQL is ready!${NC}"

# Run database migrations
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
cd backend
npm run migrate || echo -e "${YELLOW}⚠️  No migrations to run or migrations already applied${NC}"

# Start backend
echo -e "${YELLOW}🖥️  Starting backend server on port 3001...${NC}"
npm run dev &
BACKEND_PID=$!

# Give backend time to start
sleep 3

# Start frontend
echo -e "${YELLOW}🌐 Starting frontend on port 3000...${NC}"
cd ../hive-platform
npm run dev &
FRONTEND_PID=$!

# Print access information
echo -e "\n${GREEN}✨ Hive Platform is starting!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📱 Frontend:    ${GREEN}http://localhost:3000${NC}"
echo -e "🔧 Backend API: ${GREEN}http://localhost:3001${NC}"
echo -e "🗄️  PostgreSQL:  ${GREEN}localhost:5432${NC}"
echo -e "💾 Redis:       ${GREEN}localhost:6379${NC}"
echo -e "📦 MinIO:       ${GREEN}http://localhost:9001${NC} (user: minioadmin, pass: minioadmin)"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Function to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  docker-compose down
  echo -e "${GREEN}✅ All services stopped${NC}"
  exit 0
}

# Set trap to cleanup on Ctrl+C
trap cleanup INT

# Keep script running
wait