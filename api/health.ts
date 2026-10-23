import { json } from '../server/http.js';

export default {
  fetch(): Response {
    return json({
      ok: true,
      services: {
        supabase: Boolean(
          process.env['SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY'],
        ),
        r2: Boolean(
          process.env['R2_ACCOUNT_ID'] &&
            process.env['R2_ACCESS_KEY_ID'] &&
            process.env['R2_SECRET_ACCESS_KEY'] &&
            process.env['R2_BUCKET_NAME'] &&
            process.env['R2_PUBLIC_URL'],
        ),
      },
    });
  },
};
