// Read-only, public-facing catalog aggregation that powers the customer app.
const prisma = require("../config/prisma");
const { parsePagination } = require("../utils/pagination");
const heroService = require("./hero.service");
const railService = require("./rail.service");
const categoryService = require("./category.service");
const languageService = require("./language.service");
const collectionService = require("./collection.service");
const { shape: shapeTitle } = require("./title.service");

const titleInclude = { categories: { include: { category: true } } };

// The whole home page in one call: hero carousel, content rails (each with its
// titles), popular categories and featured collections.
async function home() {
  const [heroes, rails, categories, collections, languages] = await Promise.all([
    heroService.list({ activeOnly: true }),
    railService.list({ activeOnly: true }),
    categoriesWithImage(),
    collectionService.list({ activeOnly: true }),
    popularLanguages(),
  ]);
  return { heroes, rails, categories, collections, languages };
}

const pickImg = (t) => t?.backdropUrl || t?.posterUrl || null;

// Count active titles per language (the source of truth for "what we have").
async function languageCounts() {
  const rows = await prisma.title.groupBy({
    by: ["language"],
    where: { active: true },
    _count: { _all: true },
  });
  const map = {};
  for (const r of rows) if (r.language) map[r.language] = r._count._all;
  return map;
}

// "Popular Languages" rail. Uses admin-managed Language rows for the look
// (native script, image, gradient, order). If the admin hasn't set an image,
// falls back to the top-rated title's artwork in that language. If no Language
// rows exist at all, derives the list straight from the title counts.
async function popularLanguages() {
  const [rows, counts] = await Promise.all([languageService.list({ activeOnly: true }), languageCounts()]);

  const fill = async (name) => {
    const top = await prisma.title.findFirst({
      where: { active: true, language: name },
      orderBy: { rating: "desc" },
      select: { backdropUrl: true, posterUrl: true },
    });
    return pickImg(top);
  };

  if (rows.length === 0) {
    // No admin config yet → derive from content.
    const names = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return Promise.all(names.map(async (name) => ({ name, native: name, gradient: null, count: counts[name], image: await fill(name) })));
  }

  return Promise.all(
    rows.map(async (l) => ({
      name: l.name,
      native: l.native || l.name,
      gradient: l.gradient || null,
      count: counts[l.name] || 0,
      image: l.image || (await fill(l.name)),
    }))
  );
}

// Active categories enriched with an image: the admin-set image if present,
// otherwise the top-rated title's artwork in that category.
async function categoriesWithImage() {
  const cats = await categoryService.list({ activeOnly: true });
  return Promise.all(
    cats.map(async (c) => {
      if (c.image) return c;
      const top = await prisma.title.findFirst({
        where: { active: true, categories: { some: { category: { slug: c.slug } } } },
        orderBy: { rating: "desc" },
        select: { backdropUrl: true, posterUrl: true },
      });
      return { ...c, image: pickImg(top) };
    })
  );
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
  if (query.language) where.language = query.language;

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
