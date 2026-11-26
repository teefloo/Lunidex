/**
 * Older Neon Auth clients can probe the proxy root before requesting an
 * endpoint. Treat a root GET as the session endpoint so that probe cannot
 * leave the client stuck in its unauthenticated state after a successful
 * sign-in.
 */
export function normalizeAuthPath(path: string[] | undefined, method: string): string[] {
  const segments = path ?? [];
  return method === 'GET' && segments.length === 0 ? ['get-session'] : segments;
}
