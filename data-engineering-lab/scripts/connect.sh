#!/usr/bin/env bash
# Manage Kafka Connect connectors from connectors/*.json
#   scripts/connect.sh list | plugins | register <file-stem> | status <name> | delete <name>
set -euo pipefail
source "$(dirname "$0")/lib.sh"
load_env "$LAB_DIR/.env"
url="http://127.0.0.1:${KAFKA_CONNECT_HOST_PORT:-8083}"

curl -fsS "$url/" >/dev/null 2>&1 || die "Kafka Connect is not reachable at $url — run: make up-streaming"

pretty() { if command -v jq >/dev/null; then jq .; else cat; echo; fi; }

case "${1:-}" in
  list)
    curl -fsS "$url/connectors?expand=status" | pretty ;;
  plugins)
    curl -fsS "$url/connector-plugins" | pretty ;;
  register)
    stem="${2:?usage: connect.sh register <file-stem>  (e.g. debezium-postgres-source)}"
    file="$LAB_DIR/connectors/${stem%.json}.json"
    [ -f "$file" ] || die "$file not found"
    if grep -q '<FILL_ME' "$file"; then die "$file still contains <FILL_ME…> placeholders"; fi
    name="$(sed -n 's/^ *"name": *"\([^"]*\)".*/\1/p' "$file" | head -n1)"
    [ -n "$name" ] || die "could not read \"name\" from $file"
    # extract the "config" object; PUT is create-or-update
    config="$(uv run --quiet --no-project python -c 'import json,sys; print(json.dumps(json.load(open(sys.argv[1]))["config"]))' "$file")"
    code="$(curl -sS -o /tmp/connect-resp.$$ -w '%{http_code}' -X PUT -H 'Content-Type: application/json' \
      --data "$config" "$url/connectors/$name/config")"
    pretty < /tmp/connect-resp.$$; rm -f /tmp/connect-resp.$$
    case "$code" in 200|201) info "connector '$name' registered (HTTP $code). Check: make connect-status NAME=$name" ;;
      *) die "register failed (HTTP $code)" ;; esac ;;
  status)
    curl -fsS "$url/connectors/${2:?name}/status" | pretty ;;
  delete)
    curl -fsS -X DELETE "$url/connectors/${2:?name}" && info "deleted '${2}'. Its replication slot is NOT dropped — RUNBOOK §8.4" ;;
  *)
    die "usage: connect.sh list | plugins | register <file-stem> | status <name> | delete <name>" ;;
esac
