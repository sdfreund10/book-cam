# Book Camera API

Express + Postgres API for the Book Camera app.

## Local development

```sh
cp .env.example .env   # set DATABASE_URL and any API keys
npm install
npm run db:push:dev
npm run dev
```

## Deployment

Initial setup on a fresh Ubuntu DigitalOcean droplet (Node 22, Postgres, nginx, systemd). TypeScript is built in GitHub Actions; the droplet never runs `tsc`.

### 1. Clone the API onto the droplet

As an admin user:

```sh
git clone https://github.com/OWNER/REPO.git && cd REPO/api
# or copy the api/ tree to /opt/book-camera/api
sudo ./deploy/setup.sh
```

`setup.sh` prompts for port, public domain, Postgres user/database/password, `ANTHROPIC_API_KEY`, and `BUGSNAG_API_KEY` (API keys may be left blank; other prompts have defaults). It installs system packages, creates the database and `book-camera-deploy` user, and installs the systemd unit and nginx reverse proxy. It does **not** build TypeScript or run `npm ci` (CI ships `dist/` and production `node_modules/` to avoid OOM on small droplets).

Schema changes for production must be committed as generated migrations (`npm run db:migration:generate`). Local `db:push:dev` does not create migration files.

### 2. Wire up automated deploys

Follow [DEPLOY.md](DEPLOY.md) once: CI → droplet SSH key, ownership, limited sudo, and GitHub Actions secrets (`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`).

After that, merges to `main` that change `api/**` build in CI, rsync the release, and run `deploy/activate.sh` on the droplet.

### 3. Start services (first boot)

After the first successful CI deploy (or after placing a `dist/` manually):

```sh
sudo ./deploy/start.sh
```

Enables and starts Postgres, the API, and nginx. Later deploys only need `activate.sh` (invoked by Actions).

Optional TLS:

```sh
sudo ./deploy/ssl-setup.sh api.example.com
```

Health check:

```sh
curl -s http://127.0.0.1/health
```

Useful follow-ups:

- Edit `api/.env` and `sudo systemctl restart book-camera-api` if you need to change keys later.
- Logs: `journalctl -u book-camera-api -f`
- Point the mobile app’s `PRODUCTION_API_BASE_URL` at this server’s public URL (HTTPS when you add TLS).
