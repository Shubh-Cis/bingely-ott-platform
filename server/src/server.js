// API entry point:  node src/server.js  (or `npm run dev`).
// The transcode worker runs as a SEPARATE process: `npm run worker`.
const app = require("./app/app");
const config = require("./config");
const prisma = require("./config/prisma");
const { logger } = require("./utils/logger");

async function start() {
  config.assertConfig();

  // Verify the DB connection up front so we fail fast with a clear message.
  try {
    await prisma.$connect();
    logger.info("Database connected");
  } catch (err) {
    logger.error("Failed to connect to the database. Is DATABASE_URL correct and Postgres running?");
    logger.error(err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    logger.info(`Bingely API running on port ${config.port} (${config.env})`);
    logger.info(`Raw bucket: ${config.s3.rawBucket || "(unset)"} | Transcoded bucket: ${config.s3.transcodedBucket || "(unset)"}`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start();
