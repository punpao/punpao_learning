# data/

Local files shared between your laptop and Airflow (mounted at `/opt/airflow/data`):
the DuckDB database `lab.duckdb`, exports, sample files. **Everything here except this README
is git-ignored**, and `make reset` empties it. Service data (Postgres, MinIO, Kafka) lives in
Docker named volumes, not here.
