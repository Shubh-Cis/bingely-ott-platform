const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/ApiResponse");
const svc = require("../services/analytics.service");

// Public: anonymous playback event ingestion from the player.
const recordEvent = asyncHandler(async (req, res) => {
  const ev = await svc.recordEvent(req.body);
  return created(res, { id: ev.id }, "Recorded");
});

// Admin: dashboard + charts.
const dashboard = asyncHandler(async (req, res) => ok(res, await svc.dashboard(Number(req.query.days) || 7)));
const mostWatched = asyncHandler(async (req, res) => ok(res, await svc.mostWatched(Number(req.query.limit) || 10)));
const watchTime = asyncHandler(async (req, res) => ok(res, await svc.watchTime(Number(req.query.days) || 30)));
const userGrowth = asyncHandler(async (req, res) => ok(res, await svc.userGrowth(Number(req.query.days) || 30)));
const revenue = asyncHandler(async (req, res) => ok(res, await svc.revenue(Number(req.query.months) || 12)));
const subscriptions = asyncHandler(async (_req, res) => ok(res, await svc.subscriptionBreakdown()));

module.exports = { recordEvent, dashboard, mostWatched, watchTime, userGrowth, revenue, subscriptions };
