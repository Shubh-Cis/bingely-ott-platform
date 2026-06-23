# ── Backend image: serves both the API and the transcode worker ─────────────
# The worker needs ffmpeg; the API doesn't, but sharing one image keeps the
# build simple and lets `docker compose` pick the process via `command`.
FROM node:20-bookworm-slim

# ffmpeg for the transcode worker.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Prisma client generation needs the schema.
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 4001

# Default to the API; the worker service overrides `command` in compose.
CMD ["node", "src/server.js"]
