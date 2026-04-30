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

port_is_available() {
  node -e "
    const net = require('node:net');
    const host = process.argv[1];
    const port = Number(process.argv[2]);
    const server = net.createServer();
    server.unref();
    server.on('error', () => process.exit(1));
    server.listen(port, host, () => server.close(() => process.exit(0)));
  " "$1" "$2" >/dev/null 2>&1
}

next_available_port() {
  local host="$1"
  local preferred_port="$2"
  local max_port="${3:-$((preferred_port + 20))}"
  local port="$preferred_port"

  while [ "$port" -le "$max_port" ]; do
    if port_is_available "$host" "$port"; then
      echo "$port"
      return 0
    fi
    port="$((port + 1))"
  done

  echo "Unable to find an available port between ${preferred_port} and ${max_port} on ${host}." >&2
  exit 1
}

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}

trap cleanup EXIT INT TERM

API_PORT="$(next_available_port "0.0.0.0" "${PORT:-3000}")"
WEB_HOST="${WEB_HOST:-0.0.0.0}"
WEB_PORT="$(next_available_port "$WEB_HOST" "${WEB_PORT:-5173}")"
CURRENT_FRONTEND_URL="${FRONTEND_URL:-}"
CURRENT_API_URL="${VITE_API_URL:-}"

export PORT="$API_PORT"
export WEB_PORT

if [ "$CURRENT_FRONTEND_URL" != "http://localhost:${WEB_PORT}" ]; then
  export FRONTEND_URL="http://localhost:${WEB_PORT}"
  export CORS_ORIGINS="http://localhost:${WEB_PORT},http://127.0.0.1:${WEB_PORT}"
fi

if [ "$CURRENT_API_URL" != "http://localhost:${API_PORT}" ]; then
  export BETTER_AUTH_BASE_URL="http://localhost:${API_PORT}"
  export VITE_API_URL="http://localhost:${API_PORT}"
  export VITE_API_AUTH_URL="http://localhost:${API_PORT}"
fi

echo "Building shared API contract..."
pnpm --filter @repo/api-contract build

echo "Starting API on http://localhost:${API_PORT} ..."
(cd "$ROOT_DIR/apps/api" && pnpm dev) &

echo "Starting web on http://localhost:${WEB_PORT} ..."
(cd "$ROOT_DIR/apps/web" && pnpm exec vite --host --port "$WEB_PORT") &

wait -n
