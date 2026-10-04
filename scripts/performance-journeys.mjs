/** Local production journeys; telemetry blocked and all user data disposable. */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

const require = createRequire(import.meta.url);
const { values } = parseArgs({ options: {
  base: { type: 'string' }, output: { type: 'string' }, runs: { type: 'string', default: '5' },
  profiles: { type: 'string', default: 'desktop,mobile' },
} });
if (!values.base || !values.output) throw new Error('--base and --output required');
mkdirSync(values.output, { recursive: true });
if (existsSync(`${values.output}/runs.ndjson`)) throw new Error('Output already contains samples; choose a new directory');
const { chromium } = require(process.env.LUNIDEX_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.LUNIDEX_CHROMIUM_PATH });
const vitals = readFileSync(require.resolve('web-vitals').replace('web-vitals.umd.cjs', 'web-vitals.iife.js'), 'utf8');
const results = [];
const protocol = { base: values.base, runs: Number(values.runs), profiles: values.profiles.split(','),
  browser: browser.version(), visualMetric: 'trusted input/click event to two requestAnimationFrame callbacks; proxy, separate from INP',
  resultsMetric: 'action start to requested DOM condition; includes debounce/network/render',
  inpMetric: 'web-vitals INP for the current document, cumulative across its interactions; not the network result delay',
  serviceWorkers: 'blocked', storage: 'fresh context each repetition', telemetry: 'blocked through CDP', startedAt: new Date().toISOString() };
writeFileSync(`${values.output}/protocol.json`, JSON.stringify(protocol, null, 2));
try {
  for (const profile of protocol.profiles) for (let run = 1; run <= protocol.runs; run++) {
    const mobile = profile === 'mobile';
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block', locale: 'fr-FR' });
    await context.addInitScript({ content: `${vitals}\n
      window.__journey = { frames: [], inp: null, active: false };
      webVitals.onINP(metric => window.__journey.inp = metric.value, {reportAllChanges:true});
      for(const type of ['input','click','keydown']) document.addEventListener(type, event => {
        if(!window.__journey.active) return;
        const start = event.timeStamp;
        requestAnimationFrame(()=>requestAnimationFrame(()=>window.__journey.frames.push({type,ms:performance.now()-start})));
      }, true);
    ` });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', { urls: ['*posthog.com/*', '*ingest.sentry.io/*', '*vercel-insights.com/*', '*va.vercel-scripts.com/*'] });
    if (mobile) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    }
    const requests = [];
    const queryRequests = new Map();
    cdp.on('Network.requestWillBeSent', event => {
      const query = event.request.postData ?? '';
      if (query.includes('GetAllPokemon')) {
        const request = { operation: query.match(/query\s+(\w+)/)?.[1], at: Date.now(), start: event.timestamp };
        queryRequests.set(event.requestId, request); requests.push(request);
      }
    });
    cdp.on('Network.loadingFinished', event => {
      const request = queryRequests.get(event.requestId);
      if (request) Object.assign(request, { bytes: event.encodedDataLength, durationMs: (event.timestamp - request.start) * 1000 });
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    async function record(name, action, condition) {
      const start = Date.now();
      let failure = null;
      await page.evaluate(() => { window.__journey.frames = []; window.__journey.active = true; });
      try { await action(); await condition(); } catch (error) { failure = error.message; }
      const resultMs = Date.now() - start;
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => { window.__journey.active = false; return window.__journey; });
      const row = { profile, run, name, resultMs, failure, documentInpMs: metrics.inp, visualFrames: metrics.frames, url: page.url(), errors: [...errors] };
      results.push(row); appendFileSync(`${values.output}/runs.ndjson`, JSON.stringify(row) + '\n');
      console.log(JSON.stringify(row));
    }
    async function open(path) {
      await page.goto(values.base + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.locator('main').waitFor();
      const reject = page.getByRole('button', { name: 'Tout refuser', exact: true });
      if (await reject.isVisible()) await reject.click();
    }
    try {
      await open('/fr/pokedex');
      await page.locator('main a[href*="/pokemon/bulbasaur"]').first().waitFor();
      await record('pokemon-pagination', () => page.getByRole('button', { name: 'Voir plus', exact: true }).click(),
        () => page.locator('main a[href*="/pokemon/spearow"]').first().waitFor());
      const search = page.getByRole('textbox', { name: 'Rechercher un Pokémon (nom ou id)...' });
      await record('pokemon-search', () => search.pressSequentially('#025', { delay: 30 }),
        () => page.waitForFunction(() => document.querySelectorAll('main a[href*="/pokemon/pikachu?"]').length === 1 && !document.querySelector('main a[href*="/pokemon/bulbasaur?"]')));
      await record('pokemon-detail-navigation', () => page.locator('main a[href*="/pokemon/pikachu?"]').first().click(),
        () => page.waitForFunction(() => location.pathname.endsWith('/pokemon/pikachu') && /pikachu/i.test(document.querySelector('main h1')?.textContent ?? '')));
      await record('pokemon-back', () => page.goBack(), () => search.waitFor());
      const filterStart = Date.now();
      const tracing = run === 1 && profile === 'desktop';
      if (tracing) await cdp.send('Tracing.start', { categories: 'devtools.timeline,blink.user_timing,toplevel,v8.execute', transferMode: 'ReturnAsStream' });
      await open('/fr/pokedex?sort=height-asc');
      await page.waitForFunction(() => document.querySelector('main')?.innerText.includes('Affichage de'));
      const filterReadyMs = Date.now() - filterStart;
      await page.waitForTimeout(Math.max(0, 15000 - (Date.now() - filterStart)));
      if (tracing) {
        const completed = new Promise(resolve => cdp.once('Tracing.tracingComplete', resolve));
        await cdp.send('Tracing.end');
        const { stream } = await completed;
        const chunks = [];
        for (;;) {
          const chunk = await cdp.send('IO.read', { handle: stream });
          chunks.push(Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8'));
          if (chunk.eof) break;
        }
        await cdp.send('IO.close', { handle: stream });
        writeFileSync(`${values.output}/pokemon-height-trace.json.gz`, gzipSync(Buffer.concat(chunks)));
      }
      const row = { profile, run, name: 'pokemon-height-sort', resultMs: filterReadyMs, requests: requests.filter(request => request.at >= filterStart),
        results: await page.locator('main a[href*="/pokemon/"]').evaluateAll(links => links.map(link => ({ text: link.getAttribute('aria-label'), href: link.getAttribute('href') })).slice(0, 30)), errors: [...errors] };
      results.push(row); appendFileSync(`${values.output}/runs.ndjson`, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row));
      await open('/fr/pokedex?sort=weight-desc');
      await page.waitForFunction(() => document.querySelector('main')?.innerText.includes('Affichage de'));
      const weights = { profile, run, name: 'pokemon-weight-sort-results', results: await page.locator('main a[href*="/pokemon/"]').evaluateAll(links => links.map(link => link.getAttribute('aria-label')).slice(0, 30)) };
      appendFileSync(`${values.output}/runs.ndjson`, JSON.stringify(weights) + '\n');
      await open('/fr/tcg?set=sv03.5');
      const firstCard = page.getByRole('button', { name: /détails.*Bulbasaur|Bulbasaur.*détails/i }).first();
      await firstCard.waitFor();
      await record('tcg-modal-open', () => firstCard.click(), () => page.getByRole('dialog').first().waitFor());
      await record('tcg-modal-close-keyboard', () => page.keyboard.press('Escape'), () => page.getByRole('dialog').first().waitFor({ state: 'hidden' }));
      const tcgSearch = page.getByPlaceholder('Rechercher dans la base de cartes...');
      await record('tcg-search', () => tcgSearch.pressSequentially('Charizard', { delay: 20 }),
        () => page.waitForFunction(() => !document.querySelector('main button[aria-label*="Bulbasaur"]') && document.querySelector('main button[aria-label*="Charizard"]')));
      await record('tcg-language', () => page.getByRole('combobox', { name: 'Langue des cartes' }).selectOption('fr'),
        () => page.waitForURL('**tcgLang=fr**'));
      await tcgSearch.fill('');
      await page.waitForFunction(() => !new URL(location.href).searchParams.has('q'));
      await record('tcg-set', () => page.getByRole('combobox', { name: 'Extension', exact: true }).selectOption('base1'),
        () => page.getByRole('button', { name: /Voir les détails de Dracaufeu/i }).first().waitFor());
      await page.getByRole('button', { name: 'Filtres', exact: true }).click();
      await record('tcg-view', () => page.getByRole('radio', { name: 'Vue liste', exact: true }).click(),
        () => page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'table'));
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').first().waitFor({ state: 'hidden' });
      await open('/fr/team/share?code=25-6-9&lang=fr');
      await record('team-share-load', () => Promise.resolve(), () => page.waitForFunction(() => document.querySelector('main')?.innerText.includes('3/6')));
      await open('/fr/quiz');
      await record('quiz-start', () => page.getByRole('button', { name: 'Classique', exact: true }).click(),
        () => page.waitForFunction(() => document.querySelectorAll('main button.h-14:not([disabled])').length === 4));
      await record('quiz-answer', () => page.locator('main button.h-14').first().click(),
        () => page.waitForFunction(() => document.querySelectorAll('main button.h-14[disabled]').length === 4));
    } catch (error) {
      const row = { profile, run, name: 'journey-setup-failure', failure: error.message, url: page.url(), errors };
      results.push(row); appendFileSync(`${values.output}/runs.ndjson`, JSON.stringify(row) + '\n'); console.log(JSON.stringify(row));
      await page.screenshot({ path: `${values.output}/${profile}-${run}-failure.png` });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
protocol.finishedAt = new Date().toISOString();
writeFileSync(`${values.output}/protocol.json`, JSON.stringify(protocol, null, 2));
