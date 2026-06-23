// Public, read-only catalog API for the customer app. No auth required.
const router = require("express").Router();
const ctrl = require("../controllers/catalog.controller");

router.get("/home", ctrl.home);
router.get("/search", ctrl.search);
router.get("/categories", ctrl.categories);
router.get("/collections", ctrl.collections);
router.get("/categories/:slug/titles", ctrl.byCategory);
router.get("/titles/:slug", ctrl.titleBySlug);
router.get("/titles/:id/related", ctrl.related);

module.exports = router;
