import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireEnv } from '../../server/env.js';
import { errorResponse, json } from '../../server/http.js';
import { createR2Client, publicR2Url } from '../../server/r2.js';
import { requireStaff } from '../../server/supabase-admin.js';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadRequest {
  readonly fileName?: unknown;
  readonly contentType?: unknown;
  readonly size?: unknown;
  readonly productId?: unknown;
}

function safeSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' }, { status: 405, headers: { allow: 'POST' } });
    }

    try {
      await requireStaff(request);
      const body = (await request.json()) as UploadRequest;
      const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
      const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
      const size = typeof body.size === 'number' ? body.size : Number.NaN;
      const productId = typeof body.productId === 'string' ? safeSegment(body.productId) : '';

      if (!fileName || !productId || !ALLOWED_TYPES.has(contentType)) {
        return json({ error: 'Archivo o producto inválido.' }, { status: 400 });
      }

      if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE) {
        return json({ error: 'La imagen debe pesar menos de 10 MB.' }, { status: 400 });
      }

      const key = `products/${productId}/${crypto.randomUUID()}-${safeSegment(fileName)}`;
      const command = new PutObjectCommand({
        Bucket: requireEnv('R2_BUCKET_NAME'),
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      });
      const uploadUrl = await getSignedUrl(createR2Client(), command, { expiresIn: 300 });

      return json({
        uploadUrl,
        publicUrl: publicR2Url(key),
        key,
        expiresIn: 300,
      });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
