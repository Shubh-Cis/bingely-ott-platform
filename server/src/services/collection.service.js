const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");
const { uniqueSlug } = require("../utils/slugify");

const repo = createRepository("collection");

async function existsSlug(slug, exceptId) {
  const found = await repo.findUnique({ slug });
  return !!found && found.id !== exceptId;
}

async function list({ activeOnly = false } = {}) {
  return repo.findMany({ where: activeOnly ? { active: true } : {}, orderBy: { order: "asc" } });
}

async function getById(id) {
  const c = await repo.findById(id);
  if (!c) throw ApiError.notFound("Collection not found");
  return c;
}

async function create(data) {
  const slug = data.slug || (await uniqueSlug(data.title, (s) => existsSlug(s)));
  return repo.create({ ...data, slug });
}

async function update(id, data) {
  await getById(id);
  if (data.slug && (await existsSlug(data.slug, id))) throw ApiError.conflict("Slug already in use");
  return repo.update(id, data);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

module.exports = { list, getById, create, update, remove };
