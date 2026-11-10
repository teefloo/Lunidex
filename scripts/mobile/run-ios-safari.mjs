import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { get as httpsGet } from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { appiumBin, chooseDevice, getDeviceRecords, getPrivateIpv4Address, mobileArtifactsDir, nextBin, projectRoot, run, withAppiumEnvironment } from './constants.mjs';

const appiumPort = Number(process.env.APPIUM_PORT ?? 4723);
const appPort = Number(process.env.MOBILE_WEB_PORT ?? 3100);
const appiumBase = `http://127.0.0.1:${appiumPort}`;
const artifacts = mobileArtifactsDir;
const startedProcesses = [];
let sessionId;
let appBaseUrl;
let partialArtifacts = {};

mkdirSync(artifacts, { recursive: true });

function logLine(filePath, text) {
  appendFileSync(filePath, `${text}\n`);
}

function parsePort(value, name) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`${name} must be a valid TCP port.`);
  return port;
}

async function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(700);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}

async function waitForHttp(url, label, child, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'server did not respond';
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`${label} exited early with code ${child.exitCode}.`);
    }
    try {
      const status = await requestStatus(url, Math.min(timeoutMs, 2500));
      if (status < 500) return status;
      lastError = `HTTP ${status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${label}: ${lastError}.`);
}

async function requestStatus(value, timeoutMs) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !process.env.MOBILE_HTTPS_CA) {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'manual' });
    return response.status;
  }
  return new Promise((resolve, reject) => {
    const request = httpsGet(url, { ca: readFileSync(path.resolve(process.env.MOBILE_HTTPS_CA)), timeout: timeoutMs }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    });
    request.once('timeout', () => request.destroy(new Error('HTTPS preflight request timed out.')));
    request.once('error', reject);
  });
}

async function ensureAppServer() {
  if (process.env.MOBILE_BASE_URL) {
    const url = new URL(process.env.MOBILE_BASE_URL);
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(url.hostname)) {
      throw new Error('MOBILE_BASE_URL must use a host reachable from the iPhone, not localhost.');
    }
    appBaseUrl = withLocalePath(process.env.MOBILE_BASE_URL);
    await waitForHttp(appBaseUrl, 'MOBILE_BASE_URL', undefined, 20_000);
    return;
  }

  const host = process.env.MOBILE_HOST || getPrivateIpv4Address();
  if (!host) throw new Error('No private Wi-Fi IPv4 address was found. Set MOBILE_HOST to the Mac’s private LAN IP.');
  const cert = process.env.MOBILE_HTTPS_CERT;
  const key = process.env.MOBILE_HTTPS_KEY;
  if (Boolean(cert) !== Boolean(key)) throw new Error('Set both MOBILE_HTTPS_CERT and MOBILE_HTTPS_KEY, or neither.');

  const protocol = cert ? 'https' : 'http';
  const base = `${protocol}://${host}:${appPort}`;
  const healthUrl = `${base}/en`;
  if (await isPortOpen(appPort, host)) {
    throw new Error(`Port ${appPort} is already in use on ${host}. Set MOBILE_WEB_PORT or MOBILE_BASE_URL to select a known server.`);
  }

  const args = ['dev', '--webpack', '--hostname', host, '--port', String(appPort)];
  if (cert) {
    args.push('--experimental-https', '--experimental-https-key', path.resolve(key), '--experimental-https-cert', path.resolve(cert));
    if (process.env.MOBILE_HTTPS_CA) args.push('--experimental-https-ca', path.resolve(process.env.MOBILE_HTTPS_CA));
  }

  const nextLog = path.join(artifacts, 'next-server.log');
  writeFileSync(nextLog, '');
  const child = spawn(nextBin, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_ENABLE_AGENTATION: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk) => logLine(nextLog, chunk.toString().trimEnd()));
  child.stderr?.on('data', (chunk) => logLine(nextLog, chunk.toString().trimEnd()));
  startedProcesses.push(child);
  appBaseUrl = withLocalePath(base);
  await waitForHttp(healthUrl, 'Next.js dev server', child);
}

function withLocalePath(value) {
  const url = new URL(value);
  if (!url.pathname || url.pathname === '/') url.pathname = '/en';
  return url.toString().replace(/\/$/, '');
}

async function ensureAppiumServer() {
  if (await isPortOpen(appiumPort)) {
    throw new Error(`Appium port ${appiumPort} is already in use. Set APPIUM_PORT or stop the existing server first.`);
  }
  const appiumLog = path.join(artifacts, 'appium-server.log');
  writeFileSync(appiumLog, '');
  const child = spawn(appiumBin, ['server', '--address', '127.0.0.1', '--port', String(appiumPort), '--log', appiumLog, '--log-timestamp'], {
    cwd: projectRoot,
    env: withAppiumEnvironment(),
    stdio: ['ignore', 'ignore', 'ignore'],
  });
  startedProcesses.push(child);
  await waitForHttp(`${appiumBase}/status`, 'Appium server', child, 60_000);
}

async function webdriver(method, endpoint, body, timeoutMs = 180_000) {
  const response = await fetch(`${appiumBase}${endpoint}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.value?.error) {
    const message = result.value?.message || result.message || `${method} ${endpoint} returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return result.value;
}

async function waitForElement(selector, timeoutMs = 20_000, using = 'css selector') {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await webdriver('POST', `/session/${sessionId}/element`, {
        using,
        value: selector,
      }, 10_000);
      if (result?.ELEMENT || result?.['element-6066-11e4-a52e-4f735466cecf']) return result;
    } catch {
      // Wait for hydration and the accessible control to appear.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for accessible selector: ${selector}`);
}

async function findOptionalElement(selector, timeoutMs = 6000, using = 'css selector') {
  try {
    return await waitForElement(selector, timeoutMs, using);
  } catch {
    return undefined;
  }
}

async function waitForElementToBeRemoved(selector, description, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const removed = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
      script: `return document.querySelector(${JSON.stringify(selector)}) === null;`,
      args: [],
    });
    if (removed) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${description} to close.`);
}

async function clickElement(element) {
  const id = element['element-6066-11e4-a52e-4f735466cecf'] || element.ELEMENT;
  await webdriver('POST', `/session/${sessionId}/element/${id}/click`, {});
}

async function waitForPath(expectedPath, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const result = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
        script: 'return window.location.pathname;',
        args: [],
      });
      if (result === expectedPath) return;
    } catch {
      // A navigation can temporarily invalidate the current WebKit context.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Safari did not navigate to ${expectedPath}.`);
}

async function touchScrollPage() {
  const size = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
    script: 'return { width: window.innerWidth, height: window.innerHeight, y: window.scrollY };',
    args: [],
  });
  const x = Math.max(1, Math.round(size.width * 0.5));
  const startY = Math.max(1, Math.round(size.height * 0.82));
  const endY = Math.max(1, Math.round(size.height * 0.28));
  await webdriver('POST', `/session/${sessionId}/actions`, {
    actions: [{
      type: 'pointer',
      id: 'lunidex-touch-scroll',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x, y: startY },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerMove', duration: 550, x, y: endY },
        { type: 'pointerUp', button: 0 },
      ],
    }],
  });
  await webdriver('DELETE', `/session/${sessionId}/actions`);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const afterY = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
    script: 'return window.scrollY;',
    args: [],
  });
  if (afterY <= size.y) throw new Error('The Safari page did not scroll after a touch gesture.');
}

async function captureScreenshot(fileName) {
  const base64 = await webdriver('GET', `/session/${sessionId}/screenshot`);
  const output = path.join(artifacts, fileName);
  writeFileSync(output, Buffer.from(base64, 'base64'));
  return output;
}

async function captureLogs() {
  const captured = { supportedTypes: [], browser: [], pageDiagnostics: null, failures: [] };
  try {
    const types = await webdriver('GET', `/session/${sessionId}/log/types`);
    captured.supportedTypes = Array.isArray(types) ? types : [];
    if (captured.supportedTypes.includes('browser')) {
      captured.browser = await webdriver('POST', `/session/${sessionId}/log`, { type: 'browser' });
    }
  } catch (error) {
    captured.failures.push(error instanceof Error ? error.message : String(error));
  }
  try {
    captured.pageDiagnostics = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
      script: `return window.__lunidexMobileDiagnostics ?? null;`,
      args: [],
    });
  } catch (error) {
    captured.failures.push(error instanceof Error ? error.message : String(error));
  }
  writeFileSync(path.join(artifacts, 'iphone-safari-logs.json'), `${JSON.stringify(captured, null, 2)}\n`);
  return captured;
}

async function startSession(device) {
  const wdaPort = Number(process.env.APPIUM_WDA_PORT ?? 8100);
  if (!Number.isInteger(wdaPort) || wdaPort < 1 || wdaPort > 65535) {
    throw new Error('APPIUM_WDA_PORT must be a valid TCP port.');
  }
  if (await isPortOpen(wdaPort)) {
    throw new Error(`WebDriverAgent port ${wdaPort} is already in use. Set APPIUM_WDA_PORT or stop the existing WDA session first.`);
  }
  const alwaysMatch = {
    platformName: 'iOS',
    browserName: 'Safari',
    'appium:automationName': 'XCUITest',
    'appium:udid': device.identifier,
    'appium:deviceName': device.name || 'iPhone',
    'appium:newCommandTimeout': 120,
    'appium:wdaLaunchTimeout': 120_000,
    'appium:wdaStartupRetries': 3,
    'appium:wdaLocalPort': wdaPort,
    'appium:showXcodeLog': true,
    'appium:includeSafariInWebviews': true,
  };
  if (device.operatingSystemVersion) {
    alwaysMatch['appium:platformVersion'] = device.operatingSystemVersion;
  }
  if (process.env.IOS_TEAM_ID) {
    alwaysMatch['appium:xcodeOrgId'] = process.env.IOS_TEAM_ID;
    alwaysMatch['appium:xcodeSigningId'] = process.env.IOS_SIGNING_ID || 'Apple Development';
  }
  const response = await webdriver('POST', '/session', { capabilities: { alwaysMatch } }, 300_000);
  sessionId = response.sessionId || response['sessionId'];
  if (!sessionId) throw new Error('Appium created a session without returning a session ID.');
}

async function runScenario(device) {
  await startSession(device);
  await webdriver('POST', `/session/${sessionId}/url`, { url: appBaseUrl }, 60_000);

  await webdriver('POST', `/session/${sessionId}/execute/sync`, {
    script: `
      window.__lunidexMobileDiagnostics = { errors: [], rejections: [], failedResources: [] };
      window.addEventListener('error', (event) => window.__lunidexMobileDiagnostics.errors.push({ message: event.message, source: event.filename, line: event.lineno }));
      window.addEventListener('unhandledrejection', (event) => window.__lunidexMobileDiagnostics.rejections.push(String(event.reason)));
      const resources = performance.getEntriesByType('resource');
      for (const entry of resources) if (entry.responseStatus >= 400) window.__lunidexMobileDiagnostics.failedResources.push({ url: entry.name, status: entry.responseStatus });
      return document.readyState;
    `,
    args: [],
  });

  const installDismiss = await findOptionalElement(
    '//div[@role="dialog" and @aria-labelledby="pwa-install-title"]//button[normalize-space(.)="Not now"]',
    8000,
    'xpath',
  );
  if (installDismiss) {
    await clickElement(installDismiss);
    await waitForElementToBeRemoved('[role="dialog"][aria-labelledby="pwa-install-title"]', 'iOS install prompt');
  }

  const cookieReject = await findOptionalElement(
    '//div[@role="region" and @aria-labelledby="cookie-consent-title"]//button[normalize-space(.)="Reject all"]',
    8000,
    'xpath',
  );
  if (cookieReject) {
    await clickElement(cookieReject);
    await waitForElementToBeRemoved('[role="region"][aria-labelledby="cookie-consent-title"]', 'cookie consent banner');
  }

  const menuButton = await waitForElement('button[aria-label="Open Menu"]');
  await clickElement(menuButton);
  const pokedexLink = await waitForElement('#lunidex-home-mobile-menu a[href="/en/pokedex"]');
  await clickElement(pokedexLink);
  await waitForPath('/en/pokedex');
  await waitForElement('main h1');
  await touchScrollPage();

  const screenshot = await captureScreenshot('iphone-safari-pokedex.png');
  partialArtifacts.screenshot = screenshot;

  await webdriver('POST', `/session/${sessionId}/url`, { url: new URL('/en/team', appBaseUrl).toString() }, 60_000);
  await waitForPath('/en/team');
  const teamActions = await waitForElement('main details.team-actions-menu summary');
  await clickElement(teamActions);
  const importButton = await waitForElement(
    "//main//details[contains(@class, 'team-actions-menu')]//button[contains(normalize-space(.), 'Import Showdown')]",
    20_000,
    'xpath',
  );
  await clickElement(importButton);
  const importTextArea = await waitForElement('textarea');
  await clickElement(importTextArea);
  const textAreaId = importTextArea['element-6066-11e4-a52e-4f735466cecf'] || importTextArea.ELEMENT;
  await webdriver('POST', `/session/${sessionId}/element/${textAreaId}/value`, {
    text: 'Pikachu',
    value: [...'Pikachu'],
  });
  const importedValue = await webdriver('POST', `/session/${sessionId}/execute/sync`, {
    script: 'return document.querySelector("textarea")?.value ?? "";',
    args: [],
  });
  if (importedValue !== 'Pikachu') throw new Error('Safari did not enter the test text into the team import field.');

  let keyboardVisible = null;
  try {
    const contexts = await webdriver('GET', `/session/${sessionId}/contexts`);
    const webContext = Array.isArray(contexts) ? contexts.find((context) => context !== 'NATIVE_APP') : undefined;
    if (Array.isArray(contexts) && contexts.includes('NATIVE_APP') && webContext) {
      await webdriver('POST', `/session/${sessionId}/context`, { name: 'NATIVE_APP' });
      const nativeSource = await webdriver('GET', `/session/${sessionId}/source`);
      keyboardVisible = /XCUIElementTypeKeyboard|XCUIElementTypeKey/.test(nativeSource);
      await webdriver('POST', `/session/${sessionId}/context`, { name: webContext });
    }
  } catch {
    // Some iOS versions expose Safari's DOM context but not native keyboard elements.
  }
  const keyboardScreenshot = await captureScreenshot('iphone-safari-team-keyboard.png');
  partialArtifacts.keyboardScreenshot = keyboardScreenshot;
  const diagnostics = await captureLogs();
  partialArtifacts.logs = path.join(artifacts, 'iphone-safari-logs.json');
  if (keyboardVisible !== true) {
    throw new Error('The iOS keyboard was not verifiably visible in the native accessibility tree after focusing the team import field. Screenshots and logs were retained.');
  }
  const report = {
    status: 'passed',
    testedAt: new Date().toISOString(),
    device: {
      name: device.name || 'iPhone',
      model: device.modelCode || null,
      osVersion: device.operatingSystemVersion || null,
      connection: device.interface || null,
    },
    url: appBaseUrl,
    steps: ['Safari opened the local Lunidex URL', 'More menu opened by accessibility selector', 'Pokédex link activated', 'Safari reached /en/pokedex', 'touch scroll gesture changed scroll position', 'device screenshot saved', 'team import dialog opened', 'keyboard text entered into team import field'],
    screenshot,
    keyboardScreenshot,
    keyboardVisible,
    logs: path.join(artifacts, 'iphone-safari-logs.json'),
    diagnostics,
  };
  writeFileSync(path.join(artifacts, 'iphone-safari-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

async function cleanup() {
  if (sessionId) {
    try { await webdriver('DELETE', `/session/${sessionId}`, undefined, 30_000); } catch { /* The device may already have dropped its session. */ }
  }
  for (const child of startedProcesses.reverse()) {
    if (child.exitCode !== null) continue;
    child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 5000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }
}

let report;
try {
  parsePort(process.env.APPIUM_PORT ?? '4723', 'APPIUM_PORT');
  parsePort(process.env.MOBILE_WEB_PORT ?? '3100', 'MOBILE_WEB_PORT');
  const preflight = run(process.execPath, ['scripts/mobile/preflight.mjs', '--ios'], { stdio: 'inherit' });
  if (preflight.status !== 0) throw new Error('iOS preflight did not pass.');
  const device = chooseDevice(getDeviceRecords());
  await ensureAppServer();
  await ensureAppiumServer();
  report = await runScenario(device);
  process.stdout.write(`\nReal iPhone Safari scenario passed.\nScreenshot: ${report.screenshot}\nReport: ${path.join(artifacts, 'iphone-safari-report.json')}\nLogs: ${report.logs}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeFileSync(path.join(artifacts, 'iphone-safari-report.json'), `${JSON.stringify({ status: 'failed', testedAt: new Date().toISOString(), error: message, artifacts: partialArtifacts }, null, 2)}\n`);
  process.stderr.write(`\nReal iPhone Safari scenario failed: ${message}\nReport: ${path.join(artifacts, 'iphone-safari-report.json')}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
