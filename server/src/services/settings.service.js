// Single-row global site settings (id = 1).
const prisma = require("../config/prisma");

async function get() {
  return prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function update(data) {
  return prisma.siteSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
}

module.exports = { get, update };
