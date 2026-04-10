#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/docker-compose.yml"

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

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd pnpm

echo "Starting PostgreSQL..."
docker compose -f "$COMPOSE_FILE" up -d

echo "Waiting for PostgreSQL healthcheck..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' we-crm-postgres 2>/dev/null || true)" = "healthy" ]; do
  sleep 2
done

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "Installing workspace dependencies..."
  pnpm install
fi

echo "Generating Prisma client..."
pnpm generate

echo "Applying Prisma migrations..."
pnpm --filter api exec prisma migrate deploy

echo "Starting API and web..."
exec "$ROOT_DIR/scripts/dev-apps.sh"
