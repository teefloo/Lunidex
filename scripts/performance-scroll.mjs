/** Controlled scroll diagnostic. Frame gaps are not INP and are not physical-display FPS. */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { base: { type: 'string' }, output: { type: 'string' }, runs: { type: 'string', default: '5' } } });
if (!values.base || !values.output) throw new Error('--base --output required');
if (existsSync(`${values.output}/runs.json`)) throw new Error('Output already contains samples; choose a new directory');
if (!Number.isInteger(Number(values.runs)) || Number(values.runs) < 1) throw new Error('--runs must be a positive integer');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.LUNIDEX_PLAYWRIGHT_MODULE || 'playwright');
mkdirSync(values.output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.LUNIDEX_CHROMIUM_PATH });
const results = [];
const protocol = { base: values.base, browser: browser.version(), runs: Number(values.runs), durationMs: 15000,
  viewport: { desktop: [1440, 900], mobile: [390, 844] }, mobile: { cpu: 4, latencyMs: 150, downBytesPerSecond: 200000, upBytesPerSecond: 93750 },
  input: 'mouse.wheel at start, 5 s and 10 s', metric: 'rAF frame gaps and long tasks during a fixed 15 s scroll window; no INP', serviceWorkers: 'blocked', startedAt: new Date().toISOString() };
try {
  for (const profile of ['desktop', 'mobile']) for (let run = 1; run <= protocol.runs; run++) {
    const mobile = profile === 'mobile';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page); await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*posthog.com/*', '*ingest.sentry.io/*', '*vercel-insights.com/*', '*va.vercel-scripts.com/*'] });
    if (mobile) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    }
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${values.base}/fr/tcg?set=sv03.5`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /détails.*Bulbasaur|Bulbasaur.*détails/i }).first().waitFor();
      const reject = page.getByRole('button', { name: 'Tout refuser', exact: true });
      if (await reject.isVisible()) await reject.click();
      await page.evaluate(() => {
        window.__scrollAudit = { gaps: [], tasks: [], positions: [], started: performance.now() };
        let last = performance.now();
        function frame(now) { window.__scrollAudit.gaps.push(now - last); last = now; if (now - window.__scrollAudit.started < 15000) requestAnimationFrame(frame); }
        requestAnimationFrame(frame);
        const observer = new PerformanceObserver(list => window.__scrollAudit.tasks.push(...list.getEntries().map(entry => ({ start: entry.startTime, duration: entry.duration }))));
        observer.observe({ type: 'longtask' });
        setTimeout(() => observer.disconnect(), 15000);
        document.addEventListener('scroll', () => window.__scrollAudit.positions.push({ at: performance.now(), y: scrollY }));
      });
      const started = Date.now();
      await page.mouse.wheel(0, 2000); await page.waitForTimeout(5000);
      await page.mouse.wheel(0, -1500); await page.waitForTimeout(5000);
      await page.mouse.wheel(0, 2500); await page.waitForTimeout(Math.max(0, 15000 - (Date.now() - started)));
      const metrics = await page.evaluate(() => window.__scrollAudit);
      results.push({ profile, run, ...metrics, errors });
    } catch (error) { results.push({ profile, run, failure: error.message, errors }); }
    finally { await context.close(); }
    writeFileSync(`${values.output}/runs.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ profile, run, failure: results.at(-1).failure ?? null, tasks: results.at(-1).tasks?.length }));
  }
} finally { await browser.close(); }
protocol.finishedAt = new Date().toISOString(); writeFileSync(`${values.output}/protocol.json`, JSON.stringify(protocol, null, 2));
