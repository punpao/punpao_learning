# shellcheck shell=bash
# Shared helpers for scripts/*.sh — source, don't execute.

LAB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# colours are used by the scripts that source this file
# shellcheck disable=SC2034
if [ -t 1 ]; then
  C_RED=$'\033[31m' C_GREEN=$'\033[32m' C_YELLOW=$'\033[33m' C_BOLD=$'\033[1m' C_OFF=$'\033[0m'
else
  C_RED="" C_GREEN="" C_YELLOW="" C_BOLD="" C_OFF=""
fi

die()  { echo "${C_RED}error:${C_OFF} $*" >&2; exit 1; }
warn() { echo "${C_YELLOW}warn:${C_OFF} $*" >&2; }
info() { echo "${C_BOLD}==>${C_OFF} $*"; }

# load_env FILE — export KEY=value lines without evaluating them
# (a plain `source .env` would choke on <FILL_ME>, which bash reads as a redirect).
load_env() {
  local file="${1:-$LAB_DIR/.env}" line key value
  [ -f "$file" ] || die "$file not found — run: make init"
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|'#'*) continue ;; esac
    key="${line%%=*}"
    value="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$value"
  done < "$file"
}

# is_blank VALUE — true when a value is empty or still the <FILL_ME> placeholder
is_blank() { [ -z "${1:-}" ] || [ "$1" = "<FILL_ME>" ]; }

compose() { docker compose --project-directory "$LAB_DIR" "$@"; }

# profile_flags "core streaming" → --profile core --profile streaming
profile_flags() { local p; for p in $1; do printf -- '--profile %s ' "$p"; done; }
