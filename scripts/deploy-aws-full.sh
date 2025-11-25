#!/bin/bash

# =============================================================================
# HIVE PLATFORM - Full AWS Deployment Script
# =============================================================================
# This script provisions all AWS infrastructure and deploys the application
# Requirements: AWS CLI configured, Docker running
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="hive-platform"
ENVIRONMENT="${ENVIRONMENT:-prod}"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${GREEN}"
echo "============================================================================="
echo "  HIVE PLATFORM - AWS DEPLOYMENT"
echo "============================================================================="
echo -e "${NC}"
echo -e "${BLUE}AWS Account:${NC} $AWS_ACCOUNT_ID"
echo -e "${BLUE}Region:${NC} $AWS_REGION"
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo ""

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Resource names
VPC_NAME="${APP_NAME}-vpc"
ECS_CLUSTER_NAME="${APP_NAME}-cluster"
BACKEND_SERVICE_NAME="${APP_NAME}-backend"
FRONTEND_SERVICE_NAME="${APP_NAME}-frontend"
BACKEND_REPO_NAME="${APP_NAME}-backend"
FRONTEND_REPO_NAME="${APP_NAME}-frontend"
RDS_INSTANCE_ID="${APP_NAME}-db"
REDIS_CLUSTER_ID="${APP_NAME}-redis"
S3_BUCKET_NAME="${APP_NAME}-files-${AWS_ACCOUNT_ID}"
SECRET_NAME="${APP_NAME}/secrets"
ALB_NAME="${APP_NAME}-alb"
LOG_GROUP_BACKEND="/ecs/${APP_NAME}-backend"
LOG_GROUP_FRONTEND="/ecs/${APP_NAME}-frontend"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_info() {
    echo -e "${BLUE}  ℹ $1${NC}"
}

log_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}  ⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

# =============================================================================
# STEP 1: CREATE VPC AND NETWORKING
# =============================================================================

create_vpc() {
    log_step "STEP 1: Creating VPC and Networking"

    # Check if VPC exists
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=${VPC_NAME}" --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "None")

    if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
        log_info "VPC already exists: $VPC_ID"
    else
        log_info "Creating VPC..."
        VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)
        aws ec2 create-tags --resources $VPC_ID --tags Key=Name,Value=${VPC_NAME}
        aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames
        aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support
        log_success "VPC created: $VPC_ID"
    fi

    # Create Internet Gateway
    IGW_ID=$(aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=${VPC_ID}" --query 'InternetGateways[0].InternetGatewayId' --output text 2>/dev/null || echo "None")

    if [ "$IGW_ID" == "None" ] || [ -z "$IGW_ID" ]; then
        log_info "Creating Internet Gateway..."
        IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
        aws ec2 attach-internet-gateway --internet-gateway-id $IGW_ID --vpc-id $VPC_ID
        aws ec2 create-tags --resources $IGW_ID --tags Key=Name,Value=${APP_NAME}-igw
        log_success "Internet Gateway created: $IGW_ID"
    else
        log_info "Internet Gateway exists: $IGW_ID"
    fi

    # Create public subnets in different AZs
    AZS=($(aws ec2 describe-availability-zones --query 'AvailabilityZones[0:2].ZoneName' --output text))

    PUBLIC_SUBNET_1=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP_NAME}-public-1" --query 'Subnets[0].SubnetId' --output text 2>/dev/null || echo "None")
    if [ "$PUBLIC_SUBNET_1" == "None" ] || [ -z "$PUBLIC_SUBNET_1" ]; then
        log_info "Creating public subnet 1..."
        PUBLIC_SUBNET_1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ${AZS[0]} --query 'Subnet.SubnetId' --output text)
        aws ec2 create-tags --resources $PUBLIC_SUBNET_1 --tags Key=Name,Value=${APP_NAME}-public-1
        aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_1 --map-public-ip-on-launch
        log_success "Public subnet 1 created: $PUBLIC_SUBNET_1"
    else
        log_info "Public subnet 1 exists: $PUBLIC_SUBNET_1"
    fi

    PUBLIC_SUBNET_2=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP_NAME}-public-2" --query 'Subnets[0].SubnetId' --output text 2>/dev/null || echo "None")
    if [ "$PUBLIC_SUBNET_2" == "None" ] || [ -z "$PUBLIC_SUBNET_2" ]; then
        log_info "Creating public subnet 2..."
        PUBLIC_SUBNET_2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ${AZS[1]} --query 'Subnet.SubnetId' --output text)
        aws ec2 create-tags --resources $PUBLIC_SUBNET_2 --tags Key=Name,Value=${APP_NAME}-public-2
        aws ec2 modify-subnet-attribute --subnet-id $PUBLIC_SUBNET_2 --map-public-ip-on-launch
        log_success "Public subnet 2 created: $PUBLIC_SUBNET_2"
    else
        log_info "Public subnet 2 exists: $PUBLIC_SUBNET_2"
    fi

    # Create private subnets for RDS/ElastiCache
    PRIVATE_SUBNET_1=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP_NAME}-private-1" --query 'Subnets[0].SubnetId' --output text 2>/dev/null || echo "None")
    if [ "$PRIVATE_SUBNET_1" == "None" ] || [ -z "$PRIVATE_SUBNET_1" ]; then
        log_info "Creating private subnet 1..."
        PRIVATE_SUBNET_1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.10.0/24 --availability-zone ${AZS[0]} --query 'Subnet.SubnetId' --output text)
        aws ec2 create-tags --resources $PRIVATE_SUBNET_1 --tags Key=Name,Value=${APP_NAME}-private-1
        log_success "Private subnet 1 created: $PRIVATE_SUBNET_1"
    else
        log_info "Private subnet 1 exists: $PRIVATE_SUBNET_1"
    fi

    PRIVATE_SUBNET_2=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP_NAME}-private-2" --query 'Subnets[0].SubnetId' --output text 2>/dev/null || echo "None")
    if [ "$PRIVATE_SUBNET_2" == "None" ] || [ -z "$PRIVATE_SUBNET_2" ]; then
        log_info "Creating private subnet 2..."
        PRIVATE_SUBNET_2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.11.0/24 --availability-zone ${AZS[1]} --query 'Subnet.SubnetId' --output text)
        aws ec2 create-tags --resources $PRIVATE_SUBNET_2 --tags Key=Name,Value=${APP_NAME}-private-2
        log_success "Private subnet 2 created: $PRIVATE_SUBNET_2"
    else
        log_info "Private subnet 2 exists: $PRIVATE_SUBNET_2"
    fi

    # Create/update route table for public subnets
    ROUTE_TABLE_ID=$(aws ec2 describe-route-tables --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=${APP_NAME}-public-rt" --query 'RouteTables[0].RouteTableId' --output text 2>/dev/null || echo "None")
    if [ "$ROUTE_TABLE_ID" == "None" ] || [ -z "$ROUTE_TABLE_ID" ]; then
        log_info "Creating route table..."
        ROUTE_TABLE_ID=$(aws ec2 create-route-table --vpc-id $VPC_ID --query 'RouteTable.RouteTableId' --output text)
        aws ec2 create-tags --resources $ROUTE_TABLE_ID --tags Key=Name,Value=${APP_NAME}-public-rt
        aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID
        aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $PUBLIC_SUBNET_1
        aws ec2 associate-route-table --route-table-id $ROUTE_TABLE_ID --subnet-id $PUBLIC_SUBNET_2
        log_success "Route table created and associated"
    else
        log_info "Route table exists: $ROUTE_TABLE_ID"
    fi

    # Export variables
    export VPC_ID PUBLIC_SUBNET_1 PUBLIC_SUBNET_2 PRIVATE_SUBNET_1 PRIVATE_SUBNET_2

    log_success "VPC and networking setup complete"
}

# =============================================================================
# STEP 2: CREATE SECURITY GROUPS
# =============================================================================

create_security_groups() {
    log_step "STEP 2: Creating Security Groups"

    # ALB Security Group
    ALB_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${APP_NAME}-alb-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    if [ "$ALB_SG_ID" == "None" ] || [ -z "$ALB_SG_ID" ]; then
        log_info "Creating ALB security group..."
        ALB_SG_ID=$(aws ec2 create-security-group --group-name ${APP_NAME}-alb-sg --description "ALB Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
        aws ec2 authorize-security-group-ingress --group-id $ALB_SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
        aws ec2 create-tags --resources $ALB_SG_ID --tags Key=Name,Value=${APP_NAME}-alb-sg
        log_success "ALB security group created: $ALB_SG_ID"
    else
        log_info "ALB security group exists: $ALB_SG_ID"
    fi

    # ECS Security Group
    ECS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${APP_NAME}-ecs-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    if [ "$ECS_SG_ID" == "None" ] || [ -z "$ECS_SG_ID" ]; then
        log_info "Creating ECS security group..."
        ECS_SG_ID=$(aws ec2 create-security-group --group-name ${APP_NAME}-ecs-sg --description "ECS Tasks Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3000 --source-group $ALB_SG_ID
        aws ec2 authorize-security-group-ingress --group-id $ECS_SG_ID --protocol tcp --port 3001 --source-group $ALB_SG_ID
        aws ec2 create-tags --resources $ECS_SG_ID --tags Key=Name,Value=${APP_NAME}-ecs-sg
        log_success "ECS security group created: $ECS_SG_ID"
    else
        log_info "ECS security group exists: $ECS_SG_ID"
    fi

    # RDS Security Group
    RDS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${APP_NAME}-rds-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    if [ "$RDS_SG_ID" == "None" ] || [ -z "$RDS_SG_ID" ]; then
        log_info "Creating RDS security group..."
        RDS_SG_ID=$(aws ec2 create-security-group --group-name ${APP_NAME}-rds-sg --description "RDS Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id $RDS_SG_ID --protocol tcp --port 5432 --source-group $ECS_SG_ID
        aws ec2 create-tags --resources $RDS_SG_ID --tags Key=Name,Value=${APP_NAME}-rds-sg
        log_success "RDS security group created: $RDS_SG_ID"
    else
        log_info "RDS security group exists: $RDS_SG_ID"
    fi

    # Redis Security Group
    REDIS_SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${APP_NAME}-redis-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    if [ "$REDIS_SG_ID" == "None" ] || [ -z "$REDIS_SG_ID" ]; then
        log_info "Creating Redis security group..."
        REDIS_SG_ID=$(aws ec2 create-security-group --group-name ${APP_NAME}-redis-sg --description "Redis Security Group" --vpc-id $VPC_ID --query 'GroupId' --output text)
        aws ec2 authorize-security-group-ingress --group-id $REDIS_SG_ID --protocol tcp --port 6379 --source-group $ECS_SG_ID
        aws ec2 create-tags --resources $REDIS_SG_ID --tags Key=Name,Value=${APP_NAME}-redis-sg
        log_success "Redis security group created: $REDIS_SG_ID"
    else
        log_info "Redis security group exists: $REDIS_SG_ID"
    fi

    export ALB_SG_ID ECS_SG_ID RDS_SG_ID REDIS_SG_ID
    log_success "Security groups setup complete"
}

# =============================================================================
# STEP 3: CREATE S3 BUCKET
# =============================================================================

create_s3_bucket() {
    log_step "STEP 3: Creating S3 Bucket"

    if aws s3api head-bucket --bucket "$S3_BUCKET_NAME" 2>/dev/null; then
        log_info "S3 bucket already exists: $S3_BUCKET_NAME"
    else
        log_info "Creating S3 bucket..."
        if [ "$AWS_REGION" == "us-east-1" ]; then
            aws s3api create-bucket --bucket "$S3_BUCKET_NAME"
        else
            aws s3api create-bucket --bucket "$S3_BUCKET_NAME" --create-bucket-configuration LocationConstraint=$AWS_REGION
        fi

        # Enable versioning
        aws s3api put-bucket-versioning --bucket "$S3_BUCKET_NAME" --versioning-configuration Status=Enabled

        # Block public access
        aws s3api put-public-access-block --bucket "$S3_BUCKET_NAME" --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

        log_success "S3 bucket created: $S3_BUCKET_NAME"
    fi

    export S3_BUCKET_NAME
}

# =============================================================================
# STEP 4: CREATE RDS POSTGRESQL
# =============================================================================

create_rds() {
    log_step "STEP 4: Creating RDS PostgreSQL"

    # Create DB subnet group
    SUBNET_GROUP_EXISTS=$(aws rds describe-db-subnet-groups --db-subnet-group-name ${APP_NAME}-db-subnet --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text 2>/dev/null || echo "None")
    if [ "$SUBNET_GROUP_EXISTS" == "None" ]; then
        log_info "Creating DB subnet group..."
        aws rds create-db-subnet-group \
            --db-subnet-group-name ${APP_NAME}-db-subnet \
            --db-subnet-group-description "Hive Platform DB Subnet Group" \
            --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2
        log_success "DB subnet group created"
    else
        log_info "DB subnet group exists"
    fi

    # Check if RDS instance exists
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "None")

    if [ "$RDS_STATUS" == "None" ]; then
        log_info "Creating RDS PostgreSQL instance (this may take 5-10 minutes)..."

        # Generate password
        DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)

        aws rds create-db-instance \
            --db-instance-identifier $RDS_INSTANCE_ID \
            --db-instance-class db.t3.micro \
            --engine postgres \
            --engine-version 16 \
            --master-username postgres \
            --master-user-password "$DB_PASSWORD" \
            --allocated-storage 20 \
            --db-name hive_prod \
            --vpc-security-group-ids $RDS_SG_ID \
            --db-subnet-group-name ${APP_NAME}-db-subnet \
            --no-publicly-accessible \
            --backup-retention-period 7 \
            --storage-encrypted \
            --tags Key=Name,Value=${APP_NAME}-db

        log_info "Waiting for RDS to be available..."
        aws rds wait db-instance-available --db-instance-identifier $RDS_INSTANCE_ID

        log_success "RDS instance created"
        export DB_PASSWORD
    else
        log_info "RDS instance exists (status: $RDS_STATUS)"
        DB_PASSWORD="EXISTING_PASSWORD"
    fi

    # Get RDS endpoint
    RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE_ID --query 'DBInstances[0].Endpoint.Address' --output text)
    export RDS_ENDPOINT
    log_info "RDS Endpoint: $RDS_ENDPOINT"
}

# =============================================================================
# STEP 5: CREATE ELASTICACHE REDIS
# =============================================================================

create_redis() {
    log_step "STEP 5: Creating ElastiCache Redis"

    # Create cache subnet group
    CACHE_SUBNET_EXISTS=$(aws elasticache describe-cache-subnet-groups --cache-subnet-group-name ${APP_NAME}-cache-subnet --query 'CacheSubnetGroups[0].CacheSubnetGroupName' --output text 2>/dev/null || echo "None")
    if [ "$CACHE_SUBNET_EXISTS" == "None" ]; then
        log_info "Creating cache subnet group..."
        aws elasticache create-cache-subnet-group \
            --cache-subnet-group-name ${APP_NAME}-cache-subnet \
            --cache-subnet-group-description "Hive Platform Cache Subnet Group" \
            --subnet-ids $PRIVATE_SUBNET_1 $PRIVATE_SUBNET_2
        log_success "Cache subnet group created"
    else
        log_info "Cache subnet group exists"
    fi

    # Check if Redis cluster exists
    REDIS_STATUS=$(aws elasticache describe-cache-clusters --cache-cluster-id $REDIS_CLUSTER_ID --query 'CacheClusters[0].CacheClusterStatus' --output text 2>/dev/null || echo "None")

    if [ "$REDIS_STATUS" == "None" ]; then
        log_info "Creating ElastiCache Redis cluster..."

        aws elasticache create-cache-cluster \
            --cache-cluster-id $REDIS_CLUSTER_ID \
            --cache-node-type cache.t3.micro \
            --engine redis \
            --num-cache-nodes 1 \
            --cache-subnet-group-name ${APP_NAME}-cache-subnet \
            --security-group-ids $REDIS_SG_ID \
            --tags Key=Name,Value=${APP_NAME}-redis

        log_info "Waiting for Redis to be available..."
        aws elasticache wait cache-cluster-available --cache-cluster-id $REDIS_CLUSTER_ID

        log_success "Redis cluster created"
    else
        log_info "Redis cluster exists (status: $REDIS_STATUS)"
    fi

    # Get Redis endpoint
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id $REDIS_CLUSTER_ID --show-cache-node-info --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
    export REDIS_ENDPOINT
    log_info "Redis Endpoint: $REDIS_ENDPOINT"
}

# =============================================================================
# STEP 6: CREATE SECRETS IN SECRETS MANAGER
# =============================================================================

create_secrets() {
    log_step "STEP 6: Creating Secrets in Secrets Manager"

    # Get OpenAI key from local .env if exists
    OPENAI_KEY=""
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        OPENAI_KEY=$(grep OPENAI_API_KEY "$PROJECT_ROOT/backend/.env" | cut -d '=' -f2 || echo "")
    fi

    # Get Mistral key from local .env if exists
    MISTRAL_KEY=""
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        MISTRAL_KEY=$(grep MISTRAL_API_KEY "$PROJECT_ROOT/backend/.env" | cut -d '=' -f2 || echo "")
    fi

    # Generate JWT secret if not set
    JWT_SECRET=$(openssl rand -hex 32)

    # Database URL
    DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/hive_prod"

    # Create secrets JSON
    SECRETS_JSON=$(cat <<EOF
{
    "JWT_SECRET": "${JWT_SECRET}",
    "OPENAI_API_KEY": "${OPENAI_KEY}",
    "MISTRAL_API_KEY": "${MISTRAL_KEY}",
    "DATABASE_URL": "${DATABASE_URL}",
    "DATABASE_PASSWORD": "${DB_PASSWORD}"
}
EOF
)

    # Check if secret exists
    SECRET_EXISTS=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --query 'Name' --output text 2>/dev/null || echo "None")

    if [ "$SECRET_EXISTS" == "None" ]; then
        log_info "Creating secrets..."
        aws secretsmanager create-secret \
            --name $SECRET_NAME \
            --description "Hive Platform Secrets" \
            --secret-string "$SECRETS_JSON"
        log_success "Secrets created"
    else
        log_info "Updating existing secrets..."
        aws secretsmanager update-secret \
            --secret-id $SECRET_NAME \
            --secret-string "$SECRETS_JSON"
        log_success "Secrets updated"
    fi

    # Get secret ARN
    SECRET_ARN=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --query 'ARN' --output text)
    export SECRET_ARN
    log_info "Secret ARN: $SECRET_ARN"
}

# =============================================================================
# STEP 7: CREATE IAM ROLES
# =============================================================================

create_iam_roles() {
    log_step "STEP 7: Creating IAM Roles"

    # ECS Execution Role
    EXEC_ROLE_EXISTS=$(aws iam get-role --role-name ${APP_NAME}-ecs-execution-role --query 'Role.RoleName' --output text 2>/dev/null || echo "None")

    if [ "$EXEC_ROLE_EXISTS" == "None" ]; then
        log_info "Creating ECS execution role..."

        # Trust policy for ECS
        cat > /tmp/ecs-trust-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

        aws iam create-role \
            --role-name ${APP_NAME}-ecs-execution-role \
            --assume-role-policy-document file:///tmp/ecs-trust-policy.json

        aws iam attach-role-policy \
            --role-name ${APP_NAME}-ecs-execution-role \
            --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

        # Add secrets access
        cat > /tmp/secrets-policy.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "${SECRET_ARN}"
        }
    ]
}
EOF

        aws iam put-role-policy \
            --role-name ${APP_NAME}-ecs-execution-role \
            --policy-name SecretsAccess \
            --policy-document file:///tmp/secrets-policy.json

        log_success "ECS execution role created"
    else
        log_info "ECS execution role exists"
    fi

    # ECS Task Role
    TASK_ROLE_EXISTS=$(aws iam get-role --role-name ${APP_NAME}-ecs-task-role --query 'Role.RoleName' --output text 2>/dev/null || echo "None")

    if [ "$TASK_ROLE_EXISTS" == "None" ]; then
        log_info "Creating ECS task role..."

        aws iam create-role \
            --role-name ${APP_NAME}-ecs-task-role \
            --assume-role-policy-document file:///tmp/ecs-trust-policy.json

        # S3 access policy
        cat > /tmp/s3-policy.json <<EOF
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
                "arn:aws:s3:::${S3_BUCKET_NAME}",
                "arn:aws:s3:::${S3_BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF

        aws iam put-role-policy \
            --role-name ${APP_NAME}-ecs-task-role \
            --policy-name S3Access \
            --policy-document file:///tmp/s3-policy.json

        log_success "ECS task role created"
    else
        log_info "ECS task role exists"
    fi

    EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${APP_NAME}-ecs-execution-role"
    TASK_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${APP_NAME}-ecs-task-role"
    export EXECUTION_ROLE_ARN TASK_ROLE_ARN

    # Clean up temp files
    rm -f /tmp/ecs-trust-policy.json /tmp/secrets-policy.json /tmp/s3-policy.json
}

# =============================================================================
# STEP 8: CREATE ECR REPOSITORIES
# =============================================================================

create_ecr_repos() {
    log_step "STEP 8: Creating ECR Repositories"

    for REPO in $BACKEND_REPO_NAME $FRONTEND_REPO_NAME; do
        REPO_EXISTS=$(aws ecr describe-repositories --repository-names $REPO --query 'repositories[0].repositoryName' --output text 2>/dev/null || echo "None")

        if [ "$REPO_EXISTS" == "None" ]; then
            log_info "Creating ECR repository: $REPO"
            aws ecr create-repository --repository-name $REPO
            log_success "ECR repository created: $REPO"
        else
            log_info "ECR repository exists: $REPO"
        fi
    done

    ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    export ECR_BASE
}

# =============================================================================
# STEP 9: BUILD AND PUSH DOCKER IMAGES
# =============================================================================

build_and_push_images() {
    log_step "STEP 9: Building and Pushing Docker Images"

    # Login to ECR
    log_info "Logging in to ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_BASE
    log_success "Logged in to ECR"

    # Build and push backend
    log_info "Building backend image..."
    cd "$PROJECT_ROOT/backend"
    docker build -t ${BACKEND_REPO_NAME}:latest .
    docker tag ${BACKEND_REPO_NAME}:latest ${ECR_BASE}/${BACKEND_REPO_NAME}:latest
    log_info "Pushing backend image..."
    docker push ${ECR_BASE}/${BACKEND_REPO_NAME}:latest
    log_success "Backend image pushed"

    # Build and push frontend
    log_info "Building frontend image..."
    cd "$PROJECT_ROOT/hive-platform"
    docker build -t ${FRONTEND_REPO_NAME}:latest .
    docker tag ${FRONTEND_REPO_NAME}:latest ${ECR_BASE}/${FRONTEND_REPO_NAME}:latest
    log_info "Pushing frontend image..."
    docker push ${ECR_BASE}/${FRONTEND_REPO_NAME}:latest
    log_success "Frontend image pushed"

    cd "$PROJECT_ROOT"
}

# =============================================================================
# STEP 10: CREATE CLOUDWATCH LOG GROUPS
# =============================================================================

create_log_groups() {
    log_step "STEP 10: Creating CloudWatch Log Groups"

    for LOG_GROUP in $LOG_GROUP_BACKEND $LOG_GROUP_FRONTEND; do
        LOG_EXISTS=$(aws logs describe-log-groups --log-group-name-prefix $LOG_GROUP --query 'logGroups[0].logGroupName' --output text 2>/dev/null || echo "None")

        if [ "$LOG_EXISTS" == "None" ] || [ "$LOG_EXISTS" != "$LOG_GROUP" ]; then
            log_info "Creating log group: $LOG_GROUP"
            aws logs create-log-group --log-group-name $LOG_GROUP
            aws logs put-retention-policy --log-group-name $LOG_GROUP --retention-in-days 30
            log_success "Log group created: $LOG_GROUP"
        else
            log_info "Log group exists: $LOG_GROUP"
        fi
    done
}

# =============================================================================
# STEP 11: CREATE APPLICATION LOAD BALANCER
# =============================================================================

create_alb() {
    log_step "STEP 11: Creating Application Load Balancer"

    # Check if ALB exists
    ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "None")

    if [ "$ALB_ARN" == "None" ]; then
        log_info "Creating Application Load Balancer..."
        ALB_ARN=$(aws elbv2 create-load-balancer \
            --name $ALB_NAME \
            --subnets $PUBLIC_SUBNET_1 $PUBLIC_SUBNET_2 \
            --security-groups $ALB_SG_ID \
            --scheme internet-facing \
            --type application \
            --query 'LoadBalancers[0].LoadBalancerArn' \
            --output text)
        log_success "ALB created: $ALB_ARN"
    else
        log_info "ALB exists: $ALB_ARN"
    fi

    # Get ALB DNS
    ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].DNSName' --output text)
    log_info "ALB DNS: $ALB_DNS"

    # Create target groups
    # Backend target group
    BACKEND_TG_ARN=$(aws elbv2 describe-target-groups --names ${APP_NAME}-backend-tg --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "None")

    if [ "$BACKEND_TG_ARN" == "None" ]; then
        log_info "Creating backend target group..."
        BACKEND_TG_ARN=$(aws elbv2 create-target-group \
            --name ${APP_NAME}-backend-tg \
            --protocol HTTP \
            --port 3001 \
            --vpc-id $VPC_ID \
            --target-type ip \
            --health-check-path /health \
            --health-check-interval-seconds 30 \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)
        log_success "Backend target group created"
    else
        log_info "Backend target group exists"
    fi

    # Frontend target group
    FRONTEND_TG_ARN=$(aws elbv2 describe-target-groups --names ${APP_NAME}-frontend-tg --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || echo "None")

    if [ "$FRONTEND_TG_ARN" == "None" ]; then
        log_info "Creating frontend target group..."
        FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
            --name ${APP_NAME}-frontend-tg \
            --protocol HTTP \
            --port 3000 \
            --vpc-id $VPC_ID \
            --target-type ip \
            --health-check-path / \
            --health-check-interval-seconds 30 \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)
        log_success "Frontend target group created"
    else
        log_info "Frontend target group exists"
    fi

    # Create listeners
    LISTENER_EXISTS=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[0].ListenerArn' --output text 2>/dev/null || echo "None")

    if [ "$LISTENER_EXISTS" == "None" ]; then
        log_info "Creating ALB listener..."
        LISTENER_ARN=$(aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTP \
            --port 80 \
            --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG_ARN \
            --query 'Listeners[0].ListenerArn' \
            --output text)

        # Add rule for API traffic
        aws elbv2 create-rule \
            --listener-arn $LISTENER_ARN \
            --conditions Field=path-pattern,Values='/api/*' \
            --priority 1 \
            --actions Type=forward,TargetGroupArn=$BACKEND_TG_ARN

        log_success "ALB listener and rules created"
    else
        log_info "ALB listener exists"
    fi

    export ALB_ARN ALB_DNS BACKEND_TG_ARN FRONTEND_TG_ARN
}

# =============================================================================
# STEP 12: CREATE ECS CLUSTER AND SERVICES
# =============================================================================

create_ecs_cluster_and_services() {
    log_step "STEP 12: Creating ECS Cluster and Services"

    # Create ECS cluster
    CLUSTER_EXISTS=$(aws ecs describe-clusters --clusters $ECS_CLUSTER_NAME --query 'clusters[0].clusterName' --output text 2>/dev/null || echo "None")

    if [ "$CLUSTER_EXISTS" == "None" ] || [ "$CLUSTER_EXISTS" == "MISSING" ]; then
        log_info "Creating ECS cluster..."
        aws ecs create-cluster --cluster-name $ECS_CLUSTER_NAME
        log_success "ECS cluster created"
    else
        log_info "ECS cluster exists"
    fi

    # Register backend task definition
    log_info "Registering backend task definition..."
    cat > /tmp/backend-task.json <<EOF
{
    "family": "${APP_NAME}-backend",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "${EXECUTION_ROLE_ARN}",
    "taskRoleArn": "${TASK_ROLE_ARN}",
    "containerDefinitions": [
        {
            "name": "backend",
            "image": "${ECR_BASE}/${BACKEND_REPO_NAME}:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3001,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "PORT", "value": "3001"},
                {"name": "HOST", "value": "0.0.0.0"},
                {"name": "CORS_ORIGINS", "value": "http://${ALB_DNS},https://${ALB_DNS}"},
                {"name": "REDIS_URL", "value": "redis://${REDIS_ENDPOINT}:6379"},
                {"name": "S3_ENDPOINT", "value": "https://s3.${AWS_REGION}.amazonaws.com"},
                {"name": "S3_BUCKET", "value": "${S3_BUCKET_NAME}"},
                {"name": "S3_REGION", "value": "${AWS_REGION}"},
                {"name": "S3_FORCE_PATH_STYLE", "value": "false"},
                {"name": "OPENAI_MODEL", "value": "gpt-4-turbo-preview"},
                {"name": "OPENAI_EMBEDDING_MODEL", "value": "text-embedding-ada-002"},
                {"name": "USE_REAL_AI", "value": "true"},
                {"name": "JWT_EXPIRES_IN", "value": "24h"},
                {"name": "LOG_LEVEL", "value": "info"}
            ],
            "secrets": [
                {"name": "JWT_SECRET", "valueFrom": "${SECRET_ARN}:JWT_SECRET::"},
                {"name": "OPENAI_API_KEY", "valueFrom": "${SECRET_ARN}:OPENAI_API_KEY::"},
                {"name": "DATABASE_URL", "valueFrom": "${SECRET_ARN}:DATABASE_URL::"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "${LOG_GROUP_BACKEND}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "backend"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
EOF

    aws ecs register-task-definition --cli-input-json file:///tmp/backend-task.json
    log_success "Backend task definition registered"

    # Register frontend task definition
    log_info "Registering frontend task definition..."
    cat > /tmp/frontend-task.json <<EOF
{
    "family": "${APP_NAME}-frontend",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "${EXECUTION_ROLE_ARN}",
    "taskRoleArn": "${TASK_ROLE_ARN}",
    "containerDefinitions": [
        {
            "name": "frontend",
            "image": "${ECR_BASE}/${FRONTEND_REPO_NAME}:latest",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 3000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {"name": "NODE_ENV", "value": "production"},
                {"name": "PORT", "value": "3000"},
                {"name": "NEXT_PUBLIC_API_URL", "value": "http://${ALB_DNS}/api"},
                {"name": "NEXT_PUBLIC_WS_URL", "value": "http://${ALB_DNS}"}
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "${LOG_GROUP_FRONTEND}",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "frontend"
                }
            },
            "healthCheck": {
                "command": ["CMD-SHELL", "node -e \"require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\""],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
EOF

    aws ecs register-task-definition --cli-input-json file:///tmp/frontend-task.json
    log_success "Frontend task definition registered"

    # Create backend service
    BACKEND_SERVICE_EXISTS=$(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $BACKEND_SERVICE_NAME --query 'services[0].serviceName' --output text 2>/dev/null || echo "None")

    if [ "$BACKEND_SERVICE_EXISTS" == "None" ] || [ "$BACKEND_SERVICE_EXISTS" == "MISSING" ]; then
        log_info "Creating backend service..."
        aws ecs create-service \
            --cluster $ECS_CLUSTER_NAME \
            --service-name $BACKEND_SERVICE_NAME \
            --task-definition ${APP_NAME}-backend \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
            --load-balancers "targetGroupArn=$BACKEND_TG_ARN,containerName=backend,containerPort=3001"
        log_success "Backend service created"
    else
        log_info "Backend service exists, updating..."
        aws ecs update-service \
            --cluster $ECS_CLUSTER_NAME \
            --service $BACKEND_SERVICE_NAME \
            --task-definition ${APP_NAME}-backend \
            --force-new-deployment
        log_success "Backend service updated"
    fi

    # Create frontend service
    FRONTEND_SERVICE_EXISTS=$(aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $FRONTEND_SERVICE_NAME --query 'services[0].serviceName' --output text 2>/dev/null || echo "None")

    if [ "$FRONTEND_SERVICE_EXISTS" == "None" ] || [ "$FRONTEND_SERVICE_EXISTS" == "MISSING" ]; then
        log_info "Creating frontend service..."
        aws ecs create-service \
            --cluster $ECS_CLUSTER_NAME \
            --service-name $FRONTEND_SERVICE_NAME \
            --task-definition ${APP_NAME}-frontend \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
            --load-balancers "targetGroupArn=$FRONTEND_TG_ARN,containerName=frontend,containerPort=3000"
        log_success "Frontend service created"
    else
        log_info "Frontend service exists, updating..."
        aws ecs update-service \
            --cluster $ECS_CLUSTER_NAME \
            --service $FRONTEND_SERVICE_NAME \
            --task-definition ${APP_NAME}-frontend \
            --force-new-deployment
        log_success "Frontend service updated"
    fi

    # Clean up temp files
    rm -f /tmp/backend-task.json /tmp/frontend-task.json
}

# =============================================================================
# STEP 13: RUN DATABASE MIGRATIONS
# =============================================================================

run_migrations() {
    log_step "STEP 13: Running Database Migrations"

    log_info "Database migrations should be run from within the ECS task or a bastion host"
    log_info "The DATABASE_URL has been stored in Secrets Manager"
    log_warn "Manual step: Connect to RDS and run migrations"
    log_info "You can use AWS Session Manager or a bastion host to run:"
    log_info "  cd backend && npm run migrate"
}

# =============================================================================
# DEPLOYMENT SUMMARY
# =============================================================================

print_summary() {
    log_step "DEPLOYMENT COMPLETE"

    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}                    HIVE PLATFORM - DEPLOYMENT SUMMARY${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Application URL:${NC}"
    echo -e "  ${BLUE}http://${ALB_DNS}${NC}"
    echo ""
    echo -e "${CYAN}API URL:${NC}"
    echo -e "  ${BLUE}http://${ALB_DNS}/api${NC}"
    echo ""
    echo -e "${CYAN}AWS Resources Created:${NC}"
    echo -e "  ${BLUE}VPC:${NC} $VPC_ID"
    echo -e "  ${BLUE}ECS Cluster:${NC} $ECS_CLUSTER_NAME"
    echo -e "  ${BLUE}RDS Endpoint:${NC} $RDS_ENDPOINT"
    echo -e "  ${BLUE}Redis Endpoint:${NC} $REDIS_ENDPOINT"
    echo -e "  ${BLUE}S3 Bucket:${NC} $S3_BUCKET_NAME"
    echo -e "  ${BLUE}ALB DNS:${NC} $ALB_DNS"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "  1. Wait for ECS services to become healthy (2-5 minutes)"
    echo "  2. Run database migrations"
    echo "  3. (Optional) Set up a custom domain with Route 53"
    echo "  4. (Optional) Add HTTPS with ACM certificate"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo "  View ECS services:"
    echo "    aws ecs describe-services --cluster $ECS_CLUSTER_NAME --services $BACKEND_SERVICE_NAME $FRONTEND_SERVICE_NAME"
    echo ""
    echo "  View logs:"
    echo "    aws logs tail $LOG_GROUP_BACKEND --follow"
    echo "    aws logs tail $LOG_GROUP_FRONTEND --follow"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker is not running"
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        exit 1
    fi

    # Run all steps
    create_vpc
    create_security_groups
    create_s3_bucket
    create_rds
    create_redis
    create_secrets
    create_iam_roles
    create_ecr_repos
    build_and_push_images
    create_log_groups
    create_alb
    create_ecs_cluster_and_services
    run_migrations
    print_summary
}

# Run main
main "$@"
