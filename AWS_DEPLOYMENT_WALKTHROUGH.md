# AWS Deployment Walkthrough

This document provides a step-by-step walkthrough of deploying the Hive Platform to AWS. Follow this guide sequentially.

## Prerequisites

Before starting, ensure you have:

1. ✅ AWS account with admin access
2. ✅ AWS CLI installed (`aws --version`)
3. ✅ AWS CLI configured (`aws configure`)
4. ✅ Docker Desktop installed and running
5. ✅ Node.js 20+ installed

## Step 1: Understand Your Architecture

### Current Local Setup
- **Frontend**: Next.js app running on `http://localhost:3000`
- **Backend**: Fastify API running on `http://localhost:3001`
- **Database**: PostgreSQL 16 (Docker) on port 5432
- **Redis**: Redis 7 (Docker) on port 6379
- **Storage**: MinIO (Docker) on port 9000

### AWS Target Setup
- **Frontend**: ECS Fargate → ALB → Internet
- **Backend**: ECS Fargate → ALB → Internet
- **Database**: RDS PostgreSQL 16 (managed)
- **Redis**: ElastiCache Redis 7 (managed)
- **Storage**: S3 (managed)

## Step 2: Set Up AWS Infrastructure (Console)

### 2.1 Create VPC and Networking

**Go to**: VPC Dashboard → Create VPC

**Configuration**:
- ✅ VPC and more
- Name: `hive-platform-vpc`
- IPv4 CIDR: `10.0.0.0/16`
- Number of Availability Zones: **2**
- Number of public subnets: **2**
- Number of private subnets: **2**
- NAT gateways: **1 per AZ** (or 1 total for cost savings)
- VPC endpoints: None

**Click**: Create VPC

**Wait**: ~2 minutes for creation

**Note**: This creates:
- 1 VPC
- 2 Public subnets (for ALB)
- 2 Private subnets (for ECS tasks)
- 1-2 NAT Gateways
- Internet Gateway
- Route tables

### 2.2 Create Security Groups

**Go to**: VPC Dashboard → Security Groups → Create security group

#### ALB Security Group
- Name: `hive-alb-sg`
- Description: Security group for Application Load Balancer
- VPC: `hive-platform-vpc`
- **Inbound Rules**:
  - Type: HTTP, Port: 80, Source: 0.0.0.0/0
  - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
- **Outbound Rules**: Allow all

#### ECS Tasks Security Group
- Name: `hive-ecs-tasks-sg`
- Description: Security group for ECS tasks
- VPC: `hive-platform-vpc`
- **Inbound Rules**:
  - Type: Custom TCP, Port: 3000, Source: `hive-alb-sg` (select from dropdown)
  - Type: Custom TCP, Port: 3001, Source: `hive-alb-sg`
- **Outbound Rules**: Allow all

#### RDS Security Group
- Name: `hive-rds-sg`
- Description: Security group for RDS PostgreSQL
- VPC: `hive-platform-vpc`
- **Inbound Rules**:
  - Type: PostgreSQL, Port: 5432, Source: `hive-ecs-tasks-sg`
- **Outbound Rules**: None

#### Redis Security Group
- Name: `hive-redis-sg`
- Description: Security group for ElastiCache Redis
- VPC: `hive-platform-vpc`
- **Inbound Rules**:
  - Type: Custom TCP, Port: 6379, Source: `hive-ecs-tasks-sg`
- **Outbound Rules**: None

### 2.3 Create RDS PostgreSQL Database

**Go to**: RDS Dashboard → Create database

**Configuration**:
- ✅ Standard create
- Engine: **PostgreSQL**
- Version: **16.x** (latest)
- Templates: **Free tier** (for testing) or **Production** (for production)
- DB instance identifier: `hive-postgres`
- Master username: `postgres`
- Master password: **Generate strong password** (save it!)
- DB instance class: `db.t3.micro` (free tier) or `db.t3.small`
- Storage: 20 GB, General Purpose SSD (gp3)
- ✅ Enable storage autoscaling
- VPC: `hive-platform-vpc`
- Subnet group: Create new or use default
- Public access: **No**
- VPC security group: Choose existing → `hive-rds-sg`
- Initial database name: `hive_prod`
- ✅ Enable automated backups (7 days retention)

**Click**: Create database

**Wait**: 10-15 minutes for database to be available

**After creation**:
1. Note the **Endpoint** (e.g., `hive-postgres.xxxxx.us-east-1.rds.amazonaws.com`)
2. **Enable pgvector extension**:
   - Go to RDS → Parameter groups → Create parameter group
   - Family: `postgres16`
   - Name: `hive-postgres-pgvector`
   - Edit parameter: `shared_preload_libraries` = `pgvector`
   - Save
   - Go back to database → Modify
   - Change DB parameter group to `hive-postgres-pgvector`
   - Apply immediately
   - **Reboot database** (required for pgvector)
   - After reboot, connect and run: `CREATE EXTENSION IF NOT EXISTS vector;`

### 2.4 Create ElastiCache Redis

**Go to**: ElastiCache Dashboard → Create cluster

**Configuration**:
- Cluster type: **Redis**
- Name: `hive-redis`
- Description: Redis cache for Hive Platform
- Engine version: **7.x** (latest)
- Port: 6379
- Node type: `cache.t3.micro` (free tier) or `cache.t3.small`
- Number of replicas: 0 (or 1 for HA)
- Subnet group: Create new or use default (use private subnets)
- VPC: `hive-platform-vpc`
- Security groups: `hive-redis-sg`
- ✅ Enable automatic backups (optional)

**Click**: Create

**Wait**: 5-10 minutes

**After creation**: Note the **Primary endpoint**

### 2.5 Create S3 Bucket

**Go to**: S3 Dashboard → Create bucket

**Configuration**:
- Bucket name: `hive-platform-artifacts-[your-unique-id]` (must be globally unique)
- AWS Region: Same as your other resources
- Object Ownership: ACLs disabled (recommended)
- Block Public Access: ✅ Keep all enabled
- Bucket Versioning: Enable (optional)
- Default encryption: ✅ Enable (SSE-S3)

**Click**: Create bucket

**Note**: Save the bucket name

### 2.6 Create IAM Roles

**Go to**: IAM Dashboard → Roles → Create role

#### ECS Task Role
- Trust entity: AWS service → **ECS** → **ECS task**
- Permissions: Create new policy
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
- Policy name: `HivePlatformECSTaskPolicy`
- Role name: `HivePlatformECSTaskRole`

#### ECS Execution Role
- Trust entity: AWS service → **ECS** → **ECS task**
- Permissions:
  - ✅ `AmazonECSTaskExecutionRolePolicy` (managed policy)
  - Add Secrets Manager access (same as above)
- Role name: `HivePlatformECSExecutionRole`

### 2.7 Store Secrets in Secrets Manager

**Go to**: Secrets Manager → Store a new secret

**Configuration**:
- Secret type: Other type of secret
- Key/value pairs:
  ```json
  {
    "JWT_SECRET": "generate-a-random-32-character-secret-here",
    "OPENAI_API_KEY": "sk-your-openai-api-key-here",
    "DATABASE_PASSWORD": "your-rds-master-password-here"
  }
  ```
- Secret name: `hive-platform/secrets`

**Click**: Store

**Note**: Save the secret ARN (you'll need it for task definitions)

## Step 3: Build and Push Docker Images

### 3.1 Create ECR Repositories

**Option 1: Using AWS Console**
- Go to: ECR Dashboard → Create repository
- Name: `hive-platform-backend`
- Visibility: Private
- Click: Create repository
- Repeat for: `hive-platform-frontend`

**Option 2: Using AWS CLI**
```bash
aws ecr create-repository --repository-name hive-platform-backend --region us-east-1
aws ecr create-repository --repository-name hive-platform-frontend --region us-east-1
```

### 3.2 Build and Push Images

**Run the deployment script**:
```bash
cd /Users/akeilsmith/hive-1
./scripts/aws-deploy.sh
```

This script will:
1. Check/create ECR repositories
2. Login to ECR
3. Build Docker images
4. Tag images
5. Push to ECR

**Or manually**:
```bash
# Get AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend
cd backend
docker build -t hive-platform-backend .
docker tag hive-platform-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest

# Build and push frontend
cd ../hive-platform
docker build -t hive-platform-frontend .
docker tag hive-platform-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest
```

**Note**: Save the image URIs for task definitions

## Step 4: Create ECS Resources

### 4.1 Create ECS Cluster

**Go to**: ECS Dashboard → Clusters → Create cluster

**Configuration**:
- Cluster name: `hive-platform-cluster`
- Infrastructure: **AWS Fargate (serverless)**

**Click**: Create

### 4.2 Create Task Definitions

**Go to**: ECS Dashboard → Task definitions → Create new task definition

#### Backend Task Definition

1. **Task definition family**: `hive-platform-backend`
2. **Launch type**: Fargate
3. **Task size**:
   - CPU: 0.5 vCPU (512)
   - Memory: 1 GB
4. **Task role**: `HivePlatformECSTaskRole`
5. **Task execution role**: `HivePlatformECSExecutionRole`
6. **Container definitions** → **Add container**:
   - Container name: `backend`
   - Image URI: `[YOUR_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-backend:latest`
   - Port mappings: 3001 (TCP)
   - **Environment variables** (add each):
     ```
     NODE_ENV=production
     PORT=3001
     CORS_ORIGIN=https://your-domain.com (or http://ALB-DNS for testing)
     DATABASE_URL=postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod
     REDIS_URL=redis://[REDIS_ENDPOINT]:6379
     S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
     S3_BUCKET=hive-platform-artifacts-[ID]
     S3_REGION=us-east-1
     S3_FORCE_PATH_STYLE=false
     OPENAI_MODEL=gpt-4-turbo-preview
     OPENAI_EMBEDDING_MODEL=text-embedding-ada-002
     JWT_EXPIRES_IN=24h
     USE_REAL_AI=true
     DRY_RUN_APPLY=false
     LOG_LEVEL=info
     ENABLE_TELEMETRY=false
     ```
   - **Secrets** (add each):
     - `JWT_SECRET` → `arn:aws:secretsmanager:us-east-1:[ACCOUNT_ID]:secret:hive-platform/secrets:JWT_SECRET::`
     - `OPENAI_API_KEY` → `arn:aws:secretsmanager:us-east-1:[ACCOUNT_ID]:secret:hive-platform/secrets:OPENAI_API_KEY::`
     - `DATABASE_PASSWORD` → `arn:aws:secretsmanager:us-east-1:[ACCOUNT_ID]:secret:hive-platform/secrets:DATABASE_PASSWORD::`
   - **Logging**: CloudWatch Logs
     - Log group: `/ecs/hive-platform-backend` (create if needed)
     - Log stream prefix: `backend`
     - Region: `us-east-1`
   - **Health check**:
     - Command: `CMD-SHELL,node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"`
     - Interval: 30
     - Timeout: 5
     - Retries: 3
     - Start period: 60

**Click**: Create

#### Frontend Task Definition

1. **Task definition family**: `hive-platform-frontend`
2. Same settings as backend, but:
   - Container name: `frontend`
   - Image URI: Frontend image
   - Port: 3000
   - Environment variables:
     ```
     NODE_ENV=production
     PORT=3000
     NEXT_PUBLIC_API_URL=https://api.your-domain.com (or http://ALB-DNS/api for testing)
     ```
   - Log group: `/ecs/hive-platform-frontend`
   - Health check: Port 3000, path `/`

**Click**: Create

### 4.3 Create Application Load Balancer

**Go to**: EC2 Dashboard → Load Balancers → Create load balancer

**Configuration**:
- Load balancer type: **Application Load Balancer**
- Name: `hive-platform-alb`
- Scheme: **Internet-facing**
- IP address type: IPv4
- Network mapping:
  - VPC: `hive-platform-vpc`
  - Availability Zones: Select both public subnets
- Security groups: `hive-alb-sg`
- Listeners and routing:
  - Protocol: HTTP, Port: 80
  - Default action: Create new target group (we'll configure later)

**Click**: Create load balancer

**Wait**: 2-3 minutes for ALB to be active

**Note**: Save the ALB DNS name

### 4.4 Create Target Groups

**Go to**: EC2 Dashboard → Target Groups → Create target group

#### Backend Target Group
- Target type: **IP addresses**
- Target group name: `hive-platform-backend-tg`
- Protocol: HTTP, Port: 3001
- VPC: `hive-platform-vpc`
- Health checks:
  - Health check path: `/health`
  - Advanced: Healthy threshold: 2, Unhealthy threshold: 3

**Click**: Next → Create target group

#### Frontend Target Group
- Target type: **IP addresses**
- Target group name: `hive-platform-frontend-tg`
- Protocol: HTTP, Port: 3000
- VPC: `hive-platform-vpc`
- Health checks:
  - Health check path: `/`
  - Advanced: Healthy threshold: 2, Unhealthy threshold: 3

**Click**: Next → Create target group

### 4.5 Create ECS Services

**Go to**: ECS Dashboard → Clusters → `hive-platform-cluster` → Services → Create

#### Backend Service
- Launch type: Fargate
- Task definition: `hive-platform-backend:1`
- Service name: `hive-platform-backend-service`
- Number of tasks: 1 (or 2 for HA)
- Networking:
  - VPC: `hive-platform-vpc`
  - Subnets: Select private subnets
  - Security groups: `hive-ecs-tasks-sg`
  - Auto-assign public IP: **Disabled**
- Load balancing:
  - Load balancer type: Application Load Balancer
  - Load balancer: `hive-platform-alb`
  - Target group: `hive-platform-backend-tg`
  - Container to load balance: `backend:3001`

**Click**: Create

**Wait**: 2-3 minutes for service to stabilize

#### Frontend Service
- Same settings, but:
  - Task definition: `hive-platform-frontend:1`
  - Service name: `hive-platform-frontend-service`
  - Target group: `hive-platform-frontend-tg`
  - Container: `frontend:3000`

**Click**: Create

### 4.6 Configure ALB Listeners

**Go to**: EC2 Dashboard → Load Balancers → `hive-platform-alb` → Listeners → Edit HTTP listener

**Default action**: Forward to `hive-platform-frontend-tg`

**Add rules**:
1. **Rule 1**:
   - IF: Path is `/api/*`
   - THEN: Forward to `hive-platform-backend-tg`
   - Priority: 100

2. **Rule 2**:
   - IF: Path is `/health`
   - THEN: Forward to `hive-platform-backend-tg`
   - Priority: 200

**Click**: Save

## Step 5: Run Database Migrations

### Option 1: From Local Machine (Temporary)

1. **Temporarily allow your IP** in RDS security group:
   - Go to RDS → Security groups → `hive-rds-sg`
   - Add inbound rule: PostgreSQL (5432) from your IP

2. **Run migrations**:
   ```bash
   export DATABASE_URL="postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod"
   cd backend
   npm install
   npm run migrate
   ```

3. **Remove temporary rule** from security group

### Option 2: Using ECS Task (Recommended)

Create a one-off ECS task with migration command (see full guide for details)

## Step 6: Test Deployment

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names hive-platform-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Test frontend
curl http://$ALB_DNS/

# Test backend health
curl http://$ALB_DNS/health

# Test API
curl http://$ALB_DNS/api/health
```

## Step 7: Verify Everything Works

1. ✅ ECS tasks are running (check ECS console)
2. ✅ Target groups show healthy targets
3. ✅ ALB responds to requests
4. ✅ Frontend loads in browser
5. ✅ Backend API responds
6. ✅ Database migrations applied
7. ✅ CloudWatch logs show application logs

## Next Steps

1. Set up SSL/TLS certificate (ACM)
2. Configure HTTPS listener
3. Set up Route 53 for custom domain
4. Configure CloudWatch alarms
5. Enable auto scaling
6. Set up CI/CD pipeline

## Troubleshooting

If something doesn't work:

1. **Check ECS task logs** in CloudWatch
2. **Verify security groups** allow traffic
3. **Check target group health** checks
4. **Verify environment variables** are correct
5. **Check IAM roles** have correct permissions

See `AWS_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.

---

**Congratulations!** Your Hive Platform is now deployed on AWS! 🎉

