import { NextRequest, NextResponse } from 'next/server';
import { requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { isInactiveAccountError } from '@/lib/neon/errors';
import {
  apiError,
  apiResponse,
  ApiAccountUnavailableError,
  createApiKey,
  getUserSessionContext,
  isApiContext,
  listApiKeys,
  readJsonObject,
} from '@/lib/public-api';

async function getApiKeys(request: NextRequest): Promise<NextResponse> {
  const context = await getUserSessionContext(request);
  if (!isApiContext(context)) return context;
  if (!rateLimit(`api-key-list:${context.userId}`, 60)) {
    return apiError(429, 'RATE_LIMITED', 'Too many API key requests.', {
      headers: { 'Retry-After': '60' },
    });
  }
  try {
    return apiResponse(await listApiKeys(context));
  } catch {
    return apiError(503, 'API_UNAVAILABLE', 'The API key service is temporarily unavailable.');
  }
}

async function postApiKey(request: NextRequest): Promise<NextResponse> {
  if (requireTrustedMutationOrigin(request)) {
    return apiError(403, 'INVALID_REQUEST_ORIGIN', 'Invalid request origin.');
  }
  const context = await getUserSessionContext(request);
  if (!isApiContext(context)) return context;
  if (!rateLimit(`api-key-create:${context.userId}`, 10)) {
    return apiError(429, 'RATE_LIMITED', 'Too many API key creation requests.', {
      headers: { 'Retry-After': '60' },
    });
  }
  const body = await readJsonObject<Record<string, unknown>>(request, 2_048);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const permission = body?.permission;
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    return apiError(422, 'VALIDATION_ERROR', 'Name must contain 1 to 80 printable characters.');
  }
  if (permission !== 'read' && permission !== 'read_write') {
    return apiError(422, 'VALIDATION_ERROR', 'Permission must be read or read_write.');
  }
  try {
    const created = await createApiKey(context, name, permission);
    if (!created) return apiError(409, 'KEY_LIMIT_REACHED', 'A maximum of five active API keys is allowed.');
    return apiResponse({
      id: created.id,
      name,
      permission,
      prefix: created.prefix,
      key: created.token,
      createdAt: created.createdAt,
      warning: 'Copy this key now. It cannot be shown again.',
    }, 201);
  } catch (error) {
    if (error instanceof ApiAccountUnavailableError || isInactiveAccountError(error)) {
      return apiError(410, 'ACCOUNT_UNAVAILABLE', 'This account is being deleted.');
    }
    return apiError(503, 'API_UNAVAILABLE', 'The API key could not be created.');
  }
}

export const GET = withObservedRouteHandler('/api/account/api-keys', 'profile', getApiKeys);
export const POST = withObservedRouteHandler('/api/account/api-keys', 'profile', postApiKey);
