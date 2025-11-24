# AWS Deployment Guide for Hive Platform

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [AWS Services Overview](#aws-services-overview)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Current Architecture
- **Frontend**: Next.js 16 application (hive-platform)
- **Backend**: Fastify API server (backend)
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis 7
- **File Storage**: S3-compatible (MinIO locally, AWS S3 in production)
- **Real-time**: WebSocket support via Socket.io

### AWS Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                            │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   CloudFront │      │  Route 53    │                    │
│  │   (CDN)      │◄─────│  (DNS)       │                    │
│  └──────┬───────┘      └──────────────┘                    │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Application Load Balancer (ALB)              │   │
│  └───────┬──────────────────────┬───────────────────────┘   │
│          │                      │                            │
│          ▼                      ▼                            │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   ECS Fargate│      │   ECS Fargate│                    │
│  │   Frontend   │      │   Backend    │                    │
│  │   (Next.js)  │      │   (Fastify)  │                    │
│  └──────────────┘      └──────┬───────┘                    │
│                                │                            │
│                                ▼                            │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   RDS        │      │  ElastiCache  │      │   S3     │ │
│  │  PostgreSQL  │      │    Redis     │      │  Bucket  │ │
│  │  (pgvector)  │      │              │      │          │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Secrets     │      │  CloudWatch  │                    │
│  │  Manager     │      │  (Logs)      │                    │
│  └──────────────┘      └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Service Mapping
- **Frontend**: AWS Amplify or ECS Fargate with Next.js
- **Backend API**: ECS Fargate with Fastify
- **Database**: Amazon RDS PostgreSQL 16 with pgvector extension
- **Cache**: Amazon ElastiCache for Redis
- **File Storage**: Amazon S3
- **DNS**: Amazon Route 53
- **CDN**: Amazon CloudFront
- **SSL/TLS**: AWS Certificate Manager (ACM)
- **Secrets**: AWS Secrets Manager
- **Monitoring**: Amazon CloudWatch

---

## Prerequisites

### 1. AWS Account Setup
- Active AWS account with admin access
- AWS CLI installed and configured
- AWS credentials configured (`aws configure`)

### 2. Local Requirements
- Node.js 20+ installed
- Docker Desktop installed (for building images)
- Git installed
- AWS CLI v2 installed

### 3. AWS CLI Installation
```bash
# macOS
brew install awscli

# Verify installation
aws --version

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### 4. Docker Installation
```bash
# Verify Docker is running
docker --version
docker ps
```

### 5. Required AWS Services Access
Ensure your AWS account has access to:
- ECS (Elastic Container Service)
- RDS (Relational Database Service)
- ElastiCache
- S3
- Secrets Manager
- CloudWatch
- IAM (for creating roles)
- VPC (Virtual Private Cloud)
- EC2 (for NAT Gateway if needed)
- Route 53 (optional, for custom domain)
- CloudFront (optional, for CDN)
- ACM (for SSL certificates)

---

## AWS Services Overview

### 1. Amazon ECS (Elastic Container Service)
- **Purpose**: Run containerized applications
- **Type**: Fargate (serverless, no EC2 management)
- **Why**: Easy scaling, no server management, pay per use

### 2. Amazon RDS PostgreSQL
- **Purpose**: Managed PostgreSQL database
- **Version**: PostgreSQL 16
- **Extension**: pgvector (for vector embeddings)
- **Why**: Managed backups, automatic updates, high availability

### 3. Amazon ElastiCache for Redis
- **Purpose**: In-memory caching and session storage
- **Why**: Fast, managed, scalable Redis

### 4. Amazon S3
- **Purpose**: File storage (artifacts, uploads)
- **Why**: Durable, scalable, cost-effective

### 5. AWS Secrets Manager
- **Purpose**: Store sensitive configuration (API keys, DB passwords)
- **Why**: Secure, encrypted, automatic rotation support

### 6. Amazon CloudWatch
- **Purpose**: Logging and monitoring
- **Why**: Centralized logs, metrics, alarms

### 7. Application Load Balancer (ALB)
- **Purpose**: Distribute traffic to ECS tasks
- **Why**: Health checks, SSL termination, routing

---

## Step-by-Step Deployment

### Phase 1: Prepare AWS Infrastructure

#### Step 1.1: Create VPC and Networking
**Action**: Create VPC with public and private subnets

**In AWS Console:**
1. Go to **VPC Dashboard** → **Create VPC**
2. Choose **VPC and more**
3. Configure:
   - **Name**: `hive-platform-vpc`
   - **IPv4 CIDR**: `10.0.0.0/16`
   - **Number of Availability Zones**: 2 (for high availability)
   - **Number of public subnets**: 2
   - **Number of private subnets**: 2
   - **NAT gateways**: 1 per AZ (or 1 for cost savings)
   - **VPC endpoints**: None (we'll add S3 endpoint later)
4. Click **Create VPC**

**Note**: This will create:
- 1 VPC
- 2 Public subnets (for ALB)
- 2 Private subnets (for ECS tasks)
- 2 NAT Gateways (for outbound internet from private subnets)
- Internet Gateway
- Route tables

**Estimated Cost**: ~$45/month (NAT Gateways are the main cost)

**Alternative (Cost-Saving)**: Create VPC with 1 NAT Gateway in 1 AZ only (~$32/month)

#### Step 1.2: Create Security Groups
**Action**: Create security groups for ALB, ECS tasks, RDS, and Redis

**In AWS Console:**
1. Go to **VPC Dashboard** → **Security Groups**

**Create ALB Security Group:**
- **Name**: `hive-alb-sg`
- **Description**: Security group for Application Load Balancer
- **Inbound Rules**:
  - Type: HTTP, Port: 80, Source: 0.0.0.0/0
  - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
- **Outbound Rules**: Allow all

**Create ECS Tasks Security Group:**
- **Name**: `hive-ecs-tasks-sg`
- **Description**: Security group for ECS tasks
- **Inbound Rules**:
  - Type: Custom TCP, Port: 3000, Source: `hive-alb-sg` (reference ALB SG)
  - Type: Custom TCP, Port: 3001, Source: `hive-alb-sg`
- **Outbound Rules**: Allow all

**Create RDS Security Group:**
- **Name**: `hive-rds-sg`
- **Description**: Security group for RDS PostgreSQL
- **Inbound Rules**:
  - Type: PostgreSQL, Port: 5432, Source: `hive-ecs-tasks-sg`
- **Outbound Rules**: None

**Create ElastiCache Security Group:**
- **Name**: `hive-redis-sg`
- **Description**: Security group for ElastiCache Redis
- **Inbound Rules**:
  - Type: Custom TCP, Port: 6379, Source: `hive-ecs-tasks-sg`
- **Outbound Rules**: None

#### Step 1.3: Create RDS PostgreSQL Database
**Action**: Create RDS PostgreSQL instance with pgvector

**In AWS Console:**
1. Go to **RDS Dashboard** → **Create database**
2. Choose **Standard create**
3. **Engine options**:
   - Engine: **PostgreSQL**
   - Version: **16.x** (latest)
   - Templates: **Production** (or **Free tier** for testing)
4. **Settings**:
   - DB instance identifier: `hive-postgres`
   - Master username: `postgres`
   - Master password: **Generate strong password** (save it!)
5. **Instance configuration**:
   - DB instance class: `db.t3.micro` (free tier) or `db.t3.small` (production)
6. **Storage**:
   - Storage type: **General Purpose SSD (gp3)**
   - Allocated storage: 20 GB (minimum)
   - Enable storage autoscaling: Yes
7. **Connectivity**:
   - VPC: Select `hive-platform-vpc`
   - Subnet group: Create new or use default
   - Public access: **No** (private subnet only)
   - VPC security group: Choose existing → `hive-rds-sg`
   - Availability Zone: No preference
8. **Database authentication**: Password authentication
9. **Additional configuration**:
   - Initial database name: `hive_prod`
   - DB parameter group: Create new (we'll modify for pgvector)
   - Enable automated backups: Yes
   - Backup retention: 7 days
10. Click **Create database**

**Wait for database to be available** (10-15 minutes)

**Enable pgvector Extension:**
1. Once database is available, go to **RDS Dashboard** → **Parameter groups**
2. Find your parameter group → **Edit**
3. Search for `shared_preload_libraries`
4. Set value to: `pgvector`
5. Save changes
6. Go back to your database → **Modify**
7. Change **DB parameter group** to the one you just edited
8. Apply changes immediately
9. **Reboot the database** (this is required for pgvector to load)

**After reboot, connect and enable extension:**
```sql
-- Connect using AWS RDS Query Editor or psql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Save Database Endpoint**: Note the endpoint (e.g., `hive-postgres.xxxxx.us-east-1.rds.amazonaws.com`)

#### Step 1.4: Create ElastiCache Redis Cluster
**Action**: Create Redis cluster for caching

**In AWS Console:**
1. Go to **ElastiCache Dashboard** → **Create cluster**
2. Choose **Redis**
3. **Cluster settings**:
   - Name: `hive-redis`
   - Description: Redis cache for Hive Platform
   - Engine version: **7.x** (latest)
   - Port: 6379
   - Node type: `cache.t3.micro` (free tier) or `cache.t3.small`
   - Number of replicas: 0 (for cost savings) or 1 (for HA)
4. **Subnet and security**:
   - VPC: `hive-platform-vpc`
   - Subnet group: Create new or use default
   - Security groups: `hive-redis-sg`
   - Availability zones: No preference
5. **Backup**: Enable if needed
6. Click **Create**

**Save Redis Endpoint**: Note the endpoint (e.g., `hive-redis.xxxxx.cache.amazonaws.com:6379`)

#### Step 1.5: Create S3 Bucket
**Action**: Create S3 bucket for file storage

**In AWS Console:**
1. Go to **S3 Dashboard** → **Create bucket**
2. **General configuration**:
   - Bucket name: `hive-platform-artifacts-[your-unique-id]` (must be globally unique)
   - AWS Region: Same as your other resources
3. **Object Ownership**: ACLs disabled (recommended)
4. **Block Public Access**: Keep all enabled (we'll use presigned URLs)
5. **Bucket Versioning**: Enable (optional, for backup)
6. **Default encryption**: Enable (SSE-S3 or SSE-KMS)
7. Click **Create bucket**

**Save Bucket Name**: Note the bucket name

#### Step 1.6: Create IAM Roles
**Action**: Create IAM roles for ECS tasks

**In AWS Console:**
1. Go to **IAM Dashboard** → **Roles** → **Create role**
2. **Trust entity**: AWS service → **ECS** → **ECS task**
3. **Permissions**: Create new policy with:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::hive-platform-artifacts-*/*",
        "arn:aws:s3:::hive-platform-artifacts-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```
4. Name the policy: `HivePlatformECSTaskPolicy`
5. Attach to role
6. Name the role: `HivePlatformECSTaskRole`

**Create ECS Execution Role:**
1. Create another role: **ECS** → **ECS task**
2. Attach managed policy: `AmazonECSTaskExecutionRolePolicy`
3. Add Secrets Manager access (same as above)
4. Name: `HivePlatformECSExecutionRole`

#### Step 1.7: Store Secrets in Secrets Manager
**Action**: Store sensitive configuration

**In AWS Console:**
1. Go to **Secrets Manager** → **Store a new secret**
2. **Secret type**: Other type of secret
3. **Key/value pairs**:
```json
{
  "JWT_SECRET": "your-super-secret-jwt-key-at-least-32-characters-long",
  "OPENAI_API_KEY": "sk-your-openai-api-key",
  "DATABASE_PASSWORD": "your-rds-master-password",
  "REDIS_PASSWORD": ""  // If Redis has auth enabled
}
```
4. **Secret name**: `hive-platform/secrets`
5. Click **Store**

**Note**: You'll reference this secret in ECS task definitions.

---

### Phase 2: Build and Push Docker Images

#### Step 2.1: Create Dockerfiles

**Backend Dockerfile** (already created in `backend/Dockerfile`):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**Frontend Dockerfile** (already created in `hive-platform/Dockerfile`):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

#### Step 2.2: Create ECR Repositories
**Action**: Create ECR repositories for Docker images

**In AWS Console:**
1. Go to **ECR Dashboard** → **Create repository**
2. **Visibility**: Private
3. **Repository name**: `hive-platform-backend`
4. Click **Create repository**
5. Repeat for: `hive-platform-frontend`

**Or use AWS CLI:**
```bash
aws ecr create-repository --repository-name hive-platform-backend --region us-east-1
aws ecr create-repository --repository-name hive-platform-frontend --region us-east-1
```

#### Step 2.3: Build and Push Images
**Action**: Build Docker images and push to ECR

**Commands to run:**
```bash
# Get AWS account ID and region
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
cd backend
docker build -t hive-platform-backend .
docker tag hive-platform-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest

# Build and push frontend
cd ../hive-platform
docker build -t hive-platform-frontend .
docker tag hive-platform-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest
```

**Save Image URIs**: Note the full image URIs for use in ECS task definitions.

---

### Phase 3: Create ECS Cluster and Services

#### Step 3.1: Create ECS Cluster
**Action**: Create ECS Fargate cluster

**In AWS Console:**
1. Go to **ECS Dashboard** → **Clusters** → **Create cluster**
2. **Cluster configuration**:
   - Cluster name: `hive-platform-cluster`
   - Infrastructure: **AWS Fargate (serverless)**
3. Click **Create**

#### Step 3.2: Create Task Definitions

**Backend Task Definition:**
1. Go to **ECS Dashboard** → **Task definitions** → **Create new task definition**
2. **Task definition family**: `hive-platform-backend`
3. **Launch type**: Fargate
4. **Task size**:
   - CPU: 0.5 vCPU (512)
   - Memory: 1 GB
5. **Task role**: `HivePlatformECSTaskRole`
6. **Task execution role**: `HivePlatformECSExecutionRole`
7. **Container definitions** → **Add container**:
   - **Container name**: `backend`
   - **Image URI**: `[YOUR_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-backend:latest`
   - **Port mappings**: 3001 (TCP)
   - **Environment variables**:
     ```
     NODE_ENV=production
     PORT=3001
     CORS_ORIGIN=https://your-domain.com
     DATABASE_URL=postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod
     REDIS_URL=redis://[REDIS_ENDPOINT]:6379
     S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
     S3_ACCESS_KEY_ID=[FROM_SECRETS]
     S3_SECRET_ACCESS_KEY=[FROM_SECRETS]
     S3_BUCKET=hive-platform-artifacts-[ID]
     S3_REGION=us-east-1
     S3_FORCE_PATH_STYLE=false
     OPENAI_API_KEY=[FROM_SECRETS]
     OPENAI_MODEL=gpt-4-turbo-preview
     OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
     JWT_SECRET=[FROM_SECRETS]
     JWT_EXPIRES_IN=24h
     USE_REAL_AI=true
     DRY_RUN_APPLY=false
     LOG_LEVEL=info
     ENABLE_TELEMETRY=false
     ```
   - **Secrets** (from Secrets Manager):
     - `JWT_SECRET` → `hive-platform/secrets:JWT_SECRET`
     - `OPENAI_API_KEY` → `hive-platform/secrets:OPENAI_API_KEY`
     - `DATABASE_PASSWORD` → `hive-platform/secrets:DATABASE_PASSWORD`
   - **Logging**: CloudWatch Logs
     - Log group: `/ecs/hive-platform-backend`
     - Log stream prefix: `backend`
8. Click **Create**

**Frontend Task Definition:**
1. Create new task definition: `hive-platform-frontend`
2. Same settings as backend, but:
   - **Container name**: `frontend`
   - **Image URI**: Frontend image
   - **Port mappings**: 3000 (TCP)
   - **Environment variables**:
     ```
     NODE_ENV=production
     PORT=3000
     NEXT_PUBLIC_API_URL=https://api.your-domain.com
     ```
3. Click **Create**

#### Step 3.3: Create Application Load Balancer
**Action**: Create ALB to route traffic

**In AWS Console:**
1. Go to **EC2 Dashboard** → **Load Balancers** → **Create load balancer**
2. **Load balancer type**: Application Load Balancer
3. **Basic configuration**:
   - Name: `hive-platform-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4
4. **Network mapping**:
   - VPC: `hive-platform-vpc`
   - Availability Zones: Select both public subnets
5. **Security groups**: `hive-alb-sg`
6. **Listeners and routing**:
   - Protocol: HTTP, Port: 80
   - Default action: Create new target group (we'll configure later)
7. Click **Create load balancer**

**Wait for ALB to be active** (2-3 minutes)

**Save ALB DNS name**: Note the DNS name (e.g., `hive-platform-alb-xxxxx.us-east-1.elb.amazonaws.com`)

#### Step 3.4: Create Target Groups
**Action**: Create target groups for backend and frontend

**Backend Target Group:**
1. Go to **EC2 Dashboard** → **Target Groups** → **Create target group**
2. **Target type**: IP addresses
3. **Target group name**: `hive-platform-backend-tg`
4. **Protocol**: HTTP, Port: 3001
5. **VPC**: `hive-platform-vpc`
6. **Health checks**:
   - Health check path: `/health`
   - Advanced: Healthy threshold: 2, Unhealthy threshold: 3
7. Click **Next** → **Create target group**

**Frontend Target Group:**
1. Create another target group: `hive-platform-frontend-tg`
2. Port: 3000
3. Health check path: `/`
4. Click **Create**

#### Step 3.5: Create ECS Services
**Action**: Create ECS services to run tasks

**Backend Service:**
1. Go to **ECS Dashboard** → **Clusters** → `hive-platform-cluster` → **Services** → **Create**
2. **Service configuration**:
   - Launch type: Fargate
   - Task definition: `hive-platform-backend:1`
   - Service name: `hive-platform-backend-service`
   - Number of tasks: 1 (or 2 for HA)
3. **Networking**:
   - VPC: `hive-platform-vpc`
   - Subnets: Select private subnets
   - Security groups: `hive-ecs-tasks-sg`
   - Auto-assign public IP: Disabled (using NAT Gateway)
4. **Load balancing**:
   - Load balancer type: Application Load Balancer
   - Load balancer: `hive-platform-alb`
   - Target group: `hive-platform-backend-tg`
   - Container to load balance: `backend:3001`
5. Click **Create**

**Frontend Service:**
1. Create another service: `hive-platform-frontend-service`
2. Task definition: `hive-platform-frontend:1`
3. Target group: `hive-platform-frontend-tg`
4. Port: 3000
5. Click **Create**

#### Step 3.6: Configure ALB Listeners
**Action**: Configure ALB to route traffic

**In AWS Console:**
1. Go to **EC2 Dashboard** → **Load Balancers** → `hive-platform-alb` → **Listeners**
2. **Edit HTTP listener (port 80)**:
   - Default action: Forward to `hive-platform-frontend-tg`
   - Add rule:
     - **IF**: Path is `/api/*`
     - **THEN**: Forward to `hive-platform-backend-tg`
     - Priority: 100
   - Add rule:
     - **IF**: Path is `/health`
     - **THEN**: Forward to `hive-platform-backend-tg`
     - Priority: 200

**Test the setup:**
```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers --names hive-platform-alb --query 'LoadBalancers[0].DNSName' --output text)

# Test frontend
curl http://$ALB_DNS/

# Test backend health
curl http://$ALB_DNS/health

# Test API
curl http://$ALB_DNS/api/health
```

---

### Phase 4: Run Database Migrations

#### Step 4.1: Run Migrations from Local Machine
**Action**: Connect to RDS and run migrations

**Option 1: Using ECS Task (Recommended)**
1. Create a one-off ECS task with migration script
2. Or use AWS Systems Manager Session Manager

**Option 2: From Local Machine (Temporary)**
```bash
# Temporarily allow your IP in RDS security group
# Then connect and run migrations

# Set environment variables
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod"

# Run migrations
cd backend
npm install
npm run migrate
```

**Option 3: Create Migration Task in ECS**
1. Create a task definition for migrations
2. Run as one-off task
3. Use the same image as backend but override command:
   ```json
   "command": ["node", "dist/infra/db/migrate.js", "up"]
   ```

---

### Phase 5: Configure SSL/TLS and Custom Domain (Optional)

#### Step 5.1: Request SSL Certificate
**Action**: Request SSL certificate from ACM

**In AWS Console:**
1. Go to **Certificate Manager** → **Request certificate**
2. **Domain names**:
   - Domain: `your-domain.com`
   - Additional names: `api.your-domain.com`, `www.your-domain.com`
3. **Validation method**: DNS validation (recommended)
4. Click **Request**
5. **Validate**: Add CNAME records to your DNS provider

#### Step 5.2: Configure HTTPS Listener
**Action**: Add HTTPS listener to ALB

**In AWS Console:**
1. Go to **EC2 Dashboard** → **Load Balancers** → `hive-platform-alb` → **Listeners** → **Add listener**
2. **Protocol**: HTTPS, Port: 443
3. **Default SSL certificate**: Select your ACM certificate
4. **Default action**: Forward to `hive-platform-frontend-tg`
5. **Rules**: Same as HTTP listener
6. Click **Save**

#### Step 5.3: Configure Route 53 (Optional)
**Action**: Point domain to ALB

**In AWS Console:**
1. Go to **Route 53** → **Hosted zones** → Your domain
2. **Create record**:
   - Record name: `@` (root) or `www`
   - Record type: A
   - Alias: Yes
   - Alias target: Application Load Balancer → Select your ALB
3. **Create API subdomain**:
   - Record name: `api`
   - Same settings as above
4. Click **Create records**

---

## Post-Deployment Configuration

### 1. Update Frontend Environment Variables
Update the frontend to use the production API URL:
```bash
# In ECS task definition or environment variables
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 2. Configure CORS
Update backend CORS origin:
```bash
CORS_ORIGIN=https://your-domain.com
```

### 3. Set Up CloudWatch Alarms
**Action**: Create alarms for monitoring

**In AWS Console:**
1. Go to **CloudWatch** → **Alarms** → **Create alarm**
2. **Metric**: ECS → CPUUtilization
3. **Threshold**: > 80%
4. **Actions**: Send notification to SNS topic
5. Repeat for MemoryUtilization, ALB 5xx errors, RDS connections

### 4. Enable Auto Scaling
**Action**: Configure auto scaling for ECS services

**In AWS Console:**
1. Go to **ECS Dashboard** → **Services** → Select service → **Auto Scaling**
2. **Configure**:
   - Min capacity: 1
   - Max capacity: 10
   - Target tracking: CPU 70%
3. Click **Save**

### 5. Set Up Backup Strategy
- **RDS**: Automated backups enabled (7-day retention)
- **S3**: Versioning enabled
- **Consider**: AWS Backup for cross-region backups

---

## Monitoring and Maintenance

### CloudWatch Logs
- **Backend logs**: `/ecs/hive-platform-backend`
- **Frontend logs**: `/ecs/hive-platform-frontend`
- **View logs**: CloudWatch → Log groups → Select log group

### Key Metrics to Monitor
1. **ECS**:
   - CPUUtilization
   - MemoryUtilization
   - Running task count
2. **ALB**:
   - TargetResponseTime
   - HTTPCode_Target_5XX_Count
   - HealthyHostCount
3. **RDS**:
   - CPUUtilization
   - DatabaseConnections
   - FreeableMemory
4. **ElastiCache**:
   - CPUUtilization
   - CacheHits
   - CacheMisses

### Cost Optimization Tips
1. **Use Reserved Instances** for RDS (if committed)
2. **Use NAT Gateway in 1 AZ** (if high availability not critical)
3. **Enable RDS automated backups** only during business hours
4. **Use S3 Intelligent-Tiering** for file storage
5. **Set up CloudWatch billing alarms**

---

## Troubleshooting

### Common Issues

#### 1. ECS Tasks Not Starting
**Symptoms**: Tasks stuck in PENDING
**Solutions**:
- Check IAM roles have correct permissions
- Verify security groups allow traffic
- Check CloudWatch logs for errors
- Ensure task has enough CPU/memory

#### 2. Cannot Connect to RDS
**Symptoms**: Database connection timeouts
**Solutions**:
- Verify RDS security group allows traffic from ECS security group
- Check RDS is in private subnet
- Verify DATABASE_URL is correct
- Check RDS is not in "modifying" state

#### 3. ALB Health Checks Failing
**Symptoms**: Targets showing as unhealthy
**Solutions**:
- Verify health check path is correct (`/health` for backend, `/` for frontend)
- Check security groups allow ALB → ECS traffic
- Verify containers are listening on correct ports
- Check CloudWatch logs for application errors

#### 4. pgvector Extension Not Working
**Symptoms**: `CREATE EXTENSION vector` fails
**Solutions**:
- Verify parameter group has `shared_preload_libraries = 'pgvector'`
- Reboot RDS instance after changing parameter group
- Check RDS logs for errors

#### 5. High Costs
**Symptoms**: Unexpected AWS bills
**Solutions**:
- Review NAT Gateway usage (biggest cost)
- Check for orphaned resources
- Use Cost Explorer to identify spending
- Consider using Spot instances for non-critical workloads

### Useful Commands

```bash
# View ECS task logs
aws logs tail /ecs/hive-platform-backend --follow

# Describe ECS service
aws ecs describe-services --cluster hive-platform-cluster --services hive-platform-backend-service

# List running tasks
aws ecs list-tasks --cluster hive-platform-cluster --service-name hive-platform-backend-service

# Get task details
aws ecs describe-tasks --cluster hive-platform-cluster --tasks [TASK_ARN]

# Test database connection
psql "postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod"

# Test Redis connection
redis-cli -h [REDIS_ENDPOINT] -p 6379 ping
```

---

## Next Steps

1. **Set up CI/CD**: Use AWS CodePipeline or GitHub Actions
2. **Add monitoring**: Set up CloudWatch dashboards
3. **Implement caching**: Use CloudFront for static assets
4. **Add WAF**: Protect against common attacks
5. **Set up disaster recovery**: Cross-region backups
6. **Optimize performance**: Enable compression, caching headers
7. **Security hardening**: Enable MFA, use least privilege IAM

---

## Estimated Monthly Costs

**Small Scale (Development/Testing)**:
- RDS db.t3.micro: ~$15/month
- ElastiCache cache.t3.micro: ~$12/month
- ECS Fargate (2 tasks, 0.5 vCPU, 1GB): ~$30/month
- ALB: ~$20/month
- NAT Gateway (1): ~$32/month
- S3 storage (10GB): ~$0.25/month
- Data transfer: ~$10/month
- **Total: ~$120/month**

**Production Scale (2 tasks, HA)**:
- RDS db.t3.small: ~$30/month
- ElastiCache cache.t3.small: ~$24/month
- ECS Fargate (4 tasks): ~$60/month
- ALB: ~$20/month
- NAT Gateway (2): ~$64/month
- S3 storage (100GB): ~$2.50/month
- Data transfer: ~$50/month
- **Total: ~$250/month**

**Note**: Costs vary by region and usage. Use AWS Pricing Calculator for accurate estimates.

---

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/
- **RDS PostgreSQL**: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html
- **AWS Support**: https://aws.amazon.com/support/

---

**Last Updated**: 2025-01-XX
**Version**: 1.0

