// Express application wiring. Kept separate from server.js so the app can be
// imported by tests without binding a port.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const config = require("../config");
const { notFound, errorHandler } = require("../middleware/error.middleware");
const apiRoutes = require("../routes");
const stripeWebhook = require("../routes/webhook.routes");

const app = express();

app.use(helmet());

// CORS: allow the configured origins (CORS_ORIGINS) and — in development — any
// localhost / 127.0.0.1 port, so the Vite dev server (e.g. :5173) always works
// regardless of which port it picks. Requests with no Origin (curl, mobile
// apps, server-to-server) are allowed too.
const corsOrigin = (origin, cb) => {
  if (!origin) return cb(null, true);
  if (config.corsOrigins.includes(origin)) return cb(null, true);
  if (!config.isProd && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
  // Deny quietly: don't emit CORS headers (the browser blocks it) instead of
  // throwing a 500. Non-browser clients (curl, server-to-server) are unaffected.
  return cb(null, false);
};
app.use(cors({ origin: corsOrigin, credentials: true }));

// Stripe webhook must receive the RAW body to verify the signature, so it is
// mounted BEFORE express.json() and uses its own raw body parser.
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

if (!config.isProd) app.use(morgan("dev"));

// Liveness/readiness probe.
app.get("/health", (_req, res) => res.json({ success: true, status: "ok", uptime: process.uptime() }));

// All feature routes live under /api.
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
