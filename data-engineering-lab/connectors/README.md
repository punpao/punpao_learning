# Kafka Connect connector templates

Connector configs are plain JSON. **Secrets are never written in them**: values like
`${env:SOURCE_PG_CDC_PASSWORD}` are resolved *inside* the Kafka Connect worker by Kafka's
`EnvVarConfigProvider` (enabled in `docker-compose.yml`). So the password never ends up in
the `_connect_configs` topic, the REST API or Kafka UI.

| File | Connector | Ready to use? |
|---|---|---|
| `debezium-postgres-source.json` | Debezium Postgres source (CDC via `pgoutput`) | yes. Edit `schema.include.list` / add `table.include.list` per lab |
| `iceberg-sink.json` | Apache Iceberg sink → Lakekeeper/MinIO | **template**: needs the plugin (below) and the `<FILL_ME_…>` values |

## Commands

```bash
make connect-list                                  # registered connectors + status
make connect-plugins                               # installed connector classes
make connect-register NAME=debezium-postgres-source
make connect-status   NAME=pg-source-cdc
make connect-delete   NAME=pg-source-cdc
```

`connect-register` refuses a file that still contains `<FILL_ME`. Registering a connector
that already exists updates its config (`PUT /connectors/<name>/config`).

## Adding a template

1. Copy an existing file and change `name` and `config`.
2. Reference secrets as `${env:VAR}` and add `VAR: ${VAR}` to the `kafka-connect`
   service's `environment` in `docker-compose.yml`.
3. Restart Connect: `docker compose --profile core --profile streaming up -d kafka-connect`.

## Debezium notes

- The CDC role, publication (`DEBEZIUM_PUBLICATION`) and settings are created by
  `docker/postgres-source/init/10-cdc.sh` when the source volume is first created.
- Each connector owns a **replication slot** (`DEBEZIUM_SLOT_NAME`). Deleting the connector
  does *not* drop the slot. See RUNBOOK §8.4 to inspect and drop slots.
- Tables need a primary key (or `REPLICA IDENTITY FULL`), otherwise Postgres rejects
  UPDATE/DELETE on tables in a `FOR ALL TABLES` publication.

## Installing the Iceberg sink plugin

The Debezium image ships Debezium connectors only. To add the Apache Iceberg sink:

1. Download the Iceberg Kafka Connect runtime ZIP matching your Iceberg version
   (from an Apache Iceberg release, or build it: `./gradlew -x test -x integrationTest
   :iceberg-kafka-connect:iceberg-kafka-connect-runtime:distZip` in the Iceberg repo).
2. Unzip it into `docker/kafka-connect/plugins/` (one sub-folder per plugin).
3. Restart Connect, then `make connect-plugins` should list
   `org.apache.iceberg.connect.IcebergSinkConnector`.
