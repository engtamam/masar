#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Masar Platform - AWS Deployment Script
# Deploys the platform to an AWS EC2 instance with Docker + Caddy
#
# Prerequisites:
#   1. EC2 instance running Ubuntu 22.04+ (t3.medium recommended)
#   2. Security Group open: 80 (HTTP), 443 (HTTPS), 22 (SSH)
#   3. Domain DNS A record pointing to the EC2 public IP
#   4. SSH key pair for the instance
#
# Usage:
#   ./deploy.sh                    # Full deploy (first time)
#   ./deploy.sh --update           # Update code and redeploy
#   ./deploy.sh --reset            # Wipe everything and start fresh
#   ./deploy.sh --logs             # View live logs
#   ./deploy.sh --status           # Check service status
#   ./deploy.sh --backup           # Backup database
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration (edit these) ────────────────────────────
PROJECT_NAME="masar"
DEPLOY_USER="ubuntu"                           # EC2 user (ubuntu for AWS AMIs)
DEPLOY_DIR="/home/${DEPLOY_USER}/${PROJECT_NAME}"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[MASAR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Check prerequisites ──────────────────────────────────
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if .env exists
    if [ ! -f .env ]; then
        warn ".env file not found. Creating from .env.example..."
        cp .env.example .env
        err "Please edit .env with your production values, then re-run this script."
    fi

    # Check if DOMAIN is set
    if ! grep -q "^DOMAIN=" .env || grep -q "^DOMAIN=$" .env; then
        err "DOMAIN must be set in .env (e.g., DOMAIN=masar.example.com)"
    fi

    # Check if JWT_SECRET is set and not default
    if grep -q "^JWT_SECRET=change-me" .env; then
        err "JWT_SECRET must be changed from the default value in .env"
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        log "Docker installed. You may need to log out and back in."
    fi

    # Check Docker Compose
    if ! docker compose version &> /dev/null; then
        err "Docker Compose V2 is required. Please install it: https://docs.docker.com/compose/install/"
    fi

    log "All prerequisites met!"
}

# ─── Full setup (first time) ──────────────────────────────
full_deploy() {
    log "Starting full deployment of Masar Platform..."

    check_prerequisites

    # Build Docker images
    log "Building Docker images (this may take a few minutes)..."
    docker compose -f ${COMPOSE_FILE} build --no-cache

    # Start services
    log "Starting services..."
    docker compose -f ${COMPOSE_FILE} up -d

    # Wait for web to be healthy
    log "Waiting for web service to become healthy..."
    local retries=0
    local max_retries=30
    while [ $retries -lt $max_retries ]; do
        if docker compose -f ${COMPOSE_FILE} exec web curl -sf http://localhost:3000/api > /dev/null 2>&1; then
            log "Web service is healthy!"
            break
        fi
        retries=$((retries + 1))
        log "  Waiting... ($retries/$max_retries)"
        sleep 10
    done

    if [ $retries -eq $max_retries ]; then
        err "Web service failed to become healthy. Check logs: docker compose -f ${COMPOSE_FILE} logs web"
    fi

    # Seed the database
    log "Seeding database with initial data..."
    docker compose -f ${COMPOSE_FILE} exec web bun run src/lib/seed.ts

    # Show status
    show_status

    log "╔══════════════════════════════════════════════════════════╗"
    log "║         Masar Platform deployed successfully!           ║"
    log "╠══════════════════════════════════════════════════════════╣"
    log "║                                                         ║"
    log "║  Your site: https://$(grep '^DOMAIN=' .env | cut -d= -f2)                 ║"
    log "║                                                         ║"
    log "║  Default accounts (CHANGE PASSWORDS!):                  ║"
    log "║    Admin:        admin@platform.sa / admin123           ║"
    log "║    Consultant:   consultant@platform.sa / consultant123 ║"
    log "║    Entrepreneur: entrepreneur@platform.sa / entrepreneur123║"
    log "║                                                         ║"
    log "║  Useful commands:                                       ║"
    log "║    ./deploy.sh --logs     View live logs                ║"
    log "║    ./deploy.sh --status   Check service status          ║"
    log "║    ./deploy.sh --update   Update and redeploy           ║"
    log "║    ./deploy.sh --reset    Wipe and start fresh          ║"
    log "║    ./deploy.sh --backup   Backup database               ║"
    log "╚══════════════════════════════════════════════════════════╝"
}

# ─── Update deployment ────────────────────────────────────
update_deploy() {
    log "Updating Masar Platform..."

    # Pull latest code (if using git)
    if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        log "Pulling latest code..."
        git pull origin main || warn "Git pull failed, continuing with local code..."
    fi

    # Rebuild and restart
    log "Rebuilding Docker images..."
    docker compose -f ${COMPOSE_FILE} build

    log "Restarting services..."
    docker compose -f ${COMPOSE_FILE} up -d --remove-orphans

    # Clean up old images
    docker image prune -f

    log "Update complete!"
    show_status
}

# ─── Full reset (wipe everything) ─────────────────────────
full_reset() {
    warn "This will DELETE all data including the database!"
    read -p "Are you sure? Type 'yes' to confirm: " confirmation

    if [ "$confirmation" != "yes" ]; then
        log "Reset cancelled."
        exit 0
    fi

    log "Stopping all services..."
    docker compose -f ${COMPOSE_FILE} down -v

    log "Removing all data volumes..."
    docker volume rm -f ${PROJECT_NAME}_db-data ${PROJECT_NAME}_upload-data ${PROJECT_NAME}_caddy-data ${PROJECT_NAME}_caddy-config 2>/dev/null || true

    log "Removing old images..."
    docker image prune -af

    log "Full reset complete! Run './deploy.sh' to start fresh."
}

# ─── View logs ────────────────────────────────────────────
view_logs() {
    docker compose -f ${COMPOSE_FILE} logs -f --tail=100
}

# ─── Show status ──────────────────────────────────────────
show_status() {
    log "Service Status:"
    docker compose -f ${COMPOSE_FILE} ps
    echo ""
    log "Resource Usage:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker compose -f ${COMPOSE_FILE} ps -q) 2>/dev/null || true
}

# ─── Backup database ──────────────────────────────────────
backup_database() {
    local backup_dir="./backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${backup_dir}/masar_db_${timestamp}.sqlite"

    mkdir -p ${backup_dir}

    log "Backing up database..."
    docker compose -f ${COMPOSE_FILE} exec web sqlite3 /app/db/production.db ".backup '${backup_file}'" 2>/dev/null || \
    docker compose -f ${COMPOSE_FILE} cp web:/app/db/production.db ${backup_file}

    # Compress backup
    gzip ${backup_file}
    backup_file="${backup_file}.gz"

    log "Backup saved: ${backup_file}"
    log "Size: $(du -h ${backup_file} | cut -f1)"

    # Keep only last 10 backups
    ls -t ${backup_dir}/masar_db_*.sqlite.gz | tail -n +11 | xargs rm -f 2>/dev/null || true
    log "Old backups cleaned (keeping last 10)."
}

# ─── Seed database ────────────────────────────────────────
seed_database() {
    log "Seeding database..."
    docker compose -f ${COMPOSE_FILE} exec web bun run src/lib/seed.ts
    log "Seeding complete!"
}

# ─── Main ─────────────────────────────────────────────────
case "${1:-}" in
    --update)
        update_deploy
        ;;
    --reset)
        full_reset
        ;;
    --logs)
        view_logs
        ;;
    --status)
        show_status
        ;;
    --backup)
        backup_database
        ;;
    --seed)
        seed_database
        ;;
    --help|-h)
        echo "Masar Platform Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [OPTION]"
        echo ""
        echo "Options:"
        echo "  (no option)  Full deploy (first time)"
        echo "  --update     Update code and redeploy"
        echo "  --reset      Wipe everything and start fresh"
        echo "  --logs       View live logs"
        echo "  --status     Check service status"
        echo "  --backup     Backup database"
        echo "  --seed       Seed database with initial data"
        echo "  --help       Show this help message"
        ;;
    *)
        full_deploy
        ;;
esac
