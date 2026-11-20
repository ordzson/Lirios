// Creates the local development bucket in SeaweedFS (docker-compose.dev.yml).
// Idempotent: safe to run on every `pnpm run stack:up`.
import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const endpoint = process.env.R2_ENDPOINT ?? 'http://127.0.0.1:58333';
const bucket = process.env.R2_BUCKET_NAME ?? 'lirios-dev';

const client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? 'lirios-dev-access',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? 'lirios-dev-secret',
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function waitForS3(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await client.send(new ListBucketsCommand({}));
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`S3 at ${endpoint} did not answer in time: ${lastError?.message ?? lastError}`);
}

async function bucketExists() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false;
    throw error;
  }
}

await waitForS3();
if (await bucketExists()) {
  console.log(`S3 bucket "${bucket}" already exists at ${endpoint}`);
} else {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created S3 bucket "${bucket}" at ${endpoint}`);
}
