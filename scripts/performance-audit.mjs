/** Production-only lab audit. Uses an existing Playwright installation, no app dependency. */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const { values } = parseArgs({ options: {
  base: { type: 'string', default: 'http://localhost:3105' },
  output: { type: 'string' },
  runs: { type: 'string', default: '5' },
  profiles: { type: 'string', default: 'desktop,mobile' },
  routes: { type: 'string' },
} });
if (!values.output) throw new Error('--output is required; use a new directory for each campaign');
const output = resolve(values.output);
mkdirSync(output, { recursive: true });
if (existsSync(`${output}/runs.ndjson`)) throw new Error('Output already contains samples; choose a new directory');
const { chromium } = require(process.env.LUNIDEX_PLAYWRIGHT_MODULE || 'playwright');
const routes = values.routes?.split(',') ?? [
  '/fr', '/fr/pokedex', '/fr/pokemon/pikachu', '/fr/tcg',
  '/fr/tcg/cards/sv03.5-199', '/fr/team', '/fr/quiz', '/fr/dashboard',
];
const runs = Number(values.runs);
if (!Number.isInteger(runs) || runs < 1) throw new Error('--runs must be a positive integer');
const profiles = values.profiles.split(',');
if (profiles.some(profile => !['desktop', 'mobile'].includes(profile))) throw new Error('Unknown profile');
const vitalsScript = readFileSync(require.resolve('web-vitals').replace('web-vitals.umd.cjs', 'web-vitals.iife.js'), 'utf8');
const metadata = {
  startedAt: new Date().toISOString(), node: process.version, base: values.base, routes, runs,
  concurrency: profiles.length, observationMs: 15000, readinessTimeoutMs: 45000,
  serviceWorkers: 'blocked', serverCache: 'not purged; routes warmed before timed runs',
  mobile: { width: 390, height: 844, cpu: 4, latencyMs: 150, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 93750 },
  desktop: { width: 1440, height: 900, cpu: 1, network: 'unthrottled' },
};
writeFileSync(`${output}/protocol.json`, JSON.stringify(metadata, null, 2));

function ready({ pathname }) {
  const main = document.querySelector('main');
  if (!main || main.innerText.trim().length < 40) return false;
  if (pathname === '/fr/pokedex' || pathname === '/fr/tcg' || pathname.includes('/tcg/cards/')) {
    return [...main.querySelectorAll('img')].some(image => image.complete && image.naturalWidth > 0);
  }
  return true;
}

async function profileCampaign(profile) {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.LUNIDEX_CHROMIUM_PATH ? { executablePath: process.env.LUNIDEX_CHROMIUM_PATH } : {}),
  });
  const mobile = profile === 'mobile';
  const browserVersion = browser.version();
  try {
    for (const pathname of routes) {
      // Warm public server caches separately; never purge a user's browser or external cache.
      await fetch(`${values.base}${pathname}`).then(response => response.text());
      for (let run = 1; run <= runs; run++) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
          isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1,
          serviceWorkers: 'block', locale: 'fr-FR', timezoneId: 'Europe/Paris',
        });
        await context.addInitScript({ content: `${vitalsScript}\n
          window.__audit = { vitals: {}, longTasks: [] };
          for (const name of ['LCP', 'CLS', 'INP']) {
            webVitals['on' + name](metric => {
              window.__audit.vitals[name] = { value: metric.value, rating: metric.rating };
            }, { reportAllChanges: true });
          }
          new PerformanceObserver(list => {
            window.__audit.longTasks.push(...list.getEntries().map(e => ({start: e.startTime, duration: e.duration})));
          }).observe({ type: 'longtask', buffered: true });
        ` });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Performance.enable');
        await cdp.send('Network.setBlockedURLs', { urls: ['*posthog.com/*', '*ingest.sentry.io/*', '*vercel-insights.com/*', '*va.vercel-scripts.com/*'] });
        if (mobile) {
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
          await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
        }
        for (const mode of ['cold', 'warm']) {
          const requests = new Map();
          const errors = [];
          const request = event => requests.set(event.requestId, { url: event.request.url, method: event.request.method, start: event.timestamp });
          const response = event => {
            const item = requests.get(event.requestId);
            if (item) Object.assign(item, { type: event.type, status: event.response.status, diskCache: event.response.fromDiskCache, mime: event.response.mimeType });
          };
          const finished = event => {
            const item = requests.get(event.requestId);
            if (item) Object.assign(item, { bytes: event.encodedDataLength, durationMs: (event.timestamp - item.start) * 1000 });
          };
          const consoleError = message => { if (message.type() === 'error') errors.push(message.text()); };
          const pageError = error => errors.push(error.message);
          cdp.on('Network.requestWillBeSent', request);
          cdp.on('Network.responseReceived', response);
          cdp.on('Network.loadingFinished', finished);
          page.on('console', consoleError);
          page.on('pageerror', pageError);
          const started = Date.now();
          let readinessMs = null;
          let failure = null;
          let status = null;
          try {
            const result = await page.goto(`${values.base}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
            status = result?.status();
            await page.waitForFunction(ready, { pathname }, { timeout: 45000, polling: 100 });
            readinessMs = Date.now() - started;
            await page.waitForTimeout(Math.max(0, 15000 - (Date.now() - started)));
          } catch (error) {
            failure = error.message;
          }
          const observedMs = Date.now() - started;
          const metrics = await page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            return {
              ...window.__audit,
              ttfbMs: nav ? nav.responseStart - nav.requestStart : null,
              domContentLoadedMs: nav?.domContentLoadedEventEnd,
              loadMs: nav?.loadEventEnd,
              title: document.title,
              domNodes: document.querySelectorAll('*').length,
              resources: performance.getEntriesByType('resource').map(r => ({ url: r.name, start: r.startTime, duration: r.duration, transfer: r.transferSize, decoded: r.decodedBodySize, initiator: r.initiatorType })),
            };
          }).catch(() => null);
          const counters = await cdp.send('Performance.getMetrics');
          const row = { profile, pathname, mode, run, browserVersion, status, readinessMs, observedMs, failure, errors, metrics, counters: counters.metrics, requests: [...requests.values()] };
          appendFileSync(`${output}/runs.ndjson`, JSON.stringify(row) + '\n');
          if (run === 1 && mode === 'cold') await page.screenshot({ path: `${output}/${profile}-${pathname.replaceAll('/', '_')}.png`, fullPage: false });
          process.stdout.write(JSON.stringify({ profile, pathname, mode, run, status, readinessMs, lcp: metrics?.vitals?.LCP?.value, requests: requests.size, failure }) + '\n');
          cdp.off('Network.requestWillBeSent', request);
          cdp.off('Network.responseReceived', response);
          cdp.off('Network.loadingFinished', finished);
          page.off('console', consoleError);
          page.off('pageerror', pageError);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

await Promise.all(profiles.map(profileCampaign));
metadata.finishedAt = new Date().toISOString();
writeFileSync(`${output}/protocol.json`, JSON.stringify(metadata, null, 2));
