#!/usr/bin/env bash
# Runs before `make up`: catches missing blanks, bad formats and port clashes early.
#   scripts/preflight.sh "core streaming"
set -euo pipefail
source "$(dirname "$0")/lib.sh"

profiles="${1:-core}"
errors=0
err() { echo "  ${C_RED}✗${C_OFF} $*"; errors=$((errors + 1)); }

info "preflight for profiles: $profiles"

command -v docker >/dev/null || die "docker not found — install Docker Desktop (RUNBOOK §1)"
docker info >/dev/null 2>&1 || die "Docker is not running — start Docker Desktop"
docker compose version >/dev/null 2>&1 || die "'docker compose' (v2) not available — update Docker Desktop"

[ -f "$LAB_DIR/.env" ] || die ".env not found — run: make init, then fill in the blanks"
load_env "$LAB_DIR/.env"

required_core=(SOURCE_PG_USER SOURCE_PG_PASSWORD SOURCE_PG_CDC_USER SOURCE_PG_CDC_PASSWORD
  PLATFORM_DB_SUPERUSER PLATFORM_DB_SUPERUSER_PASSWORD AIRFLOW_DB_PASSWORD LAKEKEEPER_DB_PASSWORD
  MINIO_ROOT_USER MINIO_ROOT_PASSWORD LAKEHOUSE_S3_ACCESS_KEY LAKEHOUSE_S3_SECRET_KEY
  LAKEKEEPER_ENCRYPTION_KEY)
required_streaming=(KAFKA_UI_USER KAFKA_UI_PASSWORD)
required_orchestration=(AIRFLOW_ADMIN_USER AIRFLOW_ADMIN_PASSWORD AIRFLOW_FERNET_KEY
  AIRFLOW_API_SECRET_KEY AIRFLOW_JWT_SECRET)

# docker compose interpolates the whole file, so every non-optional key must be set
for k in "${required_core[@]}" "${required_streaming[@]}" "${required_orchestration[@]}"; do
  is_blank "${!k:-}" && err "$k is still blank (<FILL_ME>) — RUNBOOK §2"
done

url_safe='^[A-Za-z0-9_-]+$'
for k in SOURCE_PG_PASSWORD SOURCE_PG_CDC_PASSWORD PLATFORM_DB_SUPERUSER_PASSWORD AIRFLOW_DB_PASSWORD \
         LAKEKEEPER_DB_PASSWORD MINIO_ROOT_PASSWORD LAKEHOUSE_S3_ACCESS_KEY LAKEHOUSE_S3_SECRET_KEY; do
  v="${!k:-}"; is_blank "$v" && continue
  [[ "$v" =~ $url_safe ]] || err "$k may only contain letters, digits, - and _ (it is used inside URLs)"
done
for u in SOURCE_PG_USER SOURCE_PG_CDC_USER PLATFORM_DB_SUPERUSER; do
  v="${!u:-}"; is_blank "$v" && continue
  [[ "$v" =~ ^[a-z_][a-z0-9_]*$ ]] || err "$u should be lowercase letters, digits and _ (Postgres role name)"
done
[ "${SOURCE_PG_USER:-}" != "${SOURCE_PG_CDC_USER:-x}" ] || err "SOURCE_PG_CDC_USER must differ from SOURCE_PG_USER"
case "${PLATFORM_DB_SUPERUSER:-}" in
  airflow|lakekeeper) err "PLATFORM_DB_SUPERUSER cannot be 'airflow' or 'lakekeeper' (reserved roles)" ;;
esac

len() { printf '%s' "${!1:-}" | wc -c | tr -d ' '; }
is_blank "${MINIO_ROOT_USER:-}"          || [ "$(len MINIO_ROOT_USER)" -ge 3 ]         || err "MINIO_ROOT_USER must be 3+ chars"
is_blank "${MINIO_ROOT_PASSWORD:-}"      || [ "$(len MINIO_ROOT_PASSWORD)" -ge 8 ]     || err "MINIO_ROOT_PASSWORD must be 8+ chars"
is_blank "${LAKEHOUSE_S3_ACCESS_KEY:-}"  || { a=$(len LAKEHOUSE_S3_ACCESS_KEY); [ "$a" -ge 3 ] && [ "$a" -le 20 ]; } || err "LAKEHOUSE_S3_ACCESS_KEY must be 3–20 chars"
is_blank "${LAKEHOUSE_S3_SECRET_KEY:-}"  || { s=$(len LAKEHOUSE_S3_SECRET_KEY); [ "$s" -ge 8 ] && [ "$s" -le 40 ]; } || err "LAKEHOUSE_S3_SECRET_KEY must be 8–40 chars"
is_blank "${LAKEKEEPER_ENCRYPTION_KEY:-}" || [ "$(len LAKEKEEPER_ENCRYPTION_KEY)" -ge 32 ] || err "LAKEKEEPER_ENCRYPTION_KEY must be 32+ chars"
is_blank "${AIRFLOW_FERNET_KEY:-}" || [[ "$AIRFLOW_FERNET_KEY" =~ ^[A-Za-z0-9_-]{43}=$ ]] \
  || err "AIRFLOW_FERNET_KEY is not a valid Fernet key (44 chars, url-safe base64) — RUNBOOK §3.2"
[ "${MINIO_ROOT_USER:-a}" != "${LAKEHOUSE_S3_ACCESS_KEY:-b}" ] || err "LAKEHOUSE_S3_ACCESS_KEY must differ from MINIO_ROOT_USER"

# Port clashes — only check ports of services that are not already running in this project.
port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
check_port() { # profile service var default
  local profile=$1 svc=$2 var=$3 port="${!3:-$4}"
  [[ " $profiles " == *" $profile "* ]] || return 0
  [ -n "$(compose ps -q --status running "$svc" 2>/dev/null)" ] && return 0
  if port_in_use "$port"; then err "port $port ($var, used by $svc) is already taken — change $var in .env or stop the other program (RUNBOOK §8.1)"; fi
}
check_port core postgres-source SOURCE_PG_HOST_PORT 5433
check_port core platform-db PLATFORM_DB_HOST_PORT 5434
check_port core minio MINIO_API_HOST_PORT 9000
check_port core minio MINIO_CONSOLE_HOST_PORT 9001
check_port core lakekeeper LAKEKEEPER_HOST_PORT 8181
check_port streaming kafka KAFKA_HOST_PORT 9092
check_port streaming kafka-connect KAFKA_CONNECT_HOST_PORT 8083
check_port streaming kafka-ui KAFKA_UI_HOST_PORT 8082
check_port orchestration airflow-apiserver AIRFLOW_HOST_PORT 8080

mkdir -p "$LAB_DIR/data" "$LAB_DIR/secrets"

if [ "$errors" -gt 0 ]; then
  echo
  die "$errors problem(s) found. Fix .env (tip: make secrets-write fills every secret) and retry."
fi
echo "  ${C_GREEN}✓${C_OFF} .env looks complete"
