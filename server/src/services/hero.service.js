const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");

const repo = createRepository("hero");

async function list({ activeOnly = false } = {}) {
  return repo.findMany({ where: activeOnly ? { active: true } : {}, orderBy: { order: "asc" } });
}

async function getById(id) {
  const h = await repo.findById(id);
  if (!h) throw ApiError.notFound("Hero not found");
  return h;
}

const create = (data) => repo.create(data);

async function update(id, data) {
  await getById(id);
  return repo.update(id, data);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

module.exports = { list, getById, create, update, remove };
