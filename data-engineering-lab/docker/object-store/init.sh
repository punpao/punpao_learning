#!/bin/sh
# One-shot (service: minio-init). Idempotent: safe to run on every `make up`.
#  1. creates the lab buckets
#  2. creates a least-privilege S3 user (LAKEHOUSE_S3_ACCESS_KEY) limited to those buckets
# Everything else (Lakekeeper, DuckDB, Kafka Connect, Airflow) uses that user, never root.
set -eu

mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" > /dev/null

for bucket in "$LAKEHOUSE_BUCKET" "$RAW_BUCKET"; do
  mc mb --ignore-existing "local/$bucket"
done

cat > /tmp/lab-buckets.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetBucketLocation", "s3:ListBucket", "s3:ListBucketMultipartUploads"],
      "Resource": ["arn:aws:s3:::${LAKEHOUSE_BUCKET}", "arn:aws:s3:::${RAW_BUCKET}"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject",
                 "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"],
      "Resource": ["arn:aws:s3:::${LAKEHOUSE_BUCKET}/*", "arn:aws:s3:::${RAW_BUCKET}/*"]
    }
  ]
}
JSON

mc admin policy create local lab-buckets /tmp/lab-buckets.json > /dev/null
mc admin user add local "$LAKEHOUSE_S3_ACCESS_KEY" "$LAKEHOUSE_S3_SECRET_KEY" > /dev/null
# attaching an already-attached policy returns an error; that's fine on re-runs
mc admin policy attach local lab-buckets --user "$LAKEHOUSE_S3_ACCESS_KEY" > /dev/null 2>&1 || true

echo "minio-init: buckets [$LAKEHOUSE_BUCKET, $RAW_BUCKET] ready; user '$LAKEHOUSE_S3_ACCESS_KEY' has policy lab-buckets"
