# Backend Setup Guide

## Current Status

Your app is now running in **MOCK MODE** - no backend required!

Login/signup work with any credentials, and organization data is stored in localStorage.

## Option 1: Mock Mode (Current - ✅ Working)

**What it is:** Frontend-only mode with mock data
**When to use:** Development, demos, quick testing
**Setup:** None needed - already working!

All features work except:
- Real AI recommendations (uses mock data)
- Real file indexing (simulated)
- Real-time collaboration (simulated)

## Option 2: Full Stack with Real Backend

**What it is:** Complete system with Postgres, Redis, AI, file storage
**When to use:** Production, testing real integrations, AI features

### Prerequisites

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
2. **Node.js 20+** - Already installed ✅
3. **OpenAI API Key** - For AI features (optional for testing)

### Setup Steps

#### 1. Start Docker Desktop

Make sure Docker Desktop is running (you should see the whale icon in your menu bar).

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

✅ Already done!

#### 3. Configure Environment

```bash
cd backend
cp .env.template .env
```

✅ Already done!

**Edit `.env` if needed:**
- Add your OpenAI API key (optional - works without it)
- Change database credentials (optional - defaults work fine)

#### 4. Start Infrastructure Services

```bash
cd backend
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Caching & real-time
- **MinIO** (port 9000) - File storage (S3-compatible)

Wait ~30 seconds for services to be ready.

#### 5. Run Database Migrations

```bash
cd backend
npm run migrate
```

This creates all necessary tables.

#### 6. Start Backend Server

```bash
cd backend
npm run dev
```

Server runs on **http://localhost:3001**

#### 7. Update Frontend to Use Real Backend

```bash
cd hive-platform

# Create .env.local
echo "NEXT_PUBLIC_USE_REAL_BACKEND=true" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" >> .env.local
```

#### 8. Restart Frontend

```bash
cd hive-platform
npm run dev
```

Now you're running the full stack! 🎉

## Switching Between Modes

### Switch to Mock Mode
```bash
cd hive-platform
# Delete or comment out .env.local
rm .env.local

# Restart dev server
npm run dev
```

### Switch to Real Backend
```bash
cd hive-platform
echo "NEXT_PUBLIC_USE_REAL_BACKEND=true" > .env.local

# Start backend (in separate terminal)
cd ../backend
npm run dev

# Restart frontend
cd ../hive-platform
npm run dev
```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Start Docker Desktop
- Wait for it to fully start (whale icon should be stable)
- Try `docker ps` to verify it's running

### "Connection refused" on port 3001
- Backend server isn't running
- Run `npm run dev` in backend directory

### Database connection errors
- Services aren't ready yet - wait 30 seconds
- Check services: `docker-compose ps`
- Restart services: `docker-compose restart`

### Port already in use
- Frontend (3000): `lsof -ti:3000 | xargs kill`
- Backend (3001): `lsof -ti:3001 | xargs kill`

## Useful Commands

### Check Running Services
```bash
cd backend
docker-compose ps
```

### View Service Logs
```bash
cd backend
docker-compose logs -f postgres  # Database logs
docker-compose logs -f redis     # Redis logs
```

### Stop All Services
```bash
cd backend
docker-compose down
```

### Reset Database (Fresh Start)
```bash
cd backend
docker-compose down -v  # Remove volumes
docker-compose up -d     # Start fresh
npm run migrate          # Run migrations
npm run seed             # Add seed data (optional)
```

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │ ← You are here (Mock Mode)
│  Port 3000      │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│   Backend       │
│  (Fastify)      │
│  Port 3001      │
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐
│Postgres│ │Redis │ │MinIO │ │OpenAI   │
│:5432   │ │:6379 │ │:9000 │ │API      │
└────────┘ └──────┘ └──────┘ └─────────┘
```

## Current Setup

✅ Frontend running on http://localhost:3000
✅ Mock mode enabled (no backend needed)
✅ Login/signup working
✅ Organization management working
✅ File hub UI working (mock data)

❌ Backend not running (not needed in mock mode)
❌ Docker not running (not needed in mock mode)

## When to Use Each Mode

### Use Mock Mode When:
- Developing UI/UX
- Demoing to stakeholders
- Quick testing
- No AI features needed
- Offline development

### Use Real Backend When:
- Testing AI recommendations
- Testing real-time features
- Testing file uploads
- Integration testing
- Preparing for production

## Questions?

- **How do I know which mode I'm in?**
  - Check if `.env.local` exists in `hive-platform/`
  - If it has `NEXT_PUBLIC_USE_REAL_BACKEND=true`, you're in real mode
  - Otherwise, you're in mock mode

- **Can I switch modes while the app is running?**
  - No - you need to restart the dev server
  - Delete/modify `.env.local` and run `npm run dev` again

- **Do I lose data when switching modes?**
  - Mock mode data (localStorage) is separate from backend data
  - They don't interfere with each other
