#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo ./deploy/update.sh)" >&2; exit 1; }

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING_DIR="$API_ROOT/.deploy-staging"

# Confirm a new build version exists
[[ -d "$API_ROOT/dist_new" ]] || {
  echo "Missing $API_ROOT/dist_new — upload a build first:" >&2
  echo "  ./deploy/build-and-push.sh user@host $API_ROOT" >&2
  exit 1
}

if [[ -d "$API_ROOT/package.new.json" ]]; then
  # install dependencies from package.new.json before stopping the service to minimize downtime
  mkdir "$STAGING_DIR"
  cd "$STAGING_DIR"
  cp "$API_ROOT/package.new.json" package.json
  cp "$API_ROOT/package-lock.new.json" package-lock.json
  npm ci --omit=dev --silent
  cd "$API_ROOT"
fi

# migrate the database
cd "$API_ROOT"
npm run db:migrate

echo "Stopping book-camera-api"
if systemctl is-active --quiet book-camera-api 2>/dev/null; then
  systemctl stop book-camera-api
fi

echo "Activating dist_new → dist"
rm -rf "$API_ROOT/dist_old"

# Move original dist to an old version for rollback
if [[ -d "$API_ROOT/dist" ]]; then
  mv "$API_ROOT/dist" "$API_ROOT/dist_old"
  mv "$API_ROOT/package.json" "$API_ROOT/package.old.json"
  mv "$API_ROOT/package-lock.json" "$API_ROOT/package-lock.old.json"
fi

mv "$API_ROOT/dist_new" "$API_ROOT/dist"
mv "$API_ROOT/package.new.json" "$API_ROOT/package.json"
mv "$API_ROOT/package-lock.new.json" "$API_ROOT/package-lock.json"

chown -R bookcamera:bookcamera "$API_ROOT/dist"

systemctl restart book-camera-api
echo "Updated. Health check: curl -s http://127.0.0.1/health"
