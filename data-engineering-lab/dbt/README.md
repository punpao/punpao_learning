# dbt project — `de_lab`

Skeleton only. **No models yet** — each lab adds what it needs.

| Path | What goes here |
|---|---|
| `models/staging/` | one view per source table: rename, cast, nothing else (`stg_<source>__<entity>.sql`) |
| `models/intermediate/` | joins and business logic between staging and marts (`int_…`) |
| `models/marts/` | tables people query: facts and dimensions (`fct_…`, `dim_…`) |
| `seeds/` | small static CSVs (lookup tables) |
| `snapshots/` | SCD type-2 history of mutable tables |
| `tests/` | singular data tests (`.sql` returning failing rows) |
| `macros/` | reusable Jinja/SQL |
| `analyses/` | ad-hoc SQL compiled but never materialised |

## Targets (`profiles.yml`, copied from `profiles.yml.example`)

| Target | Engine | Needs |
|---|---|---|
| `dev` (default) | DuckDB file `data/lab.duckdb` | nothing running |
| `lakehouse` | DuckDB + Iceberg via Lakekeeper/MinIO | `make up` |
| `snowflake` | Snowflake | `SNOWFLAKE_*` in `.env`, key in `secrets/` (RUNBOOK §3.3) |

```bash
make dbt ARGS="debug --target dev"
```

```bash
make dbt ARGS="build --target lakehouse"
```

DuckDB allows **one writer per file**: don't run dbt locally and in Airflow against the
same `lab.duckdb` at the same time (RUNBOOK §8).
