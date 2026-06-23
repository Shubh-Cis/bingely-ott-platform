// Public, read-only catalog endpoints for the customer app.
const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/ApiResponse");
const catalogService = require("../services/catalog.service");
const titleService = require("../services/title.service");
const categoryService = require("../services/category.service");
const collectionService = require("../services/collection.service");

const home = asyncHandler(async (_req, res) => ok(res, await catalogService.home()));

const search = asyncHandler(async (req, res) => {
  const { items, ...meta } = await catalogService.search(req.query);
  return ok(res, items, "OK", meta);
});

const categories = asyncHandler(async (_req, res) => ok(res, await categoryService.list({ activeOnly: true })));

const collections = asyncHandler(async (_req, res) => ok(res, await collectionService.list({ activeOnly: true })));

const byCategory = asyncHandler(async (req, res) => {
  const { items, ...meta } = await catalogService.byCategory(req.params.slug, req.query);
  return ok(res, items, "OK", meta);
});

const titleBySlug = asyncHandler(async (req, res) => ok(res, await titleService.getBySlug(req.params.slug)));

const related = asyncHandler(async (req, res) => ok(res, await titleService.related(req.params.id)));

module.exports = { home, search, categories, collections, byCategory, titleBySlug, related };
