import { NextResponse } from 'next/server';
import { getNeonAuthServer, type NeonAuthHandler } from '@/lib/neon/server-auth';

type AuthRouteContext = Parameters<NeonAuthHandler['GET']>[1];

function unavailableResponse(): Response {
  return NextResponse.json({ error: 'Neon Auth is not configured' }, { status: 503 });
}

function createHandler(method: keyof NeonAuthHandler) {
  return async (request: Request, context: AuthRouteContext): Promise<Response> => {
    const auth = getNeonAuthServer();
    if (!auth) return unavailableResponse();
    return auth.handler()[method](request, context);
  };
}

export const GET = createHandler('GET');
export const POST = createHandler('POST');
export const PUT = createHandler('PUT');
export const DELETE = createHandler('DELETE');
export const PATCH = createHandler('PATCH');
