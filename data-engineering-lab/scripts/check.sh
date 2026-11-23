#!/usr/bin/env bash
# make check — test every running service and connection; print PASS / FAIL / SKIP.
# Services of profiles you didn't start are skipped, not failed. Exit code 1 on any FAIL.
# `cond && ok … || ko …` is intentional: ok() always returns 0, so ko() only runs when cond fails.
# shellcheck disable=SC2015
set -uo pipefail
source "$(dirname "$0")/lib.sh"
load_env "$LAB_DIR/.env"
cd "$LAB_DIR" || exit 1
export COMPOSE_PROFILES="core,streaming,orchestration"   # let compose see every service

pass=0 fail=0 skip=0
ok()      { printf '  %sPASS%s  %s\n' "$C_GREEN" "$C_OFF" "$1"; pass=$((pass + 1)); }
ko()      { printf '  %sFAIL%s  %s\n        → %s\n' "$C_RED" "$C_OFF" "$1" "$2"; fail=$((fail + 1)); }
sk()      { printf '  %sSKIP%s  %s (%s)\n' "$C_YELLOW" "$C_OFF" "$1" "$2"; skip=$((skip + 1)); }
note()    { printf '  %sINFO%s  %s\n' "$C_BOLD" "$C_OFF" "$1"; }
section() { printf '\n%s%s%s\n' "$C_BOLD" "$1" "$C_OFF"; }

cid()      { compose ps -q "$1" 2>/dev/null | head -n1; }
is_up()    { [ -n "$(compose ps -q --status running "$1" 2>/dev/null)" ]; }
x()        { compose exec -T "$@" 2>&1; }
http()     { curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "$@" 2>/dev/null; }

# check_container SERVICE — PASS if healthy; returns 1 (skip the rest) if not running
check_container() {
  local svc=$1 h
  if ! is_up "$svc"; then sk "$svc" "not running — start its profile"; return 1; fi
  h="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$(cid "$svc")")"
  if [ "$h" = healthy ]; then ok "$svc container is healthy"; else ko "$svc container is healthy" "health=$h — make logs SERVICE=$svc"; fi
}
check_init() { # one-shot jobs must have exited 0
  local svc=$1 c code
  c="$(compose ps -a -q "$svc" | head -n1)"
  [ -n "$c" ] || { sk "$svc" "never ran"; return; }
  code="$(docker inspect -f '{{.State.ExitCode}}' "$c")"
  if [ "$code" = 0 ]; then ok "$svc completed"; else ko "$svc completed" "exit $code — make logs SERVICE=$svc"; fi
}

printf '%sdata-engineering-lab — connection check%s\n' "$C_BOLD" "$C_OFF"

# ─────────────────────────── core ───────────────────────────
section "Source Postgres (postgres-source → localhost:${SOURCE_PG_HOST_PORT:-5433})"
if check_container postgres-source; then
  wal="$(x postgres-source psql -U "$SOURCE_PG_USER" -d "$SOURCE_PG_DB" -tAc 'SHOW wal_level')"
  [ "$wal" = logical ] && ok "wal_level = logical (CDC ready)" || ko "wal_level = logical" "got '$wal'"
  r="$(x -e PGPASSWORD="$SOURCE_PG_PASSWORD" postgres-source psql -h 127.0.0.1 -U "$SOURCE_PG_USER" -d "$SOURCE_PG_DB" -tAc 'select 1')"
  [ "$r" = 1 ] && ok "login as SOURCE_PG_USER ($SOURCE_PG_USER)" || ko "login as SOURCE_PG_USER" "$r"
  r="$(x -e PGPASSWORD="$SOURCE_PG_CDC_PASSWORD" postgres-source psql -h 127.0.0.1 -U "$SOURCE_PG_CDC_USER" -d "$SOURCE_PG_DB" \
       -tAc "select rolreplication from pg_roles where rolname = current_user")"
  [ "$r" = t ] && ok "login as SOURCE_PG_CDC_USER ($SOURCE_PG_CDC_USER) with REPLICATION" \
               || ko "login as SOURCE_PG_CDC_USER with REPLICATION" "$r — RUNBOOK §8.3"
  r="$(x postgres-source psql -U "$SOURCE_PG_USER" -d "$SOURCE_PG_DB" -tAc \
       "select count(*) from pg_publication where pubname = '${DEBEZIUM_PUBLICATION:-dbz_publication}'")"
  [ "$r" = 1 ] && ok "publication '${DEBEZIUM_PUBLICATION:-dbz_publication}' exists" \
               || ko "publication '${DEBEZIUM_PUBLICATION:-dbz_publication}' exists" "not found — RUNBOOK §8.4"
  slots="$(x postgres-source psql -U "$SOURCE_PG_USER" -d "$SOURCE_PG_DB" -tA -F' ' -c \
       "select slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) from pg_replication_slots")"
  if [ -z "$slots" ]; then note "no replication slots yet (created when a Debezium connector starts)"
  else while read -r s a lag; do
      [ "$a" = t ] && note "slot $s active, retained WAL $lag" || note "slot $s INACTIVE, retained WAL $lag — drop it if unused (RUNBOOK §8.4)"
    done <<< "$slots"; fi
fi

section "Platform DB (platform-db → localhost:${PLATFORM_DB_HOST_PORT:-5434})"
if check_container platform-db; then
  for pair in "airflow:$AIRFLOW_DB_PASSWORD" "lakekeeper:$LAKEKEEPER_DB_PASSWORD"; do
    u="${pair%%:*}" p="${pair#*:}"
    r="$(x -e PGPASSWORD="$p" platform-db psql -h 127.0.0.1 -U "$u" -d "$u" -tAc 'select 1')"
    [ "$r" = 1 ] && ok "login as '$u' to database '$u'" || ko "login as '$u' to database '$u'" "$r — RUNBOOK §8.3"
  done
fi

section "MinIO (S3 API localhost:${MINIO_API_HOST_PORT:-9000}, console localhost:${MINIO_CONSOLE_HOST_PORT:-9001})"
if check_container minio; then
  check_init minio-init
  [ "$(http "http://127.0.0.1:${MINIO_API_HOST_PORT:-9000}/minio/health/live")" = 200 ] \
    && ok "S3 API reachable from host" || ko "S3 API reachable from host" "port ${MINIO_API_HOST_PORT:-9000}"
  [ "$(http "http://127.0.0.1:${MINIO_CONSOLE_HOST_PORT:-9001}/")" = 200 ] \
    && ok "console reachable from host" || ko "console reachable from host" "port ${MINIO_CONSOLE_HOST_PORT:-9001}"
  for b in "${LAKEHOUSE_BUCKET:-lakehouse}" "${RAW_BUCKET:-raw}"; do
    r="$(x minio sh -c "mc alias set chk http://localhost:9000 '$LAKEHOUSE_S3_ACCESS_KEY' '$LAKEHOUSE_S3_SECRET_KEY' >/dev/null && mc ls chk/$b >/dev/null && echo ok")"
    [ "$r" = ok ] && ok "lab S3 user can list bucket '$b'" || ko "lab S3 user can list bucket '$b'" "$(echo "$r" | tail -n1) — RUNBOOK §8.5"
  done
fi

section "Lakekeeper Iceberg REST catalog (localhost:${LAKEKEEPER_HOST_PORT:-8181})"
if check_container lakekeeper; then
  check_init lakekeeper-init
  lk="http://127.0.0.1:${LAKEKEEPER_HOST_PORT:-8181}"
  [ "$(http "$lk/health")" = 200 ] && ok "API reachable from host" || ko "API reachable from host" "$lk/health"
  curl -fsS "$lk/management/v1/warehouse" 2>/dev/null | grep -q "\"name\":\"${LAKEKEEPER_WAREHOUSE:-lakehouse}\"" \
    && ok "warehouse '${LAKEKEEPER_WAREHOUSE:-lakehouse}' registered" \
    || ko "warehouse '${LAKEKEEPER_WAREHOUSE:-lakehouse}' registered" "make logs SERVICE=lakekeeper-init"
  [ "$(http "$lk/catalog/v1/config?warehouse=${LAKEKEEPER_WAREHOUSE:-lakehouse}")" = 200 ] \
    && ok "Iceberg REST /v1/config answers for the warehouse" || ko "Iceberg REST /v1/config" "$lk/catalog/v1/config"
fi

# ─────────────────────────── streaming ───────────────────────────
section "Kafka (KRaft; host bootstrap localhost:${KAFKA_HOST_PORT:-9092})"
if check_container kafka; then
  r="$(x kafka sh -c 'echo ping | /opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:29092 --topic _lab_check >/dev/null 2>&1 &&
       /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:29092 --topic _lab_check --from-beginning --max-messages 1 --timeout-ms 20000 2>/dev/null')"
  [[ "$r" == *ping* ]] && ok "produce + consume round trip (topic _lab_check)" || ko "produce + consume round trip" "make logs SERVICE=kafka"
  r="$(x kafka /opt/kafka/bin/kafka-metadata-quorum.sh --bootstrap-server localhost:29092 describe --status | grep -c LeaderId)"
  [ "$r" -ge 1 ] 2>/dev/null && ok "KRaft controller quorum has a leader" || ko "KRaft quorum leader" "make logs SERVICE=kafka"
fi

section "Kafka Connect + Debezium (localhost:${KAFKA_CONNECT_HOST_PORT:-8083})"
if check_container kafka-connect; then
  kc="http://127.0.0.1:${KAFKA_CONNECT_HOST_PORT:-8083}"
  curl -fsS "$kc/connector-plugins" 2>/dev/null | grep -q 'io.debezium.connector.postgresql.PostgresConnector' \
    && ok "Debezium Postgres connector plugin installed" || ko "Debezium Postgres plugin installed" "$kc/connector-plugins"
  # Validate the template against the live database: proves ${env:…} resolution, CDC credentials,
  # wal_level and the publication — without creating a connector or a slot.
  if is_up postgres-source; then
    cfg="$(uv run --quiet --no-project python -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["config"]))' connectors/debezium-postgres-source.json 2>/dev/null)"
    resp="$(curl -sS -X PUT -H 'Content-Type: application/json' --data "$cfg" \
      "$kc/connector-plugins/io.debezium.connector.postgresql.PostgresConnector/config/validate" 2>&1)"
    if [[ "$resp" == *'"error_count":0'* ]]; then ok "Debezium template validates against postgres-source"
    else ko "Debezium template validates against postgres-source" \
      "$(echo "$resp" | grep -o '"errors":\["[^]]*' | head -n3 | tr '\n' ' ') — RUNBOOK §8.4"; fi
  else sk "Debezium template validation" "postgres-source not running"; fi
fi

section "Kafka UI (localhost:${KAFKA_UI_HOST_PORT:-8082})"
if check_container kafka-ui; then
  [ "$(http -u "$KAFKA_UI_USER:$KAFKA_UI_PASSWORD" "http://127.0.0.1:${KAFKA_UI_HOST_PORT:-8082}/actuator/health")" = 200 ] \
    && ok "UI reachable from host" || ko "UI reachable from host" "port ${KAFKA_UI_HOST_PORT:-8082}"
  r="$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' -X POST --max-time 10 \
       --data-urlencode "username=$KAFKA_UI_USER" --data-urlencode "password=$KAFKA_UI_PASSWORD" \
       "http://127.0.0.1:${KAFKA_UI_HOST_PORT:-8082}/login" 2>/dev/null)"
  [[ "$r" == 302* && "$r" != *error* ]] && ok "login with KAFKA_UI_USER/KAFKA_UI_PASSWORD" || ko "Kafka UI login" "got '$r' — check KAFKA_UI_* in .env"
fi

# ─────────────────────────── orchestration ───────────────────────────
section "Airflow 3 (localhost:${AIRFLOW_HOST_PORT:-8080})"
if is_up airflow-apiserver; then
  check_init airflow-init
  for s in airflow-apiserver airflow-scheduler airflow-dag-processor airflow-triggerer; do check_container "$s"; done
  af="http://127.0.0.1:${AIRFLOW_HOST_PORT:-8080}"
  hc="$(curl -fsS --max-time 10 "$af/api/v2/monitor/health" 2>/dev/null)"
  for comp in metadatabase scheduler triggerer dag_processor; do
    echo "$hc" | grep -Eq "\"$comp\": *\{\"status\": *\"healthy\"" && ok "/monitor/health: $comp healthy" || ko "/monitor/health: $comp" "make logs SERVICE=airflow-${comp//_/-}"
  done
  code="$(http -X POST -H 'Content-Type: application/json' \
    --data "{\"username\":\"$AIRFLOW_ADMIN_USER\",\"password\":\"$AIRFLOW_ADMIN_PASSWORD\"}" "$af/auth/token")"
  [ "$code" = 201 ] || [ "$code" = 200 ] && ok "admin login (AIRFLOW_ADMIN_USER) gets an API token" \
    || ko "admin login" "HTTP $code — RUNBOOK §8.3 (the admin is created only on first init)"
  # $DBT_VENV must expand inside the container, hence single quotes
  # shellcheck disable=SC2016
  r="$(x airflow-scheduler bash -c '$DBT_VENV/bin/dbt --version 2>&1 | grep -m1 installed')"
  [[ "$r" == *installed* ]] && ok "dbt available in Airflow (/opt/dbt-venv)" || ko "dbt in Airflow" "$r"
  r="$(x airflow-scheduler python -c 'from airflow.sdk import BaseHook; BaseHook.get_connection("source_postgres"); BaseHook.get_connection("lakehouse_s3"); print("ok")' 2>&1 | tail -n1)"
  [ "$r" = ok ] && ok "connections source_postgres + lakehouse_s3 defined" || ko "Airflow connections" "$r"
else
  sk "airflow" "not running — make up-orchestration"
fi

# ─────────────────────────── local tooling ───────────────────────────
section "Local dbt / DuckDB (uv)"
if ! command -v uv >/dev/null; then sk "dbt" "uv not installed (RUNBOOK §1)"
elif [ ! -f dbt/profiles.yml ]; then ko "dbt/profiles.yml exists" "run: make init"
else
  dbt_debug() { (cd dbt && SECRETS_DIR="$LAB_DIR/secrets" DBT_PROFILES_DIR=. DBT_SEND_ANONYMOUS_USAGE_STATS=false DBT_VERSION_CHECK=false DBT_USE_COLORS=false \
                 uv run --quiet --env-file ../.env dbt debug --target "$1" 2>&1); }
  dbterr() { { grep -m1 -E '[A-Za-z]+ Error: |Error: ' <<< "$1" || grep -m1 -i 'error' <<< "$1"; } | sed 's/^[ >]*//' | cut -c1-170; }
  out="$(dbt_debug dev)"; [[ "$out" == *"All checks passed"* ]] && ok "dbt debug --target dev (DuckDB)" \
    || ko "dbt debug --target dev" "$(dbterr "$out")"
  if is_up lakekeeper && is_up minio; then
    out="$(dbt_debug lakehouse)"; [[ "$out" == *"All checks passed"* ]] && ok "dbt debug --target lakehouse (DuckDB → Iceberg via Lakekeeper)" \
      || ko "dbt debug --target lakehouse" "$(dbterr "$out") — RUNBOOK §8.5"
  else sk "dbt debug --target lakehouse" "core profile not running"; fi
  if is_blank "${SNOWFLAKE_ACCOUNT:-}"; then sk "dbt debug --target snowflake" "SNOWFLAKE_* not filled in (optional)"
  else out="$(dbt_debug snowflake)"; [[ "$out" == *"All checks passed"* ]] && ok "dbt debug --target snowflake" \
      || ko "dbt debug --target snowflake" "$(dbterr "$out") — RUNBOOK §8.6"; fi
fi

printf '\n%sSummary:%s %s%d passed%s, %s%d failed%s, %d skipped\n' "$C_BOLD" "$C_OFF" \
  "$C_GREEN" "$pass" "$C_OFF" "$C_RED" "$fail" "$C_OFF" "$skip"
[ "$fail" -eq 0 ]
