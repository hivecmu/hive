# Hive Platform - System Status & OpenAI Configuration

## 🔍 Current System Status

### ✅ What's Working

#### Backend (Port 3001)
- **Status:** ✅ RUNNING
- **Health Check:** http://localhost:3001/health - OPERATIONAL
- **Database:** Connected successfully to PostgreSQL
- **WebSocket:** Initialized and ready
- **API Endpoints:** All routes registered and accessible

#### Frontend (Port 3000) 
- **Status:** ✅ RUNNING  
- **URL:** http://localhost:3000
- **Backend Connection:** Configured to connect to http://localhost:3001

#### Docker Services
- **PostgreSQL:** ✅ Running on port 5432
- **Redis:** ✅ Running on port 6379
- **MinIO (S3):** ✅ Running on ports 9000-9001

### ⚠️ What's Missing: OpenAI Configuration

## 🚨 CRITICAL: OpenAI API Key Not Configured

The system is running but **AI features are disabled** because no OpenAI API key is configured.

### Current AI Service Behavior
- The backend checks for `OPENAI_API_KEY` in the environment
- When missing, it defaults to an empty string
- The `USE_REAL_AI` flag defaults to `true` but will fail without a key
- The system will use **mock AI responses** for testing

### Features Affected Without OpenAI Key
1. **Workspace Structure Generation** - Will return mock channel structures
2. **File Tagging** - Will return generic mock tags
3. **Text Embeddings** - Will return random vectors
4. **Any AI-powered features** - Will use placeholder data

## 🔧 How to Add Your OpenAI API Key

### Step 1: Get an OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Step 2: Create Backend .env File
Create `/Users/akeilsmith/hive-1/backend/.env` with:

```env
# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hive_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# S3 (MinIO for local)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=hive-artifacts
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# OpenAI - ADD YOUR KEY HERE
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Auth
JWT_SECRET=your-secret-key-here-at-least-32-characters-long
JWT_EXPIRES_IN=24h

# Feature Flags
USE_REAL_AI=true  # Set to true to use real OpenAI
DRY_RUN_APPLY=false

# Observability
LOG_LEVEL=info
ENABLE_TELEMETRY=false
```

### Step 3: Restart the Backend
```bash
# Stop the current backend
pkill -f "tsx watch src/server.ts"

# Restart with new configuration
cd /Users/akeilsmith/hive-1/backend
npm run dev
```

### Step 4: Verify AI is Working
```bash
# Check the backend logs
tail -f /Users/akeilsmith/hive-1/backend/backend.log

# You should NOT see "Using mock AI" messages
# Instead, you'll see "OpenAI generation complete" when using AI features
```

## 📊 System Architecture Overview

### Frontend → Backend Connection
- Frontend at `localhost:3000` connects to Backend at `localhost:3001`
- Uses typed API client with Result<T, Issue[]> error handling
- Authentication via JWT tokens stored in localStorage

### Backend Services
```
┌─────────────────────────────────────────────┐
│              Fastify Server                 │
│                Port 3001                    │
├─────────────────────────────────────────────┤
│  Routes:                                    │
│  - /health          - Health check          │
│  - /auth/*          - Authentication        │
│  - /v1/workspaces/* - Workspace management  │
│  - /v1/structure/*  - AI structure gen      │
│  - /v1/files/*      - File hub              │
│  - /v1/channels/*   - Messaging             │
│  - /v1/dms/*        - Direct messages       │
├─────────────────────────────────────────────┤
│  Services:                                  │
│  - PostgreSQL  - Main database              │
│  - Redis       - Caching & sessions         │
│  - MinIO       - File storage (S3)          │
│  - OpenAI      - AI features (needs key!)   │
│  - WebSocket   - Real-time messaging        │
└─────────────────────────────────────────────┘
```

## 🔍 Testing the Full System

### 1. Test Backend Health
```bash
curl http://localhost:3001/health | jq .
```

### 2. Test User Registration
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }' | jq .
```

### 3. Test AI Features (requires OpenAI key)
After logging in through the frontend, try:
- Creating a new workspace with AI structure generation
- Uploading a file to test AI tagging

## ⚠️ Common Issues

### Backend Won't Start
- **Port already in use:** Kill existing process with `pkill -f "tsx watch"`
- **Database connection failed:** Ensure Docker is running and containers are up
- **Missing dependencies:** Run `npm install` in the backend directory

### Frontend Connection Issues
- Check that `NEXT_PUBLIC_API_URL=http://localhost:3001` is set
- Verify CORS is configured correctly in backend
- Check browser console for network errors

### AI Features Not Working
- **No OpenAI key:** Add your key to `.env` file
- **Invalid key:** Check that key starts with `sk-` and is valid
- **Rate limits:** OpenAI has usage limits, check your account

## 📝 Summary

**The system is RUNNING but AI features are DISABLED without an OpenAI API key.**

To enable full functionality:
1. Get an OpenAI API key
2. Add it to `/Users/akeilsmith/hive-1/backend/.env`
3. Restart the backend
4. AI features will then work properly

The frontend-backend connection is working, databases are running, and the system architecture is properly set up. You just need to add your OpenAI API key to enable the AI-powered features.
