# Bingely — OTT Streaming Platform

A Netflix-style streaming platform: a customer web app + an admin portal, backed
by a Node/Express API, PostgreSQL (Prisma), and an S3 → SQS → FFmpeg → HLS →
CloudFront video pipeline.

## Monorepo layout

```
.
├── server/          # Node.js backend (API + transcode worker)
│   ├── src/         # app, config, routes, controllers, services, repositories,
│   │                #   workers, middleware, validations, utils
│   ├── prisma/      # schema.prisma + seed.js
│   ├── scripts/     # one-off ops scripts (S3 CORS setup)
│   ├── docs/        # ARCHITECTURE.md (+ legacy/ pipeline notes)
│   ├── Dockerfile   # backend image (API + worker)
│   └── .env         # backend environment (DB, JWT, AWS, Stripe)
├── client/          # React SPA (Vite) — customer app + admin portal
│   └── .env         # VITE_API_BASE_URL (defaults to http://localhost:4001)
└── docker-compose.yml   # optional backend stack (postgres, redis, api, worker)
```

## Run locally (no Docker)

```bash
# 1) Backend  → http://localhost:4001
cd server
npm install
npx prisma generate
npx prisma db push        # or: npx prisma migrate dev
# npm run db:seed         # only on an empty DB (creates an admin user)
npm run dev               # API
npm run worker            # transcode worker (separate terminal)

# 2) Frontend → http://localhost:5173
cd ../client
npm install
npm run dev
```

The SPA calls the API directly via `client/.env` → `VITE_API_BASE_URL`
(default `http://localhost:4001`). Set it to another port if you run the API
elsewhere.

Full design, API reference and deployment guide: **`server/docs/ARCHITECTURE.md`**.
