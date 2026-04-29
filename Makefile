# Digital Incubator Platform - Makefile
# Production-ready commands for development and deployment

.PHONY: help dev build start stop seed db-push db-reset lint clean docker-up docker-down docker-build docker-logs

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development
dev: ## Start development server with hot reload
	bun run dev

dev-chat: ## Start chat WebSocket service
	cd mini-services/chat-service && bun run dev

dev-all: ## Start all services (web + chat)
	@echo "Starting all services..."
	@bun run dev &
	@cd mini-services/chat-service && bun run dev &
	@wait

# Database
db-push: ## Push Prisma schema to database
	bun run db:push

db-generate: ## Generate Prisma client
	bun run db:generate

db-reset: ## Reset database (WARNING: deletes all data)
	bun run db:reset

seed: ## Seed database with initial data
	bun run src/lib/seed.ts

db-setup: db-push seed ## Setup database (push schema + seed)

# Build
build: ## Build for production
	bun run build

start: ## Start production server
	bun run start

# Code quality
lint: ## Run ESLint
	bun run lint

lint-fix: ## Run ESLint with auto-fix
	bun run lint --fix

# Docker
docker-build: ## Build Docker images
	docker compose build

docker-up: ## Start all services with Docker Compose
	docker compose up -d

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## View Docker logs
	docker compose logs -f

docker-restart: docker-down docker-up ## Restart all Docker services

# Cleanup
clean: ## Remove build artifacts and cache
	rm -rf .next
	rm -rf node_modules/.cache
	rm -rf mini-services/chat-service/node_modules/.cache

clean-all: clean ## Full cleanup including dependencies
	rm -rf node_modules
	rm -rf mini-services/chat-service/node_modules
	rm -rf db/custom.db
