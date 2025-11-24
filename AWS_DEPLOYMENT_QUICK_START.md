# AWS Deployment Quick Start Guide

This is a condensed version of the full deployment guide. Use this for quick reference during deployment.

## Prerequisites Checklist

- [ ] AWS account with admin access
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Docker Desktop installed and running
- [ ] Node.js 20+ installed
- [ ] All environment variables documented

## Quick Deployment Steps

### 1. Infrastructure Setup (AWS Console)

#### Create VPC
- VPC Dashboard → Create VPC
- Name: `hive-platform-vpc`
- CIDR: `10.0.0.0/16`
- 2 AZs, 2 public subnets, 2 private subnets
- 1 NAT Gateway per AZ (or 1 for cost savings)

#### Create Security Groups
1. **ALB SG** (`hive-alb-sg`):
   - Inbound: HTTP (80), HTTPS (443) from 0.0.0.0/0

2. **ECS Tasks SG** (`hive-ecs-tasks-sg`):
   - Inbound: Port 3000, 3001 from ALB SG

3. **RDS SG** (`hive-rds-sg`):
   - Inbound: PostgreSQL (5432) from ECS Tasks SG

4. **Redis SG** (`hive-redis-sg`):
   - Inbound: Custom TCP (6379) from ECS Tasks SG

#### Create RDS PostgreSQL
- Engine: PostgreSQL 16
- Instance: `db.t3.micro` (free tier) or `db.t3.small`
- VPC: `hive-platform-vpc`
- Subnet: Private subnets
- Security Group: `hive-rds-sg`
- Database name: `hive_prod`
- **Important**: Enable pgvector extension (see full guide)

#### Create ElastiCache Redis
- Engine: Redis 7
- Node: `cache.t3.micro` or `cache.t3.small`
- VPC: `hive-platform-vpc`
- Security Group: `hive-redis-sg`

#### Create S3 Bucket
- Name: `hive-platform-artifacts-[unique-id]`
- Region: Same as other resources
- Block public access: Enabled
- Encryption: Enabled

#### Create IAM Roles
1. **HivePlatformECSTaskRole**:
   - Trust: ECS Tasks
   - Permissions: S3, Secrets Manager, CloudWatch Logs

2. **HivePlatformECSExecutionRole**:
   - Trust: ECS Tasks
   - Permissions: `AmazonECSTaskExecutionRolePolicy` + Secrets Manager

#### Store Secrets
- Secrets Manager → Store new secret
- Name: `hive-platform/secrets`
- Values:
  ```json
  {
    "JWT_SECRET": "generate-32-char-secret",
    "OPENAI_API_KEY": "sk-...",
    "DATABASE_PASSWORD": "your-rds-password"
  }
  ```

### 2. Build and Push Docker Images

```bash
# Run deployment script
cd /Users/akeilsmith/hive-1
./scripts/aws-deploy.sh
```

Or manually:
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

### 3. Create ECS Resources

#### Create ECS Cluster
- ECS Dashboard → Create cluster
- Name: `hive-platform-cluster`
- Infrastructure: AWS Fargate

#### Create Task Definitions
1. **Backend Task Definition**:
   - Use template: `aws/ecs-task-definition-backend.json`
   - Replace `YOUR_ACCOUNT_ID` with actual account ID
   - Update image URI, environment variables, secrets ARNs

2. **Frontend Task Definition**:
   - Use template: `aws/ecs-task-definition-frontend.json`
   - Replace placeholders

#### Create Application Load Balancer
- EC2 Dashboard → Load Balancers → Create
- Type: Application Load Balancer
- Name: `hive-platform-alb`
- Scheme: Internet-facing
- VPC: `hive-platform-vpc`
- Subnets: Public subnets
- Security Group: `hive-alb-sg`

#### Create Target Groups
1. **Backend TG** (`hive-platform-backend-tg`):
   - Type: IP addresses
   - Port: 3001
   - Health check: `/health`

2. **Frontend TG** (`hive-platform-frontend-tg`):
   - Type: IP addresses
   - Port: 3000
   - Health check: `/`

#### Create ECS Services
1. **Backend Service**:
   - Cluster: `hive-platform-cluster`
   - Task definition: `hive-platform-backend:1`
   - Service name: `hive-platform-backend-service`
   - VPC: `hive-platform-vpc`
   - Subnets: Private subnets
   - Security Group: `hive-ecs-tasks-sg`
   - Load balancer: `hive-platform-alb`
   - Target group: `hive-platform-backend-tg`

2. **Frontend Service**:
   - Same settings, but:
   - Task definition: `hive-platform-frontend:1`
   - Target group: `hive-platform-frontend-tg`

#### Configure ALB Listeners
- HTTP (80):
  - Default: Forward to `hive-platform-frontend-tg`
  - Rule: Path `/api/*` → Forward to `hive-platform-backend-tg`
  - Rule: Path `/health` → Forward to `hive-platform-backend-tg`

### 4. Run Database Migrations

```bash
# Option 1: From local machine (temporarily allow your IP in RDS SG)
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod"
cd backend
npm install
npm run migrate

# Option 2: Create one-off ECS task with migration command
# (See full guide for details)
```

### 5. Enable pgvector Extension

```sql
-- Connect to RDS (using Query Editor or psql)
CREATE EXTENSION IF NOT EXISTS vector;
```

### 6. Test Deployment

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names hive-platform-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Test endpoints
curl http://$ALB_DNS/
curl http://$ALB_DNS/health
curl http://$ALB_DNS/api/health
```

## Environment Variables Reference

### Backend (ECS Task Definition)
```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.com
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

### Frontend (ECS Task Definition)
```
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### Secrets (AWS Secrets Manager)
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `DATABASE_PASSWORD`
- `S3_ACCESS_KEY_ID` (if using IAM user)
- `S3_SECRET_ACCESS_KEY` (if using IAM user)

## Common Commands

```bash
# View ECS service status
aws ecs describe-services \
  --cluster hive-platform-cluster \
  --services hive-platform-backend-service

# View task logs
aws logs tail /ecs/hive-platform-backend --follow

# Update service (force new deployment)
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --force-new-deployment

# Scale service
aws ecs update-service \
  --cluster hive-platform-cluster \
  --service hive-platform-backend-service \
  --desired-count 2
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Tasks stuck in PENDING | Check IAM roles, security groups, subnet configuration |
| Cannot connect to RDS | Verify RDS SG allows ECS SG, check DATABASE_URL |
| Health checks failing | Verify health check path, check container logs |
| High costs | Review NAT Gateway usage, check for orphaned resources |

## Next Steps After Deployment

1. [ ] Set up SSL/TLS certificate (ACM)
2. [ ] Configure HTTPS listener on ALB
3. [ ] Set up Route 53 for custom domain
4. [ ] Configure CloudWatch alarms
5. [ ] Enable auto scaling
6. [ ] Set up CI/CD pipeline
7. [ ] Configure CloudFront CDN (optional)

## Cost Estimate

**Small Scale**: ~$120/month
**Production Scale**: ~$250/month

See full guide for detailed breakdown.

---

For detailed instructions, see `AWS_DEPLOYMENT_GUIDE.md`.

