// Stripe webhook receiver. Mounted with a RAW body parser in app.js so the
// signature can be verified against the unparsed payload.
const router = require("express").Router();
const subscriptionService = require("../services/subscription.service");
const { logger } = require("../utils/logger");

router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  try {
    const event = subscriptionService.constructEvent(req.body, signature);
    await subscriptionService.handleEvent(event);
    return res.json({ received: true });
  } catch (err) {
    // 503 when billing isn't configured; 400 for a bad/forged signature.
    const status = err.statusCode === 503 ? 503 : 400;
    logger.warn(`Stripe webhook rejected: ${err.message}`);
    return res.status(status).json({ success: false, message: err.message });
  }
});

module.exports = router;
