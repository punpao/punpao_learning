# Extra Kafka Connect plugins

Mounted read-only at `/kafka/extra-plugins` and added to the worker's `plugin.path`.
Put **one sub-folder per plugin** here (for example the unzipped Apache Iceberg sink
runtime), then restart `kafka-connect`. Plugin binaries are git-ignored; only this README
is committed. See `connectors/README.md`.
