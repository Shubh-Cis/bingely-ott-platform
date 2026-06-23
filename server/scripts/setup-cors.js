// One-time setup: apply a CORS policy to the S3 buckets so the browser can
// PUT (upload) and GET (stream) directly. Run once:  npm run setup:cors
//
// For production, replace the localhost origin with your real frontend origin.

const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");
const config = require("../src/config");

const s3 = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const ALLOWED_ORIGINS = [
  "http://localhost:5173", // Vite dev server
  // "https://your-production-domain.com",
];

const corsRules = {
  CORSRules: [
    {
      AllowedOrigins: ALLOWED_ORIGINS,
      AllowedMethods: ["PUT", "GET", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3000,
    },
  ],
};

async function applyCors(bucket) {
  if (!bucket) return console.log("⚠ Skipping — bucket name not set in .env");
  await s3.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsRules }));
  console.log(`✓ CORS applied to ${bucket}`);
}

(async () => {
  try {
    await applyCors(config.s3.rawBucket);
    await applyCors(config.s3.transcodedBucket);
    console.log("\nDone. The browser can now upload/stream directly to S3.");
  } catch (err) {
    console.error("✗ Failed to apply CORS:", err.name, "-", err.message);
    process.exit(1);
  }
})();
