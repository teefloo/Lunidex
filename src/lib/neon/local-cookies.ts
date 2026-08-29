const SECURE_AUTH_COOKIE_PREFIX = '__Secure-neon-auth';
export const DEVELOPMENT_AUTH_COOKIE_PREFIX = 'lunidex-neon-auth';

function hasCookiePrefix(name: string, prefix: string): boolean {
  return name === prefix || name.startsWith(`${prefix}.`);
}

function replaceCookiePrefix(name: string, from: string, to: string): string {
  return hasCookiePrefix(name, from) ? `${to}${name.slice(from.length)}` : name;
}

/** Development-only bridge for plain HTTP hosts, where __Secure- cookies are refused. */
export function usesDevelopmentAuthCookies(request: Request): boolean {
  return process.env.NODE_ENV === 'development' && new URL(request.url).protocol === 'http:';
}

export function hasDevelopmentAuthCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((part) => {
    const separator = part.indexOf('=');
    return separator > 0 && hasCookiePrefix(part.slice(0, separator).trim(), DEVELOPMENT_AUTH_COOKIE_PREFIX);
  });
}

/** Rewrites the browser's development cookie name to the name Neon Auth expects upstream. */
export function rewriteDevelopmentAuthCookieHeader(cookieHeader: string): string {
  return cookieHeader.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) return part;
    const name = part.slice(0, separator).trim();
    const rewrittenName = replaceCookiePrefix(
      name,
      DEVELOPMENT_AUTH_COOKIE_PREFIX,
      SECURE_AUTH_COOKIE_PREFIX,
    );
    if (rewrittenName === name) return part;
    const nameStart = part.indexOf(name);
    return `${part.slice(0, nameStart)}${rewrittenName}${part.slice(separator)}`;
  }).join(';');
}

function rewriteDevelopmentSetCookie(cookie: string): string {
  const separator = cookie.indexOf('=');
  if (separator <= 0) return cookie;
  const name = cookie.slice(0, separator).trim();
  if (!hasCookiePrefix(name, SECURE_AUTH_COOKIE_PREFIX)) return cookie;

  const rewrittenName = replaceCookiePrefix(name, SECURE_AUTH_COOKIE_PREFIX, DEVELOPMENT_AUTH_COOKIE_PREFIX);
  return `${rewrittenName}${cookie.slice(separator)}`.replace(/;\s*Secure(?=\s*;|\s*$)/i, '');
}

/** Rewrites auth response cookies back to a plain-HTTP-safe development name. */
export function rewriteDevelopmentAuthResponse(response: Response, request: Request): Response {
  if (!usesDevelopmentAuthCookies(request)) return response;

  const headersWithGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = headersWithGetSetCookie.getSetCookie?.() ?? [];
  if (cookies.length === 0) return response;

  const headers = new Headers(response.headers);
  headers.delete('set-cookie');
  for (const cookie of cookies) headers.append('set-cookie', rewriteDevelopmentSetCookie(cookie));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Adds the secure cookie name back before forwarding a development request to Neon Auth. */
export function rewriteDevelopmentAuthRequest(request: Request): Request {
  if (!usesDevelopmentAuthCookies(request)) return request;
  const cookieHeader = request.headers.get('cookie');
  if (!hasDevelopmentAuthCookie(cookieHeader)) return request;

  const headers = new Headers(request.headers);
  headers.set('cookie', rewriteDevelopmentAuthCookieHeader(cookieHeader!));
  return new Request(request, { headers });
}
