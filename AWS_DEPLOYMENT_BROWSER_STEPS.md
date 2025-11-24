# AWS Deployment - Browser Steps (AWS Console)

This document contains **ALL** the browser-based steps you need to do in the AWS Console. Follow these steps in order, then switch to code steps when indicated.

---

## SECTION 1: Infrastructure Setup (Browser Only)

### Step 1.1: Create VPC and Networking

**Navigate to**: AWS Console → VPC Dashboard

1. Click **"Create VPC"** button (top right)
2. Select **"VPC and more"** option (not just "VPC")
3. Fill in the configuration:
   - **Name tag**: `hive-platform-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **IPv6 CIDR block**: Leave as "No IPv6 CIDR block"
   - **Tenancy**: Default
   - **Number of Availability Zones**: Select **2**
   - **Number of public subnets**: **2**
   - **Number of private subnets**: **2**
   - **NAT gateways**: Choose **1 per Availability Zone** (for high availability) OR **1** (for cost savings - recommended for testing)
   - **VPC endpoints**: Leave as "None"
   - **DNS options**: 
     - ✅ Enable DNS hostnames
     - ✅ Enable DNS resolution
4. Click **"Create VPC"** button
5. **Wait** for creation to complete (~2 minutes)
6. **Note down**:
   - VPC ID (e.g., `vpc-0123456789abcdef0`)
   - Public subnet IDs (2 of them)
   - Private subnet IDs (2 of them)
   - NAT Gateway ID(s)

---

### Step 1.2: Create Security Groups

**Navigate to**: AWS Console → VPC Dashboard → Security Groups

#### Create ALB Security Group

1. Click **"Create security group"** button
2. Fill in:
   - **Security group name**: `hive-alb-sg`
   - **Description**: `Security group for Application Load Balancer`
   - **VPC**: Select `hive-platform-vpc` from dropdown
3. **Inbound rules** section:
   - Click **"Add rule"**
   - **Type**: HTTP
   - **Source**: `0.0.0.0/0` (or `::/0` for IPv6)
   - **Description**: `Allow HTTP from internet`
   - Click **"Add rule"** again
   - **Type**: HTTPS
   - **Source**: `0.0.0.0/0` (or `::/0` for IPv6)
   - **Description**: `Allow HTTPS from internet`
4. **Outbound rules**: Leave as default (Allow all traffic)
5. Click **"Create security group"** button
6. **Note down** the Security Group ID (e.g., `sg-0123456789abcdef0`)

#### Create ECS Tasks Security Group

1. Click **"Create security group"** button
2. Fill in:
   - **Security group name**: `hive-ecs-tasks-sg`
   - **Description**: `Security group for ECS tasks (frontend and backend)`
   - **VPC**: Select `hive-platform-vpc`
3. **Inbound rules** section:
   - Click **"Add rule"**
   - **Type**: Custom TCP
   - **Port range**: `3000`
   - **Source**: Click dropdown → Select **"hive-alb-sg"** (or enter the security group ID)
   - **Description**: `Allow traffic from ALB to frontend`
   - Click **"Add rule"** again
   - **Type**: Custom TCP
   - **Port range**: `3001`
   - **Source**: Select **"hive-alb-sg"**
   - **Description**: `Allow traffic from ALB to backend`
4. **Outbound rules**: Leave as default
5. Click **"Create security group"** button
6. **Note down** the Security Group ID

#### Create RDS Security Group

1. Click **"Create security group"** button
2. Fill in:
   - **Security group name**: `hive-rds-sg`
   - **Description**: `Security group for RDS PostgreSQL database`
   - **VPC**: Select `hive-platform-vpc`
3. **Inbound rules** section:
   - Click **"Add rule"**
   - **Type**: PostgreSQL (or Custom TCP)
   - **Port range**: `5432`
   - **Source**: Select **"hive-ecs-tasks-sg"** from dropdown
   - **Description**: `Allow PostgreSQL from ECS tasks`
4. **Outbound rules**: Leave empty (no outbound needed)
5. Click **"Create security group"** button
6. **Note down** the Security Group ID

#### Create Redis Security Group

1. Click **"Create security group"** button
2. Fill in:
   - **Security group name**: `hive-redis-sg`
   - **Description**: `Security group for ElastiCache Redis`
   - **VPC**: Select `hive-platform-vpc`
3. **Inbound rules** section:
   - Click **"Add rule"**
   - **Type**: Custom TCP
   - **Port range**: `6379`
   - **Source**: Select **"hive-ecs-tasks-sg"** from dropdown
   - **Description**: `Allow Redis from ECS tasks`
4. **Outbound rules**: Leave empty
5. Click **"Create security group"** button
6. **Note down** the Security Group ID

---

### Step 1.3: Create RDS PostgreSQL Database

**Navigate to**: AWS Console → RDS Dashboard

1. Click **"Create database"** button (top right)
2. **Choose a database creation method**: Select **"Standard create"**
3. **Engine options**:
   - **Engine type**: Database
   - **Engine**: **PostgreSQL**
   - **Version**: Select **16.x** (latest available, e.g., `16.4`)
   - **Templates**: 
     - For testing: **Free tier**
     - For production: **Production**
4. **Settings**:
   - **DB instance identifier**: `hive-postgres`
   - **Master username**: `postgres`
   - **Master password**: 
     - Click **"Auto generate a password"** OR
     - Enter a strong password (save it securely!)
     - **Confirm password**: Re-enter the password
5. **DB instance class**:
   - For free tier: **db.t3.micro** (or **db.t4g.micro** if available)
   - For production: **db.t3.small** or larger
6. **Storage**:
   - **Storage type**: **General Purpose SSD (gp3)**
   - **Allocated storage**: `20` GB (minimum)
   - ✅ **Enable storage autoscaling**: Check this box
   - **Maximum storage threshold**: `100` GB (or your preference)
7. **Connectivity**:
   - **Virtual private cloud (VPC)**: Select `hive-platform-vpc`
   - **DB subnet group**: 
     - If you see a default one, you can use it OR
     - Click **"Create new DB subnet group"**:
       - Name: `hive-postgres-subnet-group`
       - Description: `Subnet group for Hive Platform PostgreSQL`
       - VPC: `hive-platform-vpc`
       - Availability Zones: Select 2 AZs
       - Subnets: Select the **private subnets** (2 of them)
       - Click **"Create"**
   - **Public access**: Select **"No"** (important for security)
   - **VPC security group**: Select **"Choose existing"**
     - Select **"hive-rds-sg"** from the list
   - **Availability Zone**: **No preference**
   - **Existing database port**: `5432` (default)
8. **Database authentication**: **Password authentication**
9. **Additional configuration** (expand this section):
   - **Initial database name**: `hive_prod`
   - **DB parameter group**: Leave as default (we'll modify later)
   - **Backup**:
     - ✅ **Enable automated backups**
     - **Backup retention period**: `7` days
     - **Backup window**: No preference (or choose a time)
   - **Encryption**: 
     - ✅ **Enable encryption** (recommended)
     - **Encryption key**: Use default AWS managed key
   - **Performance Insights**: Optional (adds cost)
   - **Enhanced monitoring**: Optional
   - **Log exports**: Optional
10. **Maintenance**:
    - **Auto minor version upgrade**: ✅ Enable (recommended)
    - **Maintenance window**: No preference (or choose a time)
11. Click **"Create database"** button
12. **Wait** for database creation (~10-15 minutes)
13. **After creation**:
    - Click on the database name `hive-postgres`
    - **Note down**:
      - **Endpoint** (e.g., `hive-postgres.xxxxx.us-east-1.rds.amazonaws.com`)
      - **Port**: `5432`
      - **Database name**: `hive_prod`
      - **Master username**: `postgres`
      - **Master password**: (the one you saved)

#### Enable pgvector Extension (After RDS is Created)

**Navigate to**: AWS Console → RDS Dashboard → Parameter groups

1. Click **"Create parameter group"** button
2. Fill in:
   - **Parameter group family**: Select `postgres16` (or `postgres16.x`)
   - **Group name**: `hive-postgres-pgvector`
   - **Description**: `Parameter group for Hive Platform with pgvector`
3. Click **"Create"** button
4. Click on the parameter group name `hive-postgres-pgvector`
5. Click **"Edit"** button
6. In the search box, type: `shared_preload_libraries`
7. Click on the parameter `shared_preload_libraries`
8. **Value**: Enter `pgvector` (replace any existing value)
9. Click **"Save changes"** button
10. **Navigate back to**: RDS Dashboard → Databases
11. Click on `hive-postgres` database
12. Click **"Modify"** button (top right)
13. Scroll down to **"Additional configuration"** section
14. **DB parameter group**: Change from default to `hive-postgres-pgvector`
15. Scroll to bottom, select **"Apply immediately"**
16. Click **"Modify DB instance"** button
17. **Wait** for modification to complete
18. **Reboot the database**:
    - Click on database → **"Actions"** → **"Reboot"**
    - ✅ Check **"Reboot with failover"** (if available)
    - Click **"Reboot"**
    - Wait for reboot to complete (~5 minutes)

**Note**: After reboot, you'll need to connect to the database and run `CREATE EXTENSION IF NOT EXISTS vector;` (we'll do this in code steps)

---

### Step 1.4: Create ElastiCache Redis Cluster

**Navigate to**: AWS Console → ElastiCache Dashboard

1. Click **"Create cluster"** button (top right)
2. **Cluster type**: Select **"Redis"** (not Memcached)
3. **Cluster settings**:
   - **Name**: `hive-redis`
   - **Description**: `Redis cache for Hive Platform`
   - **Engine version**: Select **7.x** (latest, e.g., `7.0`)
   - **Port**: `6379` (default)
   - **Node type**: 
     - For free tier/testing: `cache.t3.micro`
     - For production: `cache.t3.small` or larger
   - **Number of replicas**: 
     - For cost savings: `0`
     - For high availability: `1` or more
4. **Subnet and security**:
   - **VPC**: Select `hive-platform-vpc`
   - **Subnet group**: 
     - If you see a default one, you can use it OR
     - Click **"Create new"**:
       - Name: `hive-redis-subnet-group`
       - Description: `Subnet group for Hive Platform Redis`
       - VPC: `hive-platform-vpc`
       - Availability Zones: Select 2 AZs
       - Subnets: Select the **private subnets** (2 of them)
       - Click **"Create"**
   - **Security groups**: 
     - Remove default security group
     - Add **"hive-redis-sg"**
   - **Availability zones**: **No preference**
5. **Backup** (optional):
   - ✅ **Enable automatic backups** (recommended)
   - **Backup window**: No preference
   - **Snapshot retention**: `7` days (or your preference)
6. **Encryption**:
   - ✅ **Enable encryption in-transit** (recommended)
   - ✅ **Enable encryption at-rest** (optional, adds cost)
7. **Maintenance**:
   - **Maintenance window**: No preference
8. Click **"Create cluster"** button
9. **Wait** for cluster creation (~5-10 minutes)
10. **After creation**:
    - Click on the cluster name `hive-redis`
    - **Note down**:
      - **Primary endpoint** (e.g., `hive-redis.xxxxx.cache.amazonaws.com:6379`)
      - **Port**: `6379`

---

### Step 1.5: Create S3 Bucket

**Navigate to**: AWS Console → S3 Dashboard

1. Click **"Create bucket"** button (top right)
2. **General configuration**:
   - **Bucket name**: `hive-platform-artifacts-[your-unique-id]`
     - Example: `hive-platform-artifacts-akeil-2025`
     - **Must be globally unique** (try different names if you get an error)
   - **AWS Region**: Select the same region as your other resources (e.g., `us-east-1`)
   - **Object Ownership**: 
     - Select **"ACLs disabled (recommended)"**
3. **Block Public Access settings**:
   - ✅ **Keep all settings enabled** (Block all public access)
   - This is correct - we'll use presigned URLs for access
4. **Bucket Versioning**:
   - **Versioning**: Select **"Enable"** (optional, but recommended for backup)
5. **Default encryption**:
   - ✅ **Enable encryption**
   - **Encryption type**: **SSE-S3** (Amazon S3 managed keys) OR **SSE-KMS** (if you want more control)
6. **Advanced settings**: Leave as default
7. Click **"Create bucket"** button
8. **Note down** the bucket name

---

### Step 1.6: Create IAM Roles

**Navigate to**: AWS Console → IAM Dashboard → Roles

#### Create ECS Task Role

1. Click **"Create role"** button
2. **Trusted entity type**: Select **"AWS service"**
3. **Use case**: Select **"Elastic Container Service"**
4. **Select service**: Select **"Elastic Container Service Task"**
5. Click **"Next"** button
6. **Add permissions**:
   - Click **"Create policy"** button (opens new tab)
   - In new tab:
     - Click **"JSON"** tab
     - Paste this policy:
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
     - **Note**: Replace `hive-platform-artifacts-*` with your actual bucket name pattern if different
     - Click **"Next"** button
     - **Policy name**: `HivePlatformECSTaskPolicy`
     - **Description**: `Policy for Hive Platform ECS tasks to access S3, Secrets Manager, and CloudWatch`
     - Click **"Create policy"** button
     - **Close the new tab** and go back to role creation tab
7. **Back in role creation**:
   - Refresh the policies list (click refresh icon)
   - Search for `HivePlatformECSTaskPolicy`
   - ✅ Check the box next to it
8. Click **"Next"** button
9. **Role name**: `HivePlatformECSTaskRole`
10. **Description**: `Role for Hive Platform ECS tasks`
11. Click **"Create role"** button
12. **Note down** the Role ARN (e.g., `arn:aws:iam::123456789012:role/HivePlatformECSTaskRole`)

#### Create ECS Execution Role

1. Click **"Create role"** button
2. **Trusted entity type**: Select **"AWS service"**
3. **Use case**: Select **"Elastic Container Service"**
4. **Select service**: Select **"Elastic Container Service Task"**
5. Click **"Next"** button
6. **Add permissions**:
   - ✅ Check **"AmazonECSTaskExecutionRolePolicy"** (this is a managed policy)
   - Click **"Create policy"** button (for Secrets Manager access)
   - In new tab:
     - Click **"JSON"** tab
     - Paste this policy:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "secretsmanager:GetSecretValue"
           ],
           "Resource": "*"
         }
       ]
     }
     ```
     - Click **"Next"**
     - **Policy name**: `HivePlatformSecretsManagerAccess`
     - Click **"Create policy"**
     - **Close the new tab**
7. **Back in role creation**:
   - Refresh policies
   - ✅ Check **"AmazonECSTaskExecutionRolePolicy"**
   - ✅ Check **"HivePlatformSecretsManagerAccess"**
8. Click **"Next"** button
9. **Role name**: `HivePlatformECSExecutionRole`
10. **Description**: `Role for Hive Platform ECS task execution`
11. Click **"Create role"** button
12. **Note down** the Role ARN

---

### Step 1.7: Store Secrets in Secrets Manager

**Navigate to**: AWS Console → Secrets Manager

1. Click **"Store a new secret"** button
2. **Secret type**: Select **"Other type of secret"**
3. **Key/value pairs**:
   - Click **"Plaintext"** tab
   - Click **"Switch to JSON"** link
   - Paste this JSON (replace with your actual values):
   ```json
   {
     "JWT_SECRET": "generate-a-random-32-character-secret-here-use-openssl-rand-hex-32",
     "OPENAI_API_KEY": "sk-your-openai-api-key-here-or-empty-if-not-using",
     "DATABASE_PASSWORD": "your-rds-master-password-here"
   }
   ```
   - **Important**: 
     - `JWT_SECRET`: Must be at least 32 characters. Generate one using: `openssl rand -hex 32` (run in terminal)
     - `OPENAI_API_KEY`: Your OpenAI API key (or leave empty if not using AI features)
     - `DATABASE_PASSWORD`: The RDS master password you created earlier
4. Click **"Next"** button
5. **Secret name**: `hive-platform/secrets`
   - **Description**: `Secrets for Hive Platform (JWT, OpenAI, Database)`
6. Click **"Next"** button
7. **Configure rotation**: Leave as **"Disable automatic rotation"** (for now)
8. Click **"Next"** button
9. **Review**: Check all values are correct
10. Click **"Store"** button
11. **After creation**:
    - Click on the secret name `hive-platform/secrets`
    - **Note down** the **Secret ARN** (e.g., `arn:aws:secretsmanager:us-east-1:123456789012:secret:hive-platform/secrets-xxxxx`)
    - You'll need this ARN format: `arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:hive-platform/secrets:SECRET_KEY::`
    - Example: `arn:aws:secretsmanager:us-east-1:123456789012:secret:hive-platform/secrets:JWT_SECRET::`

---

## 🛑 STOP HERE - SWITCH TO CODE STEPS

**You've completed all the infrastructure setup in the browser.**

**Now you need to:**
1. Build and push Docker images (code steps)
2. Create ECR repositories (can be done in browser or code - see code steps)
3. Then come back to browser for ECS setup

**Go to**: `AWS_DEPLOYMENT_CODE_STEPS.md` and follow the code steps.

---

## SECTION 2: ECS Setup (Browser - After Code Steps)

**Return here after completing the code steps in `AWS_DEPLOYMENT_CODE_STEPS.md`**

### Step 2.1: Create ECS Cluster

**Navigate to**: AWS Console → ECS Dashboard

1. Click **"Create cluster"** button (top right)
2. **Cluster configuration**:
   - **Cluster name**: `hive-platform-cluster`
   - **Infrastructure**: Select **"AWS Fargate (serverless)"**
     - ✅ Check **"Enable CloudWatch Container Insights"** (optional, adds cost but useful for monitoring)
3. Click **"Create"** button
4. **Wait** for cluster creation (~1 minute)
5. **Note**: Cluster is ready when status shows "Active"

---

### Step 2.2: Create CloudWatch Log Groups

**Navigate to**: AWS Console → CloudWatch → Log groups

1. Click **"Create log group"** button
2. **Log group name**: `/ecs/hive-platform-backend`
3. Click **"Create log group"** button
4. Repeat for frontend:
   - Click **"Create log group"** button
   - **Log group name**: `/ecs/hive-platform-frontend`
   - Click **"Create log group"** button

---

### Step 2.3: Create Task Definitions

**Navigate to**: AWS Console → ECS Dashboard → Task definitions → Create new task definition

#### Backend Task Definition

1. **Task definition family**: `hive-platform-backend`
2. **Launch type**: Select **"Fargate"**
3. **Task size**:
   - **CPU**: `0.5 vCPU` (512)
   - **Memory**: `1 GB` (1024)
4. **Task role**: Select `HivePlatformECSTaskRole` from dropdown
5. **Task execution role**: Select `HivePlatformECSExecutionRole` from dropdown
6. **Network mode**: `awsvpc` (should be auto-selected)
7. **Container definitions** section:
   - Click **"Add container"** button
   - **Container name**: `backend`
   - **Image URI**: 
     - Enter your ECR image URI from code steps
     - Format: `[ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/hive-platform-backend:latest`
     - Example: `123456789012.dkr.ecr.us-east-1.amazonaws.com/hive-platform-backend:latest`
   - **Essential container**: ✅ Keep checked
   - **Container port mappings**:
     - Click **"Add port mapping"**
     - **Container port**: `3001`
     - **Protocol**: `TCP`
   - **Environment variables** section:
     - Click **"Add environment variable"** for each:
     
     | Key | Value |
     |-----|-------|
     | `NODE_ENV` | `production` |
     | `PORT` | `3001` |
     | `CORS_ORIGIN` | `https://your-domain.com` (or `http://[ALB-DNS]` for testing) |
     | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@[RDS_ENDPOINT]:5432/hive_prod` |
     | `REDIS_URL` | `redis://[REDIS_ENDPOINT]:6379` |
     | `S3_ENDPOINT` | `https://s3.us-east-1.amazonaws.com` |
     | `S3_BUCKET` | `hive-platform-artifacts-[YOUR-ID]` |
     | `S3_REGION` | `us-east-1` (or your region) |
     | `S3_FORCE_PATH_STYLE` | `false` |
     | `OPENAI_MODEL` | `gpt-4-turbo-preview` |
     | `OPENAI_EMBEDDING_MODEL` | `text-embedding-ada-002` |
     | `JWT_EXPIRES_IN` | `24h` |
     | `USE_REAL_AI` | `true` |
     | `DRY_RUN_APPLY` | `false` |
     | `LOG_LEVEL` | `info` |
     | `ENABLE_TELEMETRY` | `false` |
     
     **Important**: Replace placeholders:
     - `[PASSWORD]` - Your RDS password (or use secret)
     - `[RDS_ENDPOINT]` - Your RDS endpoint
     - `[REDIS_ENDPOINT]` - Your Redis endpoint
     - `[ALB-DNS]` - You'll get this after creating ALB
     - `[YOUR-ID]` - Your S3 bucket name
   
   - **Secrets** section (instead of hardcoding passwords):
     - Click **"Add secret"** for each:
     
     | Key | Value from |
     |-----|------------|
     | `JWT_SECRET` | `arn:aws:secretsmanager:[REGION]:[ACCOUNT_ID]:secret:hive-platform/secrets:JWT_SECRET::` |
     | `OPENAI_API_KEY` | `arn:aws:secretsmanager:[REGION]:[ACCOUNT_ID]:secret:hive-platform/secrets:OPENAI_API_KEY::` |
     | `DATABASE_PASSWORD` | `arn:aws:secretsmanager:[REGION]:[ACCOUNT_ID]:secret:hive-platform/secrets:DATABASE_PASSWORD::` |
     
     **Note**: Replace `[REGION]` and `[ACCOUNT_ID]` with your values
   
   - **Logging** section:
     - **Log driver**: Select **"awslogs"**
     - **Log group**: `/ecs/hive-platform-backend`
     - **Log stream prefix**: `backend`
     - **Region**: Select your region (e.g., `us-east-1`)
   
   - **Health check** section:
     - ✅ **Enable health check**
     - **Command**: 
       ```
       CMD-SHELL,node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
       ```
     - **Interval**: `30` seconds
     - **Timeout**: `5` seconds
     - **Start period**: `60` seconds
     - **Retries**: `3`
8. Click **"Create"** button at the bottom
9. **Note**: Task definition version will be `hive-platform-backend:1`

#### Frontend Task Definition

1. Click **"Create new task definition"** again
2. **Task definition family**: `hive-platform-frontend`
3. **Launch type**: **Fargate**
4. **Task size**: Same as backend (0.5 vCPU, 1 GB)
5. **Task role**: `HivePlatformECSTaskRole`
6. **Task execution role**: `HivePlatformECSExecutionRole`
7. **Container definitions** → **Add container**:
   - **Container name**: `frontend`
   - **Image URI**: `[ACCOUNT_ID].dkr.ecr.[REGION].amazonaws.com/hive-platform-frontend:latest`
   - **Port mappings**: `3000` (TCP)
   - **Environment variables**:
     
     | Key | Value |
     |-----|-------|
     | `NODE_ENV` | `production` |
     | `PORT` | `3000` |
     | `NEXT_PUBLIC_API_URL` | `https://api.your-domain.com` (or `http://[ALB-DNS]/api` for testing) |
   
   - **Logging**:
     - **Log driver**: `awslogs`
     - **Log group**: `/ecs/hive-platform-frontend`
     - **Log stream prefix**: `frontend`
     - **Region**: Your region
   
   - **Health check**:
     - ✅ **Enable health check**
     - **Command**: 
       ```
       CMD-SHELL,node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
       ```
     - **Interval**: `30`
     - **Timeout**: `5`
     - **Start period**: `60`
     - **Retries**: `3`
8. Click **"Create"** button

---

### Step 2.4: Create Application Load Balancer

**Navigate to**: AWS Console → EC2 Dashboard → Load Balancers

1. Click **"Create load balancer"** button
2. **Load balancer type**: Select **"Application Load Balancer"**
3. **Basic configuration**:
   - **Name**: `hive-platform-alb`
   - **Scheme**: **Internet-facing**
   - **IP address type**: **IPv4**
4. **Network mapping**:
   - **VPC**: Select `hive-platform-vpc`
   - **Mappings**: 
     - ✅ Check **both availability zones**
     - For each AZ, select the **public subnet**
5. **Security groups**:
   - Remove default security group
   - Select **"hive-alb-sg"**
6. **Listeners and routing**:
   - **Protocol**: HTTP
   - **Port**: `80`
   - **Default action**: 
     - Select **"Create new target group"**
     - We'll configure this later, so select any option for now
7. Click **"Create load balancer"** button
8. **Wait** for ALB to be active (~2-3 minutes)
9. **After creation**:
    - Click on the load balancer name `hive-platform-alb`
    - **Note down** the **DNS name** (e.g., `hive-platform-alb-1234567890.us-east-1.elb.amazonaws.com`)
    - This is your application URL (until you set up a custom domain)

---

### Step 2.5: Create Target Groups

**Navigate to**: AWS Console → EC2 Dashboard → Target Groups

#### Backend Target Group

1. Click **"Create target group"** button
2. **Choose a target type**: Select **"IP addresses"**
3. **Basic configuration**:
   - **Target group name**: `hive-platform-backend-tg`
   - **Protocol**: HTTP
   - **Port**: `3001`
   - **VPC**: Select `hive-platform-vpc`
4. **Health checks**:
   - **Health check protocol**: HTTP
   - **Health check path**: `/health`
   - **Advanced health check settings** (expand):
     - **Healthy threshold**: `2`
     - **Unhealthy threshold**: `3`
     - **Timeout**: `5` seconds
     - **Interval**: `30` seconds
     - **Success codes**: `200`
5. Click **"Next"** button
6. **Register targets**: Skip for now (ECS will register automatically)
7. Click **"Create target group"** button

#### Frontend Target Group

1. Click **"Create target group"** button
2. **Target type**: **IP addresses**
3. **Basic configuration**:
   - **Target group name**: `hive-platform-frontend-tg`
   - **Protocol**: HTTP
   - **Port**: `3000`
   - **VPC**: `hive-platform-vpc`
4. **Health checks**:
   - **Health check path**: `/`
   - **Advanced settings**: Same as backend (Healthy: 2, Unhealthy: 3, etc.)
5. Click **"Next"** → **"Create target group"** button

---

### Step 2.6: Create ECS Services

**Navigate to**: AWS Console → ECS Dashboard → Clusters → `hive-platform-cluster`

#### Backend Service

1. Click on the **"Services"** tab
2. Click **"Create"** button
3. **Configure service**:
   - **Launch type**: **Fargate**
   - **Task definition**:
     - **Family**: Select `hive-platform-backend`
     - **Revision**: `1` (latest)
   - **Service name**: `hive-platform-backend-service`
   - **Desired tasks**: `1` (or `2` for high availability)
4. **Networking**:
   - **VPC**: Select `hive-platform-vpc`
   - **Subnets**: Select **both private subnets** (not public!)
   - **Security groups**: Select `hive-ecs-tasks-sg`
   - **Auto-assign public IP**: **Disabled** (we're using NAT Gateway)
5. **Load balancing**:
   - ✅ **Enable load balancing**
   - **Load balancer type**: **Application Load Balancer**
   - **Load balancer name**: Select `hive-platform-alb`
   - **Container to load balance**: 
     - **Container name**: `backend`
     - **Port**: `3001`
   - **Target group name**: Select `hive-platform-backend-tg`
   - **Health check grace period**: `60` seconds
6. **Service auto scaling** (optional):
   - Leave disabled for now (can enable later)
7. Click **"Create"** button
8. **Wait** for service to stabilize (~2-3 minutes)
   - Status should show "Running" with desired count = running count

#### Frontend Service

1. Click **"Create"** button again
2. **Configure service**:
   - **Launch type**: **Fargate**
   - **Task definition**: `hive-platform-frontend:1`
   - **Service name**: `hive-platform-frontend-service`
   - **Desired tasks**: `1`
3. **Networking**: Same as backend (private subnets, `hive-ecs-tasks-sg`, no public IP)
4. **Load balancing**:
   - ✅ **Enable load balancing**
   - **Load balancer**: `hive-platform-alb`
   - **Container**: `frontend:3000`
   - **Target group**: `hive-platform-frontend-tg`
5. Click **"Create"** button
6. **Wait** for service to stabilize

---

### Step 2.7: Configure ALB Listeners

**Navigate to**: AWS Console → EC2 Dashboard → Load Balancers → `hive-platform-alb` → Listeners tab

1. Click on the **HTTP listener** (port 80)
2. Click **"Edit"** button (or **"Add rule"** if no default action)
3. **Default action**:
   - **Action type**: **Forward to**
   - **Target group**: Select `hive-platform-frontend-tg`
   - Click **"Save"** button
4. **Add rules** (for API routing):
   - Click **"Add rule"** button
   - **IF**: 
     - Click **"Add condition"**
     - **Condition type**: **Path**
     - **Path is**: `/api/*`
   - **THEN**:
     - **Action type**: **Forward to**
     - **Target group**: Select `hive-platform-backend-tg`
   - **Priority**: `100`
   - Click **"Save"** button
5. **Add another rule** (for health checks):
   - Click **"Add rule"** button
   - **IF**: Path is `/health`
   - **THEN**: Forward to `hive-platform-backend-tg`
   - **Priority**: `200`
   - Click **"Save"** button

---

## Step 2.8: Verify Deployment

1. **Check ECS Services**:
   - Go to ECS Dashboard → Clusters → `hive-platform-cluster` → Services
   - Both services should show:
     - **Status**: Active
     - **Running count**: 1 (or your desired count)
     - **Desired count**: 1

2. **Check Target Groups**:
   - Go to EC2 Dashboard → Target Groups
   - Click on `hive-platform-backend-tg`
   - **Targets** tab should show healthy targets (green)
   - Repeat for `hive-platform-frontend-tg`

3. **Test ALB**:
   - Go to EC2 Dashboard → Load Balancers → `hive-platform-alb`
   - Copy the **DNS name**
   - Test in browser or terminal:
     ```bash
     # Replace with your ALB DNS
     curl http://hive-platform-alb-xxxxx.us-east-1.elb.amazonaws.com/
     curl http://hive-platform-alb-xxxxx.us-east-1.elb.amazonaws.com/health
     curl http://hive-platform-alb-xxxxx.us-east-1.elb.amazonaws.com/api/health
     ```

---

## 🛑 STOP HERE - SWITCH TO CODE STEPS FOR MIGRATIONS

**You've completed ECS setup. Now you need to:**
1. Run database migrations (code steps)
2. Enable pgvector extension (code steps)
3. Then come back for optional enhancements

**Go to**: `AWS_DEPLOYMENT_CODE_STEPS.md` and complete the migration steps.

---

## SECTION 3: Optional Enhancements (Browser - After Migrations)

**Return here after completing migrations in code steps**

### Step 3.1: Request SSL Certificate (Optional)

**Navigate to**: AWS Console → Certificate Manager

1. Click **"Request a certificate"** button
2. **Certificate type**: **Request a public certificate**
3. **Domain names**:
   - **Fully qualified domain name**: `your-domain.com`
   - Click **"Add another name"**:
     - `api.your-domain.com`
     - `www.your-domain.com` (optional)
4. **Validation method**: **DNS validation** (recommended)
5. Click **"Request"** button
6. **Validate certificate**:
   - Click on the certificate
   - For each domain, click **"Create record in Route 53"** (if using Route 53) OR
   - Copy the CNAME records and add them to your DNS provider
7. **Wait** for validation (~5-10 minutes)
8. Status will change to "Issued" when validated

---

### Step 3.2: Configure HTTPS Listener (Optional)

**Navigate to**: EC2 Dashboard → Load Balancers → `hive-platform-alb` → Listeners

1. Click **"Add listener"** button
2. **Protocol**: HTTPS
3. **Port**: `443`
4. **Default SSL certificate**: Select your ACM certificate
5. **Default action**: Forward to `hive-platform-frontend-tg`
6. Click **"Add"** button
7. **Add rules** (same as HTTP listener):
   - Path `/api/*` → Backend target group
   - Path `/health` → Backend target group

---

### Step 3.3: Configure Route 53 (Optional)

**Navigate to**: AWS Console → Route 53 → Hosted zones

1. Click **"Create hosted zone"** (if you don't have one)
2. **Domain name**: `your-domain.com`
3. Click **"Create hosted zone"**
4. **Create records**:
   - Click **"Create record"**
   - **Record name**: Leave blank (for root domain) or `www`
   - **Record type**: A
   - ✅ **Alias**: Enable
   - **Alias target**: 
     - **Type**: Application Load Balancer
     - **Region**: Your region
     - **Load balancer**: Select `hive-platform-alb`
   - Click **"Create records"**
5. **Create API subdomain**:
   - Click **"Create record"**
   - **Record name**: `api`
   - **Record type**: A
   - **Alias**: Application Load Balancer → `hive-platform-alb`
   - Click **"Create records"**

---

### Step 3.4: Set Up CloudWatch Alarms (Optional)

**Navigate to**: AWS Console → CloudWatch → Alarms

1. Click **"Create alarm"** button
2. **Select metric**:
   - **ECS** → **Service Metrics**
   - **Cluster name**: `hive-platform-cluster`
   - **Service name**: `hive-platform-backend-service`
   - **Metric**: `CPUUtilization`
3. **Configure alarm**:
   - **Threshold**: `80` percent
   - **Actions**: Create SNS topic for notifications (optional)
4. Click **"Create alarm"**
5. Repeat for:
   - Memory utilization
   - ALB 5xx errors
   - RDS connections

---

### Step 3.5: Enable Auto Scaling (Optional)

**Navigate to**: ECS Dashboard → Clusters → `hive-platform-cluster` → Services → `hive-platform-backend-service`

1. Click on **"Auto Scaling"** tab
2. Click **"Create Auto Scaling policy"** button
3. **Policy type**: **Target tracking**
4. **Target metric**: **CPU utilization**
5. **Target value**: `70` percent
6. **Min capacity**: `1`
7. **Max capacity**: `10`
8. Click **"Create"** button
9. Repeat for frontend service if needed

---

## ✅ COMPLETE!

**You've completed all browser steps!**

Your Hive Platform should now be fully deployed on AWS. Test your application using the ALB DNS name or custom domain.

**Next steps** (optional):
- Set up CI/CD pipeline
- Configure CloudFront CDN
- Set up WAF for security
- Implement disaster recovery plan

