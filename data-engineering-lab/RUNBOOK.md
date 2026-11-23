# Runbook: data-engineering-lab

Everything you need to install, configure, start, verify, operate and fix the platform.
Commands run from the `data-engineering-lab/` folder unless stated otherwise.

| § | Section |
|---|---|
| 1 | [Prerequisites](#1-prerequisites) |
| 2 | [Blanks reference table](#2-blanks-reference-table) |
| 3 | [How to get each value](#3-how-to-get-each-value) |
| 4 | [First-time setup](#4-first-time-setup) |
| 5 | [Verify each connection](#5-verify-each-connection) |
| 6 | [Service map](#6-service-map) |
| 7 | [Daily commands](#7-daily-commands) |
| 8 | [Troubleshooting](#8-troubleshooting) |

---

## 1. Prerequisites

### 1.1 Software

| Tool | Minimum version | Check | Install |
|---|---|---|---|
| Docker Desktop (macOS / Windows) or Docker Engine + Compose plugin (Linux) | Docker Desktop 4.30+, Compose v2.27+ (tested: Engine 29.10, Compose 5.7) | `docker version` and `docker compose version` | <https://docs.docker.com/get-started/get-docker/> |
| uv (Python and package manager) | 0.13 (CI pins 0.13.9) | `uv --version` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` (macOS/Linux) or `brew install uv` |
| make | GNU make 3.81+ (the macOS default works) | `make --version` | macOS: `xcode-select --install` · Ubuntu: `sudo apt install make` |
| git | 2.40+ | `git --version` | macOS: Xcode CLT or `brew install git` · Ubuntu: `sudo apt install git` |
| curl, openssl | any recent | `curl --version`, `openssl version` | preinstalled on macOS and Linux |

You do **not** need to install Python, Java, Kafka, Postgres or dbt yourself: uv downloads
Python 3.12 and the pinned tools, and everything else runs in containers.

**Windows:** use WSL 2 (Ubuntu). Install Docker Desktop with the WSL 2 backend, enable
*Settings → Resources → WSL integration* for your distro, clone this repo **inside** the
WSL file system (for example `~/code`, not `/mnt/c/...`) and run every command in the WSL shell.

### 1.2 Hardware

| | Minimum | Recommended |
|---|---|---|
| RAM in the laptop | 16 GB | 16 GB+ |
| Memory given to Docker | 6 GB (core + one other profile) | 8 GB (all profiles) |
| CPUs given to Docker | 4 | 6 |
| Free disk | 20 GB | 40 GB |

Images take about 8 GB on disk: ~1.6 GB for `core`, ~2.3 GB for `streaming`, and ~4 GB for the
custom Airflow image.

Measured memory use (idle) and the hard caps set in `docker-compose.yml`:

| Profile | Services | Idle RAM | Cap (`deploy.resources.limits`) |
|---|---|---|---|
| `core` | postgres-source, platform-db, minio, lakekeeper | ~0.3 GB | 1.8 GB |
| `streaming` | kafka, kafka-connect, kafka-ui | ~1.2 GB | 3.0 GB |
| `orchestration` | airflow-apiserver, -scheduler, -dag-processor, -triggerer | ~1.2 GB | 3.8 GB |
| all three | | ~2.7 GB | 8.6 GB |

### 1.3 Docker Desktop resource settings

*Docker Desktop → Settings → Resources → Advanced:*

| Setting | Value |
|---|---|
| CPU limit | 4–6 |
| Memory limit | **8 GB** (6 GB is enough if you never run all three profiles together) |
| Swap | 1–2 GB |
| Virtual disk limit | 64 GB+ |

Also:

- **macOS:** *Settings → General → Virtual Machine Options:* choose **Apple Virtualization
  framework** and **VirtioFS** file sharing (faster bind mounts). All images used here are
  multi-arch, so Rosetta isn't required.
- **Windows (WSL 2):** memory is set in `%UserProfile%\.wslconfig`, not in Docker Desktop:

  ```ini
  [wsl2]
  memory=8GB
  processors=6
  swap=2GB
  ```

  Then run `wsl --shutdown` and restart Docker Desktop.
- **Linux:** Docker Engine uses host memory directly, so there's nothing to set. Do set `AIRFLOW_UID` (§3.4).

---

## 2. Blanks reference table

Every blank you have to fill in. Secrets in `.env` start as `<FILL_ME>`; `make preflight`
(run automatically by `make up`) refuses to start while a required one is still blank.

**Quick path:** `make init`, then `make secrets-write` fills **all secrets** (rows marked 🔑)
with strong random values. You still type the **usernames** (rows marked ✍️) and, if you want
it, the Snowflake block.

### 2.1 `.env`

| Variable / file | What it is | Used by | Required? | How to get it | Example format |
|---|---|---|---|---|---|
| ✍️ `SOURCE_PG_USER` | Owner/superuser of the source DB | postgres-source, Airflow conn `source_postgres`, `make psql` | Required | You choose (§3.1) | `lab_admin` |
| 🔑 `SOURCE_PG_PASSWORD` | Password for `SOURCE_PG_USER` | postgres-source, Airflow | Required | `make secrets` or §3.1 | `9f1c2e…` (32 hex) |
| ✍️ `SOURCE_PG_CDC_USER` | Least-privilege login for Debezium (REPLICATION + SELECT) | postgres-source init, Kafka Connect | Required | You choose; must differ from `SOURCE_PG_USER` | `debezium` |
| 🔑 `SOURCE_PG_CDC_PASSWORD` | Password for the CDC login | postgres-source init, Kafka Connect | Required | `make secrets` | 32 hex chars |
| ✍️ `PLATFORM_DB_SUPERUSER` | Superuser of the platform metadata DB | platform-db | Required | You choose; not `airflow` or `lakekeeper` | `platform_admin` |
| 🔑 `PLATFORM_DB_SUPERUSER_PASSWORD` | Its password | platform-db | Required | `make secrets` | 32 hex chars |
| 🔑 `AIRFLOW_DB_PASSWORD` | Password of the `airflow` role (owns DB `airflow`) | platform-db init, all Airflow services | Required | `make secrets` | 32 hex chars |
| 🔑 `LAKEKEEPER_DB_PASSWORD` | Password of the `lakekeeper` role (owns DB `lakekeeper`) | platform-db init, lakekeeper | Required | `make secrets` | 32 hex chars |
| ✍️ `MINIO_ROOT_USER` | MinIO admin user (console + admin tasks only) | minio, minio-init | Required | You choose, 3+ chars | `minio_admin` |
| 🔑 `MINIO_ROOT_PASSWORD` | MinIO admin password | minio, minio-init | Required | `make secrets` (8+ chars) | 32 hex chars |
| 🔑 `LAKEHOUSE_S3_ACCESS_KEY` | Access key of the lab S3 user (limited to the lab buckets) | minio-init, Lakekeeper warehouse, DuckDB, Kafka Connect, Airflow conn `lakehouse_s3` | Required | `make secrets` (3–20 chars) | `lab3f9a0c1d2e4b5a6c` |
| 🔑 `LAKEHOUSE_S3_SECRET_KEY` | Secret key of the lab S3 user | same as above | Required | `make secrets` (8–40 chars) | 40 hex chars |
| 🔑 `LAKEKEEPER_ENCRYPTION_KEY` | Encrypts the S3 credentials Lakekeeper stores in Postgres | lakekeeper | Required | `openssl rand -hex 32` (§3.2) | 64 hex chars |
| ✍️ `KAFKA_UI_USER` | Kafka UI login | kafka-ui | Required | You choose | `admin` |
| 🔑 `KAFKA_UI_PASSWORD` | Kafka UI password | kafka-ui | Required | `make secrets` | 32 hex chars |
| ✍️ `AIRFLOW_ADMIN_USER` | Airflow UI admin (created on first init) | airflow-init | Required | You choose | `admin` |
| 🔑 `AIRFLOW_ADMIN_PASSWORD` | Its password | airflow-init | Required | `make secrets` | 32 hex chars |
| 🔑 `AIRFLOW_FERNET_KEY` | Encrypts connections/variables in the Airflow DB | all Airflow services | Required | §3.2 command | 44 chars ending in `=`, e.g. `Xw2…k8=` |
| 🔑 `AIRFLOW_API_SECRET_KEY` | `[api] secret_key`: signs session cookies (Airflow 3's version of the old webserver secret key) | all Airflow services | Required | §3.2 command | 64 url-safe chars |
| 🔑 `AIRFLOW_JWT_SECRET` | `[api_auth] jwt_secret`: signs the tokens Airflow components use to talk to each other | all Airflow services | Required | §3.2 command | 64 url-safe chars |
| `SNOWFLAKE_ACCOUNT` | Account identifier | dbt `snowflake` target | Optional | §3.3 step 2 | `myorg-myaccount` |
| `SNOWFLAKE_USER` | Service user dbt logs in as | dbt `snowflake` | Optional | §3.3 step 3 | `DE_LAB_DBT` |
| `SNOWFLAKE_ROLE` | Role dbt uses | dbt `snowflake` | Optional | §3.3 step 3 | `DE_LAB_ROLE` |
| `SNOWFLAKE_WAREHOUSE` | Virtual warehouse (compute) | dbt `snowflake` | Optional | §3.3 step 3 | `DE_LAB_WH` |
| `SNOWFLAKE_DATABASE` | Database dbt builds into | dbt `snowflake` | Optional | §3.3 step 3 | `DE_LAB` |
| `SNOWFLAKE_SCHEMA` | Default schema | dbt `snowflake` | Optional | §3.3 step 3 | `DBT_DEV` |
| `SNOWFLAKE_PRIVATE_KEY_FILE` | File name of the private key in `secrets/` (has a default) | dbt `snowflake` | Optional | §3.3 step 4 | `snowflake_rsa_key.p8` |
| `SNOWFLAKE_PRIVATE_KEY_PASSPHRASE` | Passphrase protecting the private key | dbt `snowflake` | Optional | You choose in §3.3 step 4 | 20+ chars |

### 2.2 Files

| Variable / file | What it is | Used by | Required? | How to get it | Example format |
|---|---|---|---|---|---|
| `.env` | Every value above | docker compose, scripts, local dbt | Required | `make init` (copies `.env.example`) | `KEY=value` per line |
| `dbt/profiles.yml` | dbt connection profiles; reads everything from env vars, no secrets inside | local dbt, Airflow's dbt | Required for dbt | `make init` (copies `dbt/profiles.yml.example`) | YAML |
| `secrets/snowflake_rsa_key.p8` | Encrypted private key for Snowflake key-pair auth | dbt `snowflake` (local + Airflow) | Optional | §3.3 step 4 | encrypted PKCS#8 PEM file (`.p8`) |
| `connectors/iceberg-sink.json` → `<FILL_ME_TOPICS>`, `<FILL_ME_NAMESPACE>`, `<FILL_ME_TABLE>` | Which topics go to which Iceberg table | Kafka Connect (Iceberg sink) | Only when a lab uses the sink | Decided by the lab | `cdc.public.orders` / `raw.orders` |

### 2.3 Defaults you may change (not secret)

| Variable | Default | Change when… |
|---|---|---|
| `SOURCE_PG_HOST_PORT` · `PLATFORM_DB_HOST_PORT` | 5433 · 5434 | another Postgres uses the port |
| `MINIO_API_HOST_PORT` · `MINIO_CONSOLE_HOST_PORT` | 9000 · 9001 | port clash (also update `S3_ENDPOINT` usage, §8.5) |
| `LAKEKEEPER_HOST_PORT` | 8181 | port clash |
| `KAFKA_HOST_PORT` · `KAFKA_CONNECT_HOST_PORT` · `KAFKA_UI_HOST_PORT` | 9092 · 8083 · 8082 | port clash |
| `AIRFLOW_HOST_PORT` | 8080 | port clash |
| `AIRFLOW_UID` | 50000 | **Linux**: set to `id -u` (§3.4) |
| `SOURCE_PG_DB` · `LAKEHOUSE_BUCKET` · `RAW_BUCKET` · `LAKEKEEPER_WAREHOUSE` | `labdb` · `lakehouse` · `raw` · `lakehouse` | rarely; only before the first `make up` |
| `DEBEZIUM_PUBLICATION` · `DEBEZIUM_SLOT_NAME` · `CDC_TOPIC_PREFIX` | `dbz_publication` · `debezium_lab` · `cdc` | per lab, if you need several connectors |
| `KAFKA_CLUSTER_ID` | a fixed id | never, unless you also reset the Kafka volume (§8.8) |
| `S3_REGION` | `us-east-1` | never (MinIO ignores it) |

---

## 3. How to get each value

### 3.1 Local secrets you create yourself (Postgres, MinIO, Kafka UI, Airflow admin)

These accounts exist only on your laptop, so you invent them. Rules:

| Applies to | Rule | Why |
|---|---|---|
| All passwords and keys | letters, digits, `-` and `_` only | they are embedded in connection URLs (`postgresql://user:pass@…`) and JSON; `@ : / # % ?` would break them |
| All passwords | 16+ chars (`make secrets` makes 32) | brute-force resistance, even locally |
| Postgres usernames (`SOURCE_PG_USER`, `SOURCE_PG_CDC_USER`, `PLATFORM_DB_SUPERUSER`) | lowercase letters, digits, `_`; start with a letter | unquoted Postgres role names |
| `SOURCE_PG_CDC_USER` | different from `SOURCE_PG_USER` | Debezium should never run as a superuser |
| `PLATFORM_DB_SUPERUSER` | not `airflow` or `lakekeeper` | those roles are created by the init script |
| `MINIO_ROOT_USER` / `_PASSWORD` | 3+ / 8+ chars | MinIO's own limits |
| `LAKEHOUSE_S3_ACCESS_KEY` / `_SECRET_KEY` | 3–20 / 8–40 chars; access key ≠ root user | S3 key-length limits |

Generate them in any of these ways:

```bash
make secrets            # prints KEY=value for every secret; paste what you need
```

```bash
make secrets-write      # writes every still-<FILL_ME> secret into .env (backup: .env.bak)
```

```bash
openssl rand -hex 16    # one 32-char password
```

A password manager's generator works too: choose letters and digits only, 24+ characters.

> **Important: init scripts run only once.** The Postgres roles, MinIO user and Airflow admin
> are created the **first** time their volume starts empty. Changing a password in `.env`
> afterwards does **not** change it in the running service. Either change it in both places
> (§8.3) or wipe and recreate with `make reset` followed by `make up`. Exception: the MinIO lab
> user and the Lakekeeper warehouse credential re-sync on every `make up`.

### 3.2 Generated keys (exact commands)

| Key | Command | Notes |
|---|---|---|
| `AIRFLOW_FERNET_KEY` | `openssl rand -base64 32 \| tr '+/' '-_'` | Must be 32 random bytes in url-safe base64 (44 chars, ends with `=`). Equivalent: `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. **Don't change it later**: connections and variables already encrypted with the old key become unreadable (to rotate, set `old_key,new_key` comma-separated and run `airflow rotate-fernet-key`). |
| `AIRFLOW_API_SECRET_KEY` | `openssl rand -base64 48 \| tr '+/' '-_' \| tr -d '=\n'` | Airflow 3 moved the old `[webserver] secret_key` to `[api] secret_key`. Changing it logs everyone out. |
| `AIRFLOW_JWT_SECRET` | `openssl rand -base64 48 \| tr '+/' '-_' \| tr -d '=\n'` | Must be identical in every Airflow container (compose takes care of that). If it's missing, each container makes up its own and tasks fail with *Invalid auth token*. |
| `LAKEKEEPER_ENCRYPTION_KEY` | `openssl rand -hex 32` | Encrypts stored storage credentials. Changing it later makes the stored warehouse credential unreadable, so `make reset` afterwards. |
| `LAKEHOUSE_S3_ACCESS_KEY` | `echo "lab$(openssl rand -hex 8)"` | 19 chars |
| `LAKEHOUSE_S3_SECRET_KEY` | `openssl rand -hex 20` | 40 chars |
| `KAFKA_CLUSTER_ID` (optional) | `docker run --rm apache/kafka:4.3.2 /opt/kafka/bin/kafka-storage.sh random-uuid` | The default is fine; a new id requires wiping the Kafka volume. |

`make secrets` and `make secrets-write` run exactly these commands (see `scripts/gen-secrets.sh`).

### 3.3 Snowflake (optional)

Only the dbt `snowflake` target uses Snowflake. Skip this section and leave `SNOWFLAKE_*` as
`<FILL_ME>`; `make check` then shows *SKIP*.

**Step 1: Create a trial account.**

1. Go to <https://signup.snowflake.com/> and sign up (30-day trial with free credits, no card).
2. Choose **Enterprise** edition, any cloud, and the region closest to you.
3. Activate the account from the e-mail and set the admin username and password. That admin
   is for *you* in the web UI (Snowsight), not for dbt.

**Step 2: Find the account identifier.**

The account identifier format is `<orgname>-<accountname>`.

- In Snowsight, open the account menu (bottom-left, your initials), then **Account → View
  account details**. Copy **Account identifier**. If it's shown as `ORG.ACCOUNT`, replace the
  dot with a dash.
- Or run this in a worksheet:

  ```sql
  select current_organization_name() || '-' || current_account_name() as account_identifier;
  ```

Put it in `.env` as `SNOWFLAKE_ACCOUNT=myorg-myaccount`. Don't include `.snowflakecomputing.com`.

**Step 3: Create the role, warehouse, database, schema and service user.**

Open a SQL worksheet in Snowsight and run this as `ACCOUNTADMIN`. Names are suggestions;
if you change them, change `.env` to match.

```sql
-- 1. role (owned by SECURITYADMIN, rolled up to SYSADMIN so admins can see its objects)
use role securityadmin;
create role if not exists de_lab_role comment = 'data-engineering-lab dbt role';
grant role de_lab_role to role sysadmin;

-- 2. compute + storage (owned by SYSADMIN)
use role sysadmin;
create warehouse if not exists de_lab_wh
  warehouse_size = xsmall
  auto_suspend = 60            -- seconds idle before it stops billing
  auto_resume = true
  initially_suspended = true;
create database if not exists de_lab;
create schema if not exists de_lab.dbt_dev;

-- 3. privileges for the role
grant usage on warehouse de_lab_wh to role de_lab_role;
grant usage, create schema on database de_lab to role de_lab_role;   -- dbt creates its own schemas
grant all privileges on schema de_lab.dbt_dev to role de_lab_role;
grant select on future tables in schema de_lab.dbt_dev to role de_lab_role;

-- 4. service user for dbt: TYPE = SERVICE means key-pair only, no password login
use role useradmin;
create user if not exists de_lab_dbt
  type = service
  default_role = de_lab_role
  default_warehouse = de_lab_wh
  default_namespace = de_lab.dbt_dev
  comment = 'dbt service user for data-engineering-lab';
use role securityadmin;
grant role de_lab_role to user de_lab_dbt;

-- 5. cost guard: suspend the warehouse after 10 credits per month
use role accountadmin;
create resource monitor if not exists de_lab_rm
  with credit_quota = 10 frequency = monthly start_timestamp = immediately
  triggers on 80 percent do notify
           on 100 percent do suspend;
alter warehouse de_lab_wh set resource_monitor = de_lab_rm;
```

Then set these in `.env`:

```dotenv
SNOWFLAKE_USER=DE_LAB_DBT
SNOWFLAKE_ROLE=DE_LAB_ROLE
SNOWFLAKE_WAREHOUSE=DE_LAB_WH
SNOWFLAKE_DATABASE=DE_LAB
SNOWFLAKE_SCHEMA=DBT_DEV
```

**Step 4: Set up key-pair authentication.**

Snowflake is phasing out password-only logins, and a key pair is how services authenticate.

1. Create an **encrypted** private key. openssl asks for a passphrase; use 20+ characters and
   put it in `.env` as `SNOWFLAKE_PRIVATE_KEY_PASSPHRASE`:

   ```bash
   openssl genrsa 2048 | openssl pkcs8 -topk8 -v2 aes-256-cbc -inform PEM -out secrets/snowflake_rsa_key.p8
   ```

2. Derive the public key from it (asks for the passphrase):

   ```bash
   openssl rsa -in secrets/snowflake_rsa_key.p8 -pubout -out secrets/snowflake_rsa_key.pub
   ```

3. Lock down the private key file:

   ```bash
   chmod 600 secrets/snowflake_rsa_key.p8
   ```

4. Print the public key as one line, without the `-----BEGIN/END-----` lines:

   ```bash
   grep -v -- '-----' secrets/snowflake_rsa_key.pub | tr -d '\n'; echo
   ```

5. Register it on the user in Snowsight, pasting the line from step 4:

   ```sql
   use role securityadmin;
   alter user de_lab_dbt set rsa_public_key = 'MIIBIjANBgkqh…paste…IDAQAB';
   desc user de_lab_dbt;   -- note RSA_PUBLIC_KEY_FP (SHA256:…)
   ```

6. Confirm the fingerprint matches your local key. The output must equal `RSA_PUBLIC_KEY_FP`
   without the `SHA256:` prefix:

   ```bash
   openssl rsa -pubin -in secrets/snowflake_rsa_key.pub -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
   ```

7. Keep `SNOWFLAKE_PRIVATE_KEY_FILE=snowflake_rsa_key.p8` (the default) unless you named the
   file differently. `secrets/` is git-ignored and mounted read-only into Airflow.

**Step 5: Test it.**

```bash
make dbt-debug TARGET=snowflake
```

Expect `All checks passed!`. `make check` now runs this test too. When you are done with
the trial: `use role sysadmin; drop database de_lab; drop warehouse de_lab_wh;`.

### 3.4 Anything else the stack needs

| Item | When | What to do |
|---|---|---|
| `AIRFLOW_UID` | **Linux only** | Set it to the output of `id -u`. The Airflow containers then write into `data/`, `dags/` and `dbt/` as you, and you avoid *Permission denied* errors. Docker Desktop on macOS/Windows maps ownership for you, so keep `50000`. |
| Docker image registries | Always | Images come from Docker Hub and **quay.io** (MinIO, Debezium). On a corporate network that blocks quay.io, see §8.5 and §8.4. |
| DuckDB extensions | The first time the `lakehouse` target runs | DuckDB downloads `httpfs` and `iceberg` from `extensions.duckdb.org` (cached in `~/.duckdb`). Needs internet once. |
| `/etc/hosts` entry `127.0.0.1 minio` | Optional; only for **host-side pyiceberg/Spark** | Lakekeeper hands clients the S3 endpoint `http://minio:9000`, which only resolves inside Docker. DuckDB doesn't need this (it uses its own S3 secret). To use pyiceberg from your laptop, add the line with `sudo sh -c 'echo "127.0.0.1 minio" >> /etc/hosts'`, or run the code inside Airflow instead. |
| Iceberg sink plugin | When a lab streams Kafka into Iceberg | See `connectors/README.md`. |
| pre-commit hook | Once, optional | `make hooks` installs the git hook. CI runs the same checks either way. |

---

## 4. First-time setup

```bash
cd data-engineering-lab
```

1. **Install the local toolchain** (dbt, DuckDB, pyiceberg, linters, all pinned in `uv.lock`):

   ```bash
   make sync
   ```

2. **Copy the templates.** This creates `.env` and `dbt/profiles.yml`, and the `data/` and `secrets/` folders:

   ```bash
   make init
   ```

3. **Fill in the secrets** automatically (or by hand using §3):

   ```bash
   make secrets-write
   ```

4. **Fill in the usernames.** Open `.env` and replace each remaining `<FILL_ME>` except the
   Snowflake block. On Linux, also set `AIRFLOW_UID` to the output of `id -u`. This lists
   what's still blank:

   ```bash
   grep -n FILL_ME .env
   ```

5. **Optional: Snowflake.** Follow §3.3.

6. **Start the core profile.** `make up` runs the preflight check, starts the services and
   waits until every one is healthy. The first run pulls about 1.6 GB of images:

   ```bash
   make up
   ```

7. **Start the other profiles** when you need them. The first `up-orchestration` builds the
   Airflow image (about 3.3 GB download plus 3–6 minutes of building):

   ```bash
   make up-streaming
   ```

   ```bash
   make up-orchestration
   ```

   ```bash
   make up-all
   ```

8. **Verify** (§5):

   ```bash
   make check
   ```

A successful `make up` ends like this:

```text
✓ all services healthy (41s)
SERVICE           STATUS                    PORTS
lakekeeper        Up 30 seconds (healthy)   127.0.0.1:8181->8181/tcp
minio             Up 38 seconds (healthy)   127.0.0.1:9000-9001->9000-9001/tcp
platform-db       Up 38 seconds (healthy)   127.0.0.1:5434->5432/tcp
postgres-source   Up 38 seconds (healthy)   127.0.0.1:5433->5432/tcp
```

What happens on the first start (one-shot jobs, each re-run safely on later `make up`s):

| Job | Does |
|---|---|
| `postgres-source` init (first start only) | creates `SOURCE_PG_CDC_USER` with REPLICATION and the publication `dbz_publication` |
| `platform-db` init (first start only) | creates the `airflow` and `lakekeeper` databases and roles |
| `minio-init` | creates buckets `lakehouse` and `raw`, plus the lab S3 user with a policy limited to them |
| `lakekeeper-migrate` | creates or upgrades the catalog schema |
| `lakekeeper-init` | bootstraps Lakekeeper and registers the warehouse `lakehouse` → `s3://lakehouse/warehouse` |
| `airflow-init` | migrates the Airflow DB and creates the admin user (first start only) |

---

## 5. Verify each connection

### 5.1 Automated: `make check`

`scripts/check.sh` tests every **running** service and prints PASS / FAIL / SKIP. Services
whose profile you didn't start are skipped, not failed. The exit code is 1 if anything
fails. Each FAIL line includes a hint and the RUNBOOK section to read.

| Area | What `make check` proves |
|---|---|
| Source Postgres | healthy · `wal_level=logical` · admin login · CDC login has REPLICATION · publication exists · replication slots and retained WAL (INFO) |
| Platform DB | `airflow` and `lakekeeper` roles can log in to their DBs |
| MinIO | healthy · `minio-init` succeeded · S3 API and console reachable from the host · the lab S3 user can list both buckets |
| Lakekeeper | healthy · `lakekeeper-init` succeeded · API reachable · warehouse registered · Iceberg REST `/v1/config` answers |
| Kafka | healthy · produce→consume round trip · KRaft quorum has a leader |
| Kafka Connect | healthy · Debezium Postgres plugin installed · **the Debezium template validates against the live DB** (checks `${env:…}` resolution, CDC credentials and the publication without creating a slot) |
| Kafka UI | healthy · reachable · your login works |
| Airflow | `airflow-init` succeeded · four components healthy · `/api/v2/monitor/health` all healthy · admin login gets an API token · dbt is in the image · connections `source_postgres` and `lakehouse_s3` resolve |
| Local dbt | `dbt debug --target dev` · `--target lakehouse` (DuckDB → Lakekeeper → MinIO) when core runs · `--target snowflake` when filled in |

Example (all profiles):

```text
Source Postgres (postgres-source → localhost:5433)
  PASS  postgres-source container is healthy
  PASS  wal_level = logical (CDC ready)
  PASS  login as SOURCE_PG_CDC_USER (debezium) with REPLICATION
  …
Summary: 42 passed, 0 failed, 1 skipped
```

### 5.2 Manual checks

| Service | Open / run | Expect |
|---|---|---|
| Source Postgres | `make psql`, then `show wal_level;` and `\dRp` | `logical`; publication `dbz_publication` |
| Source Postgres from a GUI (DBeaver, DataGrip, TablePlus) | host `localhost`, port `5433`, DB `labdb`, user `SOURCE_PG_USER` | connects |
| Platform DB | `docker compose --profile core exec platform-db psql -U <PLATFORM_DB_SUPERUSER> -c '\l'` | databases `airflow` and `lakekeeper` |
| MinIO console | <http://localhost:9001>, log in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | buckets `lakehouse` and `raw` |
| MinIO S3 API | `curl -I http://localhost:9000/minio/health/live` | `HTTP/1.1 200 OK` |
| Lakekeeper UI | <http://localhost:8181/ui> | warehouse **lakehouse**; browse namespaces and tables |
| Lakekeeper API | `curl -s http://localhost:8181/management/v1/warehouse` | JSON listing `"name":"lakehouse"` |
| Kafka | `make topics` | internal topics such as `_connect_configs` (once Connect has run) |
| Kafka Connect | `make connect-plugins` | `io.debezium.connector.postgresql.PostgresConnector` |
| Kafka UI | <http://localhost:8082>, log in with `KAFKA_UI_USER` / `KAFKA_UI_PASSWORD` | cluster **de-lab** online; *Kafka Connect* tab shows `connect` |
| Airflow UI | <http://localhost:8080>, log in with `AIRFLOW_ADMIN_USER` / `AIRFLOW_ADMIN_PASSWORD` | no DAGs yet; *Admin → Connections* lists nothing (env-var connections are hidden from the UI by design) |
| Airflow health | `curl -s http://localhost:8080/api/v2/monitor/health` | every component `"healthy"` |
| dbt (DuckDB) | `make dbt-debug` | `All checks passed!` |
| dbt (lakehouse) | `make dbt-debug TARGET=lakehouse` | `All checks passed!` |
| dbt (Snowflake) | `make dbt-debug TARGET=snowflake` | `All checks passed!` |

**DuckDB → Iceberg by hand.** This lists the namespaces in the warehouse (empty until a lab
writes some):

```bash
uv run --env-file .env python - <<'PY'
import duckdb, os
con = duckdb.connect()
con.sql("INSTALL httpfs; INSTALL iceberg; LOAD httpfs; LOAD iceberg;")
con.sql(f"""CREATE SECRET (TYPE s3, KEY_ID '{os.environ["LAKEHOUSE_S3_ACCESS_KEY"]}',
  SECRET '{os.environ["LAKEHOUSE_S3_SECRET_KEY"]}', ENDPOINT 'localhost:9000',
  URL_STYLE 'path', USE_SSL false, REGION 'us-east-1')""")
con.sql("""ATTACH 'lakehouse' AS lakehouse (TYPE iceberg,
  ENDPOINT 'http://localhost:8181/catalog', AUTHORIZATION_TYPE 'none', ACCESS_DELEGATION_MODE 'none')""")
print(con.sql("SELECT * FROM duckdb_schemas() WHERE database_name = 'lakehouse'"))
PY
```

**Optional end-to-end CDC smoke test.** This proves Postgres → Debezium → Kafka, then cleans up:

1. Create a throwaway table:

   ```bash
   make psql
   ```

   ```sql
   create table _smoke (id int primary key, note text);
   insert into _smoke values (1, 'hello');
   \q
   ```

2. Register the connector and check that it's `RUNNING`:

   ```bash
   make connect-register NAME=debezium-postgres-source
   ```

   ```bash
   make connect-status NAME=pg-source-cdc
   ```

3. Look for the topic `cdc.public._smoke` in `make topics` or in Kafka UI.

4. Clean up. Delete the connector, then drop its replication slot and the table (§8.4):

   ```bash
   make connect-delete NAME=pg-source-cdc
   ```

   ```bash
   make psql
   ```

   ```sql
   select pg_drop_replication_slot('debezium_lab');
   drop table _smoke;
   ```

---

## 6. Service map

All host ports bind to **127.0.0.1**, so nothing is exposed to your network. *Inside Docker*
is the address other containers (Airflow, Kafka Connect) use.

| Service | Profile | On your laptop | Inside Docker | Login comes from |
|---|---|---|---|---|
| postgres-source | core | `localhost:5433` (`SOURCE_PG_HOST_PORT`), DB `labdb` | `postgres-source:5432` | `SOURCE_PG_USER` / `_PASSWORD`; CDC: `SOURCE_PG_CDC_USER` / `_PASSWORD` |
| platform-db | core | `localhost:5434` (`PLATFORM_DB_HOST_PORT`) | `platform-db:5432` | `PLATFORM_DB_SUPERUSER` / `_PASSWORD`; roles `airflow`, `lakekeeper` |
| minio (S3 API) | core | <http://localhost:9000> (`MINIO_API_HOST_PORT`), path-style | `http://minio:9000` | `LAKEHOUSE_S3_ACCESS_KEY` / `_SECRET_KEY` (lab user); root for admin only |
| minio (console) | core | <http://localhost:9001> (`MINIO_CONSOLE_HOST_PORT`) | — | `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| lakekeeper (UI) | core | <http://localhost:8181/ui> (`LAKEKEEPER_HOST_PORT`) | — | none (local lab, `allowall`) |
| lakekeeper (Iceberg REST) | core | <http://localhost:8181/catalog>, warehouse `lakehouse` | `http://lakekeeper:8181/catalog` | none |
| kafka | streaming | bootstrap `localhost:9092` (`KAFKA_HOST_PORT`) | `kafka:29092` | none (PLAINTEXT) |
| kafka-connect (REST) | streaming | <http://localhost:8083> (`KAFKA_CONNECT_HOST_PORT`) | `http://kafka-connect:8083` | none |
| kafka-ui | streaming | <http://localhost:8082> (`KAFKA_UI_HOST_PORT`) | — | `KAFKA_UI_USER` / `KAFKA_UI_PASSWORD` |
| airflow-apiserver (UI + API) | orchestration | <http://localhost:8080> (`AIRFLOW_HOST_PORT`) | `http://airflow-apiserver:8080` | `AIRFLOW_ADMIN_USER` / `AIRFLOW_ADMIN_PASSWORD` |
| airflow-scheduler · -dag-processor · -triggerer | orchestration | — | — | — |
| DuckDB | — (in-process) | `data/lab.duckdb` | `/opt/airflow/data/lab.duckdb` | — |
| Snowflake | — (cloud) | `https://<SNOWFLAKE_ACCOUNT>.snowflakecomputing.com` | same | key pair (§3.3) |

One-shot jobs (exit after doing their work): `minio-init`, `lakekeeper-migrate`,
`lakekeeper-init` (core) and `airflow-init` (orchestration).

Airflow connections (from environment variables, so they don't appear in the UI):
`source_postgres` and `lakehouse_s3`.

---

## 7. Daily commands

Run `make` with no target to list everything.

| Task | Command |
|---|---|
| Start core | `make up` |
| Start core + streaming / orchestration / all | `make up-streaming` · `make up-orchestration` · `make up-all` |
| Start a custom set | `make up PROFILES="core streaming"` |
| Stop one profile (keep containers and data) | `make stop PROFILES=streaming` |
| Stop everything (keep data) | `make down` |
| Status, health, ports | `make ps` |
| Logs: all / one service | `make logs` · `make logs SERVICE=kafka-connect` |
| Restart one service | `make restart SERVICE=airflow-scheduler` |
| Shell into a service | `make shell SERVICE=airflow-scheduler` |
| psql into the source DB | `make psql` |
| CPU / memory per container | `make stats` |
| Check every connection | `make check` |
| Kafka topics | `make topics` |
| Connectors | `make connect-list` · `connect-plugins` · `connect-register NAME=…` · `connect-status NAME=…` · `connect-delete NAME=…` |
| dbt | `make dbt ARGS="build --target dev"` · `make dbt-debug TARGET=lakehouse` |
| Rebuild the Airflow image (after editing `docker/airflow/*`) | `make build`, then `make up-orchestration` |
| Validate compose + `.env` | `make config` |
| Lint / format | `make lint` · `make fmt` |
| **Reset all data** (volumes + `data/`; asks first) | `make reset` |
| **Clean everything** (reset + Airflow image + `.venv` + dbt artifacts) | `make clean` |

`make reset` and `make clean` keep `.env`, `dbt/profiles.yml` and `secrets/`. Remove those by
hand if you want a truly blank slate.

**Raw docker compose:** every service belongs to a profile, so plain `docker compose logs kafka`
fails with *no such service*. Pass the profiles:

```bash
docker compose --profile core --profile streaming --profile orchestration logs kafka
```

Or set `COMPOSE_PROFILES` once per shell:

```bash
export COMPOSE_PROFILES=core,streaming,orchestration
```

**Free disk space** used by Docker (images, build cache):

```bash
docker system df
```

```bash
docker builder prune
```

---

## 8. Troubleshooting

Start with `make ps`, then `make logs SERVICE=<name>`. `make up` prints the last 25 log lines
of any service that fails.

### 8.1 Port already in use

**Symptom:** preflight says `port 5433 (SOURCE_PG_HOST_PORT…) is already taken`, or compose
fails with `Bind for 127.0.0.1:8080 failed: port is already allocated`.

1. Find what owns the port:

   ```bash
   lsof -nP -iTCP:8080 -sTCP:LISTEN
   ```

   On Windows: `netstat -ano | findstr :8080`.

2. Either stop that program (often a local Postgres, another Airflow, or a dev server on 8080),
   or change the port in `.env` (for example `AIRFLOW_HOST_PORT=8090`) and run `make up` again.
3. If you change `KAFKA_HOST_PORT`, clients on your laptop must use the new port. The
   advertised listener follows it automatically.
4. If you change `MINIO_API_HOST_PORT`, also set the `S3_ENDPOINT` env var for local dbt
   (for example `S3_ENDPOINT=localhost:9010` in `.env`), because the `lakehouse` profile
   defaults to `localhost:9000`.

### 8.2 Out of memory

**Symptoms:** a container restarts in a loop or shows `Exited (137)`; Airflow tasks die with
*SIGKILL*; Kafka or Connect logs `OutOfMemoryError`; the laptop starts swapping.

1. Check usage and limits:

   ```bash
   make stats
   ```

   A service pinned at its cap is the culprit. 137 means it was killed for memory.

2. Start fewer profiles. `make stop PROFILES=streaming` while you work on Airflow, and the
   other way round.
3. Raise Docker's memory (§1.3) to 8 GB. On Windows, edit `.wslconfig`.
4. If you really need more for one service, raise its `deploy.resources.limits.memory` and
   the JVM heap (`KAFKA_HEAP_OPTS`, `HEAP_OPTS`) together in `docker-compose.yml`. Keep the
   heap at about 60% of the limit.
5. Close other memory-heavy apps such as browsers and IDEs. A 16 GB laptop has about 8 GB to
   spare.

### 8.3 Wrong credentials

**Cause, nearly always:** you changed a value in `.env` *after* the first start. Init scripts
run only when a volume is empty (§3.1).

| Symptom | Fix |
|---|---|
| `password authentication failed for user …` (Postgres, Airflow DB, Lakekeeper DB, Debezium) | Change it inside Postgres to match `.env`. For example, connect with `docker compose --profile core exec platform-db psql -U <PLATFORM_DB_SUPERUSER> -d postgres`, run `ALTER ROLE airflow PASSWORD '<new AIRFLOW_DB_PASSWORD>';`, then `make up`. For the source DB, `make psql` (it uses the container's local socket, so no password is needed) and `ALTER ROLE <role> PASSWORD '<new value from .env>';`. |
| Airflow UI rejects the admin login | `docker compose --profile core --profile orchestration exec airflow-apiserver airflow users reset-password -u <AIRFLOW_ADMIN_USER> -p '<new password>'` |
| Kafka UI rejects the login | Kafka UI reads `.env` on start, so recreate it: `make up-streaming` |
| `make check` says *lab S3 user can list bucket* FAILS | §8.5 |
| Anything, and you don't care about the data | `make reset`, then `make up` recreates everything from `.env` |

Also check for the usual typos: trailing spaces, quotes around values (don't use them),
`<FILL_ME>` left in, and Windows line endings in `.env` (`dos2unix .env`).

### 8.4 Debezium and the replication slot

How it works: each Postgres connector owns a **logical replication slot** (`DEBEZIUM_SLOT_NAME`).
Postgres keeps WAL until the slot has consumed it. The publication `dbz_publication` is created
`FOR ALL TABLES` by the init script.

| Symptom (connector status or `make logs SERVICE=kafka-connect`) | Cause | Fix |
|---|---|---|
| `replication slot "debezium_lab" is active for PID …` | A second connector (or a zombie task) uses the same slot | Give each connector its own `slot.name`, or delete the duplicate. Then `make restart SERVICE=kafka-connect`. |
| `replication slot "debezium_lab" already exists` after re-creating a connector | Deleting a connector does **not** drop its slot | Re-use it (keeps your position), or drop it (below) and the connector re-snapshots |
| Disk filling up; `make check` shows `slot … INACTIVE, retained WAL 1.5 GB` | A slot with no running connector pins WAL | Drop it (below). `max_slot_wal_keep_size=2GB` caps the damage: past that the slot is invalidated and the connector must re-snapshot. |
| `publication "dbz_publication" does not exist` | The source volume predates the init script, or you renamed `DEBEZIUM_PUBLICATION` | `make psql`, then `create publication dbz_publication for all tables;` |
| `cannot update table "…" because it does not have a replica identity and publishes updates` | The table has no primary key | Add a primary key, or `alter table … replica identity full;` |
| `must be superuser to create FOR ALL TABLES publication` | `publication.autocreate.mode` was changed from `disabled` | Keep it `disabled`; the publication already exists |
| `wal_level must be "logical"` | You're pointing at another Postgres, or `command:` was edited | `make check` shows the current `wal_level`; restore the compose `command` |
| Validate fails in `make check`: `${env:…}` shown literally / *Could not resolve* | The variable isn't passed to the `kafka-connect` container | Add it under `kafka-connect.environment` and recreate: `make up-streaming` |
| Connector `FAILED` | Any of the above | `make connect-status NAME=pg-source-cdc` shows the `trace`. Fix it, then `curl -X POST "localhost:8083/connectors/pg-source-cdc/restart?includeTasks=true"` |
| Image pull fails: `quay.io/debezium/connect…: forbidden / timeout` | Your network blocks quay.io | Allow quay.io, or set `DEBEZIUM_CONNECT_IMAGE` in `.env` to a mirror of the same tag |

Inspect and drop slots:

```bash
make psql
```

```sql
-- what slots exist, are they active, how much WAL do they hold?
select slot_name, plugin, active, active_pid,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as retained_wal,
       wal_status
from pg_replication_slots;

-- drop an unused one (it must be inactive: delete or pause the connector first)
select pg_drop_replication_slot('debezium_lab');

-- what does the publication cover?
select * from pg_publication_tables where pubname = 'dbz_publication';
```

To start CDC completely from scratch: delete the connector, drop the slot, then remove the
connector's stored offsets. The simplest way to clear offsets is to use a new connector
`name` and `slot.name`, or to `make reset`.

### 8.5 MinIO, S3 and lakehouse access errors

| Symptom | Cause | Fix |
|---|---|---|
| `AccessDenied` for the lab user | The bucket isn't one of the lab buckets, or `minio-init` didn't run | `make logs SERVICE=minio-init`; re-run with `make up`. The policy only covers `LAKEHOUSE_BUCKET` and `RAW_BUCKET`, so new buckets need a policy update in `docker/object-store/init.sh`. |
| `InvalidAccessKeyId` / `SignatureDoesNotMatch` | Wrong key or secret, or clock skew | Compare with `.env`. `make up` re-runs `minio-init`, which updates the user's secret, and `lakekeeper-init`, which re-syncs the warehouse credential. On macOS after sleep, restart Docker Desktop to fix clock drift. |
| Lakekeeper: `Failed to validate storage` / warehouse creation fails | MinIO unreachable, or bucket/credential wrong | `make logs SERVICE=lakekeeper-init`. Fix `.env`, then `make up`. |
| pyiceberg/Spark on the laptop: `Could not connect to the endpoint URL: http://minio:9000/…` | Lakekeeper tells clients to use `minio:9000`, which resolves only inside Docker | Add `127.0.0.1 minio` to `/etc/hosts` (§3.4), or run the code in an Airflow task. DuckDB isn't affected. |
| dbt `lakehouse`: `Failed to download extension "httpfs"` / `"iceberg"` | No internet or proxy for `extensions.duckdb.org` | Connect once to cache the extensions, or install from a file: `INSTALL '/path/iceberg.duckdb_extension'`. |
| dbt `lakehouse`: `Catalog Error` / HTTP 404 on attach | Warehouse name or catalog URL wrong, or core isn't running | `curl localhost:8181/management/v1/warehouse`; check `LAKEKEEPER_WAREHOUSE` |
| Console login works but you can't manage users/policies there | The last MinIO community release ships an object-browser-only console | Use `mc` inside the container: `docker compose --profile core exec minio mc admin user list local` (first `mc alias set local http://localhost:9000 <root> <pw>`) |
| Image pull fails for `quay.io/minio/minio…` | quay.io blocked, or the tag removed upstream | Set `MINIO_IMAGE` in `.env` to an S3-compatible image you trust that keeps the same CLI. MinIO stopped publishing community images in Oct 2025; the project is in maintenance mode. RustFS (`rustfs/rustfs:1.0.6`) is the closest drop-in, but its init commands differ. |

### 8.6 Snowflake

| Symptom (from `make dbt-debug TARGET=snowflake`) | Fix |
|---|---|
| `JWT token is invalid` | Public key not registered, or registered on another user. Compare fingerprints (§3.3 step 4.6); re-run `alter user … set rsa_public_key=…`. Check that `SNOWFLAKE_USER` matches the user name exactly. |
| `Bad decrypt` / `Password was not given but private key is encrypted` | `SNOWFLAKE_PRIVATE_KEY_PASSPHRASE` is wrong or blank |
| `Could not find private key` / `No such file` | The key file isn't in `secrets/` or the name differs from `SNOWFLAKE_PRIVATE_KEY_FILE` |
| `250001: Could not connect to Snowflake backend` / 404 | Wrong `SNOWFLAKE_ACCOUNT`. Use `orgname-accountname`, without `.snowflakecomputing.com` |
| `Role 'DE_LAB_ROLE' specified in the connect string is not granted to this user` | `grant role de_lab_role to user de_lab_dbt;` |
| `No active warehouse selected` / `Insufficient privileges to operate on warehouse` | `grant usage on warehouse de_lab_wh to role de_lab_role;` |
| `Schema … does not exist or not authorized` | `grant usage, create schema on database de_lab to role de_lab_role;` |
| Warehouse suspended mid-run | The resource monitor hit its quota. Raise `credit_quota`, or wait for the monthly reset. |
| Trial ended | Snowflake disables the account. Remove `SNOWFLAKE_*` (back to `<FILL_ME>`) and keep using DuckDB. |

### 8.7 Airflow

| Symptom | Fix |
|---|---|
| `airflow-init` exits non-zero | `make logs SERVICE=airflow-init`. Usually the DB password (§8.3) or an invalid `AIRFLOW_FERNET_KEY`; preflight checks its format. |
| A new DAG doesn't appear | Wait 30 s (`REFRESH_INTERVAL`). Then check import errors with `docker compose --profile core --profile orchestration exec airflow-scheduler airflow dags list-import-errors`. |
| Tasks fail with `Invalid auth token` / `Signature verification failed` | Containers disagree on `AIRFLOW_JWT_SECRET`. Make sure it's set in `.env`, then `make down` and `make up-orchestration` so every container restarts with the same value. |
| `Permission denied` writing `data/` or `dbt/` (Linux) | Set `AIRFLOW_UID` to `id -u` (§3.4), then `make down` and `make up-orchestration` |
| Python package missing in a DAG | Add it to `docker/airflow/requirements-airflow.txt` (Airflow env) or `requirements-dbt.txt` (dbt venv), then `make build` and `make up-orchestration` |
| UI slow or the API server restarts | Memory (§8.2). The API server runs 1 worker on purpose. |

### 8.8 Kafka

| Symptom | Fix |
|---|---|
| Laptop client: `Connection to node 1 (localhost/127.0.0.1:9092) could not be established` | Streaming profile not running, or you changed `KAFKA_HOST_PORT` and the client still uses 9092 |
| Container client uses `localhost:9092` and hangs | Inside Docker, use `kafka:29092` |
| Kafka won't start after changing `KAFKA_CLUSTER_ID` (`The Cluster ID … doesn't match stored clusterId … in meta.properties`) | The data volume was formatted with the old id. Restore the old id, or wipe just Kafka: `make down`, then `docker volume rm de-lab_kafka-data`, then `make up-streaming`. |
| Disk usage grows | Topics keep data 7 days (`KAFKA_LOG_RETENTION_HOURS=168`). Lower it, or delete lab topics in Kafka UI. |

### 8.9 General

| Symptom | Fix |
|---|---|
| `make up` times out | Usually the first image pull on a slow network. Run `make up` again; it resumes. `make ps` shows which service is stuck. |
| `no such service: …` from `docker compose …` | Every service has a profile, so pass `--profile` flags or `COMPOSE_PROFILES` (§7) |
| `.env not found` / `<FILL_ME> still blank` | §4 steps 2–4 |
| DuckDB `Could not set lock on file "lab.duckdb"` | DuckDB allows one writer. Don't run dbt locally and in Airflow on the same file at once; use a second `DUCKDB_PATH` for one of them. |
| Out of disk | `docker system df`, `docker builder prune`, `docker image prune`. Lab data is in volumes; `make reset` frees it. |
| Want to start over completely | `make clean`, then from §4 step 6 |
