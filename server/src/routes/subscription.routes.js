const router = require("express").Router();
const { z } = require("zod");
const c = require("../controllers/subscription.controller");
const validate = require("../middleware/validate.middleware");
const { requireViewer } = require("../middleware/auth.middleware");

// Public plan catalogue.
router.get("/plans", c.plans);

// Viewer-only billing actions.
router.use(requireViewer);
router.get("/me", c.mine);
router.get("/payments", c.payments);
router.post("/checkout", validate({ body: z.object({ plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]) }) }), c.checkout);
router.post("/confirm", validate({ body: z.object({ plan: z.enum(["BASIC", "STANDARD", "PREMIUM"]), paymentMethodId: z.string().min(1) }) }), c.confirm);
router.post("/portal", c.portal);
router.post("/cancel", c.cancel);

module.exports = router;
