# Bingely — Deployment Guide (Docker + CI/CD to EC2)

Written for someone new to Docker & CI/CD. It explains **exactly** how your code
gets from GitHub to your EC2 server, how secrets are handled, and what every line
of the Docker and pipeline files does.

---

## 1. The big picture — how code reaches the server

```
   you ──git push──▶ GitHub ──(GitHub Actions)──▶ SSH into EC2
                                                      │
                                                      ▼
                                   cd /opt/bingely && git pull
                                   docker compose up -d --build
                                                      │
        ┌───────────────────────────────────────────┼───────────────────────────┐
        ▼                 ▼                  ▼        ▼               ▼
     client(nginx:80)   api(:4001)       worker     postgres        redis
     serves React +     Express API      FFmpeg     database         cache
     proxies /api ──────────┘            transcode  (volume)
```

**One origin:** visitors hit `http://<your-ec2-ip>` → nginx serves the React app
and forwards `/api/*` to the backend. Frontend and backend share an origin, so
**there's no CORS to configure**, and the browser never talks to the database or
sees any secret.

**Two kinds of deploy commands exist; we use the simplest:** the server pulls the
latest code from git and rebuilds the containers itself. No image registry needed.

---

## 2. ⭐ Where do the secrets (.env) come from? (your main question)

Your `.env` files are **git-ignored** — they are NOT on GitHub, and CI/CD does
**not** send them. So how does the live app get `DATABASE_URL`, Stripe keys, AWS
keys?

**The `.env` files live ON the EC2 server.** You create them **once, by hand**,
right after cloning the repo. They sit on the server's disk and stay there forever
(git pull never touches them because they're git-ignored). When `docker compose`
starts the containers, it reads them via `env_file:` and injects the values as
environment variables into the running containers.

So the flow is:
- **Code** (no secrets) travels: your machine → GitHub → EC2 (via `git pull`).
- **Secrets** travel: you → EC2 once (typed/pasted into files on the server). They never leave the server.

You'll create **two** files on the server (templates are committed as `*.example`):

| File on server | Holds | Used by |
|---|---|---|
| `/opt/bingely/server/.env` | Backend **secrets**: `JWT_*`, `AWS_*`, `S3_*`, `SQS_QUEUE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLOUDFRONT_DOMAIN` | api + worker containers |
| `/opt/bingely/.env` | Compose vars: `POSTGRES_*`, `VITE_STRIPE_PUBLISHABLE_KEY` | docker-compose / frontend build |

> `DATABASE_URL` is set by docker-compose to point at the Postgres **container**, so you don't put a DB url in `server/.env` for production (compose overrides it).

---

## 3. One-time EC2 setup

SSH into your EC2 box (`ssh ubuntu@<ec2-ip>`), then:

### a) Install Docker + Compose + git
```bash
sudo apt-get update
sudo apt-get install -y git
curl -fsSL https://get.docker.com | sudo sh        # installs Docker + Compose plugin
sudo usermod -aG docker $USER                      # run docker without sudo
exit                                               # log out & back in for the group to apply
```

### b) Clone your repo
```bash
sudo mkdir -p /opt/bingely && sudo chown $USER /opt/bingely
git clone https://github.com/<you>/<your-repo>.git /opt/bingely
cd /opt/bingely
```

### c) Create the secret files (this is the step that puts secrets on the server)
```bash
cp .env.example .env                  # then edit: POSTGRES_PASSWORD, VITE_STRIPE_PUBLISHABLE_KEY
cp server/.env.example server/.env    # then edit: JWT_*, AWS_*, S3_*, SQS_QUEUE_URL, STRIPE_SECRET_KEY, etc.
nano .env
nano server/.env
```

### d) Open the right ports in the EC2 Security Group (AWS console)
- **80** (HTTP) — so the public can reach the site
- **22** (SSH) — so GitHub Actions can deploy (ideally restrict to known IPs)

### e) First launch + create the admin user
```bash
docker compose up -d --build          # build & start everything (first run takes a few min)
docker compose exec api npm run db:seed   # creates the initial admin (admin@bingely.local / admin12345)
```
Visit **http://<your-ec2-ip>** — the site is live. Admin at `/admin/login`.

---

## 4. Where to add YOUR information (GitHub Secrets)

In GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret.** Add:

| Secret name | Value |
|---|---|
| `EC2_HOST` | your EC2 public IP or DNS (e.g. `13.234.x.x`) |
| `EC2_USER` | the SSH user — usually `ubuntu` |
| `EC2_SSH_KEY` | the **contents** of your `.pem` private key (open the file, paste everything including the `-----BEGIN/END-----` lines) |

That's the only place you add server info — the workflow reads these `${{ secrets.* }}` values. Nothing about your server is hard-coded in the repo.

---

## 5. From then on — automatic deploys
```bash
git add . && git commit -m "my change" && git push origin main
```
Pushing to `main` triggers **GitHub Actions → SSH to EC2 → git pull → docker compose up -d --build**. ~1–3 min later your change is live. Watch progress in the repo's **Actions** tab.

---

## 6. The Docker files, line by line

### `server/Dockerfile` (backend: API + worker share this image)
```dockerfile
FROM node:20-bookworm-slim          # base OS with Node 20 pre-installed
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl \
  && rm -rf /var/lib/apt/lists/*    # ffmpeg = video transcoding; openssl = Prisma needs it
WORKDIR /app                        # work inside /app from here on
COPY package*.json ./               # copy ONLY dep manifests first…
RUN npm ci --omit=dev               # …so this install layer is cached unless deps change
COPY prisma ./prisma                # Prisma schema
RUN npx prisma generate             # generate the DB client into the image
COPY src ./src                      # the application code
COPY scripts ./scripts              # one-off ops scripts
ENV NODE_ENV=production
EXPOSE 4001                         # documents the port the API listens on
CMD ["node", "src/server.js"]       # default process (compose overrides for the worker)
```

### `client/Dockerfile` (frontend: build → serve with nginx)
```dockerfile
FROM node:20-bookworm-slim AS build # "build" stage — has Node to compile the app
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL=""            # build-time vars (Vite bakes them into the JS)
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN npm run build                   # produces static files in /app/dist

FROM nginx:1.27-alpine              # final image = tiny nginx, no Node
COPY nginx.conf /etc/nginx/conf.d/default.conf   # our serve-SPA + proxy-/api config
COPY --from=build /app/dist /usr/share/nginx/html # copy ONLY the built files from stage 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]  # run nginx in the foreground
```
> Two stages keep the final image small: the heavy Node build tools are thrown away; only the static files + nginx ship.

### `client/nginx.conf`
- `location /api/ { proxy_pass http://api:4001; }` → forwards API calls to the backend container (Docker resolves `api` by service name).
- `location / { try_files $uri $uri/ /index.html; }` → SPA routing: unknown paths return `index.html` so React Router works.
- `client_max_body_size 50m` → lets image uploads pass through nginx.

### `docker-compose.yml` (ties it all together)
- **services** = the 5 containers. `build:` builds from a Dockerfile; `image:` pulls a ready one (postgres/redis).
- `restart: unless-stopped` → containers auto-restart if they crash or the server reboots.
- `env_file: ./server/.env` → injects your backend secrets into api + worker.
- `environment: DATABASE_URL: ...@postgres:5432...` → points the app at the Postgres **container** (overriding the .env value).
- `volumes: pgdata:/var/lib/postgresql/data` → database files persist across redeploys (you won't lose data on `up --build`).
- `ports: "80:80"` on **client** → the only port exposed to the internet.
- `command: sh -c "npx prisma db push --accept-data-loss && node src/server.js"` → on every start, sync the DB schema, then run the API.

---

## 7. The CI/CD pipeline, line by line (`.github/workflows/deploy.yml`)
```yaml
on:
  push: { branches: [main] }   # run when you push to main
  workflow_dispatch: {}        # …or trigger manually from the Actions tab
jobs:
  deploy:
    runs-on: ubuntu-latest     # GitHub gives a temporary Linux machine
    steps:
      - uses: appleboy/ssh-action@v1.2.0   # an action that SSHes into a server
        with:
          host: ${{ secrets.EC2_HOST }}    # ← your EC2 IP (from GitHub Secrets)
          username: ${{ secrets.EC2_USER }}# ← "ubuntu"
          key: ${{ secrets.EC2_SSH_KEY }}  # ← your private .pem contents
          script: |                        # commands run ON the EC2 server:
            cd /opt/bingely
            git pull origin main           # get the new code (NOT the .env — it's git-ignored)
            docker compose up -d --build    # rebuild changed images & restart
            docker image prune -f          # delete old unused images to save disk
```
**The deploy never sends secrets.** It only pulls code; the server's existing `.env`
files supply the secrets when compose starts the containers.

---

## 8. Handy server commands
```bash
docker compose ps               # what's running
docker compose logs -f api      # follow API logs (also: worker / client / postgres)
docker compose up -d --build    # rebuild & restart after changes
docker compose down             # stop everything (keeps the DB volume)
docker compose exec api npm run db:seed   # (re)create the admin user
```

---

## 9. Production checklist
- [ ] EC2 Security Group allows ports **80** and **22**.
- [ ] `server/.env` (secrets) and root `.env` (compose vars) created on the server.
- [ ] GitHub Secrets `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` added.
- [ ] First `docker compose up -d --build` succeeded; `db:seed` run once.
- [ ] EC2 instance is **t3.small or larger** (the Vite build + ffmpeg image can OOM on t2.micro). If it OOMs, add swap or build images in CI instead.
- [ ] For real video **playback** at scale, set `CLOUDFRONT_DOMAIN` and the transcoded-bucket CORS (otherwise the API proxies HLS, which is fine for low traffic).
- [ ] (Recommended) Put a domain + HTTPS in front — easiest is to add Caddy or an nginx-proxy with Let's Encrypt, or an AWS ALB/CloudFront. Until then it's `http://<ip>`.
