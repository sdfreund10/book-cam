#!/usr/bin/env bash
set -euo pipefail

echo "DEPRECATED: Use GitHub Actions + deploy/activate.sh (see api/DEPLOY.md). Kept for reference only." >&2
exit 0

# Build the API locally and upload to dist_new/ on the droplet (no restart).
# Activate with sudo ./deploy/update.sh on the droplet.
# Usage: ./deploy/build-and-push.sh user@host [remote_api_dir]
# Example: ./deploy/build-and-push.sh user@YOUR_DROPLET_IP /opt/book-camera/api

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:?Usage: $0 user@host [remote_api_dir]}"
REMOTE_DIR="${2:-/opt/book-camera/api}"

cd "$API_ROOT"
echo "Building API..."
npm run build

echo "Uploading to ${HOST}:${REMOTE_DIR}/dist_new/"
rsync -az --delete \
  -e ssh \
  "$API_ROOT/dist/" \
  "${HOST}:${REMOTE_DIR}/dist_new/"

rsync -az --delete \
  -e ssh \
  "$API_ROOT/package.json" \
  "${HOST}:${REMOTE_DIR}/package.new.json"

rsync -az --delete \
  -e ssh \
  "$API_ROOT/package-lock.json" \
  "${HOST}:${REMOTE_DIR}/package-lock.new.json"

rsync -az --delete \
  -e ssh \
  "$API_ROOT/migrations" \
  "${HOST}:${REMOTE_DIR}/migrations.new"

echo "Upload complete. On the droplet run: sudo ./deploy/update.sh"
