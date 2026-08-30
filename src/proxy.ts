import { NextRequest, NextResponse } from 'next/server';
import { isSupportedLanguage } from '@/lib/languages';

const COOKIE_NAME = 'primedex-lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';
const RESOURCE_PROBE_TIMEOUT_MS = 1500;
// Empty Japanese/Korean set payloads contain only metadata and are currently
// smaller than 400 bytes. Confirm those compact responses with a GET only when
// the English fallback is also absent, keeping valid fallback albums to their
// single detail read.
const LIMITED_TCG_EMPTY_PROBE_MAX_BYTES = 400;
const CANONICAL_HOST = 'lunidex.app';
const ANNIVERSARY_30_ROUTE = '30e-anniversaire';
const ANNIVERSARY_30_UNSUPPORTED_LOCALES = new Set(['de', 'es', 'it', 'ja', 'ko', 'zh']);
// Automated clients do not benefit from a preference cookie. Avoiding
// Set-Cookie for them keeps otherwise-public page responses eligible for the
// Vercel CDN cache while normal browsers still persist their locale below.
const AUTOMATED_CLIENT_PATTERN = /(?:bot|crawler|spider|lighthouse|headless|externalagent)/i;
// These paths are common WordPress probes but are not part of Lunidex. Return
// a cacheable edge 404 before Next renders the global not-found route.
const KNOWN_SCANNER_PATH_PREFIXES = ['/wp-admin', '/wp-login.php', '/xmlrpc.php'];
const LEGACY_HOSTS = new Set([
  'www.lunidex.app',
  'primedex.vercel.app',
  'poke-app-lake.vercel.app',
  'lunidex-teeflo.vercel.app',
  'lunidex-teeflo-teeflo.vercel.app',
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

function isKnownScannerPath(pathname: string): boolean {
  const unlocalizedPath = pathname.replace(/^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/)/, '');
  return KNOWN_SCANNER_PATH_PREFIXES.some(
    (prefix) => unlocalizedPath === prefix || unlocalizedPath.startsWith(`${prefix}/`),
  );
}

function getResourceProbe(pathname: string, locale: string): ResourceProbe | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== locale || segments.length !== 3) return null;

  const resource = segments[1];
  const rawIdentifier = segments[2];
  if (!rawIdentifier) return null;

  let identifier: string;
  try {
    identifier = decodeURIComponent(rawIdentifier);
  } catch {
    return null;
  }

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

function getTcgResourceProbe(pathname: string, locale: string): ResourceProbe | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== locale || segments.length !== 4 || segments[1] !== 'tcg') return null;

  let identifier: string;
  try {
    identifier = decodeURIComponent(segments[3] ?? '');
  } catch {
    return null;
  }
  if (!identifier) return null;

  const encodedIdentifier = encodeURIComponent(identifier);
  // Probe the requested catalog first. Japanese and Korean contain regional
  // set IDs that do not exist in English, while Chinese uses the established
  // English data fallback.
  const probeLocale = locale === 'zh' ? 'en' : locale;
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
  if (segments[2] === 'sets' || segments[2] === 'collection') {
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

async function probeResource(probe: ResourceProbe): Promise<boolean | null> {
  const primaryResult = await probeResourceUrl(probe.url, probe.headers);
  const primaryIsCompact = isLimitedTcgSetProbe(probe)
    && primaryResult.available === true
    && primaryResult.contentLength !== null
    && primaryResult.contentLength <= LIMITED_TCG_EMPTY_PROBE_MAX_BYTES;

  if (primaryIsCompact && probe.fallbackUrl) {
    // Probe the fallback first. A valid English fallback means the route should
    // render and avoids downloading the localized empty payload a second time.
    const fallbackResult = await probeResourceUrl(probe.fallbackUrl, probe.headers);
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
  if (primaryResult.available === false) return fallbackResult.available;

  // A successful fallback proves the route can render. If the localized probe
  // timed out, however, an English 404 cannot prove the localized ID is absent.
  return fallbackResult.available === true ? true : null;
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
  return NextResponse.rewrite(new URL('/__lunidex-not-found', request.url), {
    status: 404,
    request: { headers: forwardedHeaders },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (LEGACY_HOSTS.has(request.nextUrl.hostname)) {
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

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = isSupportedLanguage(firstSegment ?? '');

  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const cookieLang = isSupportedLanguage(cookieLocale ?? '') ? cookieLocale! : null;

  if (hasLocalePrefix) {
    const urlLocale = firstSegment!;

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
    const isDocumentRequest = request.method === 'HEAD'
      || accept.includes('text/html')
      || accept.includes('*/*');
    if (isDocumentRequest) {
      const isPrivateCollectionAlbum = segments.length === 4
        && segments[1] === 'tcg'
        && segments[2] === 'collection';
      const probe = getResourceProbe(pathname, urlLocale)
        ?? (isPrivateCollectionAlbum ? null : getTcgResourceProbe(pathname, urlLocale));
      if (probe && (await probeResource(probe)) === false) {
        return hardNotFoundResponse(request, urlLocale);
      }
    }

    // Forward the URL's locale as a request header so this exact render uses
    // it immediately. The route rewrite itself is declared in next.config.ts,
    // keeping the public URL separate from the physical route.
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-primedex-lang', urlLocale);

    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });
    if (cookieLang !== urlLocale && shouldPersistLocaleCookie(request)) {
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

  const url = request.nextUrl.clone();
  url.pathname = `/${targetLocale}${pathname === '/' ? '' : pathname}`;

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
