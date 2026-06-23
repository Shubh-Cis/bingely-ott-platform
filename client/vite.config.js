import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SPA calls the API directly using VITE_API_BASE_URL (default
// http://localhost:4001) — see src/lib/axios.js. The backend's CORS allow-list
// covers the dev origin. The proxy below is just a same-origin fallback and is
// unused while VITE_API_BASE_URL is an absolute URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4001", changeOrigin: true },
      "/upload": { target: "http://localhost:4001", changeOrigin: true },
    },
  },
});
