#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo ./deploy/ssl-setup.sh DOMAIN)" >&2; exit 1; }

DOMAIN="${1:?Usage: sudo ./deploy/ssl-setup.sh DOMAIN (e.g. api.example.com)}"

command -v nginx >/dev/null 2>&1 || { echo "nginx is not installed; run ./deploy/setup.sh first" >&2; exit 1; }
systemctl is-active --quiet nginx || systemctl start nginx

echo "Installing certbot"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq certbot python3-certbot-nginx

echo "Requesting certificate for $DOMAIN"
certbot --nginx -d "$DOMAIN"

echo "Enabling automatic renewal"
systemctl enable --now certbot.timer
certbot renew --dry-run

echo "SSL setup complete for $DOMAIN"
echo "Certificate renews automatically via certbot.timer"
