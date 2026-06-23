const prisma = require("../config/prisma");
const { createRepository } = require("../repositories/baseRepository");
const ApiError = require("../utils/ApiError");
const { uniqueSlug } = require("../utils/slugify");
const { parsePagination } = require("../utils/pagination");

const repo = createRepository("title");

const categoriesInclude = { categories: { include: { category: true } } };

// Shape a Title row (with TitleCategory join) into a flat API object.
function shape(t) {
  if (!t) return t;
  const { categories, ...rest } = t;
  return {
    ...rest,
    categories: (categories || []).map((tc) => tc.category),
  };
}

async function existsSlug(slug, exceptId) {
  const found = await repo.findUnique({ slug });
  return !!found && found.id !== exceptId;
}

// Admin list with filters + pagination.
async function adminList(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};
  if (query.type) where.type = query.type;
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };
  if (query.active !== undefined) where.active = query.active === "true" || query.active === true;

  const { items, total } = await repo.paginate({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    include: categoriesInclude,
  });
  return { items: items.map(shape), page, pageSize, total };
}

async function getById(id) {
  const t = await repo.findById(id, { include: { ...categoriesInclude, seasons: { include: { episodes: true }, orderBy: { order: "asc" } } } });
  if (!t) throw ApiError.notFound("Title not found");
  return shape(t);
}

async function getBySlug(slug) {
  const t = await repo.findUnique(
    { slug },
    { include: { ...categoriesInclude, seasons: { orderBy: { order: "asc" }, include: { episodes: { where: { active: true }, orderBy: { order: "asc" } } } } } }
  );
  if (!t || !t.active) throw ApiError.notFound("Title not found");
  return shape(t);
}

// Connect category ids via the TitleCategory join table.
function categoryConnect(categoryIds = []) {
  return categoryIds.map((categoryId) => ({ categoryId }));
}

async function create(data) {
  const { categoryIds = [], ...fields } = data;
  const slug = fields.slug || (await uniqueSlug(fields.title, (s) => existsSlug(s)));
  const created = await prisma.title.create({
    data: {
      ...fields,
      posterUrl: fields.posterUrl || "", // DB column is required; allow creating without one
      slug,
      categories: { create: categoryConnect(categoryIds) },
    },
    include: categoriesInclude,
  });
  return shape(created);
}

async function update(id, data) {
  await getById(id);
  const { categoryIds, ...fields } = data;
  if (fields.slug && (await existsSlug(fields.slug, id))) throw ApiError.conflict("Slug already in use");

  // If categoryIds provided, replace the whole set.
  const ops = { ...fields };
  if (categoryIds) {
    ops.categories = {
      deleteMany: {},
      create: categoryConnect(categoryIds),
    };
  }
  const updated = await prisma.title.update({ where: { id }, data: ops, include: categoriesInclude });
  return shape(updated);
}

async function remove(id) {
  await getById(id);
  return repo.delete(id);
}

// "Related" titles — same type, sharing at least one category, excluding self.
async function related(id, limit = 12) {
  const base = await repo.findById(id, { include: categoriesInclude });
  if (!base) throw ApiError.notFound("Title not found");
  const categoryIds = base.categories.map((c) => c.categoryId);
  const items = await repo.findMany({
    where: {
      id: { not: id },
      active: true,
      type: base.type,
      ...(categoryIds.length ? { categories: { some: { categoryId: { in: categoryIds } } } } : {}),
    },
    take: limit,
    orderBy: { rating: "desc" },
    include: categoriesInclude,
  });
  return items.map(shape);
}

module.exports = { adminList, getById, getBySlug, create, update, remove, related, shape };
