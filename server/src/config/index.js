// ----------------------------------------------------------------------------
// Central, validated configuration. Every other module imports from here so we
// read process.env in exactly one place.
// ----------------------------------------------------------------------------
require("dotenv").config();

const num = (v, d) => (v === undefined || v === "" ? d : Number(v));

const config = {
  env: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "development") === "production",
  port: num(process.env.PORT, 4001),

  // Public origin of this API (used to build absolute HLS-proxy URLs). Override
  // in production, e.g. https://api.yourdomain.com
  publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${num(process.env.PORT, 4001)}`,

  // Comma-separated list of allowed CORS origins (frontends).
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  db: {
    url: process.env.DATABASE_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  },

  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  s3: {
    rawBucket: process.env.S3_RAW_BUCKET, // bucket 1 — raw uploads
    transcodedBucket: process.env.S3_TRANSCODED_BUCKET, // bucket 2 — HLS output
    presignedUrlExpiry: num(process.env.PRESIGNED_URL_EXPIRY, 900),
  },

  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL, // transcode job queue
  },

  cloudfront: {
    // e.g. dxxxxxxxxxxxxx.cloudfront.net — CDN in front of the transcoded bucket.
    // HLS playback URLs are built from this. No https://, no trailing /.
    domain: process.env.CLOUDFRONT_DOMAIN,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    priceBasic: process.env.STRIPE_PRICE_BASIC,
    priceStandard: process.env.STRIPE_PRICE_STANDARD,
    pricePremium: process.env.STRIPE_PRICE_PREMIUM,
    successUrl: process.env.STRIPE_SUCCESS_URL || "http://localhost:5173/account?checkout=success",
    cancelUrl: process.env.STRIPE_CANCEL_URL || "http://localhost:5173/plans",
  },
};

// Fail fast on the few things the API genuinely cannot run without.
function assertConfig() {
  const missing = [];
  if (!config.db.url) missing.push("DATABASE_URL");
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

module.exports = config;
module.exports.assertConfig = assertConfig;
