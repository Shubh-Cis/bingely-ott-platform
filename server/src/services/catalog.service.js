// Read-only, public-facing catalog aggregation that powers the customer app.
const prisma = require("../config/prisma");
const { parsePagination } = require("../utils/pagination");
const heroService = require("./hero.service");
const railService = require("./rail.service");
const categoryService = require("./category.service");
const collectionService = require("./collection.service");
const { shape: shapeTitle } = require("./title.service");

const titleInclude = { categories: { include: { category: true } } };

// The whole home page in one call: hero carousel, content rails (each with its
// titles), popular categories and featured collections.
async function home() {
  const [heroes, rails, categories, collections] = await Promise.all([
    heroService.list({ activeOnly: true }),
    railService.list({ activeOnly: true }),
    categoryService.list({ activeOnly: true }),
    collectionService.list({ activeOnly: true }),
  ]);
  return { heroes, rails, categories, collections };
}

const SORTS = {
  rating: { rating: "desc" },
  newest: { createdAt: "desc" },
  year: { year: "desc" },
  az: { title: "asc" },
};

// Search + filter + sort across active titles.
async function search(query) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = { active: true };
  if (query.q) {
    const q = String(query.q).trim();
    // Match the term across title, synopsis, genre name, year and type.
    const or = [
      { title: { contains: q, mode: "insensitive" } },
      { synopsis: { contains: q, mode: "insensitive" } },
      { categories: { some: { category: { name: { contains: q, mode: "insensitive" } } } } },
    ];
    const year = parseInt(q, 10);
    if (!Number.isNaN(year) && String(year) === q) or.push({ year });
    const t = q.toUpperCase();
    if (["MOVIE", "SERIES", "DOCUMENTARY"].includes(t)) or.push({ type: t });
    where.OR = or;
  }
  if (query.type) where.type = query.type;
  if (query.year) where.year = Number(query.year);
  if (query.featured === "true") where.featured = true;
  if (query.category) where.categories = { some: { category: { slug: query.category } } };

  const orderBy = SORTS[query.sort] || SORTS.rating;

  const [items, total] = await Promise.all([
    prisma.title.findMany({ where, orderBy, skip, take, include: titleInclude }),
    prisma.title.count({ where }),
  ]);
  return { items: items.map(shapeTitle), page, pageSize, total };
}

// Titles belonging to a category slug.
async function byCategory(slug, query) {
  return search({ ...query, category: slug });
}

module.exports = { home, search, byCategory };
