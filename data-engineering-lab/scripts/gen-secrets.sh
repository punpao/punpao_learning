#!/usr/bin/env bash
# Generate strong values for every *secret* in .env.
#
#   scripts/gen-secrets.sh            print KEY=value lines (copy what you need into .env)
#   scripts/gen-secrets.sh --write    fill only the secret keys that are still <FILL_ME> in .env
#                                     (usernames and Snowflake values are never touched)
#
# Needs only openssl (preinstalled on macOS/Linux; Git Bash on Windows).
set -euo pipefail
source "$(dirname "$0")/lib.sh"
command -v openssl >/dev/null || die "openssl not found"

hex()    { openssl rand -hex "$1"; }                                   # [0-9a-f], URL-safe
fernet() { openssl rand -base64 32 | tr '+/' '-_'; }                    # 32 bytes, url-safe base64 (Airflow Fernet key)
b64url() { openssl rand -base64 "$1" | tr '+/' '-_' | tr -d '=\n'; }    # url-safe, no padding

declare -a KEYS=(
  SOURCE_PG_PASSWORD SOURCE_PG_CDC_PASSWORD
  PLATFORM_DB_SUPERUSER_PASSWORD AIRFLOW_DB_PASSWORD LAKEKEEPER_DB_PASSWORD
  MINIO_ROOT_PASSWORD LAKEHOUSE_S3_ACCESS_KEY LAKEHOUSE_S3_SECRET_KEY
  LAKEKEEPER_ENCRYPTION_KEY
  KAFKA_UI_PASSWORD
  AIRFLOW_ADMIN_PASSWORD AIRFLOW_FERNET_KEY AIRFLOW_API_SECRET_KEY AIRFLOW_JWT_SECRET
)

value_for() {
  case "$1" in
    LAKEHOUSE_S3_ACCESS_KEY)   echo "lab$(hex 8)" ;;       # 19 chars (MinIO: 3–20)
    LAKEHOUSE_S3_SECRET_KEY)   hex 20 ;;                   # 40 chars (MinIO: 8–40)
    AIRFLOW_FERNET_KEY)        fernet ;;
    LAKEKEEPER_ENCRYPTION_KEY) hex 32 ;;
    AIRFLOW_API_SECRET_KEY|AIRFLOW_JWT_SECRET) b64url 48 ;;
    *)                         hex 16 ;;                   # 32-char passwords
  esac
}

if [ "${1:-}" != "--write" ]; then
  echo "# Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) — paste into .env (or run: make secrets-write)"
  for k in "${KEYS[@]}"; do echo "$k=$(value_for "$k")"; done
  exit 0
fi

env_file="$LAB_DIR/.env"
[ -f "$env_file" ] || die ".env not found — run: make init"
cp "$env_file" "$env_file.bak"
filled=0
for k in "${KEYS[@]}"; do
  if grep -q "^$k=<FILL_ME>$" "$env_file"; then
    v="$(value_for "$k")"
    # values are [A-Za-z0-9_=-] only, so | is a safe sed delimiter
    sed -i.tmp "s|^$k=<FILL_ME>\$|$k=$v|" "$env_file" && rm -f "$env_file.tmp"
    filled=$((filled + 1))
  fi
done
info "filled $filled secret(s) in .env (backup: .env.bak)."
info "still to do by hand: usernames (…_USER) and, optionally, SNOWFLAKE_*  →  grep FILL_ME .env"
