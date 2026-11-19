import { NextRequest, NextResponse } from 'next/server';
import { isSupportedLanguage } from '@/lib/languages';
import { DEFAULT_TCG_CARD_LANGUAGE, normalizeTCGCardLanguage } from '@/lib/tcg-language';

const COOKIE_NAME = 'primedex-lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';
const RESOURCE_PROBE_TIMEOUT_MS = 1500;
// Resource existence is stable; keep positive checks warm across daily crawls.
const RESOURCE_PROBE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Negative and failed checks stay short so new data and upstream recovery show quickly.
const RESOURCE_PROBE_FAILURE_TTL_MS = 60 * 60 * 1000;
const MAX_RESOURCE_PROBE_CACHE_ENTRIES = 8192;
const MAX_RESOURCE_IDENTIFIER_LENGTH = 128;
// Percent-encoded UTF-8 can use up to nine ASCII characters per UTF-16 code
// unit. Bound the raw segment too so it is rejected before decode allocation.
const MAX_ENCODED_RESOURCE_IDENTIFIER_LENGTH = MAX_RESOURCE_IDENTIFIER_LENGTH * 9;
// Empty Japanese/Korean set payloads contain only metadata and are currently
// smaller than 400 bytes. Confirm those compact responses with a GET only when
// the English fallback is also absent, keeping valid fallback albums to their
// single detail read.
const LIMITED_TCG_EMPTY_PROBE_MAX_BYTES = 400;
const CANONICAL_HOST = 'lunidex.app';
const ANNIVERSARY_30_ROUTE = '30e-anniversaire';
const ANNIVERSARY_30_UNSUPPORTED_LOCALES = new Set(['de', 'es', 'it', 'ja', 'ko', 'zh']);
// Canonical public URLs already carry their locale. The client provider
// persists the selected locale after hydration; unprefixed redirects below
// still store the selected locale directly.
const AUTOMATED_CLIENT_PATTERN = /(?:bot|crawler|spider|lighthouse|headless|externalagent|lightpanda)/i;
const CLAUDE_BOT_USER_AGENT_PATTERN = /(?:^|[^a-z0-9])claudebot(?:[^a-z0-9]|$)/i;
const OBVIOUSLY_INVALID_RESOURCE_IDENTIFIER = /^(?:null|undefined)$/i;
// These paths are common secret/configuration probes and are not part of
// Lunidex. Return a cacheable 404 before Next renders the global not-found route.
const KNOWN_SCANNER_PATH_PREFIXES = [
  '/wp-admin',
  '/wp-login.php',
  '/xmlrpc.php',
  '/.config',
  '/.claude',
  '/.dockercfg',
  '/config',
];
const HEAP_DIAGNOSTIC_ENABLED_ENV = 'LUNIDEX_HEAP_SAMPLER_DIAGNOSTIC';
const HEAP_DIAGNOSTIC_EXPIRES_ENV = 'LUNIDEX_HEAP_SAMPLER_EXPIRES_AT';
const HEAP_DIAGNOSTIC_RUN_ID_ENV = 'LUNIDEX_HEAP_SAMPLER_RUN_ID';
const ROUTE_DIAGNOSTIC_PREFIX = 'LUNIDEX_ROUTE_FAMILY_V1';
const ROUTE_DIAGNOSTIC_METHODS = ['GET', 'HEAD', 'POST', 'OTHER'] as const;
type RouteDiagnosticMethod = (typeof ROUTE_DIAGNOSTIC_METHODS)[number];
type RouteDiagnosticFamily =
  | 'localized_home'
  | 'localized_pokedex'
  | 'localized_pokemon'
  | 'localized_tcg_home'
  | 'localized_tcg_cards'
  | 'localized_tcg_sets'
  | 'localized_tcg_collection'
  | 'localized_tcg_sealed'
  | 'localized_tcg_illustrators'
  | 'localized_tcg_other'
  | 'localized_team'
  | 'localized_quiz'
  | 'localized_other'
  | 'scanner_probe'
  | 'unlocalized_redirect';
const PUBLIC_SINGLE_SEGMENT_ROUTES = new Set([
  'pokedex',
  'moves',
  'abilities',
  'items',
  'types',
  'compare',
  'blog',
  'docs',
  'about',
  'faq',
  'contact',
  ANNIVERSARY_30_ROUTE,
  'nuzlocke',
  'breeding',
  'ev-iv',
  'quiz',
  'cookies',
  'privacy',
  'terms',
  'legal',
]);
const PUBLIC_DETAIL_ROUTE_PREFIXES = new Set([
  'pokemon',
  'moves',
  'abilities',
  'items',
  'compare',
  'guides',
  'u',
]);

type SupportedResource =
  | 'pokemon'
  | 'moves'
  | 'abilities'
  | 'items'
  | 'tcg-card'
  | 'tcg-set';

interface ResourceProbe {
  kind: SupportedResource;
  url: string;
  fallbackUrl?: string;
  headers?: Record<string, string>;
}

/**
 * Ranks Accept-Language entries by their q-values instead of trusting the raw
 * first entry, so "en;q=0.5, fr" correctly resolves to French.
 */
function detectLocaleFromAcceptLanguage(header: string | null): string {
  if (!header) return 'en';
  const candidates = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.split(';');
      let quality = 1;
      for (const param of params) {
        const match = /^\s*q=([0-9.]+)\s*$/.exec(param);
        if (match) {
          const parsed = Number.parseFloat(match[1]);
          quality = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0;
        }
      }
      return { tag: (tag ?? '').trim().toLowerCase().split('-')[0], quality };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((left, right) => right.quality - left.quality);

  for (const { tag } of candidates) {
    if (isSupportedLanguage(tag)) return tag;
  }
  return 'en';
}

function shouldPersistLocaleCookie(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') ?? '';
  return !AUTOMATED_CLIENT_PATTERN.test(userAgent);
}

function isNextPrefetchRequest(request: NextRequest): boolean {
  return request.headers.get('next-router-prefetch') === '1'
    || request.headers.get('purpose')?.toLowerCase() === 'prefetch'
    || request.headers.get('sec-purpose')?.toLowerCase() === 'prefetch';
}

function shouldBlockClaudeBotTcgCard(request: NextRequest, segments: string[]): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (!CLAUDE_BOT_USER_AGENT_PATTERN.test(request.headers.get('user-agent') ?? '')) return false;

  return segments.length === 4
    && segments[1] === 'tcg'
    && segments[2] === 'cards'
    && Boolean(segments[3]);
}

function isFlightRequest(request: NextRequest): boolean {
  const accept = request.headers.get('accept') ?? '';
  const acceptsFlight = accept.split(',').some((mediaType) =>
    mediaType.split(';', 1)[0]?.trim().toLowerCase() === 'text/x-component',
  );

  // Next's production Proxy adapter strips its internal RSC/prefetch headers
  // before invoking user code. The Flight media type survives and identifies
  // the same client-navigation requests in standalone deployments.
  return request.headers.get('rsc') === '1' || isNextPrefetchRequest(request) || acceptsFlight;
}

function isAutomatedPrefetchRequest(request: NextRequest): boolean {
  if (request.method !== 'GET' || !isNextPrefetchRequest(request)) return false;
  return AUTOMATED_CLIENT_PATTERN.test(request.headers.get('user-agent') ?? '');
}

function isAutomatedTcgCardFlightRequest(request: NextRequest, segments: string[]): boolean {
  if (request.method !== 'GET' || !isFlightRequest(request)) return false;
  if (!AUTOMATED_CLIENT_PATTERN.test(request.headers.get('user-agent') ?? '')) return false;

  return segments.length === 4
    && segments[1] === 'tcg'
    && segments[2] === 'cards'
    && Boolean(segments[3]);
}

function isKnownScannerPath(pathname: string): boolean {
  const unlocalizedPath = pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/)/, '');
  const isEnvProbe = /^\/\.env(?:$|[./-])/.test(unlocalizedPath);
  return isEnvProbe || KNOWN_SCANNER_PATH_PREFIXES.some(
    (prefix) => unlocalizedPath === prefix || unlocalizedPath.startsWith(`${prefix}/`),
  );
}

function getRouteDiagnosticFamily(pathname: string): RouteDiagnosticFamily {
  if (isKnownScannerPath(pathname)) return 'scanner_probe';

  const segments = pathname.split('/').filter(Boolean);
  if (!isSupportedLanguage(segments[0] ?? '')) return 'unlocalized_redirect';
  if (segments.length === 1) return 'localized_home';

  if (segments[1] === 'tcg') {
    if (segments.length === 2) return 'localized_tcg_home';

    switch (segments[2]) {
      case 'cards': return 'localized_tcg_cards';
      case 'sets': return 'localized_tcg_sets';
      case 'collection': return 'localized_tcg_collection';
      case 'sealed': return 'localized_tcg_sealed';
      case 'illustrators': return 'localized_tcg_illustrators';
      default: return 'localized_tcg_other';
    }
  }

  switch (segments[1]) {
    case 'pokedex': return 'localized_pokedex';
    case 'pokemon': return 'localized_pokemon';
    case 'team': return 'localized_team';
    case 'quiz': return 'localized_quiz';
    default: return 'localized_other';
  }
}

function getActiveHeapDiagnosticRunId(nowMs = Date.now()): string | null {
  if (process.env.NODE_ENV !== 'production'
    || process.env[HEAP_DIAGNOSTIC_ENABLED_ENV] !== 'enabled') {
    return null;
  }

  const runId = process.env[HEAP_DIAGNOSTIC_RUN_ID_ENV] ?? '';
  const expiresAt = Number(process.env[HEAP_DIAGNOSTIC_EXPIRES_ENV]);
  if (!/^\d+-\d+$/.test(runId)
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= Math.floor(nowMs / 1_000)) {
    return null;
  }
  return runId;
}

function getRouteDiagnosticMethod(method: string): RouteDiagnosticMethod {
  return ROUTE_DIAGNOSTIC_METHODS.includes(method as RouteDiagnosticMethod)
    ? method as RouteDiagnosticMethod
    : 'OTHER';
}

function logRouteDiagnostic(request: NextRequest): void {
  const runId = getActiveHeapDiagnosticRunId();
  if (!runId) return;

  const family = getRouteDiagnosticFamily(request.nextUrl.pathname);
  const method = getRouteDiagnosticMethod(request.method);
  console.info(`${ROUTE_DIAGNOSTIC_PREFIX} run=${runId} family=${family} method=${method}`);
}

interface DecodedResourceIdentifier {
  identifier: string | null;
  oversized: boolean;
}

function getResourceIdentifierFromPathname(pathname: string, locale: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== locale) return undefined;

  return segments.length === 3 && ['pokemon', 'moves', 'abilities', 'items'].includes(segments[1] ?? '')
    ? segments[2]
    : segments.length === 4
      && segments[1] === 'tcg'
      && ['cards', 'sets'].includes(segments[2] ?? '')
      ? segments[3]
      : undefined;
}

function hasObviouslyInvalidResourceIdentifier(pathname: string, locale: string): boolean {
  const identifier = getResourceIdentifierFromPathname(pathname, locale);
  if (!identifier) return false;
  const decoded = decodeResourceIdentifier(identifier);
  return decoded.identifier === null || OBVIOUSLY_INVALID_RESOURCE_IDENTIFIER.test(decoded.identifier);
}

function hasOversizedResourceIdentifier(pathname: string, locale: string): boolean {
  const identifier = getResourceIdentifierFromPathname(pathname, locale);
  return identifier ? decodeResourceIdentifier(identifier).oversized : false;
}

function decodeResourceIdentifier(rawIdentifier: string): DecodedResourceIdentifier {
  if (rawIdentifier.length > MAX_ENCODED_RESOURCE_IDENTIFIER_LENGTH) {
    return { identifier: null, oversized: true };
  }
  try {
    const identifier = decodeURIComponent(rawIdentifier);
    if (identifier.length > MAX_RESOURCE_IDENTIFIER_LENGTH) return { identifier: null, oversized: true };
    return { identifier: identifier || null, oversized: false };
  } catch {
    return { identifier: null, oversized: false };
  }
}

function isPublicLocalizedRoute(segments: string[]): boolean {
  if (segments.length === 1 && isSupportedLanguage(segments[0] ?? '')) {
    return true;
  }

  if (segments.length === 2 && PUBLIC_SINGLE_SEGMENT_ROUTES.has(segments[1] ?? '')) {
    return true;
  }

  if (segments.length === 3 && PUBLIC_DETAIL_ROUTE_PREFIXES.has(segments[1] ?? '')) {
    return true;
  }

  if (segments.length === 3 && segments[1] === 'docs' && segments[2] === 'api') {
    return true;
  }

  if (segments[1] !== 'tcg') return false;

  return segments.length === 2
    || (segments.length === 3 && segments[2] === 'deck-builder')
    || (segments.length === 4 && (segments[2] === 'cards' || segments[2] === 'sets' || segments[2] === 'illustrators'))
    || (segments.length === 4 && segments[2] === 'sealed' && ['market', 'releases', 'buy-safely'].includes(segments[3] ?? ''))
    || (segments.length === 5 && segments[2] === 'sealed' && segments[3] === 'market' && /^\d+$/.test(segments[4] ?? ''))
    || (segments.length === 6 && segments[2] === 'sealed' && segments[3] === 'market'
      && segments[4] === 'products' && /^\d+$/.test(segments[5] ?? ''));
}

function getResourceProbe(pathname: string, locale: string): ResourceProbe | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== locale || segments.length !== 3) return null;

  const resource = segments[1];
  const rawIdentifier = segments[2];
  if (!rawIdentifier) return null;

  const { identifier } = decodeResourceIdentifier(rawIdentifier);
  if (identifier === null) return null;

  const encodedIdentifier = encodeURIComponent(identifier);
  switch (resource) {
    case 'pokemon':
      return { kind: 'pokemon', url: `${POKEAPI_BASE_URL}/pokemon/${encodedIdentifier}` };
    case 'moves':
      return { kind: 'moves', url: `${POKEAPI_BASE_URL}/move/${encodedIdentifier}` };
    case 'abilities':
      return { kind: 'abilities', url: `${POKEAPI_BASE_URL}/ability/${encodedIdentifier}` };
    case 'items':
      return { kind: 'items', url: `${POKEAPI_BASE_URL}/item/${encodedIdentifier}` };
    default:
      return null;
  }
}

function getTcgResourceProbe(
  pathname: string,
  locale: string,
  requestedTcgLanguage: string | null,
): ResourceProbe | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== locale || segments[1] !== 'tcg') return null;
  if (segments.length !== 4) return null;

  const { identifier } = decodeResourceIdentifier(segments[3] ?? '');
  if (identifier === null) return null;

  const encodedIdentifier = encodeURIComponent(identifier);
  // TCG data language is independent from the interface locale. The detail
  // pages default to English and read this same query parameter; probing the
  // UI locale first creates avoidable 404 + English fallback requests.
  const probeLocale = normalizeTCGCardLanguage(
    requestedTcgLanguage,
    DEFAULT_TCG_CARD_LANGUAGE,
  ) ?? DEFAULT_TCG_CARD_LANGUAGE;
  const fallbackLocale = probeLocale === 'en' ? null : 'en';
  if (segments[2] === 'cards') {
    return {
      kind: 'tcg-card',
      url: `${TCGDEX_BASE_URL}/${probeLocale}/cards/${encodedIdentifier}`,
      fallbackUrl: fallbackLocale
        ? `${TCGDEX_BASE_URL}/${fallbackLocale}/cards/${encodedIdentifier}`
        : undefined,
    };
  }
  if (segments[2] === 'sets') {
    return {
      kind: 'tcg-set',
      url: `${TCGDEX_BASE_URL}/${probeLocale}/sets/${encodedIdentifier}`,
      fallbackUrl: fallbackLocale
        ? `${TCGDEX_BASE_URL}/${fallbackLocale}/sets/${encodedIdentifier}`
        : undefined,
    };
  }

  return null;
}

interface ResourceProbeResult {
  available: boolean | null;
  contentLength: number | null;
}

interface CachedResourceProbe {
  result: boolean | null;
  expiresAt: number;
}

const resourceProbeCache = new Map<string, CachedResourceProbe>();
const resourceProbeInFlight = new Map<string, Promise<boolean | null>>();

function isLimitedTcgSetProbe(probe: ResourceProbe): boolean {
  return probe.kind === 'tcg-set' && /\/(?:ja|ko)\/sets\//.test(probe.url);
}

async function confirmTcgSetHasCards(
  url: string,
  headers?: Record<string, string>,
): Promise<boolean | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOURCE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    });
    if (response.status === 404) return false;
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    if (!payload || typeof payload !== 'object' || !('cards' in payload)) return null;
    const cards = (payload as { cards?: unknown }).cards;
    return Array.isArray(cards) ? cards.length > 0 : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getResourceProbeCacheKey(probe: ResourceProbe): string {
  return [probe.url, probe.fallbackUrl ?? '', JSON.stringify(probe.headers ?? {})].join('|');
}

function getCachedResourceProbe(key: string): boolean | null | undefined {
  const cached = resourceProbeCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    resourceProbeCache.delete(key);
    return undefined;
  }

  // Keep hot probes near the end of the bounded map so they survive eviction.
  resourceProbeCache.delete(key);
  resourceProbeCache.set(key, cached);
  return cached.result;
}

function setCachedResourceProbe(key: string, result: boolean | null): void {
  resourceProbeCache.delete(key);
  while (resourceProbeCache.size >= MAX_RESOURCE_PROBE_CACHE_ENTRIES) {
    const oldestKey = resourceProbeCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    resourceProbeCache.delete(oldestKey);
  }
  resourceProbeCache.set(key, {
    result,
    expiresAt: Date.now() + (result === true ? RESOURCE_PROBE_CACHE_TTL_MS : RESOURCE_PROBE_FAILURE_TTL_MS),
  });
}

function getEnglishFallbackCacheKey(probe: ResourceProbe): string | null {
  return probe.fallbackUrl
    ? getResourceProbeCacheKey({ kind: probe.kind, url: probe.fallbackUrl, headers: probe.headers })
    : null;
}

function rememberAvailableEnglishFallback(probe: ResourceProbe, result: ResourceProbeResult): void {
  const key = getEnglishFallbackCacheKey(probe);
  if (key && result.available === true) setCachedResourceProbe(key, true);
}

async function probeResourceUncached(probe: ResourceProbe): Promise<boolean | null> {
  const primaryResult = await probeResourceUrl(probe.url, probe.headers);
  const primaryIsCompact = isLimitedTcgSetProbe(probe)
    && primaryResult.available === true
    && primaryResult.contentLength !== null
    && primaryResult.contentLength <= LIMITED_TCG_EMPTY_PROBE_MAX_BYTES;

  if (primaryIsCompact && probe.fallbackUrl) {
    // Probe the fallback first. A valid English fallback means the route should
    // render and avoids downloading the localized empty payload a second time.
    const fallbackResult = await probeResourceUrl(probe.fallbackUrl, probe.headers);
    rememberAvailableEnglishFallback(probe, fallbackResult);
    if (fallbackResult.available === true) return true;
    if (fallbackResult.available === null) return true;
    return confirmTcgSetHasCards(probe.url, probe.headers);
  }

  if (primaryResult.available === true) {
    if (primaryIsCompact) return confirmTcgSetHasCards(probe.url, probe.headers);
    return true;
  }
  if (!probe.fallbackUrl) return primaryResult.available;

  const fallbackResult = await probeResourceUrl(probe.fallbackUrl, probe.headers);
  rememberAvailableEnglishFallback(probe, fallbackResult);
  if (primaryResult.available === false) return fallbackResult.available;

  // A successful fallback proves the route can render. If the localized probe
  // timed out, however, an English 404 cannot prove the localized ID is absent.
  return fallbackResult.available === true ? true : null;
}

async function probeResource(probe: ResourceProbe): Promise<boolean | null> {
  // A confirmed English card or set can render in every supported locale via
  // the existing fallback. Avoid repeating locale-specific HEAD requests.
  const englishFallbackKey = getEnglishFallbackCacheKey(probe);
  if (englishFallbackKey && getCachedResourceProbe(englishFallbackKey) === true) return true;

  const key = getResourceProbeCacheKey(probe);
  const cached = getCachedResourceProbe(key);
  if (cached !== undefined) return cached;

  const inFlight = resourceProbeInFlight.get(key);
  if (inFlight) return inFlight;

  const pending = probeResourceUncached(probe).then((result) => {
    setCachedResourceProbe(key, result);
    return result;
  });
  resourceProbeInFlight.set(key, pending);

  try {
    return await pending;
  } finally {
    if (resourceProbeInFlight.get(key) === pending) {
      resourceProbeInFlight.delete(key);
    }
  }
}

async function probeResourceUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<ResourceProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOURCE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers,
      signal: controller.signal,
    });
    if (response.status === 404) return { available: false, contentLength: null };
    if (!response.ok) return { available: null, contentLength: null };
    const rawContentLength = response.headers.get('content-length');
    const contentLength = rawContentLength ? Number(rawContentLength) : null;
    return {
      available: true,
      contentLength: contentLength !== null && Number.isFinite(contentLength) ? contentLength : null,
    };
  } catch {
    // The page fetch remains the source of truth when the probe times out or
    // an upstream service is temporarily unavailable.
    return { available: null, contentLength: null };
  } finally {
    clearTimeout(timeout);
  }
}

function hardNotFoundResponse(request: NextRequest, locale: string) {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-primedex-lang', locale);

  // Rewrite to an unmatched internal pathname so the normal global not-found
  // UI is rendered while keeping the public URL unchanged. Setting the
  // status here avoids Next's streamed notFound() response becoming a 200.
  const response = NextResponse.rewrite(new URL('/__lunidex-not-found', request.url), {
    status: 404,
    request: { headers: forwardedHeaders },
  });
  // A confirmed missing public resource is safe to reuse briefly. This avoids
  // invoking the global not-found render repeatedly for crawler probes while
  // keeping the browser response private.
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  logRouteDiagnostic(request);

  if (request.nextUrl.hostname === 'www.lunidex.app') {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  if (isKnownScannerPath(pathname)) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  // Headless crawlers such as Lightpanda execute Next's automatic Link
  // prefetches. A single indexed page can therefore fan out into every link
  // in the footer, and each Flight prefetch would otherwise invoke the full
  // App Router render. Drop only requests that carry an explicit prefetch
  // signal; real HTML documents from the same crawler remain crawlable.
  if (isAutomatedPrefetchRequest(request)) {
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = isSupportedLanguage(firstSegment ?? '');

  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const cookieLang = isSupportedLanguage(cookieLocale ?? '') ? cookieLocale! : null;

  if (hasLocalePrefix) {
    const urlLocale = firstSegment!;

    // ClaudeBot accounted for most of the recent card-catalog crawl. Its
    // training pages remain disallowed in robots.txt; this guard also stops
    // requests that ignore robots before they trigger upstream probes/rendering.
    if (shouldBlockClaudeBotTcgCard(request, segments)) {
      return new NextResponse(null, {
        status: 403,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    // Card details can be fetched as interactive Flight responses by crawlers
    // that follow links rather than sending an explicit Next prefetch signal.
    // Their indexable HTML requests still use ISR above; this avoids repeating
    // the dynamic modal render for automated clients without changing browser
    // navigations.
    if (isAutomatedTcgCardFlightRequest(request, segments)) {
      return new NextResponse(null, {
        status: 204,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    // Bound dynamic resource paths before either document probes or Flight
    // rendering can build cache keys or pass a large identifier downstream.
    if (hasOversizedResourceIdentifier(pathname, urlLocale)) {
      return hardNotFoundResponse(request, urlLocale);
    }

    // There is no standalone /pokemon index; preserve the legacy entry point
    // with a real HTTP redirect to the localized Pokédex. Detail pages such
    // as /pokemon/pikachu do not match this branch.
    if (segments.length === 2 && segments[1] === 'pokemon') {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${urlLocale}/pokedex`;
      return NextResponse.redirect(redirectUrl, 308);
    }

    // API routes are intentionally unlocalized. Canonicalize an accidental
    // locale prefix before the config rewrite can turn it into a cacheable
    // page-like request.
    if (segments[1] === 'api') {
      const apiUrl = request.nextUrl.clone();
      apiUrl.pathname = `/${segments.slice(1).join('/')}`;
      return NextResponse.redirect(apiUrl, 308);
    }

    if (
      segments.length === 2 &&
      segments[1] === ANNIVERSARY_30_ROUTE &&
      ANNIVERSARY_30_UNSUPPORTED_LOCALES.has(urlLocale)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/en/${ANNIVERSARY_30_ROUTE}`;
      return NextResponse.redirect(redirectUrl, 308);
    }

    // Only validate document requests here. Next's client navigations use
    // Flight responses and the page itself remains the source of truth for
    // those requests; avoiding a second upstream probe keeps navigation fast.
    const accept = (request.headers.get('accept') ?? '').toLowerCase();
    const isDocumentRequest = !isFlightRequest(request)
      && (request.method === 'HEAD'
        || (request.method === 'GET' && (accept.includes('text/html') || accept.includes('*/*'))));
    if (isDocumentRequest && hasObviouslyInvalidResourceIdentifier(pathname, urlLocale)) {
      return hardNotFoundResponse(request, urlLocale);
    }
    if (isDocumentRequest) {
      const probe = getResourceProbe(pathname, urlLocale)
        ?? getTcgResourceProbe(pathname, urlLocale, request.nextUrl.searchParams.get('tcgLang'));
      if (probe && (await probeResource(probe)) === false) {
        return hardNotFoundResponse(request, urlLocale);
      }
    }

    // Serve every non-Flight card GET/HEAD through the locale-aware ISR route,
    // even when a minimal client omits Accept. Otherwise those requests fall
    // through to the request-rendered card route and repeat its root RSC render
    // on every hit. Explicit Flight navigations/prefetches keep the intercepted
    // detail modal below `(request-rendered)`.
    const isCardDocumentRequest = !isFlightRequest(request)
      && (request.method === 'GET' || request.method === 'HEAD');
    const localizedCardId = isCardDocumentRequest
      && segments.length === 4
      && segments[1] === 'tcg'
      && segments[2] === 'cards'
      ? decodeResourceIdentifier(segments[3] ?? '').identifier
      : null;
    const staticTcgLanguage = localizedCardId
      ? normalizeTCGCardLanguage(
        request.nextUrl.searchParams.get('tcgLang'),
        DEFAULT_TCG_CARD_LANGUAGE,
      ) ?? DEFAULT_TCG_CARD_LANGUAGE
      : null;

    // Forward the URL's locale as a request header so this exact render uses
    // it immediately. The route rewrite itself is declared in next.config.ts,
    // keeping the public URL separate from the physical route.
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-primedex-lang', urlLocale);
    forwardedHeaders.set('x-primedex-pathname', pathname);
    forwardedHeaders.delete('x-primedex-static-pokedex-route');
    forwardedHeaders.delete('x-primedex-static-localized-route');
    forwardedHeaders.delete('x-primedex-tcg-language');
    if (segments.length === 1) {
      forwardedHeaders.set('x-primedex-static-localized-route', 'home');
    } else if (segments.length === 2 && segments[1] === 'pokedex') {
      forwardedHeaders.set('x-primedex-static-localized-route', 'pokedex');
    } else if (localizedCardId && staticTcgLanguage) {
      forwardedHeaders.set('x-primedex-static-localized-route', 'tcg-card-detail');
      forwardedHeaders.set('x-primedex-tcg-language', staticTcgLanguage);
    }

    // The locale in the URL is authoritative for this render. Do not attach a
    // preference cookie to the public page response: Set-Cookie makes an
    // the client's locale choice after hydration, while unlocalized requests
    // still receive a cookie on the redirect below.
    const isPublicPage = isPublicLocalizedRoute(segments);
    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });
    if (cookieLang !== urlLocale && shouldPersistLocaleCookie(request) && !isPublicPage) {
      response.cookies.set(COOKIE_NAME, urlLocale, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
        secure: request.nextUrl.protocol === 'https:',
      });
    }
    return response;
  }

  const acceptLang = request.headers.get('accept-language');
  const targetLocale = cookieLang ?? detectLocaleFromAcceptLanguage(acceptLang);
  const isLegacyPokemonIndex = pathname === '/pokemon' || pathname === '/pokemon/';
  const targetPathname = isLegacyPokemonIndex ? '/pokedex' : pathname;

  const url = request.nextUrl.clone();
  url.pathname = `/${targetLocale}${targetPathname === '/' ? '' : targetPathname}`;

  const redirect = NextResponse.redirect(url, 308);
  if (!cookieLang && shouldPersistLocaleCookie(request)) {
    redirect.cookies.set(COOKIE_NAME, targetLocale, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
    });
  }
  return redirect;
}

export const config = {
  matcher: [
    '/((?!api(?:/|$)|_next/static|_next/image|sw\\.js|push-worker\\.js|workbox-[^/]+\\.js|fallback-[^/]+\\.js|favicon\\.ico|icon\\.svg|icon-192\\.png|icon-512\\.png|icon-512-maskable\\.png|apple-touch-icon\\.png|favicon-16x16\\.png|favicon-32x32\\.png|brand/|screenshot-mobile\\.png|screenshot-desktop\\.png|robots\\.txt|sitemap\\.xml|sitemaps/|llms\\.txt|llms-full\\.txt|ai\\.txt|opensearch\\.xml|manifest\\.webmanifest|opengraph-image(?:/|$)|\\.well-known/|og/|images/|pokemon-cards/).*)',
  ],
};
