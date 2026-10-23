import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { requireEnv } from '../../server/env.js';
import { errorResponse, json } from '../../server/http.js';
import { createR2Client } from '../../server/r2.js';
import { requireStaff } from '../../server/supabase-admin.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return json({ error: 'Método no permitido.' }, { status: 405, headers: { allow: 'POST' } });
    }

    try {
      await requireStaff(request);
      const body = (await request.json()) as { key?: unknown };
      const key = typeof body.key === 'string' ? body.key.trim() : '';

      if (!/^products\/[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(key)) {
        return json({ error: 'La ruta de la imagen no es válida.' }, { status: 400 });
      }

      await createR2Client().send(
        new DeleteObjectCommand({ Bucket: requireEnv('R2_BUCKET_NAME'), Key: key }),
      );

      return json({ deleted: true });
    } catch (error) {
      return errorResponse(error);
    }
  },
};
