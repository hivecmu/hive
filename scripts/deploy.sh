#!/bin/bash

# =============================================================================
# One-Click AWS Deployment for Hive Platform
# =============================================================================
# This is a simple wrapper that verifies prerequisites and runs the full
# deployment script. Just run: ./scripts/deploy.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     HIVE PLATFORM - One-Click AWS Deployment                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

log_info "Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    echo "Install it with: brew install awscli"
    exit 1
fi
log_success "AWS CLI installed"

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    log_error "AWS CLI is not configured"
    echo "Run: aws configure"
    exit 1
fi
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
log_success "AWS CLI configured (Account: $AWS_ACCOUNT_ID, Region: $AWS_REGION)"

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi
log_success "Docker installed"

if ! docker info &>/dev/null; then
    log_error "Docker is not running"
    echo "Please start Docker Desktop"
    exit 1
fi
log_success "Docker is running"

# Check jq (for JSON parsing)
if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed (optional but recommended)"
    echo "Install it with: brew install jq"
else
    log_success "jq installed"
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    log_warning "Node.js is not installed (needed for migrations)"
else
    NODE_VERSION=$(node --version)
    log_success "Node.js installed ($NODE_VERSION)"
fi

echo ""
log_info "All prerequisites met!"
echo ""

# Confirm deployment
echo -e "${YELLOW}This will create AWS resources and may incur costs.${NC}"
echo -e "${YELLOW}Estimated monthly cost: ~$120-250 (depending on usage)${NC}"
echo ""
read -p "Continue with deployment? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    log_info "Deployment cancelled."
    exit 0
fi

echo ""
log_info "Starting full deployment..."
echo ""

# Run the full deployment script
cd "$PROJECT_ROOT"
exec "$SCRIPT_DIR/deploy-aws-full.sh"

