# ── Stage 1: build the React/Vite app into static files ─────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps first (better layer caching — only re-runs if package files change)
COPY package*.json ./
RUN npm ci

# Copy the source and build
COPY . .

# Vite "bakes" VITE_* variables into the bundle AT BUILD TIME. We pass them as
# build args so the publishable Stripe key and API base are set when building.
#   VITE_API_BASE_URL="" → the app calls /api on its own origin (nginx proxies it)
ARG VITE_API_BASE_URL=""
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
RUN npm run build          # outputs static files to /app/dist

# ── Stage 2: serve the static files with nginx (tiny final image) ────────────
FROM nginx:1.27-alpine
# Our nginx config: serve the SPA + proxy /api to the backend container
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy ONLY the built files from stage 1 (no node_modules, no source)
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
