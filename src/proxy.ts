import { NextRequest, NextResponse } from 'next/server';
import { isSupportedLanguage } from '@/lib/languages';

const COOKIE_NAME = 'primedex-lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2';
const RESOURCE_PROBE_TIMEOUT_MS = 1500;

type SupportedResource =
  | 'pokemon'
  | 'moves'
  | 'abilities'
  | 'items'
  | 'tcg-card'
  | 'tcg-set'
  | 'public-profile';

interface ResourceProbe {
  kind: SupportedResource;
  url: string;
  headers?: Record<string, string>;
}

function detectLocaleFromAcceptLanguage(header: string | null): string {
  if (!header) return 'en';
  const first = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase().split('-')[0] ?? 'en';
  return isSupportedLanguage(first) ? first : 'en';
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
    case 'u': {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return null;

      const profileUrl = new URL('/rest/v1/public_profiles', supabaseUrl);
      profileUrl.searchParams.set('select', 'id');
      profileUrl.searchParams.set('public_handle', `eq.${identifier}`);
      profileUrl.searchParams.set('is_public', 'eq.true');
      profileUrl.searchParams.set('limit', '1');

      return {
        kind: 'public-profile',
        url: profileUrl.toString(),
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      };
    }
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
  if (segments[2] === 'cards') {
    return {
      kind: 'tcg-card',
      url: `${TCGDEX_BASE_URL}/${locale}/cards/${encodedIdentifier}`,
    };
  }
  if (segments[2] === 'collection') {
    return {
      kind: 'tcg-set',
      url: `${TCGDEX_BASE_URL}/${locale}/sets/${encodedIdentifier}`,
    };
  }

  return null;
}

async function probeResource(probe: ResourceProbe): Promise<boolean | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOURCE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(probe.url, {
      method: probe.kind === 'public-profile' ? 'GET' : 'HEAD',
      headers: probe.headers,
      signal: controller.signal,
    });
    if (response.status === 404) return false;
    if (probe.kind === 'public-profile') {
      if (!response.ok) return null;
      const rows: unknown = await response.json();
      return Array.isArray(rows) && rows.length > 0;
    }
    return true;
  } catch {
    // The page fetch remains the source of truth when the probe times out or
    // an upstream service is temporarily unavailable.
    return null;
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

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = isSupportedLanguage(firstSegment ?? '');

  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const cookieLang = isSupportedLanguage(cookieLocale ?? '') ? cookieLocale! : null;

  if (hasLocalePrefix) {
    const urlLocale = firstSegment!;

    const probe = getResourceProbe(pathname, urlLocale) ?? getTcgResourceProbe(pathname, urlLocale);
    if (probe && (await probeResource(probe)) === false) {
      return hardNotFoundResponse(request, urlLocale);
    }

    // Forward the URL's locale as a request header so this exact render uses
    // it immediately. The route rewrite itself is declared in next.config.ts:
    // keeping it in Next's router preserves the status code from notFound().
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('x-primedex-lang', urlLocale);

    const response = NextResponse.next({
      request: { headers: forwardedHeaders },
    });
    if (cookieLang !== urlLocale) {
      response.cookies.set(COOKIE_NAME, urlLocale, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
    return response;
  }

  // Preserve the locale header if the request reaches this branch after an
  // internal rewrite, so the route can render without being redirected back
  // to its localized public URL.
  const rewrittenLocale = request.headers.get('x-primedex-lang');
  if (isSupportedLanguage(rewrittenLocale ?? '')) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }

  const acceptLang = request.headers.get('accept-language');
  const targetLocale = cookieLang ?? detectLocaleFromAcceptLanguage(acceptLang);

  const url = request.nextUrl.clone();
  url.pathname = `/${targetLocale}${pathname === '/' ? '' : pathname}`;

  const redirect = NextResponse.redirect(url, 308);
  if (!cookieLang) {
    redirect.cookies.set(COOKIE_NAME, targetLocale, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }
  return redirect;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|sw\\.js|push-worker\\.js|workbox-[^/]+\\.js|fallback-[^/]+\\.js|favicon\\.ico|icon\\.svg|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|favicon-16x16\\.png|favicon-32x32\\.png|screenshot-mobile\\.png|screenshot-desktop\\.png|robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt|ai\\.txt|opensearch\\.xml|manifest\\.webmanifest|\\.well-known/).*)',
  ],
};
