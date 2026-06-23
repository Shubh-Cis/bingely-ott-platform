// Rate limiters. The auth limiter protects login/register/reset from brute force.
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't throttle HLS streaming — a single playback makes many segment requests.
  skip: (req) => req.path.includes("/media/hls/"),
});

module.exports = { authLimiter, apiLimiter };
