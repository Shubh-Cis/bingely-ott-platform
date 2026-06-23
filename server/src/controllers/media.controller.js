const asyncHandler = require("../utils/asyncHandler");
const { ok, created } = require("../utils/ApiResponse");
const mediaService = require("../services/media.service");
const audit = require("../services/audit.service");

// Admin: request a presigned upload URL (+ create the Media row).
const createUpload = asyncHandler(async (req, res) => {
  const result = await mediaService.createUpload(req.body);
  await audit.record(req.auth, "media.upload", "Media", result.media.id, { kind: result.media.kind });
  return created(res, result);
});

// Admin: confirm the direct-to-S3 upload finished → enqueue transcode (video).
const complete = asyncHandler(async (req, res) => {
  return ok(res, await mediaService.complete(req.params.id), "Upload completed");
});

// Admin: server-side image upload (multipart "file"). Avoids browser→S3 CORS.
const uploadImage = asyncHandler(async (req, res) => {
  const result = await mediaService.uploadImageBuffer(req.file);
  await audit.record(req.auth, "media.upload", "Media", result.id, { kind: "IMAGE" });
  return created(res, result);
});

const status = asyncHandler(async (req, res) => ok(res, await mediaService.status(req.params.id)));
const list = asyncHandler(async (req, res) => ok(res, await mediaService.list({ kind: req.query.kind, q: req.query.q })));
const remove = asyncHandler(async (req, res) => {
  const result = await mediaService.remove(req.params.id);
  await audit.record(req.auth, "media.delete", "Media", req.params.id, result);
  return ok(res, result, result.note || `Deleted (${result.deletedKeys} S3 object(s) removed)`);
});

// Public: resolve a playable HLS master URL for a finished video.
const playUrl = asyncHandler(async (req, res) => ok(res, await mediaService.playUrl(req.params.videoId)));

// Public: proxy HLS playlists/segments from S3 (no bucket CORS needed).
const streamHls = asyncHandler(async (req, res) => {
  const rel = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
  await mediaService.streamHls(req.params.videoId, rel, res);
});

module.exports = { createUpload, uploadImage, complete, status, list, remove, playUrl, streamHls };
