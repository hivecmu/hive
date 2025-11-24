#!/bin/bash

# Hive Platform - Local Development Runner
# This script sets up and runs the entire platform locally

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Header
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}   Hive Platform Local Setup    ${NC}"
echo -e "${BLUE}================================${NC}"
echo

# Check if Docker is running
print_status "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running!"
    print_warning "Please start Docker Desktop and run this script again."
    exit 1
fi
print_success "Docker is running"

# Navigate to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)
print_success "Project directory: $PROJECT_DIR"

# Step 1: Check environment files exist
print_status "Checking environment files..."

if [ ! -f "backend/.env" ]; then
    print_error "backend/.env not found!"
    print_warning "Please create backend/.env with your configuration"
    exit 1
fi
print_success "Found backend/.env"

if [ ! -f "hive-platform/.env.local" ]; then
    print_error "hive-platform/.env.local not found!"
    print_warning "Please create hive-platform/.env.local with your configuration"
    exit 1
fi
print_success "Found hive-platform/.env.local"

# Step 2: Install dependencies
print_status "Checking dependencies..."

# Backend dependencies
if [ ! -d "backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd backend && npm install
    cd ..
    print_success "Backend dependencies installed"
else
    print_success "Backend dependencies already installed"
fi

# Frontend dependencies
if [ ! -d "hive-platform/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd hive-platform && npm install
    cd ..
    print_success "Frontend dependencies installed"
else
    print_success "Frontend dependencies already installed"
fi

# Step 3: Start Docker services
print_status "Starting Docker services..."
cd backend

# Check if containers are already running
if docker-compose ps | grep -q "Up"; then
    print_warning "Docker services already running"
else
    docker-compose up -d
    print_success "Docker services started"
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 5
    
    # Check PostgreSQL connection
    for i in {1..10}; do
        if docker-compose exec -T postgres pg_isready -U hive > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        if [ $i -eq 10 ]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
        print_status "Waiting for PostgreSQL... ($i/10)"
        sleep 2
    done
fi

# Step 4: Run database migrations
print_status "Running database migrations..."
if npx tsx src/infra/db/migrate.ts up 2>/dev/null; then
    print_success "Database migrations completed"
else
    print_warning "Migrations may have already been applied"
fi

cd ..

# Step 5: Create start script for running servers
cat > start-servers.sh << 'EOF'
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
EOF

chmod +x start-servers.sh

# Final output
echo
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}   Setup Complete! 🎉           ${NC}"
echo -e "${GREEN}================================${NC}"
echo
echo -e "${BLUE}To start the platform, run:${NC}"
echo -e "  ${GREEN}./start-servers.sh${NC}"
echo
echo -e "${BLUE}Or start services manually:${NC}"
echo -e "  Terminal 1: ${GREEN}cd backend && npm run dev${NC}"
echo -e "  Terminal 2: ${GREEN}cd hive-platform && npm run dev${NC}"
echo
echo -e "${BLUE}Then open:${NC} ${GREEN}http://localhost:3000${NC}"
echo
print_success "Setup complete! Run ./start-servers.sh to start the platform"