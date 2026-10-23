import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const config = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
};

const source = `window.__LIRIOS_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;
await writeFile(resolve('public/config.js'), source, { encoding: 'utf8', mode: 0o600 });
