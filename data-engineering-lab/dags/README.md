# dags/

**Empty on purpose: lab DAGs go here.** Mounted into every Airflow container at
`/opt/airflow/dags`; new files are picked up within ~30 s.

Ready for you inside Airflow:

| What | Where |
|---|---|
| Connection to the source DB | conn id `source_postgres` |
| S3 connection to MinIO (lab user) | conn id `lakehouse_s3` (type `aws`, endpoint `http://minio:9000`) |
| dbt (isolated venv) | `$DBT_VENV/bin/dbt … --project-dir $DBT_PROJECT_DIR` (profiles in `$DBT_PROFILES_DIR`) |
| DuckDB file | `$DUCKDB_PATH` (= `data/lab.duckdb` on your laptop) |
| Iceberg catalog | `$LAKEKEEPER_CATALOG_URL`, warehouse `$LAKEKEEPER_WAREHOUSE` |
| Snowflake key | `$SECRETS_DIR/$SNOWFLAKE_PRIVATE_KEY_FILE` |

Use the Airflow 3 Task SDK (`from airflow.sdk import dag, task`). DAGs start paused.
