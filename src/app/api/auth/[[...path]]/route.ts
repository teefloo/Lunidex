import { NextResponse } from 'next/server';
import { getNeonAuthServer, revokeNeonAuthSession, type NeonAuthHandler } from '@/lib/neon/server-auth';
import { normalizeAuthPath } from '@/lib/neon/auth-route';
import { rewriteDevelopmentAuthRequest, rewriteDevelopmentAuthResponse } from '@/lib/neon/local-cookies';
import { withObservedRouteHandler } from '@/lib/api/observed-route';

type AuthRouteContext = { params: Promise<{ path?: string[] }> };

function unavailableResponse(): Response {
  return NextResponse.json({ error: 'Neon Auth is not configured' }, { status: 503 });
}

function requestWithFreshSessionLookup(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.set('disableCookieCache', 'true');
  return new Request(url, request);
}

function signOutFailureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('content-type', 'application/json');
  return new Response(JSON.stringify({ error: 'Unable to complete sign-out.' }), {
    status: 502,
    headers,
  });
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
    const revocation = method === 'POST'
      && normalizedPath.length === 1
      && normalizedPath[0] === 'sign-out'
      ? await revokeNeonAuthSession(request)
      : null;
    const forwardedRequest = rewriteDevelopmentAuthRequest(authRequest);
    const response = await auth.handler()[method](
      forwardedRequest,
      normalizedContext as Parameters<NeonAuthHandler[typeof method]>[1],
    );
    const finalResponse = revocation?.attempted && !revocation.success
      ? signOutFailureResponse(response)
      : response;
    return rewriteDevelopmentAuthResponse(finalResponse, request);
  };
}

export const GET = withObservedRouteHandler('/api/auth/:path', 'auth', createHandler('GET'));
export const POST = withObservedRouteHandler('/api/auth/:path', 'auth', createHandler('POST'));
export const PUT = withObservedRouteHandler('/api/auth/:path', 'auth', createHandler('PUT'));
export const DELETE = withObservedRouteHandler('/api/auth/:path', 'auth', createHandler('DELETE'));
export const PATCH = withObservedRouteHandler('/api/auth/:path', 'auth', createHandler('PATCH'));
