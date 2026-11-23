#!/usr/bin/env bash
# Runs once, on first start of an empty postgres-source volume.
# Creates a least-privilege CDC role for Debezium and a publication for pgoutput.
# Lab tables/data are NOT created here — each lab brings its own.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v cdc_user="$SOURCE_PG_CDC_USER" \
  -v cdc_pw="$SOURCE_PG_CDC_PASSWORD" \
  -v db="$POSTGRES_DB" \
  -v pub="${DEBEZIUM_PUBLICATION:-dbz_publication}" <<'SQL'
-- REPLICATION lets the role open a logical replication slot; it is NOT a superuser.
CREATE ROLE :"cdc_user" WITH LOGIN REPLICATION PASSWORD :'cdc_pw';
GRANT CONNECT ON DATABASE :"db" TO :"cdc_user";
GRANT USAGE ON SCHEMA public TO :"cdc_user";

-- Debezium's initial snapshot needs SELECT on captured tables, including future ones.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"cdc_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO :"cdc_user";

-- One publication for every table (current and future). Connectors filter with
-- table.include.list. Creating it here means the CDC role never needs ownership.
CREATE PUBLICATION :"pub" FOR ALL TABLES;
SQL

echo "postgres-source: CDC role '$SOURCE_PG_CDC_USER' and publication '${DEBEZIUM_PUBLICATION:-dbz_publication}' created"
