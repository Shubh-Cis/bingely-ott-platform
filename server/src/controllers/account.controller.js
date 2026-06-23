const asyncHandler = require("../utils/asyncHandler");
const { ok } = require("../utils/ApiResponse");
const svc = require("../services/account.service");

const vid = (req) => req.auth.id;

module.exports = {
  updateProfile: asyncHandler(async (req, res) => ok(res, await svc.updateProfile(vid(req), req.body), "Profile updated")),
  changePassword: asyncHandler(async (req, res) => {
    await svc.changePassword(vid(req), req.body);
    return ok(res, null, "Password changed");
  }),

  listFavourites: asyncHandler(async (req, res) => ok(res, await svc.listFavourites(vid(req)))),
  addFavourite: asyncHandler(async (req, res) => ok(res, await svc.addFavourite(vid(req), req.body.titleId))),
  removeFavourite: asyncHandler(async (req, res) => ok(res, await svc.removeFavourite(vid(req), req.params.titleId))),

  saveProgress: asyncHandler(async (req, res) => ok(res, await svc.saveProgress(vid(req), req.body), "Progress saved")),
  getProgress: asyncHandler(async (req, res) => ok(res, await svc.getProgress(vid(req), { titleId: req.query.titleId, episodeId: req.query.episodeId }))),
  continueWatching: asyncHandler(async (req, res) => ok(res, await svc.continueWatching(vid(req)))),
  watchHistory: asyncHandler(async (req, res) => ok(res, await svc.watchHistory(vid(req)))),

  listDevices: asyncHandler(async (req, res) => ok(res, await svc.listDevices(vid(req)))),
  registerDevice: asyncHandler(async (req, res) => ok(res, await svc.registerDevice(vid(req), req.body))),
  removeDevice: asyncHandler(async (req, res) => ok(res, await svc.removeDevice(vid(req), req.params.id))),

  listNotifications: asyncHandler(async (req, res) => ok(res, await svc.listNotifications(vid(req)))),
  markNotificationRead: asyncHandler(async (req, res) => ok(res, await svc.markNotificationRead(vid(req), req.params.id))),
};
