const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");

const repo = createRepository("language");

async function list({ activeOnly = false } = {}) {
  return repo.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

async function getById(id) {
  const l = await repo.findById(id);
  if (!l) throw ApiError.notFound("Language not found");
  return l;
}

async function create(data) {
  return repo.create(data);
}

async function update(id, data) {
  await getById(id);
  return repo.update(id, data);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

module.exports = { list, getById, create, update, remove };
