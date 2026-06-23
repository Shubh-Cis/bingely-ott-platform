const router = require("express").Router();
const ctrl = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const v = require("../validations/auth.validation");
const { requireAuth } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

// Customer auth
router.post("/register", authLimiter, validate(v.register), ctrl.register);
router.post("/login", authLimiter, validate(v.login), ctrl.login);

// Back-office auth
router.post("/admin/login", authLimiter, validate(v.login), ctrl.adminLogin);

// Shared
router.post("/refresh", ctrl.refresh);
router.post("/logout", ctrl.logout);
router.get("/me", requireAuth, ctrl.me);

// Email verification + password reset
router.post("/verify-email", validate(v.verifyEmail), ctrl.verifyEmail);
router.post("/forgot-password", authLimiter, validate(v.forgotPassword), ctrl.forgotPassword);
router.post("/reset-password", authLimiter, validate(v.resetPassword), ctrl.resetPassword);

module.exports = router;
