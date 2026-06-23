# S3 Video Upload — Vite + React client

A minimal frontend for the Node S3 API in the parent folder. It walks the full
flow and prints each step to both an on-screen log and the browser console.

## Run

```bash
# 1. Start the API (in the project root, one level up)
cd ..
npm run dev          # or: npm start   → http://localhost:4001

# 2. Start this client
cd client
npm install          # first time only
npm run dev          # → http://localhost:5173
```

Open http://localhost:5173, pick an `.mp4`, hit **Upload**, and watch the flow:

1. **STEP 1** — `GET /upload/presigned` → get a signed upload URL
2. **STEP 2** — `PUT` the file **directly to S3** (with a progress bar)
3. **STEP 3** — `POST /upload/notify` → server verifies the file landed
4. **STEP 4** — `GET /upload/video-url` → get a signed URL and play it inline

Requests to `/upload/*` are proxied to `http://localhost:4001` (see `vite.config.js`),
so there are no CORS issues between the client and your API.

## ⚠️ One required S3 setting (browser → S3 CORS)

The browser uploads **directly** to S3, so the **bucket itself** must allow it. Add this
CORS config to your raw bucket (S3 console → bucket → Permissions → CORS). For production,
replace `"*"` with your real origin.

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Without this, STEP 2 fails with a CORS error in the browser console even though the
presigned URL is valid.

## Files

| File              | What it is |
|-------------------|------------|
| `src/api.js`      | Plain **JS** module — all four API/S3 calls |
| `src/App.jsx`     | **JSX** React UI — drives the flow, shows progress + log |
| `src/main.jsx`    | React entry point |
| `vite.config.js`  | Vite + React plugin + dev proxy to the API |
