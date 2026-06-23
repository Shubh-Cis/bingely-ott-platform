const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/ApiResponse");
const svc = require("../services/subscription.service");

const vid = (req) => req.auth.id;

module.exports = {
  // Public
  plans: asyncHandler(async (_req, res) => ok(res, svc.getPlans())),

  // Viewer
  mine: asyncHandler(async (req, res) => ok(res, await svc.getMySubscription(vid(req)))),
  payments: asyncHandler(async (req, res) => ok(res, await svc.listPayments(vid(req)))),
  // Step 1: ensure customer/price → { mode:"card", plan, priceId } (or "demo").
  checkout: asyncHandler(async (req, res) => ok(res, await svc.subscribe(vid(req), req.body.plan))),
  // Step 2: create the subscription with the tokenised card (PaymentMethod).
  confirm: asyncHandler(async (req, res) => ok(res, await svc.confirm(vid(req), req.body.plan, req.body.paymentMethodId), "Subscription active")),
  portal: asyncHandler(async (req, res) => ok(res, await svc.createPortalSession(vid(req)))),
  cancel: asyncHandler(async (req, res) => ok(res, await svc.cancel(vid(req)), "Subscription will cancel at period end")),
};
