import { NextRequest, NextResponse } from 'next/server';
import { requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { apiError, getUserSessionContext, isApiContext, isUuid, revokeApiKey } from '@/lib/public-api';

async function deleteApiKey(
  request: NextRequest,
  routeContext: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
  const context = await getUserSessionContext(request);
  if (!isApiContext(context)) return context;
  if (!rateLimit(`api-key-revoke:${context.userId}`, 20)) {
    return apiError(429, 'RATE_LIMITED', 'Too many API key revocation requests.', {
      headers: { 'Retry-After': '60' },
    });
  }
  const id = (await routeContext.params).id;
  if (!isUuid(id)) return apiError(400, 'INVALID_ID', 'The API key id is invalid.');
  try {
    if (!await revokeApiKey(context, id)) return apiError(404, 'NOT_FOUND', 'The API key was not found.');
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (isInactiveAccountError(error)) return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    return apiError(503, 'API_UNAVAILABLE', 'The API key could not be revoked.');
  }
}

export const DELETE = withObservedRouteHandler('/api/account/api-keys/:id', 'profile', deleteApiKey);
