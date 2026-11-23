#!/usr/bin/env bash
# Wait until every service of the given profiles is healthy (or, for one-shot init jobs,
# exited with code 0). Prints a status table; fails fast if a container crashes.
#   scripts/wait-healthy.sh "core streaming" [timeout_seconds]
set -euo pipefail
source "$(dirname "$0")/lib.sh"

profiles="${1:-core}"
timeout="${2:-600}"
flags="$(profile_flags "$profiles")"
start=$(date +%s)
progress=0
# end the in-place progress line before printing anything else
endline() { if [ "$progress" = 1 ]; then echo; progress=0; fi; }

info "waiting for services to become healthy (timeout ${timeout}s)…"
# shellcheck disable=SC2086
services="$(compose $flags config --services)"

while :; do
  pending="" failed=""
  for svc in $services; do
    # shellcheck disable=SC2086
    cid="$(compose $flags ps -a -q "$svc" 2>/dev/null | head -n1)"
    if [ -z "$cid" ]; then pending+=" $svc(not-created)"; continue; fi
    read -r state health code restart < <(docker inspect -f \
      '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} {{.State.ExitCode}} {{.HostConfig.RestartPolicy.Name}}' "$cid")
    # one-shot init jobs (restart: "no") are done only once they exit 0
    if [ "$restart" = "no" ] && [ "$state" = running ]; then pending+=" $svc(running-init)"; continue; fi
    case "$state/$health" in
      running/healthy|running/none) ;;
      exited/*) [ "$code" = 0 ] || failed+=" $svc(exit $code)" ;;
      running/unhealthy) failed+=" $svc(unhealthy)" ;;
      *) pending+=" $svc($state/$health)" ;;
    esac
  done

  if [ -n "$failed" ]; then
    endline
    echo "${C_RED}✗ failed:${C_OFF}$failed"
    for f in $failed; do
      svc="${f%%(*}"
      echo "---- last 25 log lines: $svc ----"
      # shellcheck disable=SC2086
      compose $flags logs --no-color --tail 25 "$svc" || true
    done
    echo
    die "see RUNBOOK §8 (Troubleshooting); full logs: make logs SERVICE=<name>"
  fi
  if [ -z "$pending" ]; then
    endline
    echo "${C_GREEN}✓ all services healthy${C_OFF} ($(( $(date +%s) - start ))s)"
    # shellcheck disable=SC2086
    compose $flags ps --format 'table {{.Service}}\t{{.Status}}\t{{.Ports}}'
    exit 0
  fi
  if [ $(( $(date +%s) - start )) -ge "$timeout" ]; then
    endline
    die "timed out after ${timeout}s; still waiting on:$pending"
  fi
  printf '\r\033[K  waiting on:%s' "$(echo "$pending" | cut -c1-140)"
  progress=1
  sleep 5
done
