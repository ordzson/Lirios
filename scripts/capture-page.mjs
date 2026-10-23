import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const [url, output, rawWidth = '1440', rawHeight = '900'] = process.argv.slice(2);
if (!url || !output) {
  throw new Error('Usage: node scripts/capture-page.mjs <url> <output> [width] [height]');
}

const width = Number(rawWidth);
const height = Number(rawHeight);
const port = 9300 + (process.pid % 300);
const browser = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  'about:blank',
]);

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let target;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, {
      method: 'PUT',
    });
    if (response.ok) {
      target = await response.json();
      break;
    }
  } catch {
    await wait(100);
  }
}

if (!target?.webSocketDebuggerUrl) {
  browser.kill('SIGTERM');
  throw new Error('Chrome DevTools did not become ready.');
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let commandId = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const entry = pending.get(message.id);
  if (entry) {
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  }
});

function send(method, params = {}) {
  commandId += 1;
  return new Promise((resolve, reject) => {
    pending.set(commandId, { resolve, reject });
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 600,
});
await send('Page.navigate', { url });
await wait(1500);
await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
const { contentSize } = await send('Page.getLayoutMetrics');
const capture = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  fromSurface: true,
  clip: {
    x: 0,
    y: 0,
    width: Math.max(width, Math.ceil(contentSize.width)),
    height: Math.max(height, Math.ceil(contentSize.height)),
    scale: 1,
  },
});

await writeFile(output, Buffer.from(capture.data, 'base64'));
socket.close();
browser.kill('SIGTERM');
