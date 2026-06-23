const prisma = require("../config/prisma");
const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");

const repo = createRepository("episode");

async function getById(id) {
  const e = await repo.findById(id);
  if (!e) throw ApiError.notFound("Episode not found");
  return e;
}

async function create(seasonId, data) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw ApiError.notFound("Season not found");
  try {
    return await repo.create({ ...data, seasonId });
  } catch (e) {
    if (e.code === "P2002") throw ApiError.conflict(`Episode number ${data.number} already exists in this season`);
    throw e;
  }
}

async function update(id, data) {
  await getById(id);
  return repo.update(id, data);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

module.exports = { getById, create, update, remove };
