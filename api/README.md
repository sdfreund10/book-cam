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

Initial setup on a fresh Ubuntu DigitalOcean droplet (Node 22, Postgres, nginx, systemd).

### 1. Allow the droplet to clone the repo

Create a github access token with read access to the book-cam repository.

### 2. Clone and set up the droplet

```sh
git clone https://<TOKEN>@github.com/sdfreund10/book-cam.git && cd book-cam/api
sudo ./deploy/setup.sh
```

`setup.sh` will prompt for port, Postgres user/database/password, `ANTHROPIC_API_KEY`, and `BUGSNAG_API_KEY` (API keys may be left blank; other prompts have defaults). It installs packages, creates the database, installs production npm deps, runs SQL migrations, and installs the systemd unit and nginx reverse proxy. It does **not** build the TypeScript app or start the API.

Schema changes for production must be committed as generated migrations (`npm run db:migration:generate`). Local `db:push:dev` does not create migration files.

### 3. Build locally and upload `dist_new/`

From your machine (in `api/`):

```sh
./deploy/build-and-push.sh root@YOUR_DROPLET_IP /root/book-cam/api
```

This only uploads a staged build. It does not restart the API.

### 4. Activate the build on the droplet

```sh
sudo ./deploy/update.sh
```

Activates uploaded migrations, runs `db:migrate`, swaps `dist_new` → `dist` / deps, and restarts the API service (if it was already running).

### 5. Start services (first boot)

```sh
sudo ./deploy/start.sh
```

Enables and starts Postgres, the API, and nginx. For later deploys, `update.sh` is enough after each upload.

After start, check health:

```sh
curl -s http://127.0.0.1/health
```

Useful follow-ups:

- Edit `api/.env` and `sudo systemctl restart book-camera-api` if you need to change keys later.
- Logs: `journalctl -u book-camera-api -f`
- Point the mobile app’s `PRODUCTION_API_BASE_URL` at this server’s public URL (HTTPS when you add TLS).
