import { writeFile } from 'node:fs/promises';

const [pageUrl, outputPath, widthValue, heightValue, mode] = process.argv.slice(2);
const width = Number(widthValue);
const height = Number(heightValue);

if (!pageUrl || !outputPath || !width || !height) {
  throw new Error('Usage: capture.mjs <url> <output> <width> <height>');
}

const target = await fetch(
  `http://127.0.0.1:9222/json/new?${encodeURIComponent(pageUrl)}`,
  { method: 'PUT' }
).then((response) => response.json());

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const events = new Map();

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);

  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }

  const resolveEvent = events.get(message.method);
  if (resolveEvent) {
    events.delete(message.method);
    resolveEvent(message.params);
  }
});

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

const waitForEvent = (method) => new Promise((resolve) => events.set(method, resolve));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
  screenWidth: width,
  screenHeight: height
});

const loaded = waitForEvent('Page.loadEventFired');
await send('Page.navigate', { url: pageUrl });
await loaded;
await send('Runtime.evaluate', {
  // Fonts, then let the opening choreography (~1.7s) settle before capturing.
  expression: 'document.fonts.ready.then(() => new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 2200)))',
  awaitPromise: true
});

// Optional page state before capture, e.g. CAPTURE_EVAL="document.querySelector('.menu-toggle').click()".
if (process.env.CAPTURE_EVAL) {
  await send('Runtime.evaluate', {
    expression: `Promise.resolve(${process.env.CAPTURE_EVAL}).then(() => new Promise(resolve => setTimeout(resolve, 500)))`,
    awaitPromise: true
  });
}

const captureOptions = {
  format: 'png',
  fromSurface: true,
  captureBeyondViewport: mode === '--full'
};

if (mode === '--full') {
  const metrics = await send('Page.getLayoutMetrics');
  captureOptions.clip = {
    x: 0,
    y: 0,
    width,
    height: Math.ceil(metrics.cssContentSize.height),
    scale: 1
  };
}

const screenshot = await send('Page.captureScreenshot', captureOptions);

await writeFile(outputPath, Buffer.from(screenshot.data, 'base64'));
socket.close();
