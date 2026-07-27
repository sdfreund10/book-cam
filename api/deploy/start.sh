#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo ./deploy/start.sh)" >&2; exit 1; }

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

[[ -d "$API_ROOT/dist" ]] || {
  echo "Missing $API_ROOT/dist — run ./deploy/build-and-push.sh then sudo ./deploy/update.sh first" >&2
  exit 1
}

systemctl enable --now postgresql book-camera-api nginx
echo "Health check: curl -s http://127.0.0.1/health"
