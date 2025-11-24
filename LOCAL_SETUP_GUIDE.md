# 🚀 Hive Platform - Complete Local Setup Guide

## Prerequisites

### Required Software
- **Node.js** (v18+ recommended)
- **Docker Desktop** (for PostgreSQL, Redis, MinIO)
- **Git** (already installed)
- **A code editor** (VS Code recommended)

### Optional but Recommended
- **OpenAI API Key** (for AI features) - Get from https://platform.openai.com/api-keys

---

## 📦 Step 1: Clone & Install Dependencies

### 1.1 Navigate to Project Directory
```bash
cd /Users/akeilsmith/hive-1
```

### 1.2 Install Backend Dependencies
```bash
cd backend
npm install
```

### 1.3 Install Frontend Dependencies
```bash
cd ../hive-platform
npm install
```

---

## 🐳 Step 2: Start Docker Services

### 2.1 Start Docker Desktop
Open Docker Desktop application on your Mac and ensure it's running.

### 2.2 Start Backend Services
```bash
cd /Users/akeilsmith/hive-1/backend
docker-compose up -d
```

This starts:
- **PostgreSQL** (Database) - Port 5432
- **Redis** (Caching/Sessions) - Port 6379
- **MinIO** (S3-compatible storage) - Port 9000

### 2.3 Verify Services are Running
```bash
docker-compose ps
```

You should see all three services as "Up".

---

## 🔧 Step 3: Configure Environment Variables

### 3.1 Backend Configuration
Create `.env` file in the backend directory:

```bash
cd /Users/akeilsmith/hive-1/backend
```

Create `.env` with this content:
```env
# Server
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://hive:hive123@localhost:5432/hive_db

# Redis
REDIS_URL=redis://localhost:6379

# MinIO/S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=hive-files
S3_REGION=us-east-1

# OpenAI (Optional - for AI features)
OPENAI_API_KEY=sk-your-openai-key-here

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3.2 Frontend Configuration
Create `.env.local` file in the frontend directory:

```bash
cd /Users/akeilsmith/hive-1/hive-platform
```

Create `.env.local` with this content:
```env
# Backend Connection
NEXT_PUBLIC_USE_REAL_BACKEND=true
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

---

## 📊 Step 4: Initialize Database

### 4.1 Run Database Migrations
```bash
cd /Users/akeilsmith/hive-1/backend
npx tsx src/infra/db/migrate.ts up
```

This creates all necessary tables:
- users
- workspaces
- channels
- messages
- direct_messages
- files
- And more...

### 4.2 Verify Migration Success
You should see output like:
```
✓ Applied migration: 001_initial_schema.sql
✓ Applied migration: 002_structure_domain.sql
✓ Applied migration: 003_filehub_domain.sql
✓ Applied migration: 004_orchestrator_and_policy.sql
✓ Applied migration: 005_channel_members.sql
✓ Applied migration: 006_add_blueprint_approved.sql
✓ Applied migration: 007_direct_messages.sql
```

---

## 🎯 Step 5: Start the Platform

### 5.1 Start Backend Server
Open a new terminal:
```bash
cd /Users/akeilsmith/hive-1/backend
npm run dev
```

You should see:
```
🚀 Server listening at http://0.0.0.0:3001
✅ Database connected
✅ Redis connected
✅ MinIO connected
```

### 5.2 Start Frontend Application
Open another terminal:
```bash
cd /Users/akeilsmith/hive-1/hive-platform
npm run dev
```

You should see:
```
✓ Ready in 2.1s
○ Local:   http://localhost:3000
```

---

## ✅ Step 6: Access the Platform

### 6.1 Open Your Browser
Navigate to: **http://localhost:3000**

### 6.2 Create Your First Account
1. Click **"Sign up"**
2. Enter your details:
   - Name: Your Name
   - Email: your@email.com
   - Password: your-password
3. Click **"Create Account"**

### 6.3 Create Your First Workspace
1. After login, click **"Create Organization"**
2. Enter workspace details:
   - Name: My Team
   - Type: Company/Club/Personal
   - Emoji: Pick one
   - Color: Choose a color
3. Click **"Create"**

### 6.4 You're Ready! 
- A **#general** channel is automatically created
- You can now send messages
- Create more channels with the **+** button
- Run the **AI Structure Wizard** for auto-generated channels

---

## 🧪 Step 7: Test Key Features

### Test Checklist
- [ ] **Authentication**: Sign up, login, logout
- [ ] **Workspace**: Create and switch workspaces
- [ ] **Channels**: See #general, create new channels
- [ ] **Messaging**: Send, edit, delete messages
- [ ] **Real-time**: Open two browser tabs, see instant updates
- [ ] **Threading**: Click "Reply in thread" on any message
- [ ] **AI Structure**: Click "Run AI Structure" (needs OpenAI key)
- [ ] **File Hub**: Click Hub in sidebar (if blueprint approved)
- [ ] **Direct Messages**: Send DMs to other users

---

## 🛠️ Troubleshooting

### Issue: Docker services won't start
```bash
# Stop all services
docker-compose down

# Remove volumes and start fresh
docker-compose down -v
docker-compose up -d
```

### Issue: Database connection failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres
```

### Issue: Port already in use
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Issue: Frontend can't connect to backend
1. Verify backend is running on port 3001
2. Check `.env.local` has correct URLs
3. Check browser console for errors
4. Ensure CORS is configured in backend

### Issue: Migrations fail
```bash
# Reset database
docker-compose down -v
docker-compose up -d

# Wait 10 seconds for PostgreSQL to start
sleep 10

# Run migrations again
npx tsx src/infra/db/migrate.ts up
```

---

## 📝 Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | postgresql://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| MinIO Console | 9001 | http://localhost:9001 |
| MinIO API | 9000 | http://localhost:9000 |

---

## 🔄 Quick Commands Reference

### Start Everything
```bash
# Terminal 1: Docker services
cd /Users/akeilsmith/hive-1/backend
docker-compose up -d

# Terminal 2: Backend
cd /Users/akeilsmith/hive-1/backend
npm run dev

# Terminal 3: Frontend
cd /Users/akeilsmith/hive-1/hive-platform
npm run dev
```

### Stop Everything
```bash
# Stop frontend: Ctrl+C in frontend terminal
# Stop backend: Ctrl+C in backend terminal

# Stop Docker services
cd /Users/akeilsmith/hive-1/backend
docker-compose down
```

### Reset Everything
```bash
# Stop all services first, then:
cd /Users/akeilsmith/hive-1/backend
docker-compose down -v  # Removes all data
docker-compose up -d
npx tsx src/infra/db/migrate.ts up
```

---

## 🎉 Success Indicators

You know everything is working when:
1. ✅ You can create an account
2. ✅ You can create a workspace
3. ✅ You see the #general channel
4. ✅ You can send messages
5. ✅ Messages appear instantly
6. ✅ You can create new channels
7. ✅ Thread replies work
8. ✅ File Hub opens (after AI structure)

---

## 📚 Additional Resources

- **Backend API Docs**: http://localhost:3001/documentation (if enabled)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Database Client**: Connect to `postgresql://localhost:5432/hive_db`

---

## 🆘 Need Help?

If you encounter issues:
1. Check Docker Desktop is running
2. Verify all terminals show services running
3. Check browser console for errors
4. Review the troubleshooting section above
5. Ensure all dependencies are installed

The platform should now be fully operational locally! 🚀
