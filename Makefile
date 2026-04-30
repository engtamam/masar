# ═══════════════════════════════════════════════════════════════
# Masar Platform - Makefile
# Production-ready commands for development, deployment, and maintenance
# ═══════════════════════════════════════════════════════════════

.PHONY: help dev dev-chat dev-all build start stop seed db-push db-reset \
        db-generate db-setup lint clean docker-up docker-down docker-build \
        docker-logs docker-restart prod-up prod-down prod-logs prod-status \
        prod-reset prod-update prod-backup prod-seed setup fresh nuke

# Default target
help: ## Show this help message
        @echo '╔══════════════════════════════════════════════════════════╗'
        @echo '║            Masar Platform - Available Commands          ║'
        @echo '╠══════════════════════════════════════════════════════════╣'
        @echo '║                                                         ║'
        @echo '║  Quick Start:                                           ║'
        @echo '║    make setup     First-time setup (install + db + seed)║'
        @echo '║    make dev       Start development server              ║'
        @echo '║    make fresh     Delete everything and start fresh     ║'
        @echo '║                                                         ║'
        @echo '║  All commands:                                          ║'
        @echo '╚══════════════════════════════════════════════════════════╝'
        @echo ''
        @awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUICK START
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

setup: ## First-time setup: install deps + push schema + seed data
        @echo "🚀 Setting up Masar Platform..."
        bun install
        bun run db:generate
        bun run db:push
        bun run src/lib/seed.ts
        @echo ""
        @echo "✅ Setup complete! Run 'make dev' to start the development server."
        @echo ""
        @echo "📋 Admin Account (only account seeded):"
        @echo "   Email:    admin@masar.sa"
        @echo "   Password: admin123"
        @echo ""
        @echo "   Consultants → Created by admin from the admin panel"
        @echo "   Entrepreneurs → Register themselves from the landing page"

fresh: ## Delete everything, reinstall, and start fresh
        @echo "⚠️  This will delete ALL data and reinstall everything..."
        @read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
        rm -rf .next
        rm -rf node_modules
        rm -rf db/custom.db
        rm -rf db/production.db
        bun install
        bun run db:generate
        bun run db:push
        bun run src/lib/seed.ts
        @echo "✅ Fresh setup complete! Run 'make dev' to start."

nuke: ## Nuclear option: delete EVERYTHING including .env
        @echo "☢️  This will delete EVERYTHING including .env!"
        @read -p "Type 'DESTROY' to confirm: " confirm && [ "$$confirm" = "DESTROY" ] || exit 1
        rm -rf .next node_modules db/ .env
        rm -rf mini-services/chat-service/node_modules
        @echo "☢️  Everything destroyed. Run 'cp .env.example .env' then 'make setup'."

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEVELOPMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

dev: ## Start development server with hot reload
        bun run dev

dev-chat: ## Start chat WebSocket service
        cd mini-services/chat-service && bun run dev

dev-all: ## Start all services (web + chat)
        @echo "Starting all services..."
        @bun run dev &
        @cd mini-services/chat-service && bun run dev &
        @wait

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATABASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

db-push: ## Push Prisma schema to database
        bun run db:push

db-generate: ## Generate Prisma client
        bun run db:generate

db-reset: ## Reset database (WARNING: deletes all data)
        bun run db:reset

seed: ## Seed database with initial data (idempotent - safe to run multiple times)
        bun run src/lib/seed.ts

db-setup: db-push seed ## Setup database (push schema + seed)

db-reset-fresh: ## Reset database completely and re-seed from scratch
        @echo "Resetting database..."
        rm -f db/custom.db
        bun run db:generate
        bun run db:push
        bun run src/lib/seed.ts
        @echo "✅ Database reset and re-seeded!"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD & PRODUCTION (LOCAL)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

build: ## Build for production
        bun run build

start: ## Start production server
        bun run start

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CODE QUALITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lint: ## Run ESLint
        bun run lint

lint-fix: ## Run ESLint with auto-fix
        bun run lint --fix

typecheck: ## Run TypeScript type checking
        bun run tsc --noEmit

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCKER (DEVELOPMENT)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

docker-build: ## Build Docker images
        docker compose build

docker-up: ## Start all services with Docker Compose (dev)
        docker compose up -d

docker-down: ## Stop all Docker services
        docker compose down

docker-logs: ## View Docker logs (follow mode)
        docker compose logs -f

docker-restart: docker-down docker-up ## Restart all Docker services

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DOCKER (PRODUCTION WITH CADDY)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

prod-up: ## Start production stack (Caddy + App + Chat)
        docker compose -f docker-compose.prod.yml up -d --build

prod-down: ## Stop production stack
        docker compose -f docker-compose.prod.yml down

prod-logs: ## View production logs
        docker compose -f docker-compose.prod.yml logs -f --tail=100

prod-status: ## Check production service status
        docker compose -f docker-compose.prod.yml ps

prod-reset: ## Wipe production data and start fresh
        @echo "⚠️  This will delete ALL production data!"
        @read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
        docker compose -f docker-compose.prod.yml down -v
        docker volume prune -f
        docker compose -f docker-compose.prod.yml up -d --build
        @echo "Waiting for services to start..."
        @sleep 30
        docker compose -f docker-compose.prod.yml exec web bun run src/lib/seed.ts
        @echo "✅ Production reset complete!"

prod-update: ## Pull latest code and redeploy production
        docker compose -f docker-compose.prod.yml build --no-cache
        docker compose -f docker-compose.prod.yml up -d --remove-orphans
        docker image prune -f
        @echo "✅ Production updated!"

prod-backup: ## Backup production database
        @mkdir -p backups
        docker compose -f docker-compose.prod.yml cp web:/app/db/production.db ./backups/masar_$$(date +%Y%m%d_%H%M%S).sqlite
        @echo "✅ Backup saved to ./backups/"

prod-seed: ## Seed production database
        docker compose -f docker-compose.prod.yml exec web bun run src/lib/seed.ts

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLEANUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

clean: ## Remove build artifacts and cache
        rm -rf .next
        rm -rf node_modules/.cache
        rm -rf mini-services/chat-service/node_modules/.cache

clean-all: clean ## Full cleanup including dependencies
        rm -rf node_modules
        rm -rf mini-services/chat-service/node_modules
