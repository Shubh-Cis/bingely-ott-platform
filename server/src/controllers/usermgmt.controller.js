const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/ApiResponse");
const svc = require("../services/usermgmt.service");
const audit = require("../services/audit.service");

module.exports = {
  // Back-office users
  listUsers: asyncHandler(async (_req, res) => ok(res, await svc.listUsers())),
  createUser: asyncHandler(async (req, res) => {
    const u = await svc.createUser(req.body);
    await audit.record(req.auth, "user.create", "User", u.id);
    return created(res, u);
  }),
  updateUser: asyncHandler(async (req, res) => {
    const u = await svc.updateUser(req.params.id, req.body);
    await audit.record(req.auth, "user.update", "User", u.id);
    return ok(res, u);
  }),
  suspendUser: asyncHandler(async (req, res) => {
    const u = await svc.setUserActive(req.params.id, false);
    await audit.record(req.auth, "user.suspend", "User", u.id);
    return ok(res, u);
  }),
  activateUser: asyncHandler(async (req, res) => {
    const u = await svc.setUserActive(req.params.id, true);
    await audit.record(req.auth, "user.activate", "User", u.id);
    return ok(res, u);
  }),
  deleteUser: asyncHandler(async (req, res) => {
    await svc.deleteUser(req.params.id, req.auth.id);
    await audit.record(req.auth, "user.delete", "User", req.params.id);
    return ok(res, null, "Deleted");
  }),

  // Customer viewers
  listViewers: asyncHandler(async (req, res) => {
    const { items, ...meta } = await svc.listViewers(req.query);
    return ok(res, items, "OK", meta);
  }),
  getViewer: asyncHandler(async (req, res) => ok(res, await svc.getViewer(req.params.id))),
  suspendViewer: asyncHandler(async (req, res) => {
    const v = await svc.setViewerActive(req.params.id, false);
    await audit.record(req.auth, "viewer.suspend", "Viewer", req.params.id);
    return ok(res, v);
  }),
  activateViewer: asyncHandler(async (req, res) => {
    const v = await svc.setViewerActive(req.params.id, true);
    await audit.record(req.auth, "viewer.activate", "Viewer", req.params.id);
    return ok(res, v);
  }),

  // Audit feed
  auditLogs: asyncHandler(async (req, res) => {
    const { items, ...meta } = await svc.auditLogs(req.query);
    return ok(res, items, "OK", meta);
  }),
};
