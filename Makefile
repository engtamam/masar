# ═══════════════════════════════════════════════════════════════
# Masar Platform - Makefile
# Production-ready commands for development, deployment, and maintenance
# ═══════════════════════════════════════════════════════════════

.PHONY: help dev dev-chat dev-all build start stop seed db-push db-reset \
	db-generate db-setup lint clean docker-up docker-down docker-build \
	docker-logs docker-restart prod-up prod-down prod-logs prod-status \
	prod-reset prod-update prod-backup prod-restore prod-seed setup fresh nuke \
	backup restore backup-list gen-keys deploy

# Default target
help: ## Show this help message
	@echo '╔══════════════════════════════════════════════════════════╗'
	@echo '║	    Masar Platform - Available Commands	  ║'
	@echo '╠══════════════════════════════════════════════════════════╣'
	@echo '║							 ║'
	@echo '║  Quick Start:					   ║'
	@echo '║    make setup     First-time setup (install + db + seed)║'
	@echo '║    make dev       Start development server	      ║'
	@echo '║    make fresh     Delete everything and start fresh     ║'
	@echo '║							 ║'
	@echo '║  All commands:					  ║'
	@echo '╚══════════════════════════════════════════════════════════╝'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUICK START
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

setup: ## First-time dev setup: install bun + deps + push schema + seed data

prod-setup: ## First-time production setup (direct, no Docker): install bun + deps + build + push schema + seed
	@echo "🚀 Setting up Masar Platform for production..."
	@which unzip > /dev/null 2>&1 || { echo "📦 Installing system dependencies..."; sudo apt update -qq && sudo apt install -y unzip curl; }\n       @which bun > /dev/null 2>&1 || { echo "📦 Installing Bun..."; curl -fsSL https://bun.sh/install | bash; . ~/.bashrc; }
	@mkdir -p db upload/templates
	bun install
	bun run db:generate
	bun run db:push
	bun run src/lib/seed.ts
	bun run build
	@echo ""
	@echo "✅ Production setup complete! Run 'make start' to start the server."
	@echo ""
	@echo "📋 Admin Account (only account seeded):"
	@echo "   Email:    admin@masar.sa"
	@echo "   Password: admin123"


fresh: ## Delete everything, reinstall, and start fresh
	@echo "⚠️  This will delete ALL data and reinstall everything..."
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
	rm -rf .next
	rm -rf node_modules
	rm -rf db/custom.db
	rm -rf db/production.db
	@which unzip > /dev/null 2>&1 || { echo "📦 Installing system dependencies..."; sudo apt update -qq && sudo apt install -y unzip curl; }\n       @which bun > /dev/null 2>&1 || { echo "📦 Installing Bun..."; curl -fsSL https://bun.sh/install | bash; . ~/.bashrc; }
	bun install
	bun run db:generate
	bun run db:push
	bun run src/lib/seed.ts
	@echo "✅ Fresh setup complete! Run 'make dev' to start."

nuke: ## Nuclear option: delete EVERYTHING (files + Docker containers/volumes/images + .env)
	@echo '╔══════════════════════════════════════════════════════════╗'
	@echo '║  ☢️  WARNING: THIS WILL DESTROY EVERYTHING!	     ║'
	@echo '║  - All local files (.next, node_modules, db, uploads)   ║'
	@echo '║  - All .env files				       ║'
	@echo '║  - All Docker containers, volumes, images, networks     ║'
	@echo '║  - All backups					  ║'
	@echo '║							 ║'
	@echo '║  There is NO undo. You will start from ZERO.	    ║'
	@echo '╚══════════════════════════════════════════════════════════╝'
	@read -p "Type 'DESTROY' to confirm: " confirm && [ "$$confirm" = "DESTROY" ] || exit 1
	@echo ''
	@echo '🛑 Stopping and removing Docker containers...'
	docker compose -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
	docker compose down -v --remove-orphans 2>/dev/null || true
	@echo '🛑 Removing Docker images...'
	docker rmi $$(docker images -q --filter reference='masar*') 2>/dev/null || true
	@echo '🛑 Pruning unused Docker resources...'
	docker system prune -af --volumes 2>/dev/null || true
	@echo '🛑 Deleting all local files...'
	rm -rf .next node_modules db/ upload/ backups/
	rm -rf mini-services/chat-service/node_modules
	rm -f .env .env.local
	@echo ''
	@echo '☢️  Everything destroyed. Starting from scratch:'
	@echo '   1. cp .env.example .env'
	@echo '   2. make gen-keys'
	@echo '   3. make setup   (for dev)  OR  make prod-setup  (for production)'
	@echo '   4. make deploy  (for Docker production)'

deploy: ## Deploy with Docker (Caddy + Web + Chat) — same as bash deploy.sh
	@bash deploy.sh

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

backup: ## Backup dev database + uploaded files (save to ./backups/)
	@mkdir -p backups
	@echo "📦 Backing up database..."
	cp db/custom.db backups/masar_db_$$(date +%Y%m%d_%H%M%S).sqlite 2>/dev/null || echo "⚠️  No dev database found (skipping)"
	@echo "📦 Backing up uploaded files..."
	@mkdir -p /tmp/masar_backup_upload
	tar -czf backups/masar_upload_$$(date +%Y%m%d_%H%M%S).tar.gz -C upload . 2>/dev/null || echo "⚠️  No uploaded files found (skipping)"
	@echo "📦 Backing up templates..."
	tar -czf backups/masar_templates_$$(date +%Y%m%d_%H%M%S).tar.gz -C upload/templates . 2>/dev/null || echo "⚠️  No templates found (skipping)"
	@echo "📦 Backing up .env files..."
	cp .env backups/env_dev_$$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
	cp .env.production backups/env_prod_$$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
	@echo "✅ Backup complete! Files saved to ./backups/"

restore: ## Restore from a backup file (usage: make restore DB=file.sqlite UPLOAD=file.tar.gz)
	@echo "⚠️  This will OVERWRITE current database and files!"
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@if [ -z "$$DB" ]; then echo "❌ Specify DB file: make restore DB=backups/masar_db_XXXXX.sqlite"; exit 1; fi
	@if [ ! -f "$$DB" ]; then echo "❌ File not found: $$DB"; exit 1; fi
	@echo "📥 Restoring database..."
	cp "$$DB" db/custom.db
	@echo "📥 Restoring uploaded files (if specified)..."
	@if [ -n "$$UPLOAD" ] && [ -f "$$UPLOAD" ]; then \
		rm -rf upload/* 2>/dev/null; \
		tar -xzf "$$UPLOAD" -C upload/; \
		echo "  ✅ Upload files restored"; \
	fi
	@echo "📥 Restoring templates (if specified)..."
	@if [ -n "$$TEMPLATES" ] && [ -f "$$TEMPLATES" ]; then \
		mkdir -p upload/templates; \
		tar -xzf "$$TEMPLATES" -C upload/templates/; \
		echo "  ✅ Templates restored"; \
	fi
	@echo "📥 Restoring env files (if specified)..."
	@if [ -n "$$ENV" ] && [ -f "$$ENV" ]; then \
		cp "$$ENV" .env; \
		echo "  ✅ .env restored"; \
	fi
	bun run db:generate
	@echo "✅ Restore complete! Run 'make dev' to start."

backup-list: ## List all available backups
	@echo "📁 Available backups in ./backups/"
	@echo "───────────────────────────────────"
	@ls -lht backups/ 2>/dev/null || echo "  (no backups found)"

prod-backup: ## Backup production database + files
	@mkdir -p backups
	@echo "📦 Backing up production database..."
	docker compose -f docker-compose.prod.yml cp web:/app/db/production.db ./backups/masar_prod_db_$$(date +%Y%m%d_%H%M%S).sqlite
	@echo "📦 Backing up production uploaded files..."
	docker compose -f docker-compose.prod.yml cp web:/app/upload ./backups/masar_prod_upload_$$(date +%Y%m%d_%H%M%S) 2>/dev/null || echo "⚠️  No uploaded files (skipping)"
	@echo "✅ Production backup saved to ./backups/"

prod-restore: ## Restore production DB (usage: make prod-restore DB=backups/file.sqlite)
	@if [ -z "$$DB" ]; then echo "❌ Specify DB file: make prod-restore DB=backups/masar_prod_db_XXXXX.sqlite"; exit 1; fi
	@if [ ! -f "$$DB" ]; then echo "❌ File not found: $$DB"; exit 1; fi
	@echo "⚠️  This will OVERWRITE the production database!"
	@read -p "Type 'yes' to confirm: " confirm && [ "$$confirm" = "yes" ] || exit 1
	@echo "📥 Restoring production database..."
	docker compose -f docker-compose.prod.yml cp "$$DB" web:/app/db/production.db
	@echo "✅ Production database restored! Restart the service: make prod-down && make prod-up"

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

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECURITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

gen-keys: ## Generate secure random keys (JWT_SECRET + ENCRYPTION_KEY) and update .env
	@bash scripts/gen-keys.sh
