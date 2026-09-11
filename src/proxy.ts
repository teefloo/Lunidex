import { NextRequest, NextResponse } from 'next/server';
import { isSupportedLanguage } from '@/lib/languages';

const COOKIE_NAME = 'primedex-lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
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

    // Do not preflight public resource routes against PokéAPI or TCGdex here.
    // The page/API boundary already owns validation, caching, fallbacks, and
    // notFound handling. A proxy HEAD would duplicate every detail request,
    // add upstream traffic, and still race the fetch used by the route.
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
