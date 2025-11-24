# AWS Deployment - Code Steps (Terminal/Commands)

This document contains **ALL** the code and terminal commands you need to run. Follow these steps after completing the browser steps, or when indicated.

---

## Prerequisites Check

Before starting, verify you have everything installed:

```bash
# Check AWS CLI
aws --version
# Should show: aws-cli/2.x.x

# Check AWS configuration
aws sts get-caller-identity
# Should show your AWS account ID and user ARN

# Check Docker
docker --version
docker ps
# Docker should be running

# Check Node.js
node --version
# Should be 20.x or higher
```

If any of these fail, install/configure them first.

---

## SECTION 1: Build and Push Docker Images

### Step 1.1: Get AWS Account Information

```bash
# Get your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# Set your AWS region
export AWS_REGION=us-east-1  # Change if using different region
echo "AWS Region: $AWS_REGION"
```

**Note down** these values - you'll need them later.

---

### Step 1.2: Create ECR Repositories (If Not Done in Browser)

**Option A: Using AWS CLI (Recommended)**

```bash
# Create backend repository
aws ecr create-repository \
  --repository-name hive-platform-backend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

# Create frontend repository
aws ecr create-repository \
  --repository-name hive-platform-frontend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

# Verify repositories were created
aws ecr describe-repositories \
  --repository-names hive-platform-backend hive-platform-frontend \
  --region $AWS_REGION
```

**Option B: Using Browser**
- Go to ECR Dashboard → Create repository
- Create: `hive-platform-backend` and `hive-platform-frontend`

---

### Step 1.3: Login to ECR

```bash
# Login to Amazon ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Verify login (should show "Login Succeeded")
```

---

### Step 1.4: Build and Push Backend Image

```bash
# Navigate to project root
cd /Users/akeilsmith/hive-1

# Navigate to backend directory
cd backend

# Build Docker image
docker build -t hive-platform-backend .

# Tag image for ECR
docker tag hive-platform-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest

# Also tag with timestamp for versioning
docker tag hive-platform-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:$(date +%Y%m%d-%H%M%S)

# Push both tags
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:$(date +%Y%m%d-%H%M%S)

# Note down the image URI
echo "Backend Image URI: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-backend:latest"
```

**Expected output**: Images pushed successfully. Note the image URI for use in ECS task definitions.

---

### Step 1.5: Build and Push Frontend Image

```bash
# Navigate to frontend directory
cd ../hive-platform

# Build Docker image
docker build -t hive-platform-frontend .

# Tag image for ECR
docker tag hive-platform-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest

# Tag with timestamp
docker tag hive-platform-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:$(date +%Y%m%d-%H%M%S)

# Push both tags
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:$(date +%Y%m%d-%H%M%S)

# Note down the image URI
echo "Frontend Image URI: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/hive-platform-frontend:latest"
```

**Expected output**: Images pushed successfully.

---

### Step 1.6: Verify Images in ECR

```bash
# List backend images
aws ecr list-images \
  --repository-name hive-platform-backend \
  --region $AWS_REGION

# List frontend images
aws ecr list-images \
  --repository-name hive-platform-frontend \
  --region $AWS_REGION
```

You should see your images listed.

---

## 🛑 STOP HERE - SWITCH TO BROWSER STEPS

**You've completed building and pushing Docker images.**

**Now you need to:**
1. Create ECS cluster and services (browser steps)
2. Create Application Load Balancer (browser steps)
3. Configure everything in AWS Console

**Go to**: `AWS_DEPLOYMENT_BROWSER_STEPS.md` → **SECTION 2: ECS Setup**

After completing ECS setup in the browser, come back here for database migrations.

---

## SECTION 2: Database Migrations (After ECS Setup)

**Return here after completing ECS setup in browser steps**

### Step 2.1: Get Database Connection Information

You'll need to temporarily allow your IP address to connect to RDS.

**In Browser** (quick step):
1. Go to RDS Dashboard → Databases → `hive-postgres`
2. Click on **"VPC security group"** link (under Connectivity & security)
3. Click **"Edit inbound rules"**
4. Click **"Add rule"**:
   - Type: PostgreSQL
   - Port: 5432
   - Source: **My IP** (or your specific IP)
5. Click **"Save rules"**

**Get your IP**:
```bash
# Get your public IP
curl ifconfig.me
echo ""
```

---

### Step 2.2: Set Up Database Connection

```bash
# Get RDS endpoint (replace with your actual endpoint)
# You can find this in RDS Dashboard → Databases → hive-postgres → Endpoint
export RDS_ENDPOINT="hive-postgres.xxxxx.us-east-1.rds.amazonaws.com"

# Get database password from Secrets Manager
export DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id hive-platform/secrets \
  --region $AWS_REGION \
  --query SecretString \
  --output text | jq -r '.DATABASE_PASSWORD')

# Or if you saved it manually, set it directly:
# export DB_PASSWORD="your-password-here"

# Set database URL
export DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/hive_prod"

# Verify connection (optional - requires psql)
# psql "$DATABASE_URL" -c "SELECT version();"
```

---

### Step 2.3: Run Database Migrations

```bash
# Navigate to backend directory
cd /Users/akeilsmith/hive-1/backend

# Install dependencies (if not already installed)
npm install

# Run migrations
npm run migrate

# Expected output:
# Starting database migrations...
# Applying migration 001: initial_schema
# Migration 001 applied successfully
# ... (more migrations)
# Applied X migrations
```

**If migrations fail**, check:
- Database is accessible (security group allows your IP)
- DATABASE_URL is correct
- Database exists (`hive_prod`)
- User has proper permissions

---

### Step 2.4: Enable pgvector Extension

```bash
# Connect to database and enable extension
# Option 1: Using psql (if installed)
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Option 2: Using AWS RDS Query Editor
# Go to RDS Dashboard → Databases → hive-postgres → Query Editor
# Run: CREATE EXTENSION IF NOT EXISTS vector;

# Option 3: Using a temporary ECS task (advanced)
# See full guide for details
```

**Verify extension**:
```bash
# Check if extension is enabled
psql "$DATABASE_URL" -c "\dx" | grep vector
# Should show: vector | 0.5.0 | ...
```

---

### Step 2.5: Verify Database Setup

```bash
# Check tables were created
psql "$DATABASE_URL" -c "\dt"

# Should show tables like:
# - users
# - workspaces
# - channels
# - messages
# - etc.

# Check pgvector is working
psql "$DATABASE_URL" -c "SELECT vector('[1,2,3]'::float[]);"
# Should return: (1,2,3)
```

---

### Step 2.6: Remove Temporary Security Group Rule

**In Browser** (important for security):
1. Go to RDS Dashboard → Databases → `hive-postgres`
2. Click on **"VPC security group"** link
3. Click **"Edit inbound rules"**
4. Find the rule you added for your IP
5. Click **"Delete"**
6. Click **"Save rules"**

**Or using AWS CLI**:
```bash
# Get your security group ID (from browser or describe-security-groups)
export RDS_SG_ID="sg-xxxxx"  # Replace with actual SG ID

# Get your IP
export MY_IP=$(curl -s ifconfig.me)/32

# Remove the rule (replace with actual rule ID from security group)
# This is complex, so browser method is easier
```

---

## SECTION 3: Testing and Verification

### Step 3.1: Get ALB DNS Name

```bash
# Get ALB DNS name
export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names hive-platform-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"
```

---

### Step 3.2: Test Frontend

```bash
# Test frontend homepage
curl -I http://$ALB_DNS/

# Should return: HTTP/1.1 200 OK

# Test in browser
echo "Open in browser: http://$ALB_DNS/"
```

---

### Step 3.3: Test Backend Health

```bash
# Test backend health endpoint
curl http://$ALB_DNS/health

# Expected response:
# {"ok":true,"status":"healthy",...}

# Test API health
curl http://$ALB_DNS/api/health

# Should return similar response
```

---

### Step 3.4: Check ECS Task Status

```bash
# Check backend service
aws ecs describe-services \
  --cluster hive-platform-cluster \
  --services hive-platform-backend-service \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Check frontend service
aws ecs describe-services \
  --cluster hive-platform-cluster \
  --services hive-platform-frontend-service \
  --region $AWS_REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Both should show:
# Status: ACTIVE
# Running: 1 (or your desired count)
# Desired: 1
```

---

### Step 3.5: Check Target Group Health

```bash
# Check backend target group
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names hive-platform-backend-tg \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region $AWS_REGION

# Check frontend target group
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names hive-platform-frontend-tg \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text) \
  --region $AWS_REGION

# Targets should show: "State": "healthy"
```

---

### Step 3.6: View CloudWatch Logs

```bash
# View backend logs
aws logs tail /ecs/hive-platform-backend \
  --follow \
  --region $AWS_REGION

# View frontend logs
aws logs tail /ecs/hive-platform-frontend \
  --follow \
  --region $AWS_REGION

# Or view recent logs (last 100 lines)
aws logs tail /ecs/hive-platform-backend \
  --since 10m \
  --region $AWS_REGION
```

---

## SECTION 4: Update Environment Variables (If Needed)

If you need to update environment variables after deployment:

### Step 4.1: Update Task Definition

```bash
# Get current task definition
aws ecs describe-task-definition \
  --task-definition hive-platform-backend \
  --region $AWS_REGION \
  --query 'taskDefinition' > backend-task-def.json

# Edit the JSON file to update environment variables
# Then register new task definition
aws ecs register-task-definition \
  --cli-input-json file://backend-task-def.json \
  --region $AWS_REGION

# Update service to use new task definition
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --task-definition hive-platform-backend \
  --force-new-deployment \
  --region $AWS_REGION
```

---

## SECTION 5: Useful Maintenance Commands

### View ECS Task Details

```bash
# List running tasks
aws ecs list-tasks \
  --cluster hive-platform-cluster \
  --service-name hive-platform-backend-service \
  --region $AWS_REGION

# Get task details
aws ecs describe-tasks \
  --cluster hive-platform-cluster \
  --tasks [TASK_ARN] \
  --region $AWS_REGION
```

### Scale Services

```bash
# Scale backend service
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --desired-count 2 \
  --region $AWS_REGION

# Scale frontend service
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-frontend-service \
  --desired-count 2 \
  --region $AWS_REGION
```

### Force New Deployment

```bash
# Force new deployment (pulls latest image)
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --force-new-deployment \
  --region $AWS_REGION
```

### Update Docker Images

```bash
# After pushing new images to ECR, update services
# The force-new-deployment command above will pull latest :latest tag

# Or update to specific version
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --task-definition hive-platform-backend:2 \
  --region $AWS_REGION
```

---

## Troubleshooting Commands

### Check ECS Task Logs for Errors

```bash
# Get recent errors from backend
aws logs filter-log-events \
  --log-group-name /ecs/hive-platform-backend \
  --filter-pattern "ERROR" \
  --region $AWS_REGION \
  --max-items 20
```

### Test Database Connection from ECS

```bash
# This requires creating a temporary ECS task
# See full guide for details
```

### Check Security Group Rules

```bash
# Describe security groups
aws ec2 describe-security-groups \
  --group-names hive-ecs-tasks-sg hive-rds-sg \
  --region $AWS_REGION \
  --query 'SecurityGroups[*].{Name:GroupName,ID:GroupId,Rules:IpPermissions}'
```

---

## ✅ COMPLETE!

**You've completed all code steps!**

Your application should now be:
- ✅ Built and pushed to ECR
- ✅ Database migrated
- ✅ pgvector extension enabled
- ✅ Tested and verified

**Next steps** (optional, in browser):
- Set up SSL/TLS certificate
- Configure custom domain
- Set up CloudWatch alarms
- Enable auto scaling

See `AWS_DEPLOYMENT_BROWSER_STEPS.md` → **SECTION 3: Optional Enhancements**

