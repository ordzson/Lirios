// `pnpm run dev`: local API (scripts/dev-api.mjs on :4310) + `ng serve` (:4200,
// with proxy.conf.json sending /api to the API) in one terminal.
// Extra arguments go to `ng serve` (e.g. `pnpm run dev -- --port 4201`).
// If either process exits, the other is stopped too; Ctrl+C stops both.
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = (name) => join(root, 'node_modules', '.bin', name);
const isWindows = process.platform === 'win32';

// Same step as `prestart`: write public/config.js from .env.local.
const config = spawnSync(
  process.execPath,
  ['--env-file-if-exists=.env.local', 'scripts/write-runtime-config.mjs'],
  { cwd: root, stdio: 'inherit' },
);
if (config.status !== 0) process.exit(config.status ?? 1);

const children = [];
let stopping = false;

function prefixed(stream, label, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) target.write(`${label} ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) target.write(`${label} ${buffer}\n`);
  });
}

function start(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: !isWindows, // own process group, so stop() reaches grandchildren
    shell: isWindows,
  });
  prefixed(child.stdout, label, process.stdout);
  prefixed(child.stderr, label, process.stderr);
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`${label} exited (${signal ?? code}); stopping the rest.`);
      stop(code ?? 1);
    }
  });
  children.push(child);
}

function kill(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  try {
    if (isWindows) child.kill(signal);
    else process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) kill(child, 'SIGTERM');
  const force = setTimeout(() => {
    for (const child of children) kill(child, 'SIGKILL');
    process.exit(code);
  }, 5000);
  force.unref();
  Promise.all(
    children.map(
      (child) =>
        new Promise((done) => {
          if (child.exitCode !== null || child.signalCode !== null) done();
          else child.once('exit', done);
        }),
    ),
  ).then(() => process.exit(code));
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

start('[api]', bin('tsx'), ['watch', '--clear-screen=false', 'scripts/dev-api.mjs']);
start('[ng] ', bin('ng'), ['serve', ...process.argv.slice(2).filter((arg) => arg !== '--')]);
