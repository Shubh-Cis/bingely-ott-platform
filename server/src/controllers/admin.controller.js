// Admin (back-office) CRUD controllers for all catalog entities. Thin wrappers
// over the services that also write an audit-log entry for mutations.
const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/ApiResponse");
const audit = require("../services/audit.service");

const categoryService = require("../services/category.service");
const titleService = require("../services/title.service");
const railService = require("../services/rail.service");
const seasonService = require("../services/season.service");
const episodeService = require("../services/episode.service");
const collectionService = require("../services/collection.service");
const heroService = require("../services/hero.service");
const settingsService = require("../services/settings.service");

// ---- Categories ------------------------------------------------------------
const categories = {
  list: asyncHandler(async (_req, res) => ok(res, await categoryService.list())),
  get: asyncHandler(async (req, res) => ok(res, await categoryService.getById(req.params.id))),
  create: asyncHandler(async (req, res) => {
    const c = await categoryService.create(req.body);
    await audit.record(req.auth, "category.create", "Category", c.id);
    return created(res, c);
  }),
  update: asyncHandler(async (req, res) => {
    const c = await categoryService.update(req.params.id, req.body);
    await audit.record(req.auth, "category.update", "Category", c.id);
    return ok(res, c);
  }),
  remove: asyncHandler(async (req, res) => {
    await categoryService.remove(req.params.id);
    await audit.record(req.auth, "category.delete", "Category", req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Titles ----------------------------------------------------------------
const titles = {
  list: asyncHandler(async (req, res) => {
    const { items, ...meta } = await titleService.adminList(req.query);
    return ok(res, items, "OK", meta);
  }),
  get: asyncHandler(async (req, res) => ok(res, await titleService.getById(req.params.id))),
  create: asyncHandler(async (req, res) => {
    const t = await titleService.create(req.body);
    await audit.record(req.auth, "title.create", "Title", t.id, { title: t.title });
    return created(res, t);
  }),
  update: asyncHandler(async (req, res) => {
    const t = await titleService.update(req.params.id, req.body);
    await audit.record(req.auth, "title.update", "Title", t.id);
    return ok(res, t);
  }),
  remove: asyncHandler(async (req, res) => {
    await titleService.remove(req.params.id);
    await audit.record(req.auth, "title.delete", "Title", req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Rails -----------------------------------------------------------------
const rails = {
  list: asyncHandler(async (_req, res) => ok(res, await railService.list())),
  get: asyncHandler(async (req, res) => ok(res, await railService.getById(req.params.id))),
  create: asyncHandler(async (req, res) => {
    const r = await railService.create(req.body);
    await audit.record(req.auth, "rail.create", "Rail", r.id);
    return created(res, r);
  }),
  update: asyncHandler(async (req, res) => {
    const r = await railService.update(req.params.id, req.body);
    await audit.record(req.auth, "rail.update", "Rail", r.id);
    return ok(res, r);
  }),
  remove: asyncHandler(async (req, res) => {
    await railService.remove(req.params.id);
    await audit.record(req.auth, "rail.delete", "Rail", req.params.id);
    return ok(res, null, "Deleted");
  }),
  addTitle: asyncHandler(async (req, res) => ok(res, await railService.addTitle(req.params.id, req.body.titleId, req.body.order))),
  removeTitle: asyncHandler(async (req, res) => ok(res, await railService.removeTitle(req.params.id, req.params.titleId))),
  reorder: asyncHandler(async (req, res) => ok(res, await railService.reorder(req.params.id, req.body.titleIds))),
};

// ---- Seasons ---------------------------------------------------------------
const seasons = {
  listForTitle: asyncHandler(async (req, res) => ok(res, await seasonService.listForTitle(req.params.titleId))),
  create: asyncHandler(async (req, res) => {
    const s = await seasonService.create(req.params.titleId, req.body);
    await audit.record(req.auth, "season.create", "Season", s.id);
    return created(res, s);
  }),
  update: asyncHandler(async (req, res) => ok(res, await seasonService.update(req.params.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await seasonService.remove(req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Episodes --------------------------------------------------------------
const episodes = {
  create: asyncHandler(async (req, res) => {
    const e = await episodeService.create(req.params.seasonId, req.body);
    await audit.record(req.auth, "episode.create", "Episode", e.id);
    return created(res, e);
  }),
  update: asyncHandler(async (req, res) => ok(res, await episodeService.update(req.params.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await episodeService.remove(req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Collections -----------------------------------------------------------
const collections = {
  list: asyncHandler(async (_req, res) => ok(res, await collectionService.list())),
  get: asyncHandler(async (req, res) => ok(res, await collectionService.getById(req.params.id))),
  create: asyncHandler(async (req, res) => {
    const c = await collectionService.create(req.body);
    await audit.record(req.auth, "collection.create", "Collection", c.id);
    return created(res, c);
  }),
  update: asyncHandler(async (req, res) => ok(res, await collectionService.update(req.params.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await collectionService.remove(req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Heroes ----------------------------------------------------------------
const heroes = {
  list: asyncHandler(async (_req, res) => ok(res, await heroService.list())),
  get: asyncHandler(async (req, res) => ok(res, await heroService.getById(req.params.id))),
  create: asyncHandler(async (req, res) => {
    const h = await heroService.create(req.body);
    await audit.record(req.auth, "hero.create", "Hero", h.id);
    return created(res, h);
  }),
  update: asyncHandler(async (req, res) => ok(res, await heroService.update(req.params.id, req.body))),
  remove: asyncHandler(async (req, res) => {
    await heroService.remove(req.params.id);
    return ok(res, null, "Deleted");
  }),
};

// ---- Settings --------------------------------------------------------------
const settings = {
  get: asyncHandler(async (_req, res) => ok(res, await settingsService.get())),
  update: asyncHandler(async (req, res) => {
    const s = await settingsService.update(req.body);
    await audit.record(req.auth, "settings.update", "SiteSettings", "1");
    return ok(res, s);
  }),
};

module.exports = { categories, titles, rails, seasons, episodes, collections, heroes, settings };
