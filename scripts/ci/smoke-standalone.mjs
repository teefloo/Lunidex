import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const host = '127.0.0.1';
const startupTimeoutMs = 60_000;
const requestTimeoutMs = 2_000;

const port = await findAvailablePort(host);
const server = spawn('npm', ['run', 'start'], {
  detached: process.platform !== 'win32',
  env: { ...process.env, HOSTNAME: host, PORT: String(port) },
  stdio: 'inherit',
});

let spawnError;
server.once('error', (error) => {
  spawnError = error;
});

try {
  await waitForHealth(server, `http://${host}:${port}/api/healthz`);
  console.log('Standalone server health check passed.');
} finally {
  await stopServer(server);
}

async function findAvailablePort(address) {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, address, resolve);
  });

  const boundAddress = listener.address();
  if (!boundAddress || typeof boundAddress === 'string') {
    throw new Error('Could not determine an available localhost port.');
  }

  await new Promise((resolve, reject) => {
    listener.close((error) => (error ? reject(error) : resolve()));
  });
  return boundAddress.port;
}

async function waitForHealth(child, url) {
  const deadline = Date.now() + startupTimeoutMs;
  let lastFailure = 'server did not respond';

  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `npm run start exited before becoming healthy (code ${child.exitCode}, signal ${child.signalCode}).`,
      );
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'ok') return;
        lastFailure = `unexpected health response: ${JSON.stringify(payload)}`;
      } else {
        lastFailure = `health endpoint returned HTTP ${response.status}`;
      }
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Standalone server failed its health check: ${lastFailure}`);
}

async function stopServer(child) {
  if (child.pid === undefined) return;

  signalServer(child, 'SIGTERM');
  await waitForExit(child, 5_000);

  // npm may exit before its child; signal the whole process group to avoid an orphan.
  signalServer(child, 'SIGKILL');
  await waitForExit(child, 1_000);
}

function signalServer(child, signal) {
  try {
    if (process.platform === 'win32' || child.pid === undefined) {
      if (child.exitCode === null && child.signalCode === null) child.kill(signal);
      return;
    }
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const finish = (didExit) => {
      clearTimeout(timer);
      child.off('exit', onExit);
      child.off('error', onExit);
      resolve(didExit);
    };
    const onExit = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    child.once('exit', onExit);
    child.once('error', onExit);
  });
}
