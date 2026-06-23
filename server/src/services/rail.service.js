const prisma = require("../config/prisma");
const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");
const { uniqueSlug } = require("../utils/slugify");
const { shape: shapeTitle } = require("./title.service");

const repo = createRepository("rail");

const itemsInclude = {
  items: {
    orderBy: { order: "asc" },
    include: { title: { include: { categories: { include: { category: true } } } } },
  },
};

function shape(r) {
  if (!r) return r;
  const { items, ...rest } = r;
  return { ...rest, titles: (items || []).map((i) => shapeTitle(i.title)) };
}

async function existsSlug(slug, exceptId) {
  const found = await repo.findUnique({ slug });
  return !!found && found.id !== exceptId;
}

async function list({ activeOnly = false } = {}) {
  // Always include the rail's items (shaped into a `titles` array) so the admin
  // UI can show and manage what's in each rail. Only the active filter differs
  // between the admin and public lists.
  const rails = await repo.findMany({
    where: activeOnly ? { active: true } : {},
    orderBy: { order: "asc" },
    include: itemsInclude,
  });
  return rails.map(shape);
}

async function getById(id) {
  const r = await repo.findById(id, { include: itemsInclude });
  if (!r) throw ApiError.notFound("Rail not found");
  return shape(r);
}

async function create(data) {
  const slug = data.slug || (await uniqueSlug(data.name, (s) => existsSlug(s)));
  const created = await repo.create({ ...data, slug });
  return getById(created.id);
}

async function update(id, data) {
  await getRailOrThrow(id);
  if (data.slug && (await existsSlug(data.slug, id))) throw ApiError.conflict("Slug already in use");
  await repo.update(id, data);
  return getById(id);
}

async function remove(id) {
  await getRailOrThrow(id);
  return repo.delete(id);
}

async function getRailOrThrow(id) {
  const r = await repo.findById(id);
  if (!r) throw ApiError.notFound("Rail not found");
  return r;
}

// Assign a title to a rail (idempotent via the unique [railId,titleId]).
async function addTitle(railId, titleId, order = 0) {
  await getRailOrThrow(railId);
  const title = await prisma.title.findUnique({ where: { id: titleId } });
  if (!title) throw ApiError.notFound("Title not found");
  await prisma.railItem.upsert({
    where: { railId_titleId: { railId, titleId } },
    update: { order },
    create: { railId, titleId, order },
  });
  return getById(railId);
}

async function removeTitle(railId, titleId) {
  await getRailOrThrow(railId);
  await prisma.railItem.deleteMany({ where: { railId, titleId } });
  return getById(railId);
}

// Reorder: accept an ordered array of titleIds.
async function reorder(railId, titleIds = []) {
  await getRailOrThrow(railId);
  await prisma.$transaction(
    titleIds.map((titleId, idx) =>
      prisma.railItem.updateMany({ where: { railId, titleId }, data: { order: idx } })
    )
  );
  return getById(railId);
}

module.exports = { list, getById, create, update, remove, addTitle, removeTitle, reorder };
