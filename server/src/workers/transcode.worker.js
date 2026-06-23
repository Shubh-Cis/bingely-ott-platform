// ─────────────────────────────────────────────────────────────────────────
// TRANSCODE WORKER  —  run separately from the API:   npm run worker
//
// The API drops a job on SQS and replies to the user immediately. This worker,
// running on its own, picks the job up, does the slow ffmpeg ABR transcode, and
// writes the HLS output to the transcoded bucket — so the user never waits.
//
// Per job:
//   1. mark the Media row PROCESSING
//   2. download the raw .mp4 from the RAW bucket
//   3. ffmpeg → 360/480/720/1080p HLS ladder + master.m3u8
//   4. upload the whole HLS tree to "<videoId>/…" in the TRANSCODED bucket
//   5. mark Media READY (url/hlsUrl = CloudFront master), delete the raw object
//   6. delete the SQS message so it isn't processed twice
// On failure: mark Media FAILED (+ error), keep the raw + message for retry.
// ─────────────────────────────────────────────────────────────────────────
const fs = require("fs");
const os = require("os");
const path = require("path");
const config = require("../config");
const prisma = require("../config/prisma");
const { logger, createFlow } = require("../utils/logger");
const { downloadObject, uploadFile, deleteObject, objectExists } = require("../services/s3.service");
const { receiveJob, deleteJob } = require("../services/sqs.service");
const { transcodeToHls, listFilesRecursive } = require("./transcode");

function contentTypeFor(file) {
  if (file.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (file.endsWith(".ts")) return "video/mp2t";
  return "application/octet-stream";
}

function cdnMaster(videoId) {
  const key = `${videoId}/master.m3u8`;
  if (config.cloudfront.domain && !config.cloudfront.domain.includes("REPLACE_WITH")) {
    return `https://${config.cloudfront.domain}/${key}`;
  }
  return key; // stored as a relative key when no CDN is configured yet
}

// Update the Media row if this job carried a mediaId (jobs may be ad-hoc).
async function setMedia(mediaId, data) {
  if (!mediaId) return;
  try {
    await prisma.media.update({ where: { id: mediaId }, data });
  } catch (e) {
    logger.warn(`could not update Media ${mediaId}: ${e.message}`);
  }
}

async function processJob(job) {
  const { videoId, mediaId, sourceBucket, s3Key, destBucket } = job.body;
  const flow = createFlow("TRANSCODE");
  flow.step("Job received", { videoId, mediaId });

  // ── Drop UNRECOVERABLE jobs instead of retrying them forever ──────────────
  // 1) The Media row was deleted (e.g. a DB reset) → the job is orphaned.
  if (mediaId) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } }).catch(() => null);
    if (!media) {
      flow.warn("Media record no longer exists — dropping orphaned job");
      await deleteJob(job.receiptHandle);
      return;
    }
  }
  // 2) The raw source file isn't in S3 (already transcoded+deleted, or never
  //    uploaded) → nothing to transcode. Mark FAILED and drop the message.
  if (!(await objectExists(sourceBucket, s3Key))) {
    flow.warn(`Raw file missing in S3 (${s3Key}) — dropping job`);
    await setMedia(mediaId, { status: "FAILED", transcoding: false, error: "Raw source file not found in S3" });
    await deleteJob(job.receiptHandle);
    return;
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `transcode-${videoId}-`));
  const inputPath = path.join(workDir, "input.mp4");
  const outDir = path.join(workDir, "hls");
  fs.mkdirSync(outDir);

  try {
    await setMedia(mediaId, { status: "PROCESSING", transcoding: true, error: null });

    flow.step("Downloading raw video from S3");
    await downloadObject(sourceBucket, s3Key, inputPath);

    flow.step("Transcoding ABR ladder with ffmpeg (slow step)");
    await transcodeToHls(inputPath, outDir, () => {});

    const files = listFilesRecursive(outDir); // relative paths, incl. stream_*/...
    flow.step(`Uploading ${files.length} HLS files to ${destBucket}`);
    for (const rel of files) {
      await uploadFile(destBucket, `${videoId}/${rel}`, path.join(outDir, rel), contentTypeFor(rel));
    }

    const master = cdnMaster(videoId);
    await setMedia(mediaId, { status: "READY", transcoding: false, url: master, hlsUrl: master, error: null });

    flow.step("Deleting raw upload (no longer needed)");
    await deleteObject(sourceBucket, s3Key);

    await deleteJob(job.receiptHandle);
    flow.ok("Transcode complete", { master });
  } catch (err) {
    await setMedia(mediaId, { status: "FAILED", transcoding: false, error: String(err.message).slice(0, 480) });
    flow.fail(`Job failed (left on queue for retry): ${err.message}`);
    throw err; // message NOT deleted → SQS redelivers per the queue's redrive policy
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function main() {
  if (!config.sqs.queueUrl || config.sqs.queueUrl.includes("REPLACE_WITH")) {
    logger.error("Set SQS_QUEUE_URL in .env before running the worker.");
    process.exit(1);
  }
  await prisma.$connect();
  logger.info("Transcode worker started — waiting for jobs...");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let job = null;
    try {
      job = await receiveJob();
    } catch (err) {
      logger.error(`SQS receive failed: ${err.message}`);
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    if (!job) continue;
    try {
      await processJob(job);
    } catch {
      /* already logged + Media marked FAILED; loop continues */
    }
  }
}

if (require.main === module) main();

module.exports = { processJob, contentTypeFor, cdnMaster };
