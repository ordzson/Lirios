import { S3Client } from '@aws-sdk/client-s3';
import { requireEnv } from './env.js';

export function createR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${requireEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

export function publicR2Url(key: string): string {
  return `${requireEnv('R2_PUBLIC_URL').replace(/\/$/, '')}/${key}`;
}
