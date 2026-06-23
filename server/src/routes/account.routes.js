// Customer account API. All routes require an authenticated viewer.
const router = require("express").Router();
const c = require("../controllers/account.controller");
const validate = require("../middleware/validate.middleware");
const v = require("../validations/account.validation");
const { requireViewer } = require("../middleware/auth.middleware");

router.use(requireViewer);

router.patch("/profile", validate(v.updateProfile), c.updateProfile);
router.post("/change-password", validate(v.changePassword), c.changePassword);

router.get("/favourites", c.listFavourites);
router.post("/favourites", validate(v.favourite), c.addFavourite);
router.delete("/favourites/:titleId", validate(v.byTitleId), c.removeFavourite);

router.get("/continue-watching", c.continueWatching);
router.get("/history", c.watchHistory);
router.get("/progress", c.getProgress);
router.post("/progress", validate(v.progress), c.saveProgress);

router.get("/devices", c.listDevices);
router.post("/devices", validate(v.device), c.registerDevice);
router.delete("/devices/:id", validate(v.byId), c.removeDevice);

router.get("/notifications", c.listNotifications);
router.post("/notifications/:id/read", validate(v.byId), c.markNotificationRead);

module.exports = router;
