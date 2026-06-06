import { NextRequest, NextResponse } from 'next/server';
import { isSupportedLanguage } from '@/lib/languages';

const COOKIE_NAME = 'primedex-lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function detectLocaleFromAcceptLanguage(header: string | null): string {
  if (!header) return 'en';
  const first = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase().split('-')[0] ?? 'en';
  return isSupportedLanguage(first) ? first : 'en';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const hasLocalePrefix = isSupportedLanguage(firstSegment ?? '');

  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  const cookieLang = isSupportedLanguage(cookieLocale ?? '') ? cookieLocale! : null;

  if (hasLocalePrefix) {
    const urlLocale = firstSegment!;
    const restPath = '/' + segments.slice(1).join('/');
    const finalPath = restPath === '/' ? '/' : restPath;

    const response = NextResponse.rewrite(new URL(finalPath, request.url));
    if (cookieLang !== urlLocale) {
      response.cookies.set(COOKIE_NAME, urlLocale, {
        path: '/',
        maxAge: COOKIE_MAX_AGE,
        sameSite: 'lax',
      });
    }
    return response;
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
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|favicon-16x16\\.png|favicon-32x32\\.png|screenshot-mobile\\.png|screenshot-desktop\\.png|robots\\.txt|sitemap\\.xml|llms\\.txt|llms-full\\.txt|ai\\.txt|opensearch\\.xml|manifest\\.webmanifest|\\.well-known/).*)',
  ],
};
