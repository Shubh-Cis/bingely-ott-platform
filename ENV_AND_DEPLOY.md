# Environment Variables & EC2 Deployment — Explained Simply

This doc answers two questions:

1. **If we never commit `.env`, how does the running app get its credentials?**
2. **I just bought an EC2 server — what do I do _before_ CI/CD can deploy the site?**

---

## Part 1 — How secrets reach the app (without ever being in git)

### The one big idea

> **Code** and **secrets** travel on **two different roads.**
>
> - **Code** (no secrets): your laptop → GitHub → EC2 (via `git pull`).
> - **Secrets** (`.env` files): typed **once, by hand, directly on the EC2 server.** They never enter git, never go through GitHub, and CI/CD never sends them.

`.env` is in `.gitignore`, so `git push`/`git pull` simply **skip it**. The file physically sits on the server's disk and stays there forever. When `docker compose` starts, it reads those files and feeds the values into the containers.

```
   your laptop ──git push──▶ GitHub ──CI/CD (SSH)──▶ EC2:  git pull   (CODE only)
                                                            │
   you ─────────────────── type once, by hand ────────────▶ EC2:  /opt/bingely/.env
                                                                   /opt/bingely/server/.env   (SECRETS)
                                                            │
                                                   docker compose reads them
                                                   and injects into containers
```

### There are TWO env files, with two different jobs

| File (lives on the server) | Holds | Read by | When it's used |
|---|---|---|---|
| `/opt/bingely/.env` | Compose-level vars: `POSTGRES_USER/PASSWORD/DB`, `VITE_STRIPE_PUBLISHABLE_KEY` | `docker-compose.yml` | at **build & startup** |
| `/opt/bingely/server/.env` | Backend **secrets**: `JWT_*`, `AWS_*`, `S3_*`, `SQS_QUEUE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDFRONT_DOMAIN` | the **api** + **worker** containers | at **runtime** |

Templates for both are committed as `*.example` files (safe — no real values). You copy them and fill in the real secrets **on the server**.

### Two kinds of variables — and why it matters

There's a crucial difference between the **backend** and the **frontend**:

#### A) Backend secrets → injected at RUNTIME (`env_file`)

In `docker-compose.yml`:

```yaml
api:
  env_file: ./server/.env        # ← reads every line and sets it as an env var
  environment:
    NODE_ENV: production
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
```

- `env_file: ./server/.env` tells Compose: "open this file and inject **all** its values into the container as environment variables."
- Inside the container, Node reads them with `process.env.JWT_ACCESS_SECRET`, `process.env.AWS_SECRET_ACCESS_KEY`, etc.
- These are **never baked into the image** — they're handed in fresh each time the container starts. So the same image is safe; the secrets stay outside it.
- `DATABASE_URL` is set **by Compose** to point at the `postgres` container, so it overrides whatever is in `server/.env`. (That's why you don't worry about the DB URL in `server/.env` for production.)

#### B) Frontend (Vite) vars → baked in at BUILD time (`ARG`/`ENV`)

This is the part that confuses people. The React app is **static files** — by the time a browser loads it, there's no server-side env to read. So Vite **"bakes" `VITE_*` variables into the JavaScript when the app is built**, not when it runs.

That's why they appear in `client/Dockerfile` as **build arguments**:

```dockerfile
ARG VITE_API_BASE_URL=""               # placeholder, value comes from the build command
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN npm run build                       # ← Vite reads those ENV vars HERE and freezes them into /dist
```

**So where does the Dockerfile get those values?** From `docker-compose.yml`, which passes them as `build.args`, pulling from your **root `.env`**:

```yaml
client:
  build:
    context: ./client
    args:
      VITE_API_BASE_URL: ""                                       # "" → app calls /api on its own origin
      VITE_STRIPE_PUBLISHABLE_KEY: ${VITE_STRIPE_PUBLISHABLE_KEY}  # ← pulled from /opt/bingely/.env
```

The chain, end to end:

```
/opt/bingely/.env  ──(${VITE_STRIPE_PUBLISHABLE_KEY})──▶  docker-compose build.args
        │
        ▼
client/Dockerfile  ARG → ENV  ──▶  `npm run build`  ──▶  value frozen into the JS bundle
```

> ⚠️ Only put **publishable / non-secret** values in `VITE_*` — they end up visible in the browser bundle. The Stripe **publishable** key is safe; the Stripe **secret** key is NOT and lives only in `server/.env`.

> Note: because these are baked at build time, **changing a `VITE_*` value requires a rebuild** (`docker compose up -d --build`), not just a restart.

### Why the browser never sees a secret

The frontend talks to **one origin** only: nginx serves the site and proxies `/api/*` to the backend container. The browser never connects to Postgres, never sees AWS keys, never sees the Stripe secret. All of that lives inside the `api`/`worker` containers via `server/.env`. (This is also why there's **no CORS** to configure.)

### TL;DR

- `.env` is gitignored → never in GitHub → you create it **once, by hand, on the server**.
- **Backend secrets** (`server/.env`) → injected into containers at **runtime** via `env_file`.
- **Frontend `VITE_*`** (root `.env`) → passed as Docker **build args** and **baked into the JS** at build time.
- CI/CD only ships **code**; the server's existing `.env` files supply the secrets.

---

## Part 2 — What to do on your new EC2 server BEFORE CI/CD can deploy

CI/CD (`.github/workflows/deploy.yml`) just SSHes in and runs `git pull && docker compose up -d --build`. For that to work, the server must already be prepared **once**. Do these steps in order.

### Step 0 — Pick the right instance
- **t3.small or larger** (2 GB RAM). The Vite build + ffmpeg can OOM on `t2.micro`. Add swap if you must use a tiny box.
- OS: Ubuntu 22.04/24.04 LTS.

### Step 1 — Open the right ports (EC2 Security Group, AWS console)
- **22 (SSH)** — so you and GitHub Actions can connect. Ideally restrict to known IPs.
- **80 (HTTP)** — the public website.
- **(443 later** if you add HTTPS.)
- **Do NOT open 5432** — Postgres stays private; reach it via SSH tunnel only.

### Step 2 — Install Docker, Compose, and git
```bash
ssh -i your-key.pem ubuntu@<EC2_IP>

sudo apt-get update
sudo apt-get install -y git
curl -fsSL https://get.docker.com | sudo sh     # Docker + Compose plugin
sudo usermod -aG docker $USER                    # run docker without sudo
exit                                             # log out & back in so the group applies
```

### Step 3 — Clone the repo to `/opt/bingely`
```bash
sudo mkdir -p /opt/bingely && sudo chown $USER /opt/bingely
git clone https://github.com/<you>/<your-repo>.git /opt/bingely
cd /opt/bingely
```
> CI/CD expects the repo at **`/opt/bingely`**. If you use a different path, update `cd /opt/bingely` in `.github/workflows/deploy.yml`.

### Step 4 — Create the two `.env` files ON THE SERVER (the key step)
```bash
cp .env.example .env                 # root: POSTGRES_* + VITE_STRIPE_PUBLISHABLE_KEY
cp server/.env.example server/.env   # backend secrets

nano .env                            # fill in real values
nano server/.env
```
Fill in:

**Root `.env`**
- `POSTGRES_USER`, `POSTGRES_PASSWORD` (use a **plain strong alphanumeric** password — avoids URL-encoding issues), `POSTGRES_DB`
- `VITE_STRIPE_PUBLISHABLE_KEY` (the `pk_...` key)

**`server/.env`**
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (long random strings)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `S3_RAW_BUCKET`, `S3_TRANSCODED_BUCKET`, `SQS_QUEUE_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (+ price IDs/amounts if using Stripe)
- `CLOUDFRONT_DOMAIN` (optional, for CDN playback)
- `CORS_ORIGINS` — your domain/IP (e.g. `http://<EC2_IP>`)

> These files are **not** tracked by git, so a later `git pull` never overwrites or deletes them.

### Step 5 — First launch
```bash
docker compose up -d --build
```
This builds the images and starts `postgres`, `api`, `worker`, `client`.

### Step 6 — Load your database (manual — nothing is automatic)
The fresh Postgres has **no tables** until you import. Bring your data over (full dump = schema + data). Your videos/images already live on **S3**, so only DB rows need importing — just make sure `server/.env` has the **same AWS keys + buckets**.

Open a tunnel from your laptop and restore:
```bash
# terminal 1: tunnel (keep open)
ssh -i your-key.pem -L 5432:localhost:5432 ubuntu@<EC2_IP>

# terminal 2: dump local, restore to server
pg_dump --no-owner --no-privileges \
  "postgresql://postgres:LOCAL_PW@localhost:5432/streamhaven?schema=public" > bingely.sql
psql "postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@localhost:5432/<POSTGRES_DB>" -f bingely.sql
```
(Or scp the dump to the server and load it with `docker compose exec postgres psql ...` — see `DEPLOYMENT.md` §3f.)

Visit **http://\<EC2_IP\>** → the site is live.

### Step 7 — Wire up CI/CD (GitHub Secrets)
In GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `EC2_HOST` | your EC2 public IP or DNS |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | the **contents** of your `.pem` private key (whole file, incl. the `BEGIN/END` lines) |

After this, every push to `main` auto-deploys: GitHub Actions SSHes in → `git pull` → `docker compose up -d --build`.

### Step 8 (recommended) — Domain + HTTPS
Point a domain at the IP and add TLS (Caddy or nginx + Let's Encrypt, or an AWS ALB/CloudFront). Until then it's `http://<ip>`.

---

## Pre-deploy checklist

- [ ] EC2 is t3.small+; Security Group opens **80** and **22** only (5432 closed).
- [ ] Docker + Compose + git installed; user in the `docker` group.
- [ ] Repo cloned to `/opt/bingely`.
- [ ] `/opt/bingely/.env` and `/opt/bingely/server/.env` created **on the server** with real values.
- [ ] AWS keys in `server/.env` match the bucket/queue holding your media.
- [ ] `docker compose up -d --build` succeeded; database imported manually.
- [ ] GitHub Secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` added.
- [ ] (Optional) domain + HTTPS in front.

---

## Quick mental model to remember

- **`.env` = the keys to the house.** You don't mail the keys (git); you hand them over in person, once (type them on the server).
- **Backend secrets** are handed to the app **every time it starts** (runtime, `env_file`).
- **Frontend `VITE_*`** are **baked into the walls when the house is built** (build time) — change them ⇒ rebuild.
- **CI/CD delivers furniture (code), never keys (secrets).**
