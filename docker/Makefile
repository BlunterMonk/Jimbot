# These command exit non-0 when any violations occur
.IGNORE: stop

.DEFAULT: help
all: help

# Helpful commands
.PHONY: tables
tables: ## Build / Rebuild containers
	aws dynamodb list-tables --endpoint-url http://192.168.99.100:8000

.PHONY: checkpoints
checkpoints:
	@aws dynamodb scan --table-name vams-event-stream-consumer-elastic_checkpoints --endpoint-url http://192.168.99.100:8000

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

.PHONY: remove
remove: ## Remove cached containers
	@docker-compose rm -f >/dev/null 2>&1

.PHONY: rebuild ## Rebuild the image(s) in docker-compose
rebuild: build remove run

.PHONY: ssh
ssh: ## Access server
	@docker-compose exec consumer /bin/bash

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
