/** Smoke checks against an isolated production server with no cloud credentials. */
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const { values } = parseArgs({ options: { base: { type: 'string' }, output: { type: 'string' } } });
if (!values.base || !values.output) throw new Error('--base and --output required');
mkdirSync(values.output, { recursive: true });
const evidence = { base: values.base, startedAt: new Date().toISOString(), http: [], browser: [], simulations: [] };
const save = () => writeFileSync(`${values.output}/validation.json`, JSON.stringify(evidence, null, 2));
const locales = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
function files(path) { return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]); }
const fixtures = {
  '/abilities/[name]': '/abilities/blaze', '/items/[name]': '/items/potion', '/moves/[name]': '/moves/thunderbolt',
  '/pokemon/[name]': '/pokemon/pikachu', '/compare/[slug]': '/compare/lunidex-vs-bulbapedia',
  '/guides/[slug]': '/guides/pokemon-reference-guide', '/friends/[friendId]': '/friends/00000000-0000-4000-8000-000000000001',
  '/u/[handle]': '/u/audit-unconfigured', '/tcg/cards/[id]': '/tcg/cards/sv03.5-199',
  '/tcg/sets/[setId]': '/tcg/sets/sv03.5', '/tcg/collection/[language]': '/tcg/collection/en',
  '/tcg/collection/[language]/[setId]': '/tcg/collection/en/sv03.5', '/tcg/sealed/[[...view]]': '/tcg/sealed',
  '/tcg/sealed/market/[id]': '/tcg/sealed/market/audit-unconfigured',
  '/tcg/sealed/market/products/[id]': '/tcg/sealed/market/products/1',
};
const routes = files('src/app').filter(path => path.endsWith('/page.tsx')).map(path => {
  const route = path.slice('src/app'.length, -'/page.tsx'.length) || '/';
  if (route.includes('[') && !fixtures[route]) throw new Error(`Missing fixture: ${route}`);
  return fixtures[route] ?? route;
});
const paths = new Set(routes.map(route => `/fr${route === '/' ? '' : route}`));
for (const locale of locales) for (const route of ['', '/pokedex', '/pokemon/pikachu', '/tcg', '/tcg/cards/sv03.5-199', '/team', '/quiz', '/dashboard']) paths.add(`/${locale}${route}`);
for (const path of ['/api/user-state', '/api/auth/get-session', '/api/tcg/sealed/catalogue', '/robots.txt', '/sitemap.xml', '/llms.txt', '/ai.txt', '/opensearch.xml']) paths.add(path);
const pending = [...paths];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (pending.length) {
    const path = pending.shift();
    try {
      const response = await fetch(values.base + path, { signal: AbortSignal.timeout(60000) });
      const body = await response.text();
      const unavailable = path.startsWith('/api/');
      const missingFixture = /\/u\/|\/friends\/|\/sealed\/market\//.test(path);
      const expected = unavailable ? [503, 401] : missingFixture ? [200, 404, 503] : [200];
      evidence.http.push({ path, status: response.status, ok: expected.includes(response.status), expected, bytes: Buffer.byteLength(body),
        title: body.match(/<title>(.*?)<\/title>/)?.[1], canonical: body.match(/<link rel="canonical" href="([^"]+)"/)?.[1],
        languageAlternates: (body.match(/hreflang=/gi) ?? []).length, cacheControl: response.headers.get('cache-control') });
    } catch (error) { evidence.http.push({ path, ok: false, error: error.message }); }
    save();
  }
}));
const { chromium } = require(process.env.LUNIDEX_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.LUNIDEX_CHROMIUM_PATH });
try {
  for (let index = 0; index < locales.length; index++) {
    const locale = locales[index];
    const dark = index % 2 === 1;
    const width = index % 3 === 0 ? 320 : index % 3 === 1 ? 390 : 1440;
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: dark ? 'dark' : 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${values.base}/${locale}/pokedex`);
      await page.waitForFunction(expected => document.documentElement.lang === expected && document.querySelector('main a[href*="/pokemon/bulbasaur"]'), locale);
      const reject = page.getByRole('button', { name: /Tout refuser|Reject all|Alle ablehnen|Rifiuta tutto|すべて拒否|모두 거부|全部拒绝|Rechazar todo/ }).first();
      if (await reject.isVisible()) await reject.click();
      await page.waitForTimeout(1000);
      if (await reject.isVisible()) await reject.click();
      const state = await page.evaluate(() => ({ lang: document.documentElement.lang, dark: document.documentElement.classList.contains('dark'), overflow: document.documentElement.scrollWidth > innerWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, heading: document.querySelector('main h1')?.textContent }));
      evidence.browser.push({ locale, width, expectedDark: dark, ...state, errors, ok: state.lang === locale && state.dark === dark && !state.overflow && state.reducedMotion && errors.length === 0 });
      await page.screenshot({ path: `${values.output}/${locale}-${width}.png` });
    } catch (error) { evidence.browser.push({ locale, width, ok: false, error: error.message, errors }); }
    await context.close(); save();
  }
  async function simulation(name, init, action) {
    const context = await browser.newContext({ serviceWorkers: name === 'pwa-offline' ? 'allow' : 'block' });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try { await init(context, page); const detail = await action(context, page); evidence.simulations.push({ name, ok: errors.length === 0, detail, errors }); }
    catch (error) { evidence.simulations.push({ name, ok: false, error: error.message, errors }); await page.screenshot({ path: `${values.output}/${name}-failure.png` }); }
    await context.close(); save();
  }
  await simulation('storage-unavailable', async (context) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined });
      Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Unavailable', 'SecurityError'); } });
    });
  }, async (_context, page) => {
    await page.goto(`${values.base}/fr/pokedex?q=%23025`);
    await page.locator('main a[href*="/pokemon/pikachu"]').first().waitFor({ timeout: 30000 });
    return { heading: await page.locator('main h1').innerText() };
  });
  await simulation('out-of-order-tcg-language', async (_context, page) => {
    await page.route('**/api.tcgdex.net/v2/*/sets?**', async route => {
      const french = route.request().url().includes('/fr/');
      await new Promise(resolve => setTimeout(resolve, french ? 50 : 5000));
      await route.fulfill({ json: [{ id: 'base1', name: french ? 'FR fixture' : 'EN late fixture', releaseDate: '1999-01-09', cardCount: { total: 102, official: 102 } }] }).catch(() => {});
    });
  }, async (_context, page) => {
    await page.goto(`${values.base}/fr/tcg`);
    await page.getByRole('combobox', { name: 'Langue des cartes' }).selectOption('fr');
    await page.waitForFunction(() => document.querySelector('select[aria-label="Extension"]')?.textContent.includes('FR fixture'));
    await page.waitForTimeout(5500);
    const state = await page.getByRole('combobox', { name: 'Extension', exact: true }).textContent();
    if (state.includes('EN late fixture')) throw new Error('Stale language results replaced the current catalog');
    return { selectedLanguage: await page.getByRole('combobox', { name: 'Langue des cartes' }).inputValue(), options: state };
  });
  await simulation('pwa-offline', async () => {}, async (context, page) => {
    await page.goto(`${values.base}/fr/pokedex`);
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 });
    await page.reload();
    await page.locator('main a[href*="/pokemon/bulbasaur"]').first().waitFor();
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor();
    const visitedTitle = await page.title();
    await page.goto(`${values.base}/fr/not-visited-offline-audit`, { waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor();
    return { controlled: await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), visitedTitle, fallbackTitle: await page.title(), fallbackText: (await page.locator('main').innerText()).slice(0, 500) };
  });
  await simulation('tcg-keyboard-and-state', async () => {}, async (_context, page) => {
    await page.goto(`${values.base}/fr/tcg?set=sv03.5`);
    const card = page.getByRole('button', { name: /détails.*Bulbasaur|Bulbasaur.*détails/i }).first();
    await card.waitFor(); await card.focus(); await page.keyboard.press('Enter');
    await page.getByRole('dialog').first().waitFor();
    await page.waitForTimeout(300);
    const focusInside = await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')));
    if (!focusInside) throw new Error('Keyboard focus did not enter the card dialog');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').first().waitFor({ state: 'hidden' });
    if (!await card.evaluate(element => element === document.activeElement)) throw new Error('Dialog did not restore focus to the card');
    await page.getByRole('button', { name: 'Filtres', exact: true }).click();
    await page.getByRole('radio', { name: 'Vue liste', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => new URL(location.href).searchParams.get('view') === 'table');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('main [aria-labelledby="tcg-results-title"] .grid.grid-cols-1.gap-4 h3'));
    return { focusInside, focusRestored: true, viewAfterReload: new URL(page.url()).searchParams.get('view') };
  });
  await simulation('navigate-before-loading-completes', async (_context, page) => {
    await page.route('**/api.tcgdex.net/v2/*/sets?**', async route => {
      await new Promise(resolve => setTimeout(resolve, 4000));
      await route.fulfill({ json: [] }).catch(() => {});
    });
  }, async (_context, page) => {
    await page.goto(`${values.base}/fr/tcg`);
    await page.goto(`${values.base}/fr/pokedex?q=%23025`);
    await page.locator('main a[href*="/pokemon/pikachu"]').first().waitFor();
    await page.waitForTimeout(4500);
    if (!page.url().includes('/pokedex')) throw new Error('Late results changed the route');
    return { finalRoute: new URL(page.url()).pathname, search: new URL(page.url()).searchParams.get('q') };
  });
  await simulation('quiz-complete-local-game', async () => {}, async (_context, page) => {
    await page.goto(`${values.base}/en/quiz`);
    await page.getByRole('button', { name: 'Classic', exact: true }).click();
    let rounds = 0;
    for (; rounds < 25; rounds++) {
      const answer = page.locator('main button.h-14:not([disabled])').first();
      await answer.waitFor(); await answer.click();
      await page.waitForFunction(() => document.querySelectorAll('main button.h-14:not([disabled])').length === 4
        || [...document.querySelectorAll('main button')].some(button => button.textContent.trim() === 'Classic'));
      if (await page.getByRole('button', { name: 'Classic', exact: true }).isVisible()) break;
    }
    if (rounds === 25) throw new Error('Quiz did not finish within 25 rounds');
    const reject = page.getByRole('button', { name: 'Reject all', exact: true });
    if (await reject.isVisible()) await reject.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${values.output}/quiz-completed.png` });
    return { completed: true, rounds: rounds + 1, authenticated: false };
  });
} finally { await browser.close(); }
evidence.finishedAt = new Date().toISOString(); save();
const failed = [...evidence.http, ...evidence.browser, ...evidence.simulations].filter(row => !row.ok);
console.log(JSON.stringify({ http: evidence.http.length, browser: evidence.browser.length, simulations: evidence.simulations.length, failed }, null, 2));
if (failed.length) process.exitCode = 1;
