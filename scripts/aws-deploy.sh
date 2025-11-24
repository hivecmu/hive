#!/bin/bash

# AWS Deployment Script for Hive Platform
# This script builds Docker images and pushes them to ECR

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Error: AWS CLI not configured or not logged in${NC}"
    echo "Run: aws configure"
    exit 1
fi

echo -e "${GREEN}🚀 Starting AWS Deployment for Hive Platform${NC}"
echo -e "${BLUE}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}AWS Region: ${AWS_REGION}${NC}"
echo ""

# ECR Repository names
BACKEND_REPO="hive-platform-backend"
FRONTEND_REPO="hive-platform-frontend"

# ECR Base URL
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Function to check if ECR repo exists, create if not
check_or_create_repo() {
    local repo_name=$1
    echo -e "${YELLOW}📦 Checking ECR repository: ${repo_name}${NC}"
    
    if aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" &>/dev/null; then
        echo -e "${GREEN}✅ Repository ${repo_name} exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Repository ${repo_name} does not exist. Creating...${NC}"
        aws ecr create-repository --repository-name "$repo_name" --region "$AWS_REGION"
        echo -e "${GREEN}✅ Repository ${repo_name} created${NC}"
    fi
}

# Function to login to ECR
login_ecr() {
    echo -e "${YELLOW}🔐 Logging in to ECR...${NC}"
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_BASE"
    echo -e "${GREEN}✅ Logged in to ECR${NC}"
}

# Function to build and push image
build_and_push() {
    local service=$1
    local repo_name=$2
    local dockerfile_path=$3
    local context_path=$4
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Building and pushing ${service}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    local image_tag="${ECR_BASE}/${repo_name}:latest"
    local image_tag_versioned="${ECR_BASE}/${repo_name}:$(date +%Y%m%d-%H%M%S)"
    
    # Build image
    echo -e "${YELLOW}🔨 Building Docker image for ${service}...${NC}"
    cd "$context_path"
    docker build -t "$repo_name:latest" -f "$dockerfile_path" .
    echo -e "${GREEN}✅ Image built successfully${NC}"
    
    # Tag images
    echo -e "${YELLOW}🏷️  Tagging images...${NC}"
    docker tag "$repo_name:latest" "$image_tag"
    docker tag "$repo_name:latest" "$image_tag_versioned"
    echo -e "${GREEN}✅ Images tagged${NC}"
    
    # Push images
    echo -e "${YELLOW}📤 Pushing images to ECR...${NC}"
    docker push "$image_tag"
    docker push "$image_tag_versioned"
    echo -e "${GREEN}✅ Images pushed successfully${NC}"
    
    echo ""
    echo -e "${GREEN}✅ ${service} deployment complete!${NC}"
    echo -e "${BLUE}Image URI: ${image_tag}${NC}"
    echo -e "${BLUE}Versioned URI: ${image_tag_versioned}${NC}"
    
    cd - > /dev/null
}

# Main execution
main() {
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        exit 1
    fi
    
    # Get project root directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
    
    # Check or create ECR repositories
    check_or_create_repo "$BACKEND_REPO"
    check_or_create_repo "$FRONTEND_REPO"
    
    # Login to ECR
    login_ecr
    
    # Build and push backend
    build_and_push "Backend" "$BACKEND_REPO" "Dockerfile" "$PROJECT_ROOT/backend"
    
    # Build and push frontend
    build_and_push "Frontend" "$FRONTEND_REPO" "Dockerfile" "$PROJECT_ROOT/hive-platform"
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✨ Deployment Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update ECS task definitions with new image URIs"
    echo "2. Update ECS services to use new task definitions"
    echo "3. Monitor deployment in ECS console"
    echo ""
    echo -e "${BLUE}Backend Image: ${ECR_BASE}/${BACKEND_REPO}:latest${NC}"
    echo -e "${BLUE}Frontend Image: ${ECR_BASE}/${FRONTEND_REPO}:latest${NC}"
}

# Run main function
main

