import { NextResponse, type NextRequest } from 'next/server';

/** Safely parse a JSON request body. Returns null on invalid JSON or non-object payloads. */
export async function readJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const payload = await request.json();
    return payload && typeof payload === 'object' ? (payload as T) : null;
  } catch {
    return null;
  }
}

/**
 * Cookie-authenticated mutations must originate from this application. Native
 * clients authenticate with a bearer token instead, so they do not need a
 * browser Origin header and remain supported by the same API routes.
 */
export function hasBearerAuthorization(request: Request): boolean {
  return /^Bearer\s+\S+$/i.test(request.headers.get('authorization')?.trim() ?? '');
}

function sameHost(request: NextRequest, value: string): boolean {
  const host = request.headers.get('host') ?? request.nextUrl.host;
  try {
    return new URL(value).host === host;
  } catch {
    return false;
  }
}

export function isTrustedMutationOrigin(request: NextRequest): boolean {
  if (hasBearerAuthorization(request)) return true;

  const origin = request.headers.get('origin');
  if (origin) return sameHost(request, origin);

  // Some same-origin user agents omit Origin on a mutation. Referer and
  // Sec-Fetch-Site are safe fallbacks here because browsers set them and a
  // cross-site page cannot set either value for a credentialed fetch.
  const referer = request.headers.get('referer');
  if (referer && sameHost(request, referer)) return true;
  return request.headers.get('sec-fetch-site') === 'same-origin';
}

/** Returns a 403 response when a browser mutation lacks a trusted origin. */
export function requireTrustedMutationOrigin(request: NextRequest): NextResponse | null {
  if (isTrustedMutationOrigin(request)) return null;
  return NextResponse.json(
    { error: 'Invalid request origin' },
    { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
  );
}
