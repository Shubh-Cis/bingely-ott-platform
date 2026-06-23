// Back-office API. Every route requires an authenticated admin/editor user.
const router = require("express").Router();
const c = require("../controllers/admin.controller");
const validate = require("../middleware/validate.middleware");
const v = require("../validations/catalog.validation");
const { requireAdmin } = require("../middleware/auth.middleware");
const um = require("../controllers/usermgmt.controller");
const umv = require("../validations/usermgmt.validation");

// All admin routes require a back-office user (ADMIN or EDITOR).
router.use(requireAdmin("ADMIN", "EDITOR"));

// Categories
router.get("/categories", c.categories.list);
router.post("/categories", validate(v.category.create), c.categories.create);
router.get("/categories/:id", validate(v.category.byId), c.categories.get);
router.patch("/categories/:id", validate(v.category.update), c.categories.update);
router.delete("/categories/:id", validate(v.category.byId), c.categories.remove);

// Languages
router.get("/languages", c.languages.list);
router.post("/languages", validate(v.language.create), c.languages.create);
router.get("/languages/:id", validate(v.language.byId), c.languages.get);
router.patch("/languages/:id", validate(v.language.update), c.languages.update);
router.delete("/languages/:id", validate(v.language.byId), c.languages.remove);

// Titles
router.get("/titles", c.titles.list);
router.post("/titles", validate(v.title.create), c.titles.create);
router.get("/titles/:id", validate(v.title.byId), c.titles.get);
router.patch("/titles/:id", validate(v.title.update), c.titles.update);
router.delete("/titles/:id", validate(v.title.byId), c.titles.remove);

// Seasons (nested under a title for creation/listing)
router.get("/titles/:titleId/seasons", c.seasons.listForTitle);
router.post("/titles/:titleId/seasons", validate(v.season.create), c.seasons.create);
router.patch("/seasons/:id", validate(v.season.update), c.seasons.update);
router.delete("/seasons/:id", validate(v.season.byId), c.seasons.remove);

// Episodes (nested under a season for creation)
router.post("/seasons/:seasonId/episodes", validate(v.episode.create), c.episodes.create);
router.patch("/episodes/:id", validate(v.episode.update), c.episodes.update);
router.delete("/episodes/:id", validate(v.episode.byId), c.episodes.remove);

// Rails + items
router.get("/rails", c.rails.list);
router.post("/rails", validate(v.rail.create), c.rails.create);
router.get("/rails/:id", validate(v.rail.byId), c.rails.get);
router.patch("/rails/:id", validate(v.rail.update), c.rails.update);
router.delete("/rails/:id", validate(v.rail.byId), c.rails.remove);
router.post("/rails/:id/items", validate(v.rail.addTitle), c.rails.addTitle);
router.delete("/rails/:id/items/:titleId", validate(v.rail.removeTitle), c.rails.removeTitle);
router.post("/rails/:id/reorder", validate(v.rail.reorder), c.rails.reorder);

// Collections
router.get("/collections", c.collections.list);
router.post("/collections", validate(v.collection.create), c.collections.create);
router.get("/collections/:id", validate(v.collection.byId), c.collections.get);
router.patch("/collections/:id", validate(v.collection.update), c.collections.update);
router.delete("/collections/:id", validate(v.collection.byId), c.collections.remove);

// Heroes
router.get("/heroes", c.heroes.list);
router.post("/heroes", validate(v.hero.create), c.heroes.create);
router.get("/heroes/:id", validate(v.hero.byId), c.heroes.get);
router.patch("/heroes/:id", validate(v.hero.update), c.heroes.update);
router.delete("/heroes/:id", validate(v.hero.byId), c.heroes.remove);

// Settings (single row)
router.get("/settings", c.settings.get);
router.patch("/settings", validate(v.settings.update), c.settings.update);

// Back-office user management (ADMIN role recommended; both roles allowed here)
router.get("/users", um.listUsers);
router.post("/users", validate(umv.createUser), um.createUser);
router.patch("/users/:id", validate(umv.updateUser), um.updateUser);
router.post("/users/:id/suspend", validate(umv.id), um.suspendUser);
router.post("/users/:id/activate", validate(umv.id), um.activateUser);
router.delete("/users/:id", validate(umv.id), um.deleteUser);

// Customer viewer management
router.get("/viewers", um.listViewers);
router.get("/viewers/:id", validate(umv.id), um.getViewer);
router.post("/viewers/:id/suspend", validate(umv.id), um.suspendViewer);
router.post("/viewers/:id/activate", validate(umv.id), um.activateViewer);

// Audit log feed
router.get("/audit-logs", um.auditLogs);

module.exports = router;
