# AWS Deployment Summary

## Architecture Overview

### Current Stack
- **Frontend**: Next.js 16 (React 19) - Server-side rendered application
- **Backend**: Fastify API server (Node.js 20) - RESTful API with WebSocket support
- **Database**: PostgreSQL 16 with pgvector extension
- **Cache**: Redis 7
- **File Storage**: S3-compatible storage (MinIO locally, AWS S3 in production)

### AWS Target Architecture

```
Internet
   │
   ▼
CloudFront (CDN) ──┐
   │                │
Route 53 (DNS)      │
   │                │
   ▼                ▼
Application Load Balancer (ALB)
   │                │
   ├───────────────┼───────────────┐
   │               │               │
   ▼               ▼               ▼
ECS Fargate    ECS Fargate    ECS Fargate
(Frontend)     (Backend)      (Backend)
   │               │               │
   │               ├───────────────┼───────────────┐
   │               │               │               │
   ▼               ▼               ▼               ▼
              RDS PostgreSQL  ElastiCache    S3 Bucket
              (pgvector)      Redis          (Files)
```

### Key Components

1. **Frontend (Next.js)**
   - Deployed on ECS Fargate
   - Serves static assets and SSR pages
   - Connects to backend API via environment variable

2. **Backend (Fastify)**
   - Deployed on ECS Fargate
   - Handles API requests, WebSocket connections
   - Connects to RDS, Redis, S3

3. **Database (RDS PostgreSQL)**
   - Managed PostgreSQL 16
   - pgvector extension for vector embeddings
   - Automated backups enabled

4. **Cache (ElastiCache Redis)**
   - Managed Redis 7
   - Used for session storage and caching

5. **Storage (S3)**
   - File artifacts and uploads
   - Presigned URLs for secure access

6. **Load Balancer (ALB)**
   - Routes traffic to frontend/backend
   - SSL termination
   - Health checks

## Files Created

### Documentation
- ✅ `AWS_DEPLOYMENT_GUIDE.md` - Comprehensive step-by-step guide
- ✅ `AWS_DEPLOYMENT_QUICK_START.md` - Quick reference guide
- ✅ `AWS_DEPLOYMENT_SUMMARY.md` - This file

### Docker Configuration
- ✅ `backend/Dockerfile` - Backend container image
- ✅ `hive-platform/Dockerfile` - Frontend container image
- ✅ `.dockerignore` - Root dockerignore
- ✅ `backend/.dockerignore` - Backend dockerignore
- ✅ `hive-platform/.dockerignore` - Frontend dockerignore

### Deployment Scripts
- ✅ `scripts/aws-deploy.sh` - Build and push Docker images to ECR
- ✅ `scripts/aws-setup-env.sh` - Setup environment variables and secrets

### ECS Configuration
- ✅ `aws/ecs-task-definition-backend.json` - Backend task definition template
- ✅ `aws/ecs-task-definition-frontend.json` - Frontend task definition template

## Deployment Checklist

### Phase 1: AWS Infrastructure Setup (Do in AWS Console)

- [ ] **Create VPC**
  - Name: `hive-platform-vpc`
  - CIDR: `10.0.0.0/16`
  - 2 Availability Zones
  - 2 Public subnets (for ALB)
  - 2 Private subnets (for ECS tasks)
  - 1-2 NAT Gateways

- [ ] **Create Security Groups**
  - `hive-alb-sg` - ALB security group
  - `hive-ecs-tasks-sg` - ECS tasks security group
  - `hive-rds-sg` - RDS security group
  - `hive-redis-sg` - Redis security group

- [ ] **Create RDS PostgreSQL**
  - Engine: PostgreSQL 16
  - Instance: `db.t3.micro` or `db.t3.small`
  - Database name: `hive_prod`
  - VPC: `hive-platform-vpc` (private subnets)
  - Security group: `hive-rds-sg`
  - **Enable pgvector extension** (modify parameter group, reboot)

- [ ] **Create ElastiCache Redis**
  - Engine: Redis 7
  - Node: `cache.t3.micro` or `cache.t3.small`
  - VPC: `hive-platform-vpc` (private subnets)
  - Security group: `hive-redis-sg`

- [ ] **Create S3 Bucket**
  - Name: `hive-platform-artifacts-[unique-id]`
  - Region: Same as other resources
  - Encryption: Enabled
  - Block public access: Enabled

- [ ] **Create IAM Roles**
  - `HivePlatformECSTaskRole` - For ECS tasks (S3, Secrets Manager, CloudWatch)
  - `HivePlatformECSExecutionRole` - For ECS execution (ECR, Secrets Manager, CloudWatch)

- [ ] **Store Secrets in Secrets Manager**
  - Secret name: `hive-platform/secrets`
  - Values: `JWT_SECRET`, `OPENAI_API_KEY`, `DATABASE_PASSWORD`

### Phase 2: Build and Push Docker Images (Run Scripts)

- [ ] **Verify AWS CLI is configured**
  ```bash
  aws configure
  aws sts get-caller-identity
  ```

- [ ] **Create ECR Repositories** (if not exists)
  ```bash
  aws ecr create-repository --repository-name hive-platform-backend --region us-east-1
  aws ecr create-repository --repository-name hive-platform-frontend --region us-east-1
  ```

- [ ] **Build and Push Images**
  ```bash
  cd /Users/akeilsmith/hive-1
  ./scripts/aws-deploy.sh
  ```

  Or manually:
  ```bash
  # Login to ECR
  aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin \
    [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com

  # Build and push backend
  cd backend
  docker build -t hive-platform-backend .
  docker tag hive-platform-backend:latest [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-backend:latest
  docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-backend:latest

  # Build and push frontend
  cd ../hive-platform
  docker build -t hive-platform-frontend .
  docker tag hive-platform-frontend:latest [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-frontend:latest
  docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/hive-platform-frontend:latest
  ```

### Phase 3: Create ECS Resources (Do in AWS Console)

- [ ] **Create ECS Cluster**
  - Name: `hive-platform-cluster`
  - Infrastructure: AWS Fargate

- [ ] **Create Task Definitions**
  - Use templates: `aws/ecs-task-definition-backend.json` and `aws/ecs-task-definition-frontend.json`
  - Replace `YOUR_ACCOUNT_ID` with actual account ID
  - Update image URIs, environment variables, secrets ARNs
  - Register task definitions in ECS

- [ ] **Create Application Load Balancer**
  - Name: `hive-platform-alb`
  - Scheme: Internet-facing
  - VPC: `hive-platform-vpc`
  - Subnets: Public subnets
  - Security group: `hive-alb-sg`

- [ ] **Create Target Groups**
  - `hive-platform-backend-tg` - Port 3001, Health check: `/health`
  - `hive-platform-frontend-tg` - Port 3000, Health check: `/`

- [ ] **Create ECS Services**
  - `hive-platform-backend-service` - Backend task definition
  - `hive-platform-frontend-service` - Frontend task definition
  - Configure load balancer integration
  - Set desired count: 1 (or 2 for HA)

- [ ] **Configure ALB Listeners**
  - HTTP (80): Default → Frontend, `/api/*` → Backend, `/health` → Backend

### Phase 4: Database Setup (Run Commands)

- [ ] **Run Database Migrations**
  ```bash
  # Option 1: From local (temporarily allow your IP in RDS SG)
  export DATABASE_URL="postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod"
  cd backend
  npm install
  npm run migrate
  ```

- [ ] **Enable pgvector Extension**
  ```sql
  -- Connect to RDS and run:
  CREATE EXTENSION IF NOT EXISTS vector;
  ```

### Phase 5: Testing and Verification

- [ ] **Test ALB Endpoints**
  ```bash
  # Get ALB DNS
  ALB_DNS=$(aws elbv2 describe-load-balancers \
    --names hive-platform-alb \
    --query 'LoadBalancers[0].DNSName' \
    --output text)

  # Test
  curl http://$ALB_DNS/
  curl http://$ALB_DNS/health
  curl http://$ALB_DNS/api/health
  ```

- [ ] **Verify ECS Tasks are Running**
  - Check ECS console for running tasks
  - Verify health checks are passing

- [ ] **Check CloudWatch Logs**
  - View logs: `/ecs/hive-platform-backend`
  - View logs: `/ecs/hive-platform-frontend`

### Phase 6: Optional Enhancements

- [ ] **Set up SSL/TLS**
  - Request certificate in ACM
  - Configure HTTPS listener on ALB

- [ ] **Configure Custom Domain**
  - Set up Route 53 hosted zone
  - Point domain to ALB

- [ ] **Set up CloudWatch Alarms**
  - CPU utilization
  - Memory utilization
  - Error rates

- [ ] **Enable Auto Scaling**
  - Configure auto scaling for ECS services
  - Set min/max capacity

- [ ] **Set up CI/CD**
  - GitHub Actions or AWS CodePipeline
  - Automated deployments on git push

## Important Notes

### Environment Variables

**Backend requires:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - At least 32 characters (from Secrets Manager)
- `OPENAI_API_KEY` - Optional, for AI features
- `S3_BUCKET` - S3 bucket name
- `CORS_ORIGIN` - Frontend domain URL

**Frontend requires:**
- `NEXT_PUBLIC_API_URL` - Backend API URL

### Security Considerations

1. **Never commit secrets** - Use AWS Secrets Manager
2. **Use IAM roles** - Don't hardcode AWS credentials
3. **Private subnets** - ECS tasks should be in private subnets
4. **Security groups** - Follow least privilege principle
5. **Encryption** - Enable encryption at rest and in transit

### Cost Optimization

1. **NAT Gateways** - Biggest cost, use 1 instead of 2 if HA not critical
2. **Instance sizes** - Start small, scale up as needed
3. **Reserved Instances** - Consider for RDS if committed
4. **S3 Lifecycle** - Move old files to cheaper storage tiers

### Monitoring

- **CloudWatch Logs**: Application logs
- **CloudWatch Metrics**: CPU, memory, request counts
- **ALB Access Logs**: HTTP request logs
- **RDS Performance Insights**: Database performance

## Next Steps After Deployment

1. **Set up monitoring dashboards** in CloudWatch
2. **Configure alerts** for critical metrics
3. **Set up backup strategy** (RDS automated backups, S3 versioning)
4. **Implement CI/CD** for automated deployments
5. **Add CloudFront** for CDN and better performance
6. **Set up WAF** for additional security
7. **Configure disaster recovery** plan

## Support Resources

- **Full Guide**: `AWS_DEPLOYMENT_GUIDE.md`
- **Quick Reference**: `AWS_DEPLOYMENT_QUICK_START.md`
- **AWS Documentation**: https://docs.aws.amazon.com/
- **ECS Best Practices**: https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/

## Estimated Timeline

- **Infrastructure Setup**: 1-2 hours
- **Docker Build & Push**: 15-30 minutes
- **ECS Setup**: 30-60 minutes
- **Database Migrations**: 10-15 minutes
- **Testing & Verification**: 30 minutes

**Total**: ~3-4 hours for first-time deployment

---

**Ready to deploy?** Start with Phase 1 in the AWS Console, then proceed through each phase sequentially.

