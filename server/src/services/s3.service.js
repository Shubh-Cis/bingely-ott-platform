// S3 access — presigned URLs (so the browser uploads/streams directly), plus
// the download/upload helpers the transcode worker needs. The server never
// proxies video bytes.
//
// Ported from the original pipeline; now reads the central config.
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const { pipeline } = require("stream/promises");
const config = require("../config");

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  // SDK v3 (>=3.729) auto-adds a CRC32 checksum to PutObject, which bakes
  // `x-amz-checksum-crc32` into the presigned URL. The browser can't reproduce
  // it, so the PUT fails with a checksum mismatch. WHEN_REQUIRED stops it.
  requestChecksumCalculation: "WHEN_REQUIRED",
});

// Presigned PUT URL → frontend uploads the video directly to S3.
async function getPresignedUploadUrl(bucket, s3Key, contentType = "video/mp4") {
  const command = new PutObjectCommand({ Bucket: bucket, Key: s3Key, ContentType: contentType });
  return getSignedUrl(s3, command, { expiresIn: config.s3.presignedUrlExpiry });
}

// Presigned GET URL → frontend streams/downloads directly from S3.
async function getPresignedDownloadUrl(bucket, s3Key, expiry = 3600) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
  return getSignedUrl(s3, command, { expiresIn: expiry });
}

// HeadObject — does the object exist? (metadata only, no download)
async function objectExists(bucket, s3Key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: s3Key }));
    return true;
  } catch {
    return false;
  }
}

// Stream an S3 object to a local file (never buffers the whole video).
async function downloadObject(bucket, s3Key, destPath) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
  await pipeline(Body, fs.createWriteStream(destPath));
}

// Upload a single local file with an explicit content type.
async function uploadFile(bucket, s3Key, filePath, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: fs.createReadStream(filePath),
      ContentType: contentType,
    })
  );
}

// Fetch an object as a stream (used to proxy HLS playlists/segments through the
// API so the browser never talks to S3 directly — no bucket CORS needed).
async function getObjectStream(bucket, s3Key) {
  const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
  return { body: out.Body, contentType: out.ContentType, contentLength: out.ContentLength };
}

// Upload an in-memory buffer (used for server-side image uploads, which avoids
// needing browser→S3 CORS on the bucket).
async function uploadBuffer(bucket, s3Key, buffer, contentType) {
  await s3.send(
    new PutObjectCommand({ Bucket: bucket, Key: s3Key, Body: buffer, ContentType: contentType })
  );
}

// Delete an object (used to remove the raw upload after transcoding succeeds).
async function deleteObject(bucket, s3Key) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
}

// List every object key under a prefix (paginated). Needs s3:ListBucket.
async function listObjects(bucket, prefix) {
  const keys = [];
  let token;
  do {
    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    (out.Contents || []).forEach((o) => keys.push(o.Key));
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// Bulk-delete object keys (S3 allows up to 1000 per request).
async function deleteObjects(bucket, keys) {
  for (let i = 0; i < keys.length; i += 1000) {
    const Objects = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    if (Objects.length) await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects } }));
  }
}

module.exports = {
  s3,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  objectExists,
  downloadObject,
  uploadFile,
  uploadBuffer,
  getObjectStream,
  deleteObject,
  listObjects,
  deleteObjects,
};
