// API route aggregator — everything is mounted under /api in app.js.
// Slices are added here as they're built (catalog, media, subscriptions, ...).
const router = require("express").Router();
const { apiLimiter } = require("../middleware/rateLimit.middleware");

router.use(apiLimiter);

router.use("/auth", require("./auth.routes"));
router.use("/catalog", require("./catalog.routes")); // public reads
router.use("/admin", require("./admin.routes")); // back-office CRUD (auth required)
router.use("/media", require("./media.routes")); // upload/transcode pipeline
router.use("/account", require("./account.routes")); // viewer profile/favourites/history/devices
router.use("/analytics", require("./analytics.routes")); // public ingest + admin reads
router.use("/subscriptions", require("./subscription.routes")); // Stripe billing

module.exports = router;
