#!/bin/sh
# One-shot (service: lakekeeper-init). Idempotent: safe to run on every `make up`.
#  1. bootstraps Lakekeeper (first start only)
#  2. registers the Iceberg warehouse "$LAKEKEEPER_WAREHOUSE" (data in s3://$LAKEHOUSE_BUCKET),
#     or, if it already exists, re-syncs its S3 credential from .env
set -eu

api="$LAKEKEEPER_URL/management/v1"

if curl -fsS "$api/info" | grep -q '"bootstrapped":true'; then
  echo "lakekeeper-init: already bootstrapped"
else
  curl -fsS -X POST "$api/bootstrap" \
    -H 'Content-Type: application/json' \
    -d '{"accept-terms-of-use": true}'
  echo "lakekeeper-init: bootstrapped"
fi

credential="{\"type\":\"s3\",\"credential-type\":\"access-key\",\"aws-access-key-id\":\"$LAKEHOUSE_S3_ACCESS_KEY\",\"aws-secret-access-key\":\"$LAKEHOUSE_S3_SECRET_KEY\"}"

# Warehouse already registered? Re-sync its S3 credential (so rotating LAKEHOUSE_S3_* in .env
# only needs `make up`) and stop.
warehouse_id="$(curl -fsS "$api/warehouse" | sed 's/{"id":"/\n/g' \
  | grep "\"name\":\"$LAKEKEEPER_WAREHOUSE\"" | cut -c1-36 | head -n1)"
if [ -n "$warehouse_id" ]; then
  curl -fsS -X POST "$api/warehouse/$warehouse_id/storage-credential" \
    -H 'Content-Type: application/json' \
    -d "{\"new-storage-credential\": $credential}" > /dev/null
  echo "lakekeeper-init: warehouse '$LAKEKEEPER_WAREHOUSE' exists ($warehouse_id); S3 credential re-synced"
  exit 0
fi

# sts-enabled=false: clients (DuckDB, pyiceberg, Kafka Connect) use their own S3 keys
# (LAKEHOUSE_S3_*) instead of credentials vended by the catalog. Simple and predictable locally.
cat > /tmp/warehouse.json <<JSON
{
  "warehouse-name": "$LAKEKEEPER_WAREHOUSE",
  "storage-profile": {
    "type": "s3",
    "bucket": "$LAKEHOUSE_BUCKET",
    "key-prefix": "warehouse",
    "endpoint": "http://minio:9000",
    "region": "$S3_REGION",
    "path-style-access": true,
    "flavor": "s3-compat",
    "sts-enabled": false
  },
  "storage-credential": $credential
}
JSON

code=$(curl -sS -o /tmp/resp.json -w '%{http_code}' -X POST "$api/warehouse" \
  -H 'Content-Type: application/json' --data @/tmp/warehouse.json)
if [ "$code" -ge 200 ] && [ "$code" -lt 300 ]; then
  echo "lakekeeper-init: warehouse '$LAKEKEEPER_WAREHOUSE' created"
else
  echo "lakekeeper-init: creating warehouse failed (HTTP $code):" >&2
  cat /tmp/resp.json >&2
  exit 1
fi
