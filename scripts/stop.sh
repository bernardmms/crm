#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

cd "$ROOT_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd pgrep

echo "Stopping API and web processes..."
PIDS="$(pgrep -f "$ROOT_DIR" || true)"

if [ -n "$PIDS" ]; then
  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    if [ "$pid" != "$$" ]; then
      kill "$pid" 2>/dev/null || true
    fi
  done <<< "$PIDS"
else
  echo "No running we-crm processes found."
fi

echo "Stopping PostgreSQL..."
docker compose -f "$COMPOSE_FILE" down
