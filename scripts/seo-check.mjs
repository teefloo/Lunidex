import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sitemapSource = await readFile(join(projectRoot, 'src/lib/sitemap.ts'), 'utf8');
const routeSource = await readFile(join(projectRoot, 'src/app/sitemaps/[name]/route.ts'), 'utf8');
const proxySource = await readFile(join(projectRoot, 'src/proxy.ts'), 'utf8');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const families = ['static', 'guides', 'pokemon', 'tcg-sets', 'tcg-cards', 'moves', 'abilities', 'items'];
for (const family of families) check(sitemapSource.includes(`'${family}'`), `Missing sitemap family: ${family}`);

check(sitemapSource.includes('assertSitemapIntegrity'), 'Sitemap integrity guard is not wired');
check(routeSource.includes('status: 503'), 'Specialized sitemap route does not fail explicitly');
check(proxySource.includes('sitemaps/'), 'Proxy matcher does not exclude specialized sitemaps');
check(!sitemapSource.includes('<priority>'), 'Sitemap source must not emit priority hints');

const forbiddenPaths = ['/dashboard', '/favorites', '/friends', '/tcg/collection', '/tcg/wishlist', '/tcg/start'];
for (const path of forbiddenPaths) check(sitemapSource.includes(path), `Expected private-path guard is missing: ${path}`);

const invalidMarkers = ['/types-Types', '/blog-博客', '/team-Team-Builder', '/pokedex-Pokédex', '/en-0', '/zh-0'];
for (const marker of invalidMarkers) check(sitemapSource.includes(marker), `Expected legacy-URL guard is missing: ${marker}`);

if (failures.length > 0) {
  console.error(failures.map((failure) => `SEO CHECK FAILED: ${failure}`).join('\n'));
  process.exit(1);
}

const baseUrl = process.env.SEO_BASE_URL;
if (!baseUrl) {
  console.log('SEO source checks passed. Set SEO_BASE_URL to validate the deployed sitemap index and child files.');
  process.exit(0);
}

const origin = new URL(baseUrl).origin;
const response = await fetch(`${origin}/sitemap.xml`, { redirect: 'manual' });
check(response.status === 200, `Sitemap index returned HTTP ${response.status}`);
const indexXml = await response.text();
check(indexXml.includes('<sitemapindex'), 'Sitemap index is not a sitemapindex document');

const childUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(childUrls.length === families.length, `Expected ${families.length} child sitemaps, found ${childUrls.length}`);

const allUrls = new Set();
const samples = [];
for (const childUrl of childUrls) {
  const parsedChild = new URL(childUrl);
  check(parsedChild.origin === origin, `Child sitemap has a foreign origin: ${childUrl}`);
  const childResponse = await fetch(childUrl, { redirect: 'manual' });
  check(childResponse.status === 200, `${childUrl} returned HTTP ${childResponse.status}`);
  const xml = await childResponse.text();
  check(xml.includes('<urlset'), `${childUrl} is not a urlset document`);

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  console.log(`${childUrl}: ${urls.length} URLs`);
  check(urls.length > 0, `${childUrl} is empty`);

  for (const value of urls) {
    const url = new URL(value);
    check(url.origin === origin, `Foreign URL in ${childUrl}: ${value}`);
    check(/^\/(en|fr|es|de|it|ja|ko|zh)(\/|$)/.test(url.pathname), `Invalid locale in ${childUrl}: ${value}`);
    check(!/[?#[\]]/.test(value), `Query, fragment, or bracket in sitemap URL: ${value}`);
    check(!forbiddenPaths.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`)), `Private URL in ${childUrl}: ${value}`);
    check(!invalidMarkers.some((marker) => url.pathname.includes(marker)), `Invalid legacy URL in ${childUrl}: ${value}`);
    check(!allUrls.has(value), `Duplicate URL across sitemaps: ${value}`);
    allUrls.add(value);
    if (samples.length < 12) samples.push(value);
  }
}

if (process.env.SEO_CHECK_HTTP === '1') {
  for (const url of samples) {
    const pageResponse = await fetch(url, { redirect: 'manual' });
    check(pageResponse.status >= 200 && pageResponse.status < 300, `${url} returned HTTP ${pageResponse.status}`);
    const html = await pageResponse.text();
    check(!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html), `Sample URL is noindex: ${url}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `SEO CHECK FAILED: ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`SEO live checks passed: ${allUrls.size} unique sitemap URLs.`);
