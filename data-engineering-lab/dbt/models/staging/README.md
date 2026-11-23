# staging

One model per source table, materialised as **views**. Only rename, cast and lightly clean;
no joins. Declare sources in a `_<source>__sources.yml` next to the models.
Naming: `stg_<source>__<entity>.sql`. Filled in by labs.
