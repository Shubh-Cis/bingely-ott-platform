// SQS access — the API enqueues transcode jobs; the worker long-polls + deletes.
// SQS is the shared to-do list that lets the slow FFmpeg work happen in a
// separate process at a separate time, so the upload request never blocks.
//
// Ported from the original pipeline; now reads the central config.
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const config = require("../config");

const sqs = new SQSClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

// Drop a "please transcode this video" job on the queue.
async function sendTranscodeJob({ videoId, s3Key, fileName, mediaId, kind = "movie" }) {
  if (!config.sqs.queueUrl) throw new Error("SQS_QUEUE_URL is not set in .env");

  const body = {
    videoId,
    mediaId, // DB Media row to update when done (may be undefined for ad-hoc jobs)
    kind, // "movie" | "trailer" | "episode"
    sourceBucket: config.s3.rawBucket,
    s3Key, // raw/<videoId>.mp4
    destBucket: config.s3.transcodedBucket,
    fileName,
  };

  const { MessageId } = await sqs.send(
    new SendMessageCommand({ QueueUrl: config.sqs.queueUrl, MessageBody: JSON.stringify(body) })
  );
  return MessageId;
}

// Long-poll for one job. Returns null if nothing arrived within the wait window.
async function receiveJob() {
  const { Messages } = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: config.sqs.queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20, // long poll up to 20s
      VisibilityTimeout: 900, // hide msg for 15 min while we transcode
    })
  );
  if (!Messages || Messages.length === 0) return null;
  const msg = Messages[0];
  return { receiptHandle: msg.ReceiptHandle, body: JSON.parse(msg.Body) };
}

// Delete a job once processed (so it isn't retried).
async function deleteJob(receiptHandle) {
  await sqs.send(
    new DeleteMessageCommand({ QueueUrl: config.sqs.queueUrl, ReceiptHandle: receiptHandle })
  );
}

module.exports = { sqs, sendTranscodeJob, receiveJob, deleteJob };
