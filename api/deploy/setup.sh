#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root (sudo ./deploy/setup.sh)" >&2; exit 1; }

API_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY_DIR="$API_ROOT/deploy"
ENV_FILE="$API_ROOT/.env"
DEPLOY_USER=book-camera-deploy

ask() {
  local prompt="$1" default="${2:-}" value
  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " value </dev/tty
    echo "${value:-$default}"
  else
    read -r -p "$prompt: " value </dev/tty
    echo "$value"
  fi
}

ask_secret() {
  local prompt="$1" default="${2:-}" value
  if [[ -n "$default" ]]; then
    read -r -s -p "$prompt [generated]: " value </dev/tty
    echo >&2
    echo "${value:-$default}"
  else
    read -r -s -p "$prompt: " value </dev/tty
    echo >&2
    echo "$value"
  fi
}

# dotenv 16 only unescapes \n/\r inside double quotes and does not strip
# backslash-escapes, so pick a quote style that stores the exact password.
validate_app_password() {
  local value="$1"
  [[ -z "$value" ]] && return 1
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "App password cannot contain line breaks" >&2
    return 1
  fi
  if [[ "$value" == *"'"* && ( "$value" == *'"'* || "$value" == *'\'* ) ]]; then
    echo "App password cannot mix a single quote with a double quote or backslash" >&2
    return 1
  fi
}

dotenv_quote() {
  local value="$1"
  validate_app_password "$value" || return 1
  if [[ "$value" != *'"'* && "$value" != *'\'* ]]; then
    printf '"%s"' "$value"
  else
    printf "'%s'" "$value"
  fi
}

upsert_env() {
  local file="$1" key="$2" value="$3" line tmp
  line="${key}=$(dotenv_quote "$value")"
  if grep -qE "^${key}=" "$file"; then
    tmp="$(mktemp)"
    ENV_LINE="$line" ENV_KEY="$key" awk '
      BEGIN { keyre = "^" ENVIRON["ENV_KEY"] "=" }
      $0 ~ keyre { print ENVIRON["ENV_LINE"]; next }
      { print }
    ' "$file" > "$tmp" && mv "$tmp" "$file"
  else
    printf '\n%s\n' "$line" >> "$file"
  fi
}

# If .env does not exist, prompt the user for the environment variables and create the file
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Configuring production environment"
  PORT="$(ask 'App port' 3000)"
  DOMAIN="$(ask 'Public domain (nginx server_name)' api.example.com)"
  DB_USER="$(ask 'Postgres user' book_camera)"
  DB_NAME="$(ask 'Postgres database' book_camera_production)"
  DB_PASS="$(ask_secret 'Postgres password' "$(openssl rand -hex 16)")"
  ANTHROPIC_API_KEY="$(ask_secret 'Anthropic API key (optional)')"
  BUGSNAG_API_KEY="$(ask_secret 'BugSnag API key (optional)')"
  APP_PASSWORD=""
  while ! validate_app_password "$APP_PASSWORD"; do
    APP_PASSWORD="$(ask_secret 'App password (required)')"
  done

  sed \
    -e 's/^NODE_ENV=.*/NODE_ENV=production/' \
    -e "s/^PORT=.*/PORT=${PORT}/" \
    -e "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}/" \
    -e "s/^BUGSNAG_API_KEY=.*/BUGSNAG_API_KEY=${BUGSNAG_API_KEY}/" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}|" \
    "$API_ROOT/.env.example" > "$ENV_FILE"
  upsert_env "$ENV_FILE" APP_PASSWORD "$APP_PASSWORD"
  echo "Created $ENV_FILE"
else
  PORT="$(grep -E '^PORT=' "$ENV_FILE" | cut -d= -f2- || true)"
  PORT="${PORT:-3000}"
  DOMAIN="$(ask 'Public domain (nginx server_name)' api.example.com)"
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
  without_scheme="${DATABASE_URL#postgresql://}"
  without_scheme="${without_scheme#postgres://}"
  userpass="${without_scheme%%@*}"
  hostdb="${without_scheme#*@}"
  DB_USER="${userpass%%:*}"
  DB_PASS="${userpass#*:}"
  DB_NAME="${hostdb##*/}"
  [[ -n "$DB_USER" && -n "$DB_PASS" && -n "$DB_NAME" ]] \
    || { echo "Could not parse DATABASE_URL in $ENV_FILE" >&2; exit 1; }
  echo "Using existing $ENV_FILE"
  if ! grep -qE '^APP_PASSWORD=.+' "$ENV_FILE"; then
    APP_PASSWORD=""
    while ! validate_app_password "$APP_PASSWORD"; do
      APP_PASSWORD="$(ask_secret 'App password (required)')"
    done
    upsert_env "$ENV_FILE" APP_PASSWORD "$APP_PASSWORD"
  fi
fi

DB_PASS_SQL="${DB_PASS//\'/\'\'}"

echo "Installing dependencies"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg openssl postgresql nginx

echo "Installing Node.js"
need_node=1
if command -v node >/dev/null 2>&1; then
  major="$(node -v | sed 's/^v//;s/\..*//')"
  [[ "$major" -ge 22 ]] && need_node=0
  echo "Node.js $major found"
fi
if [[ "$need_node" -eq 1 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

# Deploy + runtime user (SSH deploy and systemd share this account)
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

systemctl enable --now postgresql

# Create database user and database if they don't exist
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS_SQL}';"
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS_SQL}';"
fi
# Create database if it doesn't exist
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

cd "$API_ROOT"
# Prod deps are installed in GitHub Actions and rsynced (see api/DEPLOY.md).
# Do not run npm ci here — small droplets OOM (exit 137).
echo "Skipping npm install (CI ships node_modules on deploy)"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$API_ROOT"
chmod 600 "$ENV_FILE"

# set up the systemd services
sed "s|__API_ROOT__|${API_ROOT}|g" \
  "$DEPLOY_DIR/systemd/book-camera-api.service.template" > /etc/systemd/system/book-camera-api.service
systemctl daemon-reload

# Limited passwordless sudo so CI activate.sh can restart without a TTY password prompt
SYSTEMCTL="$(command -v systemctl)"
SUDOERS_FILE=/etc/sudoers.d/deploy-book-camera-api
cat > "$SUDOERS_FILE" <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: ${SYSTEMCTL} restart book-camera-api, ${SYSTEMCTL} status book-camera-api, ${SYSTEMCTL} status book-camera-api --no-pager
EOF
chmod 440 "$SUDOERS_FILE"
visudo -cf "$SUDOERS_FILE"

sed \
  -e "s|__PORT__|${PORT}|g" \
  -e "s|__DOMAIN__|${DOMAIN}|g" \
  "$DEPLOY_DIR/nginx/book-camera.template.conf" > /etc/nginx/sites-available/book-camera
ln -sfn /etc/nginx/sites-available/book-camera /etc/nginx/sites-enabled/book-camera
rm -f /etc/nginx/sites-enabled/default
nginx -t

echo "Setup complete."
echo "Next:"
echo "  1. Configure CI deploy SSH keys (see api/DEPLOY.md)"
echo "  2. Sync a built release via GitHub Actions (dist + node_modules + migrations)"
echo "  3. Then: sudo ./deploy/start.sh"
echo "  4. Required TLS (login sends a password): sudo ./deploy/ssl-setup.sh ${DOMAIN}"
