import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const nextConfigSource = await readFile(join(projectRoot, 'next.config.ts'), 'utf8');
const siteSource = await readFile(join(projectRoot, 'src/lib/site.ts'), 'utf8');
const sitemapSource = await readFile(join(projectRoot, 'src/lib/sitemap.ts'), 'utf8');
const routeSource = await readFile(join(projectRoot, 'src/app/sitemaps/[name]/route.ts'), 'utf8');
const proxySource = await readFile(join(projectRoot, 'src/proxy.ts'), 'utf8');
const blogSource = await readFile(join(projectRoot, 'src/app/blog/page.tsx'), 'utf8');
const tcgDeskSource = await readFile(join(projectRoot, 'src/components/tcg/TCGResearchDesk.tsx'), 'utf8');
const tcgLayoutSource = await readFile(join(projectRoot, 'src/app/tcg/layout.tsx'), 'utf8');
const pokemonLayoutSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/layout.tsx'), 'utf8');
const pokemonPageSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/page.tsx'), 'utf8');
const pokemonClientSource = await readFile(join(projectRoot, 'src/app/pokemon/[name]/PokemonDetailClient.tsx'), 'utf8');
const compareLayoutSource = await readFile(join(projectRoot, 'src/app/compare/layout.tsx'), 'utf8');
const editorialGuideRouteSource = await readFile(join(projectRoot, 'src/app/guides/[slug]/page.tsx'), 'utf8');
const editorialCompareRouteSource = await readFile(join(projectRoot, 'src/app/compare/[slug]/page.tsx'), 'utf8');
const homeArchiveSource = await readFile(join(projectRoot, 'src/components/home/HomeArchiveExperience.tsx'), 'utf8');
const footerSource = await readFile(join(projectRoot, 'src/components/layout/SiteFooter.tsx'), 'utf8');
const tcgPageSource = await readFile(join(projectRoot, 'src/app/tcg/page.tsx'), 'utf8');
const pokedexPageSource = await readFile(join(projectRoot, 'src/app/pokedex/page.tsx'), 'utf8');
const teamPageSource = await readFile(join(projectRoot, 'src/app/team/page.tsx'), 'utf8');
const layoutSource = await readFile(join(projectRoot, 'src/app/layout.tsx'), 'utf8');
const editorialSource = await readFile(join(projectRoot, 'src/lib/editorial.ts'), 'utf8');
const seoSource = await readFile(join(projectRoot, 'src/lib/seo.ts'), 'utf8');
const localeFiles = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
const localeSources = await Promise.all(localeFiles.map((locale) => readFile(join(projectRoot, `src/lib/i18n/${locale}.ts`), 'utf8')));
const localeSource = localeSources.join('\n');
const llmsSource = await readFile(join(projectRoot, 'public/llms.txt'), 'utf8');
const llmsFullSource = await readFile(join(projectRoot, 'public/llms-full.txt'), 'utf8');
const aiSource = await readFile(join(projectRoot, 'public/ai.txt'), 'utf8');
const aiAssets = { 'llms.txt': llmsSource, 'llms-full.txt': llmsFullSource, 'ai.txt': aiSource };
const canonicalOrigin = new URL(siteSource.match(/export const SITE_URL = '([^']+)'/)?.[1] ?? 'https://lunidex.app').origin;

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
check(!nextConfigSource.includes("source: '/pokedex'"), 'Valid /pokedex route must not redirect to the home page');
check(!nextConfigSource.includes("source: '/pokemon'"), 'Legacy /pokemon alias must be handled by the localized route');
check(proxySource.includes("segments.length === 2 && segments[1] === 'pokemon'"), 'Localized /pokemon alias must redirect before rendering');
check(proxySource.includes("const isLegacyPokemonIndex"), 'Unlocalized /pokemon alias must preserve the locale redirect target');

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
check(editorialSource.includes("'wishlist'") && editorialSource.includes("'pokedex'") && editorialSource.includes("'teamBuilder'") && editorialSource.includes("'openSource'") && editorialSource.includes("'limits'"), 'Editorial comparison matrix keys are incomplete');
check(editorialSource.includes('sources: readonly EditorialSource[]'), 'Editorial articles must expose a typed source list');
check(editorialSource.includes("slug: 'pokellector'") && editorialSource.includes('https://www.pokellector.com/'), 'Editorial registry omits the Pokéllector source-backed entry');
check(editorialSource.includes("slug: 'cardzia'") && editorialSource.includes('https://cardzia.fr/') && editorialSource.includes('play.google.com/store/apps/details?id=fr.cardzia.app'), 'Editorial registry omits the Cardzia source-backed entry');
check(editorialSource.includes("slug: 'cardmarket'") && editorialSource.includes('/compare/lunidex-vs-cardmarket'), 'Editorial registry omits the Cardmarket comparison');
check(editorialSource.includes("slug: 'dex'") && editorialSource.includes('https://dextcg.com/help/collection/scanning-your-cards'), 'Editorial registry omits the source-backed Dex comparison');
check(editorialSource.includes("slug: 'pokemon-card-collection-value'") && editorialSource.includes('/guides/pokemon-card-collection-value'), 'Editorial registry omits the collection value guide');
check(seoSource.includes('CREATOR_PERSON_ID') && layoutSource.includes('buildCreatorJsonLd'), 'Root entity graph is missing the verified creator node');
check(!compareLayoutSource.includes('buildBreadcrumbJsonLd'), 'Comparison layout must not emit a duplicate breadcrumb');
check(editorialGuideRouteSource.includes('shouldIndex ? { languages: buildEditorialLanguages(guide.path) }'), 'Fallback guide locales must not emit hreflang links');
check(editorialCompareRouteSource.includes('shouldIndex ? { languages: buildEditorialLanguages(article.path) }'), 'Fallback comparison locales must not emit hreflang links');

for (const [assetName, assetSource] of Object.entries(aiAssets)) {
  const reviewDate = assetSource.match(/reviewed against (?:the )?(?:application )?source(?: on|:)\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  check(Boolean(reviewDate), `${assetName} has no machine-readable review date`);
  if (reviewDate) {
    const timestamp = Date.parse(`${reviewDate}T00:00:00Z`);
    const ageDays = Math.floor((Date.now() - timestamp) / 86_400_000);
    check(Number.isFinite(timestamp) && ageDays >= 0 && ageDays <= 90, `${assetName} review date is in the future or older than 90 days: ${reviewDate}`);
  }
}

const genericIntentPaths = [
  '/en/pokedex',
  '/en/team',
  '/en/nuzlocke',
  '/en/guides/pokemon-card-collection-tracker',
  '/en/guides/tcg-workspace-guide',
  '/en/guides/pokemon-reference-guide',
  '/en/guides/team-tools-guide',
  '/en/guides/team-builder-guide',
  '/en/guides/pokemon-card-collection-value',
  '/en/guides/organize-pokemon-card-collection',
  '/fr/guides/organize-pokemon-card-collection',
  '/en/compare/lunidex-vs-collectr',
  '/en/compare/lunidex-vs-pokecardex',
  '/en/compare/lunidex-vs-zebradex',
  '/en/compare/lunidex-vs-pokellector',
  '/en/compare/lunidex-vs-cardzia',
  '/en/compare/lunidex-vs-cardmarket',
  '/en/compare/lunidex-vs-dex',
  '/fr/compare/lunidex-vs-dex',
];
for (const path of genericIntentPaths) {
  check(llmsSource.includes(path), `AI asset omits the canonical intent route: ${path}`);
}

for (const path of [
  '/guides/pokemon-card-collection-tracker',
  '/guides/organize-pokemon-card-collection',
  '/guides/pokemon-card-collection-value',
  '/guides/team-builder-guide',
]) {
  check(homeArchiveSource.includes(path), `Home page is missing a direct editorial link: ${path}`);
}

check(tcgPageSource.includes('/guides/pokemon-card-collection-tracker') && tcgPageSource.includes('/guides/pokemon-card-collection-value'), 'TCG catalog is missing direct collection guide links');
check(pokedexPageSource.includes('/guides/pokemon-reference-guide'), 'Pokédex is missing a direct Pokémon reference guide link');
check(teamPageSource.includes("href={localeHref('/guides/team-builder-guide')}") && teamPageSource.indexOf("href={localeHref('/guides/team-builder-guide')}") < teamPageSource.indexOf('<details className="team-builder-help">'), 'Team Builder guide link must be directly visible outside the collapsed help menu');

const compactFooterLinks = footerSource.match(/const compactLinks: FooterLinkData\[\] = \[([\s\S]*?)\n  \];/)?.[1] ?? '';
check(compactFooterLinks.includes("href: '/blog'"), 'Compact footer is missing the blog link');

const forbiddenAiPatterns = [
  /(?:most complete|ultimate)\s+(?:online\s+)?pok[eé]dex/i,
  /\bbest\s+pokemon\b/i,
  /\b(?:1025|1,025|1 025|1\.025)\b/,
  /guaranteed\s+(?:market|collection|price|valuation)/i,
];
for (const [assetName, assetSource] of Object.entries(aiAssets)) {
  for (const pattern of forbiddenAiPatterns) {
    check(!pattern.test(assetSource), `${assetName} contains a forbidden unsupported claim: ${pattern}`);
  }
  check(!/\bLunidex\b[^\n]{0,120}\b(?:App Store|Google Play)\b/i.test(assetSource), `${assetName} claims current Lunidex store availability`);
}

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
check(localeSources[0].includes("meta_description: 'Learn how to choose a Pokémon card collection app and tracker"), 'Collection guide metadata must target collection organization');
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

const runtimeOrigin = new URL(baseUrl).origin;
const runtimeUrl = (canonicalUrl) => new URL(new URL(canonicalUrl).pathname, runtimeOrigin).href;
const response = await fetch(`${runtimeOrigin}/sitemap.xml`, { redirect: 'manual' });
check(response.status === 200, `Sitemap index returned HTTP ${response.status}`);
const indexXml = await response.text();
check(indexXml.includes('<sitemapindex'), 'Sitemap index is not a sitemapindex document');

const childUrls = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const locales = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
const expectedSitemapFiles = families.length * locales.length + locales.length * 3;
check(childUrls.length === expectedSitemapFiles, `Expected ${expectedSitemapFiles} localized sitemap files, found ${childUrls.length}`);

const allUrls = new Set();
const urlRecords = new Map();
for (const childUrl of childUrls) {
  const parsedChild = new URL(childUrl);
  check(parsedChild.origin === canonicalOrigin, `Child sitemap has a foreign origin: ${childUrl}`);
  const childResponse = await fetch(runtimeUrl(childUrl), { redirect: 'manual' });
  check(childResponse.status === 200, `${runtimeUrl(childUrl)} returned HTTP ${childResponse.status}`);
  const xml = await childResponse.text();
  check(xml.includes('<urlset'), `${childUrl} is not a urlset document`);
  check([...xml.matchAll(/<url>/g)].length <= 50_000, `${childUrl} exceeds the 50,000 URL protocol limit`);
  check(Buffer.byteLength(xml, 'utf8') <= 50 * 1024 * 1024, `${childUrl} exceeds the 50 MB protocol limit`);

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  console.log(`${childUrl}: ${urls.length} URLs`);
  check(urls.length > 0, `${childUrl} is empty`);

  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  check(blocks.length === urls.length, `${childUrl} has malformed URL entries`);
  for (const block of blocks) {
    const value = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!value) continue;
    const url = new URL(value);
    check(url.origin === canonicalOrigin, `Foreign URL in ${childUrl}: ${value}`);
    const localeMatch = url.pathname.match(/^\/(en|fr|es|de|it|ja|ko|zh)(?=\/|$)/);
    check(Boolean(localeMatch), `Invalid locale in ${childUrl}: ${value}`);
    check(!/[?#[\]]/.test(value), `Query, fragment, or bracket in sitemap URL: ${value}`);
    const pathWithoutLocale = url.pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/, '') || '/';
    const privateSealedPath = pathWithoutLocale === '/tcg/sealed'
      || (pathWithoutLocale.startsWith('/tcg/sealed/') && pathWithoutLocale !== '/tcg/sealed/market');
    check(!privateSealedPath && !forbiddenPaths.some((path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)), `Private URL in ${childUrl}: ${value}`);
    check(!invalidMarkers.some((marker) => url.pathname.includes(marker)), `Invalid legacy URL in ${childUrl}: ${value}`);
    check(!allUrls.has(value), `Duplicate URL across sitemaps: ${value}`);
    allUrls.add(value);

    const alternates = new Map();
    for (const match of block.matchAll(/<xhtml:link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*\/>/g)) {
      const [, language, href] = match;
      check(!alternates.has(language), `${value} repeats hreflang ${language}`);
      alternates.set(language, href);
      try {
        const alternateUrl = new URL(href);
        check(alternateUrl.origin === canonicalOrigin, `${value} has a foreign hreflang URL: ${href}`);
        const alternateLocale = alternateUrl.pathname.match(/^\/(en|fr|es|de|it|ja|ko|zh)(?=\/|$)/)?.[1];
        check(Boolean(alternateLocale), `${value} has an invalid hreflang path: ${href}`);
        if (language !== 'x-default') check(alternateLocale === language, `${value} hreflang ${language} points to the wrong locale: ${href}`);
        const alternatePath = alternateUrl.pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/, '') || '/';
        check(alternatePath === pathWithoutLocale, `${value} has a non-matching alternate path: ${href}`);
      } catch {
        check(false, `${value} has an invalid hreflang URL: ${href}`);
      }
    }
    const pageLocale = localeMatch?.[1];
    check(Boolean(pageLocale && alternates.get(pageLocale) === value), `${value} is missing its own hreflang entry`);
    urlRecords.set(value, { pageLocale, alternates });
  }
}

for (const [url, record] of urlRecords) {
  for (const [language, alternateUrl] of record.alternates) {
    if (language === 'x-default') continue;
    const reciprocal = urlRecords.get(alternateUrl);
    check(Boolean(reciprocal), `${url} hreflang ${language} does not have a sitemap entry: ${alternateUrl}`);
    if (reciprocal) {
      check(reciprocal.alternates.get(record.pageLocale) === url, `${url} and ${alternateUrl} do not have reciprocal hreflang links`);
      check([...record.alternates.keys()].sort().join(',') === [...reciprocal.alternates.keys()].sort().join(','), `${url} and ${alternateUrl} declare different alternate sets`);
    }
  }
}

if (process.env.SEO_CHECK_HTTP === '1') {
  const pages = [
    { path: '/en/guides/organize-pokemon-card-collection', indexable: true },
    { path: '/fr/guides/organize-pokemon-card-collection', indexable: true },
    { path: '/en/guides/pokemon-card-collection-tracker', indexable: true },
    { path: '/de/guides/pokemon-card-collection-tracker', indexable: true },
    { path: '/en/guides/pokemon-card-collection-value', indexable: true },
    { path: '/fr/guides/pokemon-card-collection-value', indexable: true },
    { path: '/en/guides/progress-account-guide', indexable: true },
    { path: '/fr/guides/progress-account-guide', indexable: true },
    { path: '/en/compare/lunidex-vs-dex', indexable: true },
    { path: '/fr/compare/lunidex-vs-dex', indexable: true },
    { path: '/en/guides/team-builder-guide', indexable: true },
    { path: '/fr/guides/team-builder-guide', indexable: true },
    { path: '/en/team', indexable: true },
    { path: '/en/pokedex', indexable: true },
    { path: '/en/faq', indexable: true },
    { path: '/de/guides/pokemon-card-collection-value', indexable: false },
    { path: '/de/compare/lunidex-vs-dex', indexable: false },
  ];
  for (const { path, indexable } of pages) {
    const url = new URL(path, runtimeOrigin).href;
    const canonicalUrl = new URL(path, canonicalOrigin).href;
    const pageResponse = await fetch(url, { redirect: 'manual' });
    check(pageResponse.status >= 200 && pageResponse.status < 300, `${url} returned HTTP ${pageResponse.status}`);
    const html = await pageResponse.text();
    const hasNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
    check(hasNoindex === !indexable, `${url} has unexpected robots indexability`);

    const mainCount = (html.match(/<main\b/gi) ?? []).length;
    const h1Count = (html.match(/<h1\b/gi) ?? []).length;
    check(mainCount === 1, `${url} must render exactly one main landmark (found ${mainCount})`);
    check(h1Count === 1, `${url} must render exactly one h1 (found ${h1Count})`);

    const canonicalLinks = [...html.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)];
    check(canonicalLinks.length === 1, `${url} must render exactly one canonical link (found ${canonicalLinks.length})`);
    const canonicalHref = canonicalLinks[0]?.[0].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (indexable) check(canonicalHref === canonicalUrl, `${url} canonical does not point to the requested localized URL`);
    else {
      const englishFallbackPath = path.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/, '/en');
      check(canonicalHref === new URL(englishFallbackPath, canonicalOrigin).href, `${url} fallback canonical does not point to English`);
    }
    const alternateLinks = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)];
    check(indexable ? alternateLinks.length >= 3 : alternateLinks.length === 0, `${url} has unexpected locale links (found ${alternateLinks.length})`);
    for (const match of alternateLinks) {
      const tag = match[0];
      const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
      const hreflang = tag.match(/\bhreflang=["']([^"']+)["']/i)?.[1];
      check(Boolean(href && hreflang), `${url} has an incomplete hreflang link`);
      if (href && hreflang && hreflang !== 'x-default') {
        try {
          const alternateUrl = new URL(href);
          check(alternateUrl.origin === canonicalOrigin, `${url} has a foreign hreflang origin: ${href}`);
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

    if (path.endsWith('/compare/lunidex-vs-dex')) {
      const matrixRows = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1].match(/<tr\b/g)?.length ?? 0;
      check(matrixRows === 12, `${url} must render all 12 Dex comparison criteria (found ${matrixRows})`);
      check(
        html.includes('https://dextcg.com/')
          && html.includes('https://dextcg.com/help/collection/scanning-your-cards')
          && html.includes('https://dextcg.com/help/getting-started/installing-dex')
          && html.includes('https://dextcg.com/help/getting-started/dex-early-access-for-web-and-android'),
        `${url} is missing the dated official Dex product, platform, or scanner sources`,
      );
      check(html.includes('2026-10-06'), `${url} is missing its publication or source-check date`);
      const alternateLocales = [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["']/gi)].map((match) => match[1]).sort();
      if (indexable) check(alternateLocales.join(',') === 'en,fr,x-default', `${url} must expose only en/fr/x-default hreflang links`);
    }

    if (path.endsWith('/guides/progress-account-guide') && indexable) {
      check(html.includes('installer Lunidex depuis le navigateur') || html.includes('Install Lunidex from your browser'), `${url} is missing the browser installation instructions`);
      check(html.includes('https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios') && html.includes('https://web.dev/learn/pwa/installation?hl=en'), `${url} is missing the official PWA installation sources`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `SEO CHECK FAILED: ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`SEO live checks passed: ${allUrls.size} unique sitemap URLs.`);
