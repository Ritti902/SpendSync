#!/usr/bin/env bash
set -euo pipefail

DEFAULT_HEALTH_PATH="/api/v1/health"
RETRIES="${KEEP_ALIVE_RETRIES:-3}"
TIMEOUT_SECONDS="${KEEP_ALIVE_TIMEOUT_SECONDS:-15}"

if [[ -z "${RENDER_BACKEND_URL:-}" ]]; then
  echo "RENDER_BACKEND_URL is required" >&2
  exit 1
fi

TARGET="$RENDER_BACKEND_URL"
if [[ "$TARGET" != *"/health"* ]]; then
  case "$TARGET" in
    */api)
      TARGET="${TARGET%/}/v1/health"
      ;;
    */api/v1)
      TARGET="${TARGET%/}/health"
      ;;
    */)
      TARGET="${TARGET%/}${DEFAULT_HEALTH_PATH}"
      ;;
    *)
      TARGET="${TARGET%/}${DEFAULT_HEALTH_PATH}"
      ;;
  esac
fi

safe_target() {
  local without_query="${TARGET%%\?*}"
  printf "%s" "$without_query"
}

attempt=1
while [[ "$attempt" -le "$RETRIES" ]]; do
  started_ms="$(date +%s%3N)"
  http_code="$(
    curl \
      --silent \
      --show-error \
      --location \
      --max-time "$TIMEOUT_SECONDS" \
      --output /tmp/expensemania-keep-alive.out \
      --write-out "%{http_code}" \
      "$TARGET"
  )" || http_code="000"
  finished_ms="$(date +%s%3N)"
  elapsed_ms="$((finished_ms - started_ms))"

  if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "{\"service\":\"expensemania-api\",\"ok\":true,\"attempt\":$attempt,\"statusCode\":$http_code,\"elapsedMs\":$elapsed_ms,\"target\":\"$(safe_target)\"}"
    exit 0
  fi

  echo "{\"service\":\"expensemania-api\",\"ok\":false,\"attempt\":$attempt,\"statusCode\":$http_code,\"elapsedMs\":$elapsed_ms,\"target\":\"$(safe_target)\"}" >&2
  if [[ "$attempt" -lt "$RETRIES" ]]; then
    sleep "$((attempt * 2))"
  fi
  attempt="$((attempt + 1))"
done

exit 1
