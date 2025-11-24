#!/bin/bash

# AWS Environment Setup Script
# This script helps set up environment variables and secrets for AWS deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔧 AWS Environment Setup for Hive Platform${NC}"
echo ""

# Get AWS account info
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: AWS CLI not configured${NC}"
    exit 1
fi

echo -e "${BLUE}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}AWS Region: ${AWS_REGION}${NC}"
echo ""

# Function to generate random string
generate_secret() {
    openssl rand -hex 32
}

# Function to get user input with default
get_input() {
    local prompt=$1
    local default=$2
    local var_name=$3
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value=${value:-$default}
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

# Collect configuration
echo -e "${YELLOW}📝 Please provide the following information:${NC}"
echo ""

# Database configuration
get_input "RDS Endpoint" "" RDS_ENDPOINT
get_input "RDS Database Name" "hive_prod" DB_NAME
get_input "RDS Master Username" "postgres" DB_USER
read -sp "RDS Master Password: " DB_PASSWORD
echo ""

# Redis configuration
get_input "ElastiCache Redis Endpoint" "" REDIS_ENDPOINT

# S3 configuration
get_input "S3 Bucket Name" "" S3_BUCKET
get_input "S3 Region" "$AWS_REGION" S3_REGION

# OpenAI
read -sp "OpenAI API Key (optional, press Enter to skip): " OPENAI_KEY
echo ""

# Generate JWT secret
JWT_SECRET=$(generate_secret)
echo -e "${GREEN}✅ Generated JWT_SECRET${NC}"

# Domain configuration
get_input "Frontend Domain (e.g., yourdomain.com)" "" FRONTEND_DOMAIN
get_input "API Domain (e.g., api.yourdomain.com)" "" API_DOMAIN

# Create secrets JSON
SECRETS_JSON=$(cat <<EOF
{
  "JWT_SECRET": "$JWT_SECRET",
  "OPENAI_API_KEY": "${OPENAI_KEY:-}",
  "DATABASE_PASSWORD": "$DB_PASSWORD",
  "REDIS_PASSWORD": ""
}
EOF
)

echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo -e "${BLUE}RDS Endpoint: ${RDS_ENDPOINT}${NC}"
echo -e "${BLUE}Redis Endpoint: ${REDIS_ENDPOINT}${NC}"
echo -e "${BLUE}S3 Bucket: ${S3_BUCKET}${NC}"
echo -e "${BLUE}Frontend Domain: ${FRONTEND_DOMAIN}${NC}"
echo -e "${BLUE}API Domain: ${API_DOMAIN}${NC}"
echo ""

read -p "Store secrets in AWS Secrets Manager? (y/n): " STORE_SECRETS

if [ "$STORE_SECRETS" = "y" ]; then
    SECRET_NAME="hive-platform/secrets"
    
    echo -e "${YELLOW}📦 Storing secrets in AWS Secrets Manager...${NC}"
    
    # Check if secret exists
    if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region "$AWS_REGION" &>/dev/null; then
        echo -e "${YELLOW}⚠️  Secret already exists. Updating...${NC}"
        aws secretsmanager update-secret \
            --secret-id "$SECRET_NAME" \
            --secret-string "$SECRETS_JSON" \
            --region "$AWS_REGION"
    else
        aws secretsmanager create-secret \
            --name "$SECRET_NAME" \
            --description "Hive Platform secrets" \
            --secret-string "$SECRETS_JSON" \
            --region "$AWS_REGION"
    fi
    
    echo -e "${GREEN}✅ Secrets stored in AWS Secrets Manager${NC}"
    echo -e "${BLUE}Secret ARN: arn:aws:secretsmanager:${AWS_REGION}:${AWS_ACCOUNT_ID}:secret:${SECRET_NAME}${NC}"
fi

# Generate environment variable files
echo ""
echo -e "${YELLOW}📝 Generating environment variable files...${NC}"

# Backend environment variables
cat > backend/.env.aws <<EOF
# AWS Production Environment Variables
# Generated on $(date)

NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://${FRONTEND_DOMAIN}

# Database
DATABASE_URL=postgresql://${DB_USER}:\${DATABASE_PASSWORD}@${RDS_ENDPOINT}:5432/${DB_NAME}
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://${REDIS_ENDPOINT}:6379

# S3
S3_ENDPOINT=https://s3.${S3_REGION}.amazonaws.com
S3_ACCESS_KEY_ID=\${AWS_ACCESS_KEY_ID}
S3_SECRET_ACCESS_KEY=\${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=${S3_BUCKET}
S3_REGION=${S3_REGION}
S3_FORCE_PATH_STYLE=false

# OpenAI
OPENAI_API_KEY=\${OPENAI_API_KEY}
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Auth
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRES_IN=24h

# Feature Flags
USE_REAL_AI=true
DRY_RUN_APPLY=false

# Observability
LOG_LEVEL=info
ENABLE_TELEMETRY=false
EOF

# Frontend environment variables
cat > hive-platform/.env.aws <<EOF
# AWS Production Environment Variables
# Generated on $(date)

NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}
EOF

echo -e "${GREEN}✅ Environment files created:${NC}"
echo -e "${BLUE}  - backend/.env.aws${NC}"
echo -e "${BLUE}  - hive-platform/.env.aws${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "1. Review the generated .env.aws files"
echo "2. Update ECS task definitions with these environment variables"
echo "3. Reference secrets from AWS Secrets Manager in ECS task definitions"
echo "4. Keep .env.aws files secure and do not commit to git"
echo ""

