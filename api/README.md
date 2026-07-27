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

### 2. Clone, set up, and start

```sh
git clone https://<TOKEN>@github.com/sdfreund10/book-cam.git && cd book-cam/api
sudo ./deploy/setup.sh
sudo ./deploy/start.sh
```

`setup.sh` will prompt for port, Postgres user/database/password, `ANTHROPIC_API_KEY`, and `BUGSNAG_API_KEY` (API keys may be left blank; other prompts have defaults). It installs packages, creates the database, builds the app, and installs the systemd unit and nginx reverse proxy. It does **not** start the API — that is `start.sh`.

After start, check health:

```sh
curl -s http://127.0.0.1/health
```

Useful follow-ups:

- Edit `api/.env` and `sudo systemctl restart book-camera-api` if you need to change keys later.
- Logs: `journalctl -u book-camera-api -f`
- Point the mobile app’s `PRODUCTION_API_BASE_URL` at this server’s public URL (HTTPS when you add TLS).
