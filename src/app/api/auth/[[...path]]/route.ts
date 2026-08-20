import { NextResponse } from 'next/server';
import { getNeonAuthServer, type NeonAuthHandler } from '@/lib/neon/server-auth';
import { normalizeAuthPath } from '@/lib/neon/auth-route';

type AuthRouteContext = { params: Promise<{ path?: string[] }> };

function unavailableResponse(): Response {
  return NextResponse.json({ error: 'Neon Auth is not configured' }, { status: 503 });
}

function requestWithFreshSessionLookup(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.set('disableCookieCache', 'true');
  return new Request(url, request);
}

function createHandler(method: keyof NeonAuthHandler) {
  return async (request: Request, context: AuthRouteContext): Promise<Response> => {
    const auth = getNeonAuthServer();
    if (!auth) return unavailableResponse();
    const params = await context.params;
    const normalizedContext = {
      params: Promise.resolve({ path: normalizeAuthPath(params.path, request.method) }),
    };
    const normalizedPath = normalizeAuthPath(params.path, request.method);
    const authRequest = method === 'GET'
      && normalizedPath.length === 1
      && normalizedPath[0] === 'get-session'
      ? requestWithFreshSessionLookup(request)
      : request;
    return auth.handler()[method](authRequest, normalizedContext as Parameters<NeonAuthHandler[typeof method]>[1]);
  };
}

export const GET = createHandler('GET');
export const POST = createHandler('POST');
export const PUT = createHandler('PUT');
export const DELETE = createHandler('DELETE');
export const PATCH = createHandler('PATCH');
