#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo ./deploy/start.sh)" >&2; exit 1; }

systemctl enable --now postgresql book-camera-api nginx
echo "Health check: curl -s http://127.0.0.1/health"
