// `pnpm run verify:flows` — flujos de punta a punta con Chrome real (PLAN.md §9.6, §4.3).
// Dueño: T (paso 0-T). Prueba del catálogo: nadie más la edita (§7.2 regla 11).
//
// Necesita el entorno local arriba: `pnpm run stack:up` (Supabase 55321 + S3 58333) y
// `pnpm run dev` (app en :4200 con proxy /api → :4310).
//
// Uso: node scripts/verify-flows.mjs [--only F1,F7] [--base-url http://127.0.0.1:4200]
//   Variables: CHROME_BIN (ejecutable de Chrome; si falta se busca google-chrome,
//   google-chrome-stable, chromium, chromium-browser en PATH), FLOWS_BASE_URL,
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY / SUPABASE_PUBLISHABLE_KEY (de process.env o
//   de .env.local; lo de process.env manda).
//
// Qué hace
//   1. Comprueba que la pila responde: GET <app>/ (200 con <app-root>), GET <app>/api/health
//      por el proxy (200, ok: true) y la API de Supabase (cualquier respuesta < 500).
//   2. Abre Chrome headless (--no-sandbox: AppArmor de Ubuntu 24.04 en CI).
//   3. Por cada viewport de §9.6 (390×844 y 768×1024 táctiles, 1440×900 con ratón):
//      corre `pnpm run db:reset` (los flujos cambian datos: «la existencia baja a 90» debe
//      valer en las tres pasadas), espera a que la API de Supabase vuelva, comprueba que la
//      tienda pinta `/` en ese viewport sin excepciones, y corre cada flujo del registro en
//      un contexto de navegador nuevo (almacenamiento limpio).
//   Con el registro vacío (Oleada 0) hace igual los pasos 1–3 y sale con 0: así la
//   infraestructura (pila, Chrome, db:reset, viewports) ya queda probada en local y en CI.
//
// Registro de flujos
//   Cada flujo es un archivo `scripts/verify-flow-<id>.mjs` (p. ej. verify-flow-f7.mjs, lo
//   escribe T en el paso 0 de su paquete; entra en el patrón `scripts/verify-*.mjs` de T).
//   Se descubren solos, en orden de nombre. Forma:
//     export default {
//       id: 'F7', owner: 'A2', title: 'Muestrario: hoja y confirmación devuelven el foco',
//       viewports: ['390x844', '1440x900'],   // opcional; por defecto los tres
//       async run(page, ctx) { await page.goto('/admin/_kit'); ... }
//     };
//   `page`: goto(path, selector?), waitFor(selector | expresión, mensaje?), evaluate(expr),
//   exists(selector), text(selector), click(selector) (ratón o toque real en el centro),
//   type(texto), press('Escape' | 'Enter' | 'Tab' | …), focused() (descripción del elemento
//   activo), screenshot(ruta), send(método CDP, params), errors (excepciones de la página).
//   `ctx`: { viewport: { name, width, height, mobile }, baseUrl, env, assert, wait, until,
//   supabase(path, init) → fetch a la API de Supabase con la llave de servicio }.
//   Un flujo falla lanzando un error (p. ej. con `ctx.assert`).
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, mobile: true },
  { name: '768x1024', width: 768, height: 1024, mobile: true },
  { name: '1440x900', width: 1440, height: 900, mobile: false },
];
const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

// ---------- entorno ----------
const fileEnv = {};
const envFile = join(root, '.env.local');
if (existsSync(envFile)) {
  for (const line of (await readFile(envFile, 'utf8')).split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !line.trimStart().startsWith('#'))
      fileEnv[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const env = {
  ...fileEnv,
  ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')),
};
const baseUrl = (argValue('--base-url') ?? env.FLOWS_BASE_URL ?? 'http://127.0.0.1:4200').replace(
  /\/$/,
  '',
);
const supabaseUrl = (env.SUPABASE_URL || 'http://127.0.0.1:55321').replace(/\/$/, '');
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '';
const only = (argValue('--only') ?? '')
  .split(',')
  .map((id) => id.trim().toUpperCase())
  .filter(Boolean);

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(check, message, timeout = 10000, interval = 100) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      if (await check()) return;
    } catch (error) {
      last = error;
    }
    await wait(interval);
  }
  throw new Error(`${message}${last ? ` (${last.message})` : ''}`);
}
const supabase = (path, init = {}) =>
  fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      ...(supabaseKey ? { Authorization: `Bearer ${supabaseKey}` } : {}),
      ...init.headers,
    },
  });

// ---------- registro ----------
const flowFiles = readdirSync(join(root, 'scripts'))
  .filter((name) => /^verify-flow-[a-z0-9-]+\.mjs$/.test(name))
  .sort();
const flows = [];
for (const name of flowFiles) {
  const flow = (await import(pathToFileURL(join(root, 'scripts', name)).href)).default;
  assert(
    flow && typeof flow.id === 'string' && typeof flow.run === 'function',
    `${name}: export default { id, owner, title, run }`,
  );
  for (const viewport of flow.viewports ?? []) {
    assert(
      VIEWPORTS.some((entry) => entry.name === viewport),
      `${name}: viewport desconocido ${viewport}`,
    );
  }
  flows.push({ ...flow, file: name });
}
const selected = only.length ? flows.filter((flow) => only.includes(flow.id.toUpperCase())) : flows;
if (only.length) {
  const missing = only.filter((id) => !flows.some((flow) => flow.id.toUpperCase() === id));
  if (missing.length) {
    console.error(
      `verify:flows FALLA: no hay flujo ${missing.join(', ')} en scripts/verify-flow-*.mjs`,
    );
    process.exit(1);
  }
}

// ---------- 1. pila ----------
async function checkStack() {
  const problems = [];
  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    if (!response.ok || !html.includes('<app-root'))
      problems.push(`${baseUrl}/ respondió ${response.status} sin <app-root>`);
  } catch (error) {
    problems.push(
      `${baseUrl}/ no responde (${error.cause?.code ?? error.message}); ¿corre \`pnpm run dev\`?`,
    );
  }
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = response.ok ? await response.json() : null;
    if (!body?.ok)
      problems.push(
        `${baseUrl}/api/health respondió ${response.status}; ¿corre el API local (:4310) detrás del proxy?`,
      );
  } catch (error) {
    problems.push(`${baseUrl}/api/health no responde (${error.cause?.code ?? error.message})`);
  }
  try {
    const response = await supabase('/rest/v1/');
    if (response.status >= 500)
      problems.push(`Supabase ${supabaseUrl} respondió ${response.status}`);
  } catch (error) {
    problems.push(
      `Supabase ${supabaseUrl} no responde (${error.cause?.code ?? error.message}); ¿corre \`pnpm run stack:up\`?`,
    );
  }
  return problems;
}

// ---------- db:reset ----------
function dbReset() {
  return new Promise((done, reject) => {
    const child = spawn('pnpm', ['run', 'db:reset'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    const timer = setTimeout(() => child.kill('SIGTERM'), 5 * 60 * 1000);
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) done();
      else reject(new Error(`pnpm run db:reset salió con ${signal ?? code}:\n${output.trim()}`));
    });
  });
}
async function waitForSupabase() {
  await until(
    async () => {
      const response = await supabase('/rest/v1/');
      return response.status < 500;
    },
    `Supabase ${supabaseUrl} no volvió después de db:reset`,
    60000,
    500,
  );
}

// ---------- Chrome ----------
function findChrome() {
  if (env.CHROME_BIN) return env.CHROME_BIN;
  const candidates =
    process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].flatMap((name) =>
          (process.env.PATH ?? '').split(delimiter).map((dir) => join(dir, name)),
        );
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // siguiente
    }
  }
  return 'google-chrome';
}

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        clearTimeout(entry.timeout);
        if (message.error) entry.reject(new Error(`${entry.method}: ${message.error.message}`));
        else entry.resolve(message.result);
      } else for (const listener of this.listeners) listener(message);
    });
  }
  send(method, params = {}, sessionId) {
    return new Promise((done, reject) => {
      const id = ++this.id;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome no respondió a ${method}`));
      }, 30000);
      this.pending.set(id, { resolve: done, reject, timeout, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

const KEYS = {
  Escape: { code: 'Escape', windowsVirtualKeyCode: 27 },
  Enter: { code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
  Tab: { code: 'Tab', windowsVirtualKeyCode: 9 },
  Backspace: { code: 'Backspace', windowsVirtualKeyCode: 8 },
  ArrowUp: { code: 'ArrowUp', windowsVirtualKeyCode: 38 },
  ArrowDown: { code: 'ArrowDown', windowsVirtualKeyCode: 40 },
  ArrowLeft: { code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
  ArrowRight: { code: 'ArrowRight', windowsVirtualKeyCode: 39 },
  Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' },
};

async function openPage(cdp, viewport) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext', {
    disposeOnDetach: true,
  });
  const { targetId } = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    browserContextId,
  });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const errors = [];
  const listener = (message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      errors.push(details.exception?.description ?? details.text);
    }
  };
  cdp.listeners.add(listener);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    mobile: viewport.mobile,
    deviceScaleFactor: 1,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile });
  await send('Emulation.setTimezoneOverride', { timezoneId: 'America/Guatemala' });
  await send('Emulation.setLocaleOverride', { locale: 'es-GT' });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
      );
    return result.result.value;
  };
  const query = (selector) => `document.querySelector(${JSON.stringify(selector)})`;
  const isSelector = (value) => !/^\s*(\(|!|document\b|window\b|return\b)/.test(value);
  const page = {
    errors,
    send,
    evaluate,
    async waitFor(target, message, timeout = 10000) {
      const expression = isSelector(target) ? `Boolean(${query(target)})` : target;
      await until(() => evaluate(expression), message ?? `No apareció: ${target}`, timeout);
    },
    async goto(path, selector) {
      await send('Page.navigate', { url: new URL(path, `${baseUrl}/`).href });
      await until(() => evaluate("document.readyState === 'complete'"), `No cargó ${path}`, 30000);
      if (selector) await page.waitFor(selector);
    },
    exists: (selector) => evaluate(`Boolean(${query(selector)})`),
    text: (selector) => evaluate(`${query(selector)}?.textContent.trim() ?? null`),
    focused: () =>
      evaluate(
        "(() => { const el = document.activeElement; if (!el || el === document.body) return 'body'; return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.getAttribute('data-testid') ? `[data-testid=${el.getAttribute('data-testid')}]` : '') + ' ' + (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 60); })()",
      ),
    async click(selector) {
      await page.waitFor(selector);
      const box = await evaluate(
        `(() => { const el = ${query(selector)}; el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
      );
      if (viewport.mobile) {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [box] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...box });
        await send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...box,
          button: 'left',
          clickCount: 1,
        });
        await send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...box,
          button: 'left',
          clickCount: 1,
        });
      }
    },
    type: (text) => send('Input.insertText', { text }),
    async press(key) {
      const info = KEYS[key] ?? {
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        text: key.length === 1 ? key : undefined,
      };
      const base = {
        key: info.key ?? key,
        code: info.code,
        windowsVirtualKeyCode: info.windowsVirtualKeyCode,
      };
      await send('Input.dispatchKeyEvent', {
        type: info.text ? 'keyDown' : 'rawKeyDown',
        ...base,
        ...(info.text ? { text: info.text } : {}),
      });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    async screenshot(path) {
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(path, Buffer.from(data, 'base64'));
    },
    async close() {
      cdp.listeners.delete(listener);
      await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
      await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    },
  };
  return page;
}

// ---------- principal ----------
const started = Date.now();
const problems = await checkStack();
if (problems.length) {
  console.error('verify:flows FALLA: la pila local no está arriba (PLAN.md §4.3):');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`pila OK: app ${baseUrl}, /api/health por el proxy, Supabase ${supabaseUrl}`);
console.log(
  selected.length
    ? `flujos: ${selected.map((flow) => `${flow.id} (${flow.owner ?? '?'})`).join(', ')}`
    : 'registro de flujos vacío (scripts/verify-flow-*.mjs): se prueba solo la infraestructura',
);

const chrome = findChrome();
const profile = await mkdtemp(join(tmpdir(), 'lirios-flows-'));
const browser = spawn(
  chrome,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--hide-scrollbars',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const exited = new Promise((done) => {
  browser.once('exit', done);
  browser.once('error', done);
});
let socket;
const failures = [];
let passed = 0;

try {
  let port;
  await until(
    async () => {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      return Boolean(port);
    },
    `Chrome no arrancó (${chrome}). Define CHROME_BIN con la ruta del ejecutable.`,
    20000,
  );
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((done, reject) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', () => reject(new Error('No se pudo conectar a Chrome')), {
      once: true,
    });
  });
  const cdp = new Cdp(socket);
  console.log(`Chrome OK: ${version.Browser} (${chrome})`);

  for (const viewport of VIEWPORTS) {
    const label = `${viewport.width}×${viewport.height}`;
    const resetStart = Date.now();
    await dbReset();
    await waitForSupabase();
    console.log(`${label}: db:reset OK (${((Date.now() - resetStart) / 1000).toFixed(1)} s)`);

    const smoke = await openPage(cdp, viewport);
    try {
      await smoke.goto('/', 'app-root *');
      await wait(300);
      assert.deepEqual(smoke.errors, [], `excepciones en / a ${label}`);
      console.log(`PASS ${label} base: la tienda pinta / sin excepciones`);
      passed += 1;
    } catch (error) {
      failures.push(`${label} base: ${error.message}`);
      console.error(`FAIL ${label} base: ${error.message}`);
    } finally {
      await smoke.close();
    }

    for (const flow of selected) {
      if (flow.viewports && !flow.viewports.includes(viewport.name)) continue;
      const page = await openPage(cdp, viewport);
      const flowStart = Date.now();
      try {
        await flow.run(page, { viewport, baseUrl, env, assert, wait, until, supabase });
        console.log(
          `PASS ${label} ${flow.id}: ${flow.title ?? flow.file} (${((Date.now() - flowStart) / 1000).toFixed(1)} s)`,
        );
        passed += 1;
      } catch (error) {
        const shot = join(tmpdir(), `lirios-flow-${flow.id}-${viewport.name}.png`);
        await page.screenshot(shot).catch(() => {});
        failures.push(`${label} ${flow.id}: ${error.message} (captura: ${shot})`);
        console.error(`FAIL ${label} ${flow.id}: ${error.message}\n  captura: ${shot}`);
      } finally {
        await page.close();
      }
    }
  }
} catch (error) {
  failures.push(error.message);
  console.error(`verify:flows FALLA: ${error.message}`);
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (failures.length) {
  console.error(
    `verify:flows FALLA: ${failures.length} fallo(s), ${passed} en verde (${seconds} s).`,
  );
  process.exit(1);
}
console.log(
  `verify:flows OK: ${passed} comprobación(es) en ${VIEWPORTS.length} viewports, ${selected.length} flujo(s) (${seconds} s).`,
);
