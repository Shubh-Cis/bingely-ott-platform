// Media library + the upload/transcode entrypoints, DB-integrated.
//
// Video flow:
//   1. createUpload()  → makes a Media row (status QUEUED) + presigned PUT to the
//                        RAW bucket. Browser uploads bytes directly to S3.
//   2. complete()      → verifies the object landed, enqueues an SQS transcode
//                        job carrying { mediaId, videoId }. The worker then flips
//                        the row PROCESSING → READY/FAILED.
//   3. status()/playUrl() → poll + fetch the HLS master URL (via CloudFront).
//
// Image flow: uploaded straight to the transcoded (CDN) bucket and marked READY.
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const prisma = require("../config/prisma");
const config = require("../config");
const ApiError = require("../utils/ApiError");
const s3 = require("./s3.service");
const { sendTranscodeJob } = require("./sqs.service");
const { logger } = require("../utils/logger");

function cdnUrl(key) {
  if (config.cloudfront.domain && !config.cloudfront.domain.includes("REPLACE_WITH")) {
    return `https://${config.cloudfront.domain}/${key}`;
  }
  return null;
}

async function createUpload({ filename, kind, mimeType, size, alt }) {
  const ext = path.extname(filename).toLowerCase();

  if (kind === "VIDEO") {
    if (ext !== ".mp4") throw ApiError.badRequest("Only .mp4 video uploads are supported");
    const videoId = uuidv4();
    const s3Key = `raw/${videoId}.mp4`;
    const media = await prisma.media.create({
      data: {
        filename,
        url: "", // filled in once transcoding completes
        kind: "VIDEO",
        mimeType: mimeType || "video/mp4",
        size: size || 0,
        alt,
        videoId,
        status: "QUEUED",
        transcoding: false,
      },
    });
    const uploadUrl = await s3.getPresignedUploadUrl(config.s3.rawBucket, s3Key, "video/mp4");
    return { media, uploadUrl, s3Key, videoId };
  }

  // IMAGE → goes straight to the CDN bucket, no transcoding.
  const key = `images/${uuidv4()}${ext}`;
  // The URL the frontend will store/display: CloudFront if configured, else a
  // long-lived (7-day, the SigV4 max) presigned GET so it works in dev too.
  // <img> tags don't require bucket CORS, so this displays without extra setup.
  const viewUrl = cdnUrl(key) || (await s3.getPresignedDownloadUrl(config.s3.transcodedBucket, key, 604800));
  const media = await prisma.media.create({
    data: {
      filename,
      url: viewUrl,
      kind: "IMAGE",
      mimeType: mimeType || "application/octet-stream",
      size: size || 0,
      alt,
      status: "READY",
      transcoding: false,
    },
  });
  const uploadUrl = await s3.getPresignedUploadUrl(config.s3.transcodedBucket, key, media.mimeType);
  return { media, uploadUrl, s3Key: key, videoId: null, viewUrl };
}

// Server-side image upload: the browser POSTs the file to our API, and the
// server uploads it to S3. This avoids needing browser→S3 (bucket) CORS for
// images entirely. Returns the viewable URL.
async function uploadImageBuffer(file) {
  if (!file) throw ApiError.badRequest("No image file provided");
  const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
  const key = `images/${uuidv4()}${ext}`;
  await s3.uploadBuffer(config.s3.transcodedBucket, key, file.buffer, file.mimetype || "application/octet-stream");
  const url = cdnUrl(key) || (await s3.getPresignedDownloadUrl(config.s3.transcodedBucket, key, 604800));
  const media = await prisma.media.create({
    data: {
      filename: file.originalname || "image",
      url,
      kind: "IMAGE",
      mimeType: file.mimetype || "application/octet-stream",
      size: file.size || file.buffer.length,
      status: "READY",
      transcoding: false,
    },
  });
  return { id: media.id, url };
}

async function getById(id) {
  const m = await prisma.media.findUnique({ where: { id } });
  if (!m) throw ApiError.notFound("Media not found");
  return m;
}

// Called after the browser finishes the direct-to-S3 PUT.
async function complete(id) {
  const media = await getById(id);

  if (media.kind === "IMAGE") {
    // Verify it actually landed in the CDN bucket.
    const key = media.url ? media.url.split("/").slice(3).join("/") : null;
    if (key) {
      const exists = await s3.objectExists(config.s3.transcodedBucket, key);
      if (!exists) throw ApiError.notFound("Uploaded image not found in S3");
    }
    return media;
  }

  // VIDEO — verify raw object, then enqueue transcode.
  const s3Key = `raw/${media.videoId}.mp4`;
  const exists = await s3.objectExists(config.s3.rawBucket, s3Key);
  if (!exists) throw ApiError.notFound("Uploaded video not found in S3 — upload may have failed");

  const messageId = await sendTranscodeJob({
    videoId: media.videoId,
    mediaId: media.id,
    s3Key,
    fileName: media.filename,
    kind: "movie",
  });
  return { ...media, queued: true, messageId };
}

async function status(id) {
  const m = await getById(id);
  return { id: m.id, videoId: m.videoId, kind: m.kind, status: m.status, transcoding: m.transcoding, hlsUrl: m.hlsUrl, error: m.error };
}

async function list({ kind, q } = {}) {
  return prisma.media.findMany({
    where: {
      ...(kind ? { kind } : {}),
      ...(q ? { filename: { contains: String(q), mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// Delete a media item AND its S3 objects (transcoded HLS files / raw mp4 /
// uploaded image). Best-effort on S3 — the DB row is always removed.
async function remove(id) {
  const media = await getById(id);
  const result = { deletedKeys: 0, note: null };

  try {
    if (media.kind === "VIDEO" && media.videoId) {
      // All transcoded HLS files live under "<videoId>/" in the CDN bucket.
      let keys = [];
      try {
        keys = await s3.listObjects(config.s3.transcodedBucket, `${media.videoId}/`);
      } catch (e) {
        logger.warn(`Could not list transcoded files for ${media.videoId} (needs s3:ListBucket): ${e.name}`);
        result.note = "Could not list S3 objects (IAM lacks s3:ListBucket) — deleted known playlists only; some .ts segments may remain.";
        // Fallback: delete the playlists we know the names of.
        keys = ["master.m3u8", "stream_0/playlist.m3u8", "stream_1/playlist.m3u8", "stream_2/playlist.m3u8", "stream_3/playlist.m3u8"].map((f) => `${media.videoId}/${f}`);
      }
      if (keys.length) {
        await s3.deleteObjects(config.s3.transcodedBucket, keys).catch((e) => logger.warn(`deleteObjects failed: ${e.message}`));
        result.deletedKeys = keys.length;
      }
      // Remove the raw upload too if it's still around.
      await s3.deleteObject(config.s3.rawBucket, `raw/${media.videoId}.mp4`).catch(() => {});
    } else if (media.kind === "IMAGE" && media.url) {
      // url: https://<host>/images/<uuid>.<ext>?... → key: images/<uuid>.<ext>
      const key = media.url.split("/").slice(3).join("/").split("?")[0];
      if (key) {
        await s3.deleteObject(config.s3.transcodedBucket, key).catch((e) => logger.warn(`image delete failed: ${e.message}`));
        result.deletedKeys = 1;
      }
    }
  } catch (e) {
    logger.warn(`S3 cleanup for media ${id} failed: ${e.message}`);
    result.note = result.note || `S3 cleanup partial: ${e.message}`;
  }

  await prisma.media.delete({ where: { id } });
  return result;
}

// Build a playable HLS master URL for a finished video.
//   • CloudFront configured → the CDN URL (best for production).
//   • Otherwise → an API proxy URL (GET /api/media/hls/<videoId>/master.m3u8).
//     The API streams the playlists + segments from S3, so the browser never
//     talks to S3 directly and NO transcoded-bucket CORS is required.
async function playUrl(videoId) {
  const media = await prisma.media.findUnique({ where: { videoId } });
  if (!media) throw ApiError.notFound("Video not found");
  if (media.status !== "READY") throw ApiError.badRequest(`Video is not ready (status: ${media.status})`);

  const key = `${videoId}/master.m3u8`;
  const url = cdnUrl(key) || `${config.publicApiUrl}/api/media/hls/${videoId}/master.m3u8`;
  return { videoId, url, hlsUrl: media.hlsUrl || url };
}

// Stream an HLS file (playlist or segment) for a video from the transcoded
// bucket. `relPath` is e.g. "master.m3u8" or "stream_0/segment_003.ts".
async function streamHls(videoId, relPath, res) {
  // Guard against path traversal.
  const safe = String(relPath).replace(/\.\.+/g, "").replace(/^\/+/, "");
  const key = `${videoId}/${safe}`;
  const { body, contentType, contentLength } = await s3.getObjectStream(config.s3.transcodedBucket, key);
  res.setHeader("Content-Type", contentType || (key.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t"));
  if (contentLength != null) res.setHeader("Content-Length", contentLength);
  res.setHeader("Cache-Control", key.endsWith(".m3u8") ? "no-cache" : "public, max-age=31536000");
  body.pipe(res);
}

module.exports = { createUpload, uploadImageBuffer, getById, complete, status, list, remove, playUrl, streamHls, cdnUrl };
