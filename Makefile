# ================================
# Makefile for Red Tetris Docker
# ================================

# Variables
IMAGE_NAME := red-tetris
DEV_CONTAINER := red-tetris-dev
PROD_CONTAINER := red-tetris-prod
TEST_CONTAINER := red-tetris-test

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ================================
# Build targets
# ================================

.PHONY: build-dev
build-dev: ## Build development image
	@echo "$(GREEN)Building development image...$(NC)"
	docker build --target development -t $(IMAGE_NAME):dev .
	@echo "$(GREEN)✓ Development image built successfully$(NC)"

.PHONY: build-prod
build-prod: ## Build production image (with tests)
	@echo "$(GREEN)Building production image...$(NC)"
	docker build --target production -t $(IMAGE_NAME):prod .
	@echo "$(GREEN)✓ Production image built successfully$(NC)"

.PHONY: build-prod-no-test
build-prod-no-test: ## Build production image (skip tests)
	@echo "$(YELLOW)Building production image without tests...$(NC)"
	docker build --target builder -t $(IMAGE_NAME):builder .
	docker build --target production -t $(IMAGE_NAME):prod .
	@echo "$(GREEN)✓ Production image built successfully$(NC)"

# ================================
# Run targets
# ================================

.PHONY: dev
dev: ## Run development environment with hot-reload
	@echo "$(GREEN)Starting development server...$(NC)"
	@docker rm -f $(DEV_CONTAINER) 2>/dev/null || true
	docker run -d \
		--name $(DEV_CONTAINER) \
		-p 3000:3000 \
		-p 3001:3001 \
		-v $(PWD)/app:/app/app \
		-v $(PWD)/server:/app/server \
		-v $(PWD)/public:/app/public \
		-v $(PWD)/nuxt.config.ts:/app/nuxt.config.ts \
		$(IMAGE_NAME):dev
	@echo "$(GREEN)✓ Development server running at:$(NC)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"
	@echo ""
	@echo "$(YELLOW)Tip: Use 'make logs' to see output$(NC)"

.PHONY: prod
prod: ## Run production server
	@echo "$(GREEN)Starting production server...$(NC)"
	@docker rm -f $(PROD_CONTAINER) 2>/dev/null || true
	docker run -d \
		--name $(PROD_CONTAINER) \
		-p 3000:3000 \
		-p 3001:3001 \
		$(IMAGE_NAME):prod
	@echo "$(GREEN)✓ Production server running at:$(NC)"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:3001"
	@echo ""
	@echo "$(YELLOW)Tip: Use 'make logs-prod' to see output$(NC)"

# ================================
# Test targets
# ================================

.PHONY: test
test: ## Run tests in Docker with coverage
	@echo "$(GREEN)Building test image...$(NC)"
	@docker rm -f $(TEST_CONTAINER) 2>/dev/null || true
	@docker build --target test -t $(IMAGE_NAME):test . > /dev/null 2>&1 && \
	echo "$(GREEN)✓ Test image built$(NC)" || \
	(echo "$(RED)✗ Build failed$(NC)" && exit 1)
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	@docker run --rm \
		--name $(TEST_CONTAINER) \
		$(IMAGE_NAME):test \
		npm run test:coverage
	@echo ""
	@echo "$(GREEN)✓ All tests passed$(NC)"
	@echo "$(YELLOW)Extracting coverage report...$(NC)"
	@docker create --name $(TEST_CONTAINER)-extract $(IMAGE_NAME):test > /dev/null 2>&1
	@docker cp $(TEST_CONTAINER)-extract:/app/coverage ./coverage 2>/dev/null || true
	@docker rm $(TEST_CONTAINER)-extract > /dev/null 2>&1
	@echo "$(GREEN)✓ Coverage report available in ./coverage/index.html$(NC)"

# ================================
# Utility targets
# ================================

.PHONY: logs
logs: ## Show development logs (follow)
	@docker logs -f $(DEV_CONTAINER)

.PHONY: logs-prod
logs-prod: ## Show production logs (follow)
	@docker logs -f $(PROD_CONTAINER)

.PHONY: shell-dev
shell-dev: ## Open shell in development container
	@docker exec -it $(DEV_CONTAINER) sh

.PHONY: shell-prod
shell-prod: ## Open shell in production container
	@docker exec -it $(PROD_CONTAINER) sh

.PHONY: stop
stop: ## Stop all running containers
	@echo "$(YELLOW)Stopping all containers...$(NC)"
	@docker stop $(DEV_CONTAINER) 2>/dev/null || true
	@docker stop $(PROD_CONTAINER) 2>/dev/null || true
	@docker stop $(TEST_CONTAINER) 2>/dev/null || true
	@echo "$(GREEN)✓ All containers stopped$(NC)"

.PHONY: restart-dev
restart-dev: ## Restart development container
	@echo "$(YELLOW)Restarting development container...$(NC)"
	@docker restart $(DEV_CONTAINER)
	@echo "$(GREEN)✓ Container restarted$(NC)"

.PHONY: restart-prod
restart-prod: ## Restart production container
	@echo "$(YELLOW)Restarting production container...$(NC)"
	@docker restart $(PROD_CONTAINER)
	@echo "$(GREEN)✓ Container restarted$(NC)"

# ================================
# Cleanup targets
# ================================

.PHONY: clean
clean: stop ## Stop and remove all containers and images
	@echo "$(YELLOW)Cleaning up containers and images...$(NC)"
	@docker rm -f $(DEV_CONTAINER) 2>/dev/null || true
	@docker rm -f $(PROD_CONTAINER) 2>/dev/null || true
	@docker rm -f $(TEST_CONTAINER) 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):dev 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):prod 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):test 2>/dev/null || true
	@docker rmi $(IMAGE_NAME):builder 2>/dev/null || true
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

.PHONY: clean-all
clean-all: clean ## Clean everything including volumes and build cache
	@echo "$(YELLOW)Performing deep cleanup...$(NC)"
	@docker system prune -af --volumes
	@rm -rf coverage node_modules .output .nuxt
	@echo "$(GREEN)✓ Deep cleanup complete$(NC)"

# ================================
# Info targets
# ================================

.PHONY: status
status: ## Show status of all containers
	@echo "$(GREEN)Container Status:$(NC)"
	@docker ps -a --filter "name=$(IMAGE_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers found"

.PHONY: images
images: ## Show all Red Tetris images
	@echo "$(GREEN)Images:$(NC)"
	@docker images | grep -E "$(IMAGE_NAME)|REPOSITORY" || echo "No images found"

.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)Red Tetris - Docker Commands$(NC)"
	@echo ""
	@echo "$(YELLOW)Build:$(NC)"
	@grep -E '^build-[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Run:$(NC)"
	@grep -E '^(dev|prod|restart-[a-zA-Z0-9_-]+):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Test:$(NC)"
	@grep -E '^test[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Logs & Debug:$(NC)"
	@grep -E '^(logs|shell)[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Cleanup:$(NC)"
	@grep -E '^(clean|stop)[a-zA-Z0-9_-]*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Info:$(NC)"
	@grep -E '^(status|images):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. Build dev image:  $(GREEN)make build-dev$(NC)"
	@echo "  2. Start dev server: $(GREEN)make dev$(NC)"
	@echo "  3. View logs:        $(GREEN)make logs$(NC)"
	@echo "  4. Stop:             $(GREEN)make stop$(NC)"
