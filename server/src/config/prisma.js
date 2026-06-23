// Single shared PrismaClient instance. Importing this everywhere avoids opening
// a new connection pool per module (and avoids the "too many connections" issue
// when nodemon hot-reloads in development).
const { PrismaClient } = require("@prisma/client");
const config = require("./index");

const prisma =
  global.__bingelyPrisma ||
  new PrismaClient({
    log: config.isProd ? ["error", "warn"] : ["error", "warn"],
  });

if (!config.isProd) global.__bingelyPrisma = prisma;

module.exports = prisma;
