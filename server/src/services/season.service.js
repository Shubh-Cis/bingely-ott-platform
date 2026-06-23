const prisma = require("../config/prisma");
const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");

const repo = createRepository("season");

async function listForTitle(titleId) {
  return repo.findMany({
    where: { titleId },
    orderBy: { order: "asc" },
    include: { episodes: { orderBy: { order: "asc" } } },
  });
}

async function getById(id) {
  const s = await repo.findById(id, { include: { episodes: { orderBy: { order: "asc" } } } });
  if (!s) throw ApiError.notFound("Season not found");
  return s;
}

async function create(titleId, data) {
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) throw ApiError.notFound("Title not found");
  if (title.type !== "SERIES") throw ApiError.badRequest("Seasons can only be added to SERIES titles");
  try {
    return await repo.create({ ...data, titleId });
  } catch (e) {
    if (e.code === "P2002") throw ApiError.conflict(`Season number ${data.number} already exists for this title`);
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

module.exports = { listForTitle, getById, create, update, remove };
