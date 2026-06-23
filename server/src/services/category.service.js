const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");
const { uniqueSlug } = require("../utils/slugify");

const repo = createRepository("category");

const slugTaken = (slug, exceptId) => async (s) => {
  const found = await repo.findUnique({ slug: s });
  return !!found && found.id !== exceptId;
};

async function list({ activeOnly = false } = {}) {
  return repo.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

async function getById(id) {
  const c = await repo.findById(id);
  if (!c) throw ApiError.notFound("Category not found");
  return c;
}

async function create(data) {
  const slug = data.slug || (await uniqueSlug(data.name, slugTaken()));
  return repo.create({ ...data, slug });
}

async function update(id, data) {
  await getById(id);
  const patch = { ...data };
  if (data.slug) {
    if (await slugTaken(id)(data.slug)) throw ApiError.conflict("Slug already in use");
  }
  return repo.update(id, patch);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

module.exports = { list, getById, create, update, remove };
