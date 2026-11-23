# secrets/

Private key files only, for example the Snowflake key `snowflake_rsa_key.p8` (RUNBOOK §3.3).
Mounted read-only into Airflow at `/opt/airflow/secrets`. **Everything here except this
README is git-ignored**, and a pre-commit hook blocks committing it anyway.
