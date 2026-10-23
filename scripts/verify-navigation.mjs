import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Requires a running local site and Chrome. Uses the bundled catalogue, without backend requests.
// Usage: pnpm run verify:navigation http://127.0.0.1:4200
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4200';
const profile = await mkdtemp(join(tmpdir(), 'lirios-navigation-'));
const browser = spawn(
  process.env.CHROME_BIN ?? 'google-chrome',
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=0',
    'about:blank',
  ],
  { stdio: 'ignore' },
);
const exited = new Promise((resolve) => {
  browser.once('exit', resolve);
  browser.once('error', resolve);
});
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;

async function until(check, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await check()) return;
    await wait(100);
  }
  throw new Error(message);
}

try {
  let port;
  await until(async () => {
    try {
      port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      return Boolean(port);
    } catch {
      return false;
    }
  }, 'Chrome did not start. Set CHROME_BIN to the Chrome executable if needed.');
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {
      method: 'PUT',
    })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let commandId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++commandId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Chrome command timed out: ${method}`));
      }, 10000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const ready = (selector) =>
    until(
      () => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`),
      `Element did not appear: ${selector}`,
    );
  const click = async (selector) => {
    await ready(selector);
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  };
  const navigate = async (path, selector) => {
    await send('Page.navigate', { url: new URL(path, baseUrl).href });
    await ready(selector);
  };
  const locked = () => evaluate("getComputedStyle(document.body).overflowY === 'hidden'");
  const assertLock = async (expected) => {
    await until(
      async () => (await locked()) === expected,
      `Expected body scroll lock: ${expected}`,
    );
  };
  const swipe = async (x, y, dx, dy) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 12; step += 1) {
      await send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x + (dx * step) / 12, y: y + (dy * step) / 12 }],
      });
      await wait(17);
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(500);
  };
  const position = async (selector) => {
    await evaluate(
      `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'}); window.scrollBy(0, -80)`,
    );
    await wait(150);
  };
  const assertPageScroll = async (mobile) => {
    await evaluate('window.scrollTo(0, 0)');
    await wait(150);
    if (mobile) await swipe(190, 350, 0, -200);
    else {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: 700,
        y: 500,
        deltaX: 0,
        deltaY: 300,
      });
      await wait(500);
    }
    assert(await evaluate('window.scrollY > 50'), 'Page must scroll after closing a dialog');
  };

  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: "Object.defineProperty(window, '__LIRIOS_CONFIG__', {value: {}, writable: false});",
  });

  for (const { width, height, mobile } of [
    { width: 390, height: 844, mobile: true },
    { width: 768, height: 1024, mobile: true },
    { width: 1440, height: 900, mobile: false },
  ]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      mobile,
      deviceScaleFactor: 1,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
    await navigate('/personalizados', '.samples');

    if (mobile) {
      for (let index = 1; index <= 3; index += 1) {
        const gallery = `.choice:nth-of-type(${index + 2}) .samples`;
        await position(gallery);
        const before = await evaluate('scrollY');
        await swipe(190, 340, 4, -200);
        assert(
          await evaluate(`scrollY > ${before} + 50`),
          `Vertical swipe over gallery ${index} (${width}px)`,
        );
        await position(gallery);
        await swipe(width - 80, 220, -220, 0);
        assert(
          await evaluate(`document.querySelector(${JSON.stringify(gallery)}).scrollLeft > 50`),
          'Horizontal gallery swipe',
        );
        await position(gallery);
        const beforeDown = await evaluate('scrollY');
        await swipe(190, 180, -4, 200);
        assert(
          await evaluate(`scrollY < ${beforeDown} - 50`),
          'Reverse vertical swipe after horizontal swipe',
        );
      }
      await navigate('/', '.catalog-preview');
      await position('.catalog-preview');
      const before = await evaluate('scrollY');
      await swipe(190, 240, 0, -150);
      assert(
        await evaluate(`scrollY > ${before} + 50`),
        'Home gallery must allow vertical scrolling',
      );
    }

    await navigate('/catalogo', '.product-card');
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await click('.product-card');
      await ready('.product-dialog');
      await assertLock(true);
      if (mobile) {
        await wait(250);
        const remaining = await evaluate(
          "(() => { const dialog = document.querySelector('.product-dialog'); return dialog.scrollHeight - dialog.clientHeight; })()",
        );
        if (remaining > 1) {
          await swipe(190, 500, 0, -200);
          assert(
            await evaluate(
              `document.querySelector('.product-dialog').scrollTop >= ${Math.min(50, remaining / 2)}`,
            ),
            'Product dialog must scroll when its content exceeds the viewport',
          );
        }
      }
      if (cycle === 1) await evaluate('history.back()');
      else await click('.product-dialog__header button');
      await ready('.product-card');
      await assertLock(false);
      await assertPageScroll(mobile);
    }
    await click('.product-card');
    await ready('.product-dialog');
    await evaluate('window.__navigationBeforeReload = true');
    await send('Page.reload');
    await until(() => evaluate('!window.__navigationBeforeReload'), 'Product page did not reload');
    await ready('.product-dialog');
    await assertLock(true);
    await click('.product-dialog__brand');
    await ready('.home');
    await assertLock(false);
    await assertPageScroll(mobile);

    if (mobile) {
      await navigate('/personalizados', '.samples');
      await click('.menu-toggle');
      await click('.primary-nav a');
      await ready('.product-card');
      for (const exit of ['escape', 'apply', 'back']) {
        await click('.mobile-utility > button');
        await ready('.filter-sheet');
        await assertLock(true);
        if (exit === 'escape') {
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
        } else if (exit === 'apply') await click('.filter-apply');
        else {
          await evaluate('history.back()');
          await ready('.samples');
        }
        await assertLock(false);
        await assertPageScroll(true);
      }
    }
    console.log(
      `PASS ${width}×${height}: photo gestures, dialog scrolling, repeated close, Back, reload, navigation and filters`,
    );
  }
} finally {
  socket?.close();
  browser.kill('SIGTERM');
  await exited;
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
