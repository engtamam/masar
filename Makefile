# ═══════════════════════════════════════════════════════════════
# Masar Platform - Makefile
# Production-ready commands for development, deployment, and maintenance
# ═══════════════════════════════════════════════════════════════

.PHONY: help dev dev-chat dev-all build start stop seed db-push db-reset \
	db-generate db-setup lint clean docker-up docker-down docker-build \
	docker-logs docker-restart prod-up prod-down prod-logs prod-status \
	prod-reset prod-update prod-backup prod-restore prod-seed setup fresh nuke \
	backup restore backup-list gen-keys deploy fast-deploy ensure-bun ui-deploy ui-restart \
	test test-admin test-consultant test-entrepreneur test-prod

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUN AUTO-INSTALL — used by all targets that need bun
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ensure-bun: ## (Internal) Ensure bun is installed
	@command -v bun > /dev/null 2>&1 || { \
		echo "📦 Bun not found — installing..."; \
		curl -fsSL https://bun.sh/install | bash; \
		export PATH="$$HOME/.bun/bin:$$PATH"; \
	}
	@command -v bun > /dev/null 2>&1 || { \
		export PATH="$$HOME/.bun/bin:$$PATH"; \
		hash -r; \
		bun --version; \
	}

# Default target
help: ## Show this help message
	@echo '╔══════════════════════════════════════════════════════════╗'
	@echo '║            Masar Platform - Available Commands   ║'
	@echo '╠══════════════════════════════════════════════════════════╣'
	@echo '║                                                         ║'
	@echo '║  Quick Start:                                     ║'
	@echo '║    make setup     First-time setup (install + db + seed)║'
	@echo '║    make dev       Start development server           ║'
	@echo '║    make fresh     Delete everything and start fresh     ║'
	@echo '║                                                         ║'
	@echo '║  All commands:                                   ║'
	@echo '╚══════════════════════════════════════════════════════════╝'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUICK START
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

setup: ensure-bun ## First-time dev setup: install deps + push schema + seed data
	bun install
	bun run db:generate
	bun run db:push
	bun run src/lib/seed.ts
	@echo ""
	@echo "✅ Dev setup complete! Run 'make dev' to start."
	@echo ""
	@echo "📋 Admin Account (only account seeded):"
	@echo "   Email:    admin@masar.sa"
	@echo "   Password: admin123"

prod-setup: ensure-bun ## First-time production setup (direct, no Docker): install deps + build + push schema + seed
	@echo "🚀 Setting up Masar Platform for production..."
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

fresh: ensure-bun ## Delete everything, reinstall, and start fresh
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

nuke: ## Nuclear option: delete EVERYTHING — run: make nuke CONFIRM=DESTROY
ifeq ($(CONFIRM),DESTROY)
	@echo '🛑 Nuking everything...'
	@echo '🛑 Stopping Docker containers...'
	-docker compose -f docker-compose.prod.yml down -v --remove-orphans
	-docker compose down -v --remove-orphans
	@echo '🛑 Removing Docker images...'
	-docker system prune -af --volumes
	@echo '🛑 Deleting all local files...'
	-powershell -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue .next, node_modules, db, upload, backups, mini-services/chat-service/node_modules; Remove-Item -Force -ErrorAction SilentlyContinue .env, .env.local"
	@echo ''
	@echo '☢️  Everything destroyed. Starting from scratch:'
	@echo '   1. copy .env.example .env'
	@echo '   2. make gen-keys'
	@echo '   3. make setup   (for dev)  OR  make prod-setup  (for production)'
	@echo '   4. make deploy  (for Docker production)'
else
	@echo '╔══════════════════════════════════════════════════════════╗'
	@echo '║  ☢️  WARNING: THIS WILL DESTROY EVERYTHING!         ║'
	@echo '║  - All local files (.next, node_modules, db, uploads)   ║'
	@echo '║  - All .env files                                     ║'
	@echo '║  - All Docker containers, volumes, images, networks     ║'
	@echo '║  - All backups                                   ║'
	@echo '║                                                         ║'
	@echo '║  There is NO undo. You will start from ZERO.       ║'
	@echo '╚══════════════════════════════════════════════════════════╝'
	@echo ''
	@echo '  To confirm, run:  make nuke CONFIRM=DESTROY'
	@exit 1
endif

deploy: ## Deploy with Docker — full rebuild (no cache, slow but clean)
	@bash deploy.sh

fast-deploy: ensure-bun ## Quick deploy — uses Docker cache (fast, ~30s if only code changed)
	@export PATH="$$HOME/.bun/bin:$$PATH" && \
	echo "⚡ Fast deploy (using Docker cache)..." && \
	git pull origin main && \
	bun install && \
	cd mini-services/chat-service && bun install && cd ../.. && \
	docker compose -f docker-compose.prod.yml build && \
	docker compose -f docker-compose.prod.yml up -d --force-recreate --remove-orphans && \
	sleep 3 && \
	docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true && \
	echo "✅ Fast deploy done!"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEVELOPMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

dev: ensure-bun ## Start development server with hot reload
	bun run dev

dev-chat: ensure-bun ## Start chat WebSocket service
	cd mini-services/chat-service && bun run dev

dev-all: ensure-bun ## Start all services (web + chat)
	@echo "Starting all services..."
	@bun run dev &
	@cd mini-services/chat-service && bun run dev &
	@wait

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATABASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

db-push: ensure-bun ## Push Prisma schema to database
	bun run db:push

db-generate: ensure-bun ## Generate Prisma client
	bun run db:generate

db-reset: ensure-bun ## Reset database (WARNING: deletes all data)
	bun run db:reset

seed: ensure-bun ## Seed database with initial data (idempotent - safe to run multiple times)
	bun run src/lib/seed.ts

db-setup: db-push seed ## Setup database (push schema + seed)

db-reset-fresh: ensure-bun ## Reset database completely and re-seed from scratch
	@echo "Resetting database..."
	rm -f db/custom.db
	bun run db:generate
	bun run db:push
	bun run src/lib/seed.ts
	@echo "✅ Database reset and re-seeded!"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BUILD & PRODUCTION (LOCAL)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

build: ensure-bun ## Build for production
	bun run build

start: ensure-bun ## Start production server
	bun run start

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CODE QUALITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

lint: ensure-bun ## Run ESLint
	bun run lint

lint-fix: ensure-bun ## Run ESLint with auto-fix
	bun run lint --fix

typecheck: ensure-bun ## Run TypeScript type checking
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
	docker compose -f docker-compose.prod.yml exec web npx tsx src/lib/seed.ts
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

restore: ensure-bun ## Restore from a backup file (usage: make restore DB=file.sqlite UPLOAD=file.tar.gz)
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
	docker compose -f docker-compose.prod.yml exec web npx tsx src/lib/seed.ts

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UI-ONLY DEPLOY (fast — no DB, no Caddy, no Chat restart)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ui-deploy: ## Rebuild & restart ONLY the web (UI) container — fast for UI changes
	@echo "🎨 Rebuilding web container only..."
	docker compose -f docker-compose.prod.yml build web
	@echo "🔄 Restarting web container..."
	docker compose -f docker-compose.prod.yml up -d web
	@echo "⏳ Waiting for health check..."
	@sleep 5
	@for i in 1 2 3 4 5 6; do \
		if docker compose -f docker-compose.prod.yml exec -T web curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then \
			echo "✅ UI deployed & healthy! (Caddy + Chat + DB untouched)"; \
			exit 0; \
		fi; \
		echo "  Waiting... ($$i/6)"; \
		sleep 5; \
	done; \
	echo "⚠️  Container started but health check not yet passing. Check: make prod-logs"

ui-restart: ## Restart web container WITHOUT rebuilding (useful after env changes)
	@echo "🔄 Restarting web container (no rebuild)..."
	docker compose -f docker-compose.prod.yml restart web
	@echo "✅ Web container restarted!"

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

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# E2E SCENARIO TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

test: ## Run ALL E2E scenario tests (admin + consultant + entrepreneur)
	@echo "🧪 Running ALL Masar Platform E2E tests..."
	@bash tests/run-all.sh all

test-admin: ## Run admin behavior scenario tests only
	@echo "🧪 Running Admin scenario tests..."
	@bash tests/run-all.sh admin

test-consultant: ## Run consultant behavior scenario tests only
	@echo "🧪 Running Consultant scenario tests..."
	@bash tests/run-all.sh consultant

test-entrepreneur: ## Run entrepreneur behavior scenario tests only
	@echo "🧪 Running Entrepreneur scenario tests..."
	@bash tests/run-all.sh entrepreneur

test-prod: ## Run ALL tests against production server (BASE_URL=https://walaabusiness.com/api)
	@echo "🧪 Running E2E tests against PRODUCTION..."
	BASE_URL=https://walaabusiness.com/api bash tests/run-all.sh all
