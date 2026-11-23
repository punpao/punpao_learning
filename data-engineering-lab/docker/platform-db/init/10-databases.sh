#!/usr/bin/env bash
# Runs once, on first start of an empty platform-db volume.
# Creates one database + owner role per platform service (Airflow, Lakekeeper).
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname postgres \
  -v airflow_pw="$AIRFLOW_DB_PASSWORD" \
  -v lakekeeper_pw="$LAKEKEEPER_DB_PASSWORD" <<'SQL'
CREATE ROLE airflow LOGIN PASSWORD :'airflow_pw';
CREATE DATABASE airflow OWNER airflow;

CREATE ROLE lakekeeper LOGIN PASSWORD :'lakekeeper_pw';
CREATE DATABASE lakekeeper OWNER lakekeeper;
SQL

echo "platform-db: databases 'airflow' and 'lakekeeper' created"
