# Automated deploy setup

One-time steps so GitHub Actions can build the API off-droplet, rsync the release over SSH, and restart the service.
Manual first install (nginx, Node, Postgres, `.env`) is covered in [README.md](README.md#deployment).

TypeScript compilation and production `npm ci` run in CI. The droplet only runs migrations and `systemctl restart`.

## 1. Deploy user on the droplet

`deploy/setup.sh` creates `book-camera-deploy` when you bootstrap a new droplet. If the user already exists, skip creation and continue from the SSH key steps.

```shell
# Step 1: ssh to the VM as an admin user
# Step 2: create the deploy user if needed (no password; SSH keys only)
sudo adduser --disabled-password --gecos "" book-camera-deploy

# Step 3: (on your laptop) generate the CI → droplet SSH key
ssh-keygen -t ed25519 -C "book-camera-github-actions" -f book-camera-deploy-key -N ""

# Step 4: install the public key on the droplet
sudo mkdir -p /home/book-camera-deploy/.ssh
sudo chmod 700 /home/book-camera-deploy/.ssh
sudo nano /home/book-camera-deploy/.ssh/authorized_keys   # paste book-camera-deploy-key.pub
sudo chmod 600 /home/book-camera-deploy/.ssh/authorized_keys
sudo chown -R book-camera-deploy:book-camera-deploy /home/book-camera-deploy/.ssh

# Step 5: test SSH from your laptop (-i is the private key path)
ssh -i book-camera-deploy-key book-camera-deploy@YOUR_DROPLET_IP

# Step 6: give deploy user ownership of the API directory
sudo chown -R book-camera-deploy:book-camera-deploy /opt/book-camera/api
sudo chmod 600 /opt/book-camera/api/.env

# Step 7: limited passwordless sudo for restart/status only
sudo visudo -f /etc/sudoers.d/deploy-book-camera-api
# add this line:
# book-camera-deploy ALL=(root) NOPASSWD: /bin/systemctl restart book-camera-api, /bin/systemctl status book-camera-api
sudo chmod 440 /etc/sudoers.d/deploy-book-camera-api
```

Keep the private key out of git. Add `book-camera-deploy-key*` to your local ignore habits if you store it next to the repo.

## 2. GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions** → New repository secret:

| Secret | Corresponds to |
| --- | --- |
| `DEPLOY_HOST` | Droplet IP or hostname Actions SSHs to |
| `DEPLOY_USER` | Linux user on the droplet (`book-camera-deploy`) |
| `DEPLOY_SSH_KEY` | Full private key from `book-camera-deploy-key` (including `BEGIN`/`END` lines) |
| `DEPLOY_PATH` | Absolute path to the API on the droplet (directory with `package.json`, e.g. `/opt/book-camera/api`) |

Production `.env` values stay on the droplet. They are never stored as Actions secrets.

Routine deploys do **not** use `git pull` on the droplet, so no GitHub deploy key is required for updates. A one-time clone (or copy of the `api/` tree) is enough for `setup.sh`.

## 3. CI behavior

After [`.github/workflows/api-deploy.yml`](../.github/workflows/api-deploy.yml) is on `main`:

- Pushes and PRs that touch `api/**` run lint, typecheck, tests (with Postgres), and `npm run build`.
- On push to `main` (or manual **workflow_dispatch**), if those steps pass, Actions rsyncs `dist/`, production `node_modules/`, lockfiles, and `migrations/` to `DEPLOY_PATH`, then runs `./deploy/activate.sh` over SSH (migrate, `systemctl restart book-camera-api`).

Deprecated laptop scripts `deploy/build-and-push.sh` and `deploy/update.sh` remain in the tree for reference only.
