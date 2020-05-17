# These command exit non-0 when any violations occur
.IGNORE: stop

.DEFAULT: help
all: help

# Docker Compose commands
.PHONY: build
build: ## Build / Rebuild containers
	docker-compose build --no-cache

.PHONY: run
run: stop ## Run docker-compose up
	docker-compose up --remove-orphans

.PHONY: stop
stop: ## Stop docker-composer stop
	@docker-compose stop >/dev/null 2>&1

.PHONY: ssh
ssh: ## Access server
	@docker-compose exec jimbot /bin/bash

.PHONY: logs
logs: ## Follow server logs
	@docker-compose logs -f

.PHONY: help
help: ## this help
	# Usage:
	#   make <target> [OPTION=value]
	#
	# Targets:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
