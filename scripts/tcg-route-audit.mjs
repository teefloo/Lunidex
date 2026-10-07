/** Read-only HTTP audit. Catalog listings cost one request per data language.
 * Default route coverage is bounded; --all must be explicitly requested.
 * node scripts/tcg-route-audit.mjs --base http://localhost:3105 --output /tmp/tcg-audit.json
 * Reuse the report's catalog without upstream reads: --catalog /tmp/tcg-audit.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const locales = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
const dataLanguages = ['en', 'fr', 'es', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'nl', 'pl', 'ru', 'ja', 'ko', 'zh-tw', 'id', 'th', 'zh-cn'];
const { values } = parseArgs({ options: {
  base: { type: 'string', default: 'https://lunidex.app' },
  'canonical-origin': { type: 'string', default: 'https://lunidex.app' },
  locales: { type: 'string', default: 'en,fr,de,ja,zh' },
  sets: { type: 'string' },
  catalog: { type: 'string' },
  'catalog-languages': { type: 'string', default: dataLanguages.join(',') },
  output: { type: 'string' },
  all: { type: 'boolean', default: false },
  'skip-sitemaps': { type: 'boolean', default: false },
  'max-requests': { type: 'string', default: '100' },
} });
const base = new URL(values.base).origin;
const canonicalOrigin = new URL(values['canonical-origin']).origin;
const selectedLocales = values.locales.split(',');
if (selectedLocales.some(locale => !locales.includes(locale))) throw new Error('Unknown UI locale');
const maxRequests = Number(values['max-requests']);
if (!Number.isInteger(maxRequests) || maxRequests < 1) throw new Error('Invalid request budget');
const report = {
  checkedAt: new Date().toISOString(), base, canonicalOrigin, requests: 0,
  catalog: {}, routes: [], internalLinks: [], sitemaps: {}, errors: [],
  limitations: ['Internal HTTP checks sample at most six links; every rendered link is checked for locale and TCG-language consistency.'],
};
const requests = new Map();
const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(match => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));
}
function readMetadata(html) {
  const document = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const links = [...document.matchAll(/<link\b[^>]*>/gi)].map(match => attributes(match[0]));
  const metas = [...document.matchAll(/<meta\b[^>]*>/gi)].map(match => attributes(match[0]));
  return {
    title: decode(document.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    canonical: links.find(link => link.rel === 'canonical')?.href ?? null,
    alternates: Object.fromEntries(links.filter(link => link.hreflang).map(link => [link.hreflang, link.href])),
    robots: metas.filter(meta => ['robots', 'googlebot'].includes(meta.name)).map(meta => meta.content).join(', '),
    og: Object.fromEntries(metas.filter(meta => meta.property?.startsWith('og:')).map(meta => [meta.property.slice(3), meta.content])),
    htmlLanguage: document.match(/<html\b[^>]*\blang="([^"]*)"/i)?.[1],
    links: [...new Set([...document.matchAll(/<a\b[^>]*>/gi)].map(match => attributes(match[0]).href).filter(Boolean))],
  };
}
async function get(url) {
  if (requests.has(url)) return requests.get(url);
  if (++report.requests > maxRequests) throw new Error(`Request budget ${maxRequests} exceeded; narrow the scope or explicitly increase --max-requests`);
  const pending = (async () => {
    const response = await fetch(url, {
      redirect: 'manual', signal: AbortSignal.timeout(45000),
      headers: { accept: 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8', 'user-agent': 'LunidexTechnicalSEOAudit/1.0' },
    });
    const result = { url, status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
    if (response.headers.get('x-vercel-mitigated') === 'challenge') {
      throw new Error(`Vercel challenge at ${url} (${response.status}); origin status is unverified, stopping redundant requests`);
    }
    return result;
  })();
  requests.set(url, pending);
  return pending;
}
function localUrl(url) {
  const target = new URL(url, canonicalOrigin);
  if (target.origin !== canonicalOrigin) throw new Error(`Foreign SEO target: ${target.href}`);
  return `${base}${target.pathname}${target.search}`;
}
function error(url, message) { report.errors.push({ url, message }); }
let robots = '';
function robotsAllows(pathname) {
  const groups = robots.split(/\n\s*\n/).filter(group => /^user-agent:\s*\*\s*$/im.test(group) || /^user-agent:\s*Googlebot\s*$/im.test(group));
  const rules = groups.flatMap(group => [...group.matchAll(/^(allow|disallow):\s*(\S+)/gim)].map(([, action, path]) => ({ action: action.toLowerCase(), path })));
  const matches = rules.filter(rule => {
    const pattern = rule.path.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*').replace(/\\\$$/, '$');
    return new RegExp(`^${pattern}`).test(pathname);
  }).sort((a, b) => b.path.length - a.path.length || (a.action === 'allow' ? -1 : 1));
  return matches[0]?.action !== 'disallow';
}
const checkedPages = new Map();
async function checkPage(path) {
  if (checkedPages.has(path)) return checkedPages.get(path);
  const response = await get(`${base}${path}`);
  const metadata = readMetadata(response.body);
  const result = {
    path, status: response.status, location: response.headers.location ?? null,
    title: metadata.title, canonical: metadata.canonical, robots: metadata.robots,
    xRobotsTag: response.headers['x-robots-tag'] ?? null, hreflang: metadata.alternates,
    og: metadata.og, htmlLanguage: metadata.htmlLanguage,
    cache: { age: response.headers.age, vercel: response.headers['x-vercel-cache'], control: response.headers['cache-control'], cdn: response.headers['cdn-cache-control'] },
    tcgLanguage: new URL(path, base).searchParams.get('tcgLang') ?? 'en',
  };
  checkedPages.set(path, { result, metadata });
  report.routes.push(result);
  if (response.status !== 200) { error(path, `HTTP ${response.status}${result.location ? ` redirect to ${result.location}` : ''}`); return { result, metadata }; }
  if (!metadata.title) error(path, 'Missing title');
  if (!metadata.canonical) error(path, 'Missing canonical');
  else {
    const canonical = new URL(metadata.canonical, canonicalOrigin);
    const expected = new URL(path, canonicalOrigin);
    if (result.tcgLanguage === 'en') expected.searchParams.delete('tcgLang');
    if (canonical.href !== expected.href) error(path, `Canonical language/path mismatch: ${canonical.href}, expected ${expected.href}`);
    const target = await get(localUrl(canonical.href));
    result.canonicalStatus = target.status;
    if (target.status !== 200) error(path, `Canonical returns HTTP ${target.status}`);
    const targetMeta = readMetadata(target.body);
    if (targetMeta.canonical !== canonical.href) error(path, 'Canonical target is not self-canonical');
    if (!/noindex|none/i.test(metadata.robots) && /noindex|none/i.test(`${targetMeta.robots},${target.headers['x-robots-tag'] ?? ''}`)) error(path, 'Indexable page points to a noindex canonical');
  }
  if (!metadata.robots) error(path, 'Missing explicit robots policy');
  if (/noindex|none/i.test(result.xRobotsTag ?? '') && !/noindex|none/i.test(metadata.robots)) error(path, 'HTTP robots header blocks an indexable page');
  if (!robotsAllows(path)) error(path, 'Blocked by robots.txt');
  if (metadata.htmlLanguage !== path.split('/')[1]) error(path, `HTML/URL language mismatch: ${metadata.htmlLanguage}`);
  for (const field of ['title', 'description', 'url', 'image']) if (!metadata.og[field]) error(path, `Missing OG ${field}`);
  if (metadata.og.url !== metadata.canonical) error(path, 'OG URL differs from canonical');
  for (const href of metadata.links) {
    const link = new URL(href, `${base}${path}`);
    if (![base, canonicalOrigin].includes(link.origin)) continue;
    if (/\/tcg\/(?:sets|cards)\//.test(link.pathname)) {
      if (link.pathname.split('/')[1] !== path.split('/')[1]) error(path, `Internal link loses UI locale: ${href}`);
      if ((link.searchParams.get('tcgLang') ?? 'en') !== result.tcgLanguage) error(path, `Internal link loses TCG language: ${href}`);
    }
  }
  return { result, metadata };
}
async function main() {
  if (values.catalog) report.catalog = JSON.parse(readFileSync(values.catalog, 'utf8')).catalog;
  else for (const language of values['catalog-languages'].split(',')) {
    if (!dataLanguages.includes(language)) throw new Error(`Unknown data language ${language}`);
    const response = await get(`https://api.tcgdex.net/v2/${language}/sets`);
    if (response.status !== 200) { error(response.url, `Catalog HTTP ${response.status}`); continue; }
    const sets = JSON.parse(response.body);
    if (!Array.isArray(sets) || sets.some(set => typeof set.id !== 'string' || typeof set.name !== 'string')) throw new Error(`Invalid catalog ${language}`);
    report.catalog[language] = sets.map(({ id, name, cardCount }) => ({ id, name, cardCount }));
  }
  const english = report.catalog.en;
  if (!english?.length) throw new Error('English catalog is unavailable');
  const selectedSets = values.sets?.split(',') ?? (values.all ? english.map(set => set.id) : ['base1', 'base2', english.findLast(set => (set.cardCount?.total ?? 0) > 0 && !['base1', 'base2'].includes(set.id))?.id].filter(Boolean));
  if (selectedSets.some(id => !english.some(set => set.id === id))) throw new Error('Requested set absent from the real English catalog');
  report.selectedSets = selectedSets;
  const robotsResponse = await get(`${base}/robots.txt`);
  robots = robotsResponse.body;
  if (robotsResponse.status !== 200) error('/robots.txt', `HTTP ${robotsResponse.status}`);
  for (const locale of selectedLocales) for (const id of selectedSets) await checkPage(`/${locale}/tcg/sets/${encodeURIComponent(id)}`);
  // Compare clean/explicit default URLs and one translated data variant.
  for (const locale of selectedLocales) {
    await checkPage(`/${locale}/tcg/sets/base1?tcgLang=en`);
    if (report.catalog.fr?.some(set => set.id === 'base1')) await checkPage(`/${locale}/tcg/sets/base1?tcgLang=fr`);
  }
  const regional = report.catalog.ja?.find(set => !english.some(other => other.id === set.id));
  if (regional) await checkPage(`/ja/tcg/sets/${encodeURIComponent(regional.id)}?tcgLang=ja`);
  // Every alternate in sampled clusters is checked once, including reciprocals.
  for (const { result, metadata } of [...checkedPages.values()]) {
    for (const [language, href] of Object.entries(metadata.alternates)) {
      if (!locales.includes(language) && language !== 'x-default') { error(result.path, `Invalid hreflang ${language}`); continue; }
      const alternateUrl = new URL(href, canonicalOrigin);
      if (language !== 'x-default' && alternateUrl.pathname.split('/')[1] !== language) error(result.path, `Wrong hreflang locale ${href}`);
      const alternate = await checkPage(`${alternateUrl.pathname}${alternateUrl.search}`);
      if (alternate.result.canonical !== href) error(result.path, `Non-canonical hreflang ${href}`);
      if (!/noindex|none/i.test(result.robots) && /noindex|none/i.test(alternate.result.robots)) error(result.path, `Noindex hreflang ${href}`);
      if (Object.keys(metadata.alternates).length && alternate.metadata.alternates[result.path.split('/')[1]] !== result.canonical) error(result.path, `Nonreciprocal hreflang ${href}`);
    }
    if (Object.keys(metadata.alternates).length && metadata.alternates[result.path.split('/')[1]] !== result.canonical) error(result.path, 'Missing self hreflang');
  }
  if (values['skip-sitemaps']) report.limitations.push('Sitemap HTTP verification explicitly skipped; run against production to verify cached documents.');
  else for (const locale of new Set(report.routes.map(route => route.path.split('/')[1]))) {
    const path = `/sitemaps/tcg-sets${locale === 'en' ? '' : `-${locale}`}.xml`;
    const response = await get(`${base}${path}`);
    const locations = [...response.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
    report.sitemaps[locale] = { path, status: response.status, count: locations.length };
    if (response.status !== 200) error(path, `Sitemap HTTP ${response.status}`);
    for (const route of report.routes.filter(route => route.path.split('/')[1] === locale && !route.path.includes('?'))) {
      route.inSitemap = locations.includes(route.canonical);
      if (!/noindex|none/i.test(route.robots) && !route.inSitemap) error(route.path, 'Indexable canonical is absent from sitemap');
    }
  }
  // Bound live internal-link checking; avoid fetching hundreds of checklist cards.
  for (const { result, metadata } of checkedPages.values()) {
    if (report.internalLinks.length >= 6) break;
    const href = metadata.links.find(href => /\/tcg\/cards\//.test(href));
    if (!href) continue;
    const url = new URL(href, `${canonicalOrigin}${result.path}`);
    const response = await get(localUrl(url.href));
    report.internalLinks.push({ from: result.path, url: url.href, status: response.status });
    if (response.status !== 200) error(result.path, `Internal link HTTP ${response.status}: ${href}`);
  }
}
try { await main(); } catch (failure) { error(base, failure instanceof Error ? failure.message : String(failure)); }
if (values.output) writeFileSync(values.output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ requests: report.requests, catalogs: Object.fromEntries(Object.entries(report.catalog).map(([lang, sets]) => [lang, sets.length])), routes: report.routes.length, failures: report.errors }, null, 2));
process.exitCode = report.errors.length ? 1 : 0;
