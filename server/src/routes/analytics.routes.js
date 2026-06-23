// Analytics: public anonymous event ingestion + admin-only aggregate reads.
const router = require("express").Router();
const c = require("../controllers/analytics.controller");
const validate = require("../middleware/validate.middleware");
const v = require("../validations/analytics.validation");
const { requireAdmin } = require("../middleware/auth.middleware");

// Public ingestion from the player (no auth — anonymous sessionId).
router.post("/events", validate(v.event), c.recordEvent);

// Admin dashboard + charts.
router.get("/dashboard", requireAdmin("ADMIN", "EDITOR"), c.dashboard);
router.get("/most-watched", requireAdmin("ADMIN", "EDITOR"), c.mostWatched);
router.get("/watch-time", requireAdmin("ADMIN", "EDITOR"), c.watchTime);
router.get("/user-growth", requireAdmin("ADMIN", "EDITOR"), c.userGrowth);
router.get("/revenue", requireAdmin("ADMIN", "EDITOR"), c.revenue);
router.get("/subscriptions", requireAdmin("ADMIN", "EDITOR"), c.subscriptions);

module.exports = router;
