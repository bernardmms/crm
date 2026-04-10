#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
elif [ -f "$ROOT_DIR/.env.example" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.example"
  set +a
fi

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "Building shared API contract..."
pnpm --filter @repo/api-contract build

echo "Starting API on http://localhost:${PORT:-3000} ..."
(cd "$ROOT_DIR/apps/api" && pnpm dev) &

echo "Starting web on http://localhost:5173 ..."
(cd "$ROOT_DIR/apps/web" && pnpm dev) &

wait -n
