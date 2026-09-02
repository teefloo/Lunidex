import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sitemapSource = await readFile(join(projectRoot, 'src/lib/sitemap.ts'), 'utf8');
const routeSource = await readFile(join(projectRoot, 'src/app/sitemaps/[name]/route.ts'), 'utf8');
const proxySource = await readFile(join(projectRoot, 'src/proxy.ts'), 'utf8');
const blogSource = await readFile(join(projectRoot, 'src/app/blog/page.tsx'), 'utf8');
const tcgDeskSource = await readFile(join(projectRoot, 'src/components/tcg/TCGResearchDesk.tsx'), 'utf8');
const tcgLayoutSource = await readFile(join(projectRoot, 'src/app/tcg/layout.tsx'), 'utf8');
const pokemonLayoutSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/layout.tsx'), 'utf8');
const pokemonPageSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/page.tsx'), 'utf8');
const pokemonClientSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/PokemonDetailClient.tsx'), 'utf8');
const editorialSource = await readFile(join(projectRoot, 'src/lib/editorial.ts'), 'utf8');
const localeFiles = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
const localeSources = await Promise.all(localeFiles.map((locale) => readFile(join(projectRoot, `src/lib/i18n/${locale}.ts`), 'utf8')));
const localeSource = localeSources.join('\n');

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

// Keep structured data and document landmarks aligned with the visible pages.
check(blogSource.includes("'@type': 'ItemList'"), 'Blog page is missing its ItemList schema');
check(blogSource.includes("'@type': 'ListItem'"), 'Blog ItemList does not contain named ListItems');
check(blogSource.includes('name: article.title'), 'Blog ItemList entries must expose the visible article title');
check(!blogSource.includes("item: { '@type': 'Article'"), 'Blog ItemList must not embed Article objects for list entries');
check(!tcgDeskSource.includes('<main className="min-w-0 space-y-4">'), 'TCG results must not nest a second main landmark');
check(tcgDeskSource.includes('aria-labelledby="tcg-results-title"'), 'TCG results section needs a named landmark');
check(!tcgLayoutSource.includes('export async function generateMetadata'), 'TCG layout must not duplicate catalog metadata');
check(!pokemonLayoutSource.includes('export async function generateMetadata'), 'Pokémon layout must not define duplicate metadata');
check(!pokemonLayoutSource.includes('bulbapedia'), 'Pokémon JSON-LD must not invent a Bulbapedia sameAs link');
check(!pokemonLayoutSource.includes('speakable'), 'Pokémon JSON-LD must not use the broad speakable hint');
check(!pokemonPageSource.includes('citation_title') && !pokemonPageSource.includes('DC.'), 'Pokémon metadata must not contain artificial citation fields');
check(pokemonClientSource.includes('<main id="main-content"'), 'Pokémon detail page must expose a single main landmark');
check(pokemonPageSource.includes('alternates:') && pokemonPageSource.includes('supportedLanguages.map'), 'Pokémon metadata must expose the localized canonical/hreflang map');
check(editorialSource.includes('buildEditorialLanguages'), 'Editorial routes must expose the limited translated hreflang map');
check(editorialSource.includes("'platform',\n  'scope',\n  'scanner',\n  'prices',\n  'offline',\n  'accountSync',\n  'cost'"), 'Editorial comparison matrix keys are incomplete');
check(editorialSource.includes('sources: readonly EditorialSource[]'), 'Editorial articles must expose a typed source list');

const forbiddenClaims = [
  'most complete Pokédex',
  'complete Pokédex of all 1025',
  'competitive builds',
  'optimal builds',
  'best pokemon team',
  'pokemon builds',
  'the ultimate online pokédex',
  'le pokédex le plus complet',
  'tu compañero pokémon definitivo',
  'dein ultimativer begleiter',
  'il tuo compagno pokémon definitivo',
  '究極のポケモンコンパニオン',
  '최고의 포켓몬 동반자',
  '终极宝可梦伴侣',
];
for (const claim of forbiddenClaims) check(!localeSource.toLowerCase().includes(claim.toLowerCase()), `Forbidden SEO claim remains in translations: ${claim}`);
check(!/(?:1025|1,025|1 025|1\.025)/.test(localeSource), 'Fixed Pokémon counts must not remain in localized SEO copy');
check(localeSource.includes('team_description:') && localeSource.includes('collection_guide:'), 'Team and collection guide metadata keys are missing');
check(localeSources[0].includes("team_description: 'Build up to six Pokémon") || localeSources[0].includes('team_description: \'Build up to six Pokémon'), 'Team metadata must target immediate team use');
check(localeSources[0].includes("page_description: 'Browse the Pokémon Trading Card Game catalog."), 'TCG metadata must target the public catalog');
check(localeSources[0].includes("meta_description: 'Learn what to look for in a Pokémon card collection tracker"), 'Collection guide metadata must target collection organization');
const teamDescription = localeSources[0].match(/team_description:\s*'([^']+)'/)?.[1];
const collectionDescription = localeSources[0].match(/collection_guide:\s*\{[\s\S]*?meta_description:\s*'([^']+)'/)?.[1];
check(Boolean(teamDescription && collectionDescription && teamDescription !== collectionDescription), 'Team and collection guide snippets must remain distinct');

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

    const mainCount = (html.match(/<main\b/gi) ?? []).length;
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    check(mainCount === 1, `${url} must render exactly one main landmark (found ${mainCount})`);
    check(h1Count === 1, `${url} must render exactly one h1 (found ${h1Count})`);

    const canonicalLinks = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
    check(canonicalLinks.length === 1, `${url} must render exactly one canonical link (found ${canonicalLinks.length})`);
    const alternateLinks = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)];
    check(alternateLinks.length >= 3, `${url} must expose reciprocal locale links (found ${alternateLinks.length})`);
    for (const match of alternateLinks) {
      const tag = match[0];
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const hreflang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
      check(Boolean(href && hreflang), `${url} has an incomplete hreflang link`);
      if (href && hreflang && hreflang !== 'x-default') {
        try {
          const alternateUrl = new URL(href);
          check(/^\/(en|fr|es|de|it|ja|ko|zh)(\/|$)/.test(alternateUrl.pathname), `${url} has an invalid hreflang path: ${href}`);
        } catch {
          check(false, `${url} has an invalid hreflang URL: ${href}`);
        }
      }
    }

    const jsonLdScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const match of jsonLdScripts) {
      try {
        JSON.parse(match[1]);
      } catch {
        check(false, `${url} contains invalid JSON-LD`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `SEO CHECK FAILED: ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`SEO live checks passed: ${allUrls.size} unique sitemap URLs.`);
