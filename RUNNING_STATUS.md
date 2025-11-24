# Hive Platform - Running Status

## ✅ FULLY OPERATIONAL

Both frontend and backend are running successfully in the background!

---

## Current Status

### 🟢 Backend Server
- **Status:** Running
- **URL:** http://localhost:3001
- **PID:** Check with `ps aux | grep "tsx watch"`
- **Logs:** `/Users/akeilsmith/hive-1/backend/backend.log`
- **Health:** http://localhost:3001/health

### 🟢 Frontend Server
- **Status:** Running
- **URL:** http://localhost:3000
- **PID:** Check with `ps aux | grep "next dev"`
- **Logs:** `/Users/akeilsmith/hive-1/hive-platform/frontend.log`

### 🟢 Docker Services
- **PostgreSQL:** Port 5432 (hive-postgres)
- **Redis:** Port 6379 (hive-redis)
- **MinIO:** Port 9000-9001 (hive-minio)

---

## Quick Commands

### Check Status
```bash
# Check if servers are running
ps aux | grep -E "(next dev|tsx watch)" | grep -v grep

# Check Docker services
cd /Users/akeilsmith/hive-1/backend
docker-compose ps

# Test backend
curl http://localhost:3001/health

# Test frontend
curl -I http://localhost:3000
```

### View Logs
```bash
# Backend logs
tail -f /Users/akeilsmith/hive-1/backend/backend.log

# Frontend logs
tail -f /Users/akeilsmith/hive-1/hive-platform/frontend.log

# Docker logs
cd /Users/akeilsmith/hive-1/backend
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
```

### Stop Everything
```bash
# Stop frontend
pkill -f "next dev"

# Stop backend
pkill -f "tsx watch src/server.ts"

# Stop Docker services
cd /Users/akeilsmith/hive-1/backend
docker-compose down
```

### Restart Everything
```bash
# Start Docker services
cd /Users/akeilsmith/hive-1/backend
docker-compose up -d

# Wait for services to be ready
sleep 10

# Start backend
npm run dev > backend.log 2>&1 &

# Start frontend
cd /Users/akeilsmith/hive-1/hive-platform
npm run dev > frontend.log 2>&1 &
```

---

## Access the App

### Frontend
**Open in browser:** http://localhost:3000

**Test it:**
1. Go to http://localhost:3000
2. Click "Sign Up" or "Login"
3. Enter any email/password
4. You should be able to create an account and access the app!

### Backend API
**API Base URL:** http://localhost:3001

**Example endpoints:**
- Health check: `GET http://localhost:3001/health`
- Register: `POST http://localhost:3001/auth/register`
- Login: `POST http://localhost:3001/auth/login`
- Workspaces: `GET http://localhost:3001/v1/workspaces` (requires auth)

---

## Configuration

### Frontend (.env.local)
```
NEXT_PUBLIC_USE_REAL_BACKEND=true
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hive_dev
REDIS_URL=redis://localhost:6379
# ... other settings
```

---

## Verified Working

✅ Docker services started
✅ Database migrations applied
✅ Backend server running on port 3001
✅ Frontend server running on port 3000
✅ Backend health endpoint responding
✅ Frontend homepage loading
✅ User registration working
✅ Database connected
✅ CORS configured

---

## Database

**Connection:** PostgreSQL on localhost:5432
**Database:** `hive_dev`
**User:** `postgres`
**Password:** `postgres`

**Connect to database:**
```bash
docker exec -it hive-postgres psql -U postgres -d hive_dev
```

**Check tables:**
```sql
\dt
SELECT * FROM users;
SELECT * FROM workspaces;
```

---

## Test User

A test user was created to verify the system:

**Email:** test@example.com
**Password:** testpass123
**Name:** Test User

You can log in with these credentials or create a new account.

---

## Process IDs

Run this to see PIDs:
```bash
ps aux | grep -E "(next dev|tsx watch)" | grep -v grep
```

Example output:
```
akeilsmith  11215  node .../next dev --webpack
akeilsmith  10577  node .../tsx watch src/server.ts
```

---

## Troubleshooting

### Frontend not responding
```bash
# Check if running
ps aux | grep "next dev"

# Check logs
tail -50 /Users/akeilsmith/hive-1/hive-platform/frontend.log

# Restart
pkill -f "next dev"
cd /Users/akeilsmith/hive-1/hive-platform
npm run dev > frontend.log 2>&1 &
```

### Backend not responding
```bash
# Check if running
ps aux | grep "tsx watch"

# Check logs
tail -50 /Users/akeilsmith/hive-1/backend/backend.log

# Restart
pkill -f "tsx watch src/server.ts"
cd /Users/akeilsmith/hive-1/backend
npm run dev > backend.log 2>&1 &
```

### Docker services not running
```bash
cd /Users/akeilsmith/hive-1/backend
docker-compose ps
docker-compose up -d
```

---

## Next Steps

1. **Open the app:** http://localhost:3000
2. **Sign up** with any email/password
3. **Explore** the platform features
4. **Check logs** if you encounter any issues

Everything is running and ready to use! 🎉
