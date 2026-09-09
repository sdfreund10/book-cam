#!/usr/bin/env bash
set -euo pipefail

# Activate a CI-built release already synced into this directory.
# Run as the deploy user (not root). See api/DEPLOY.md.

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

echo "Installing production dependencies"
npm ci --omit=dev --no-audit

echo "Running migrations"
npm run db:migrate

echo "Restarting book-camera-api"
sudo systemctl restart book-camera-api
sudo systemctl status book-camera-api --no-pager

echo "Activated. Health check: curl -s http://127.0.0.1/health"
