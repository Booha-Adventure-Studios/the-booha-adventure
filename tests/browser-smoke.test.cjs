#!/usr/bin/env node
'use strict';

// A real browser smoke test for the four most important student surfaces.
// This intentionally uses Chrome's built-in DevTools Protocol instead of a
// third-party dependency: the repo is a static app and should not need a
// browser framework just to catch a boot-time exception or blank page.
const assert = require('assert');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(__dirname, 'serve-preview.cjs');
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const ROUTES = [
  { name: 'Hub', path: '/index.html', selector: '#hubScene' },
  { name: 'Maze', path: '/maze.html', selector: '#mazeScene' },
  { name: 'Karasuki', path: '/karasuki.html?from=maze', selector: '#karasuki-app' },
  { name: 'Adventure Log', path: '/profile.html', selector: '#profile-content' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  for (const command of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      return execFileSync('which', [command], { encoding: 'utf8' }).trim();
    } catch (_) {}
  }
  throw new Error('Chrome/Chromium not found; set CHROME_BIN to run the browser smoke test');
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function waitForLine(child, pattern, label, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let output = '';
    let timer;
    const finish = (error, value) => {
      clearTimeout(timer);
      child.stdout?.removeListener('data', onData);
      child.stderr?.removeListener('data', onData);
      child.removeListener('exit', onExit);
      if (error) reject(error);
      else resolve(value);
    };
    const onData = chunk => {
      output += String(chunk);
      const match = output.match(pattern);
      if (match) finish(null, match[1] || true);
    };
    const onExit = code => finish(new Error(`${label} exited with code ${code}\n${output}`));
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.once('exit', onExit);
    timer = setTimeout(() => finish(new Error(`Timed out waiting for ${label}\n${output}`)), timeoutMs);
  });
}

async function waitForJson(url, predicate, label, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const value = await fetch(url).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      });
      if (predicate(value)) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError.message}` : ''}`);
}

class CdpClient {
  constructor(webSocket) {
    this.webSocket = webSocket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    webSocket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  once(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      let timer;
      const listener = value => {
        clearTimeout(timer);
        const listeners = this.listeners.get(method) || [];
        this.listeners.set(method, listeners.filter(item => item !== listener));
        resolve(value);
      };
      this.on(method, listener);
      timer = setTimeout(() => reject(new Error(`Timed out waiting for CDP event ${method}`)), timeoutMs);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.webSocket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try { this.webSocket.close(); } catch (_) {}
  }
}

async function connectWebSocket(url) {
  const webSocket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    webSocket.addEventListener('open', resolve, { once: true });
    webSocket.addEventListener('error', reject, { once: true });
  });
  return new CdpClient(webSocket);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

async function waitForRoute(client, route, baseUrl) {
  const url = `${baseUrl}${route.path}`;
  const load = client.once('Page.loadEventFired', 15000).catch(() => null);
  await client.send('Page.navigate', { url });
  await load;

  const deadline = Date.now() + 8000;
  let state;
  while (Date.now() < deadline) {
    state = await evaluate(client, `(() => {
      const body = document.body;
      const target = document.querySelector(${JSON.stringify(route.selector)});
      const style = body ? getComputedStyle(body) : null;
      const rect = body ? body.getBoundingClientRect() : null;
      return {
        ready: document.readyState,
        tokenChecking: document.documentElement.classList.contains('token-checking'),
        target: !!target,
        children: body ? body.children.length : 0,
        text: body ? body.innerText.trim().slice(0, 120) : '',
        visible: !!body && !!style && style.visibility !== 'hidden' && style.display !== 'none'
          && !!rect && rect.width > 0 && rect.height > 0,
      };
    })()`);
    if (state.ready !== 'loading' && !state.tokenChecking && state.target && state.visible && state.children > 0) break;
    await sleep(100);
  }
  // Keep the listeners active after the first visible surface. Delayed boot
  // work includes Maze arrival timers and Karasuki's first popup scheduling.
  await sleep(2000);
  assert.ok(state, `${route.name}: browser returned no document state`);
  assert.strictEqual(state.tokenChecking, false, `${route.name}: token gate remained visible`);
  assert.strictEqual(state.target, true, `${route.name}: expected surface ${route.selector} was not mounted`);
  assert.strictEqual(state.visible, true, `${route.name}: document is blank or hidden`);
  assert.ok(state.children > 0, `${route.name}: body has no rendered children`);
  return state;
}

async function main() {
  const chromePath = findChrome();
  const serverPort = await freePort();
  const chromePort = await freePort();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'booha-browser-smoke-'));
  const server = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: { ...process.env, JUKU_PREVIEW_PORT: String(serverPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1280,900',
    'about:blank',
  ], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });

  let client;
  try {
    await waitForLine(server, /Booha preview:/, 'preview server');
    await waitForLine(chrome, /DevTools listening on (ws:\/\/[^\s]+)/, 'headless Chrome');
    const version = await waitForJson(
      `http://127.0.0.1:${chromePort}/json/version`,
      value => !!value.webSocketDebuggerUrl,
      'Chrome DevTools endpoint'
    );
    const page = await waitForJson(
      `http://127.0.0.1:${chromePort}/json/list`,
      list => list.some(item => item.type === 'page' && item.webSocketDebuggerUrl),
      'Chrome page target'
    );
    const pageTarget = page.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    client = await connectWebSocket(pageTarget.webSocketDebuggerUrl || version.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');

    const browserErrors = [];
    client.on('Runtime.consoleAPICalled', event => {
      if (event.type !== 'error') return;
      const message = (event.args || []).map(arg => arg.value ?? arg.description ?? '').join(' ');
      browserErrors.push(`console.error: ${message}`);
    });
    client.on('Runtime.exceptionThrown', event => {
      const description = event.exceptionDetails?.exception?.description
        || event.exceptionDetails?.text
        || 'uncaught exception';
      browserErrors.push(`uncaught exception: ${description}`);
    });
    client.on('Log.entryAdded', event => {
      if (event.entry?.level !== 'error') return;
      browserErrors.push(`browser log: ${event.entry.text || 'error'}`);
    });

    const baseUrl = `http://127.0.0.1:${serverPort}`;
    for (const route of ROUTES) {
      browserErrors.length = 0;
      const state = await waitForRoute(client, route, baseUrl);
      assert.deepStrictEqual(browserErrors, [], `${route.name}: browser errors\n${browserErrors.join('\n')}`);
      console.log(`Browser smoke passed: ${route.name} (${state.children} body children)`);
    }
    console.log('Browser smoke passed: hub, Maze, Karasuki, and Adventure Log rendered for preview-student with no console errors.');
  } finally {
    client?.close();
    await Promise.all([stopProcess(chrome), stopProcess(server)]);
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(`Browser smoke failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
