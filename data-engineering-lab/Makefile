# data-engineering-lab — day-to-day commands. Run `make` (or `make help`) for the list.
# Works with the GNU make that ships with macOS (3.81) and Linux.

SHELL          := /bin/bash
.DEFAULT_GOAL  := help

COMPOSE        := docker compose
ALL_PROFILES   := core streaming orchestration
# Which profiles `make up` starts. "core" is always added because the others depend on it.
PROFILES       ?= core
# Service name for logs/restart/shell, e.g. make logs SERVICE=kafka
SERVICE        ?=

profile_flags   = $(foreach p,$(1),--profile $(p))
UP_PROFILES     = $(sort core $(PROFILES))
ALL_FLAGS       = $(call profile_flags,$(ALL_PROFILES))
DBT_ENV         = SECRETS_DIR=$(CURDIR)/secrets DBT_PROFILES_DIR=. DBT_SEND_ANONYMOUS_USAGE_STATS=false DBT_VERSION_CHECK=false
# path of this folder relative to the git root (for pre-commit, which runs from the root)
REPO_PREFIX    := $(shell git rev-parse --show-prefix 2>/dev/null)

.PHONY: help
help: ## Show this help
	@echo "data-engineering-lab — make targets (see RUNBOOK.md)"
	@echo
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "Variables: PROFILES=\"core streaming orchestration\"  SERVICE=<name>  NAME=<connector>  ARGS=\"<dbt args>\""

# ─── first-time setup ───────────────────────────────────────────────────────

.PHONY: init
init: ## Copy templates (.env, dbt/profiles.yml) if missing and create local folders
	@test -f .env && echo ".env already exists — left untouched" || (cp .env.example .env && echo "created .env — now fill in the <FILL_ME> values (RUNBOOK §2–3)")
	@test -f dbt/profiles.yml && echo "dbt/profiles.yml already exists — left untouched" || (cp dbt/profiles.yml.example dbt/profiles.yml && echo "created dbt/profiles.yml")
	@mkdir -p data secrets

.PHONY: secrets
secrets: ## Print strong random values for every secret (copy into .env)
	@scripts/gen-secrets.sh

.PHONY: secrets-write
secrets-write: ## Fill every secret that is still <FILL_ME> in .env (keeps a .env.bak)
	@scripts/gen-secrets.sh --write

.PHONY: sync
sync: ## Install the local Python toolchain (dbt, DuckDB, pyiceberg, linters) with uv
	uv sync

.PHONY: hooks
hooks: sync ## Install the pre-commit git hook for this folder
	cd "$$(git rev-parse --show-toplevel)" && uv run --project "$(CURDIR)" pre-commit install -c "$(REPO_PREFIX).pre-commit-config.yaml"

# ─── start / stop ───────────────────────────────────────────────────────────

.PHONY: preflight
preflight: ## Validate .env and check for port clashes
	@scripts/preflight.sh "$(UP_PROFILES)"

.PHONY: up
up: preflight ## Start PROFILES (default: core) and wait until healthy
	$(COMPOSE) $(call profile_flags,$(UP_PROFILES)) up -d
	@scripts/wait-healthy.sh "$(UP_PROFILES)"

.PHONY: up-streaming
up-streaming: ## Start core + streaming (Kafka, Kafka Connect/Debezium, Kafka UI)
	@$(MAKE) --no-print-directory up PROFILES="core streaming"

.PHONY: up-orchestration
up-orchestration: ## Start core + orchestration (Airflow 3)
	@$(MAKE) --no-print-directory up PROFILES="core orchestration"

.PHONY: up-all
up-all: ## Start every profile (~6–7 GB RAM)
	@$(MAKE) --no-print-directory up PROFILES="$(ALL_PROFILES)"

.PHONY: build
build: ## Rebuild the custom Airflow image (after editing docker/airflow/*)
	$(COMPOSE) $(ALL_FLAGS) build --pull

.PHONY: stop
stop: ## Stop the given PROFILES only, keep containers and data (make stop PROFILES=streaming)
	$(COMPOSE) $(call profile_flags,$(PROFILES)) stop

.PHONY: down
down: ## Stop and remove all containers (data volumes are kept)
	$(COMPOSE) $(ALL_FLAGS) down --remove-orphans

.PHONY: restart
restart: ## Restart one service: make restart SERVICE=kafka-connect
	@test -n "$(SERVICE)" || (echo "usage: make restart SERVICE=<name>" && exit 1)
	$(COMPOSE) $(ALL_FLAGS) restart $(SERVICE)

# ─── inspect ────────────────────────────────────────────────────────────────

.PHONY: ps
ps: ## Show containers, health and ports
	@$(COMPOSE) $(ALL_FLAGS) ps -a --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'

.PHONY: logs
logs: ## Follow logs (all, or one: make logs SERVICE=airflow-scheduler)
	$(COMPOSE) $(ALL_FLAGS) logs -f --tail 200 $(SERVICE)

.PHONY: check
check: ## Test every running service and connection (PASS/FAIL)
	@scripts/check.sh

.PHONY: stats
stats: ## Live CPU / memory per container
	docker stats $$($(COMPOSE) $(ALL_FLAGS) ps -q)

.PHONY: shell
shell: ## Open a shell in a service: make shell SERVICE=airflow-scheduler
	@test -n "$(SERVICE)" || (echo "usage: make shell SERVICE=<name>" && exit 1)
	$(COMPOSE) $(ALL_FLAGS) exec $(SERVICE) sh -c 'command -v bash >/dev/null && exec bash || exec sh'

.PHONY: psql
psql: ## psql into the source database as SOURCE_PG_USER
	$(COMPOSE) $(ALL_FLAGS) exec postgres-source sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

.PHONY: topics
topics: ## List Kafka topics
	$(COMPOSE) $(ALL_FLAGS) exec kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:29092 --list

# ─── Kafka Connect ──────────────────────────────────────────────────────────

.PHONY: connect-list connect-plugins connect-register connect-status connect-delete
connect-list: ## List connectors and their status
	@scripts/connect.sh list
connect-plugins: ## List installed connector plugins
	@scripts/connect.sh plugins
connect-register: ## Register/update connectors/NAME.json: make connect-register NAME=debezium-postgres-source
	@scripts/connect.sh register "$(NAME)"
connect-status: ## Status of one connector: make connect-status NAME=pg-source-cdc
	@scripts/connect.sh status "$(NAME)"
connect-delete: ## Delete a connector (its replication slot stays!): make connect-delete NAME=pg-source-cdc
	@scripts/connect.sh delete "$(NAME)"

# ─── dbt ────────────────────────────────────────────────────────────────────

.PHONY: dbt
dbt: ## Run dbt locally: make dbt ARGS="build --target dev"
	cd dbt && $(DBT_ENV) uv run --env-file ../.env dbt $(ARGS)

.PHONY: dbt-debug
dbt-debug: ## dbt debug for a target: make dbt-debug TARGET=lakehouse (default dev)
	cd dbt && $(DBT_ENV) uv run --env-file ../.env dbt debug --target $(or $(TARGET),dev)

# ─── quality ────────────────────────────────────────────────────────────────

.PHONY: lint
lint: ## Run every pre-commit hook (ruff, sqlfluff, yamllint, shellcheck-free checks) on this folder
	cd "$$(git rev-parse --show-toplevel)" && uv run --project "$(CURDIR)" pre-commit run --all-files -c "$(REPO_PREFIX).pre-commit-config.yaml"

.PHONY: fmt
fmt: ## Auto-format Python (ruff) and SQL (sqlfluff fix)
	uv run ruff format .
	uv run ruff check --fix .
	uv run sqlfluff fix dbt

.PHONY: config
config: ## Validate docker-compose.yml with your .env
	$(COMPOSE) $(ALL_FLAGS) config --quiet && echo "docker-compose.yml is valid"

# ─── reset / clean ──────────────────────────────────────────────────────────

.PHONY: reset
reset: ## DELETE all lab data: containers + volumes + data/ (asks first)
	@read -r -p "This deletes every database, topic, bucket and DuckDB file. Type 'reset' to continue: " ans; \
	  [ "$$ans" = reset ] || (echo "aborted" && exit 1)
	$(COMPOSE) $(ALL_FLAGS) down --volumes --remove-orphans
	find data -mindepth 1 -maxdepth 1 ! -name README.md -exec rm -rf {} +
	@echo "reset done — next 'make up' starts from scratch (init scripts run again)"

.PHONY: clean
clean: reset ## reset + remove the built Airflow image, .venv and dbt artifacts
	-docker image rm de-lab/airflow:3.4.0
	rm -rf .venv dbt/target dbt/dbt_packages dbt/logs
	@echo "clean done — .env, dbt/profiles.yml and secrets/ were kept"
