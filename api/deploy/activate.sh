#!/usr/bin/env bash
set -euo pipefail

# Activate a CI-built release already synced into this directory.
# Run as the deploy user (not root). See api/DEPLOY.md.
# Production deps are installed in CI and shipped as node_modules.tar.gz;
# this script must not run npm ci (small droplets OOM / exit 137).

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$API_ROOT"

[[ -d "$API_ROOT/dist" ]] || {
  echo "Missing $API_ROOT/dist — sync a CI build first" >&2
  exit 1
}
[[ -f "$API_ROOT/package.json" && -f "$API_ROOT/package-lock.json" ]] || {
  echo "Missing package.json / package-lock.json" >&2
  exit 1
}
[[ -f "$API_ROOT/scripts/migrate.mjs" ]] || {
  echo "Missing $API_ROOT/scripts/migrate.mjs — sync a CI build first" >&2
  exit 1
}
[[ -f "$API_ROOT/node_modules.tar.gz" ]] || {
  echo "Missing $API_ROOT/node_modules.tar.gz — sync a CI build first" >&2
  exit 1
}

echo "Extracting production node_modules"
rm -rf "$API_ROOT/node_modules"
tar -xzf "$API_ROOT/node_modules.tar.gz"
rm -f "$API_ROOT/node_modules.tar.gz"

[[ -f "$API_ROOT/node_modules/drizzle-orm/node-postgres/index.js" ]] || {
  echo "Incomplete node_modules (drizzle-orm/node-postgres missing)" >&2
  exit 1
}

echo "Running migrations"
npm run db:migrate

echo "Restarting book-camera-api"
sudo systemctl restart book-camera-api
sudo systemctl status book-camera-api --no-pager

echo "Activated. Health check: curl -s http://127.0.0.1/health"
