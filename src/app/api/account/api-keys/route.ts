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
  readJsonObject,
  type ApiPermission,
} from '@/lib/public-api';

interface ApiKeyListRow {
  id: string;
  name: string;
  key_prefix: string;
  permission: ApiPermission;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

async function getApiKeys(request: NextRequest): Promise<NextResponse> {
  const context = await getUserSessionContext(request);
  if (!isApiContext(context)) return context;
  if (!rateLimit(`api-key-list:${context.userId}`, 60)) {
    return apiError(429, 'RATE_LIMITED', 'Too many API key requests.', {
      headers: { 'Retry-After': '60' },
    });
  }
  const rows = await context.sql`
    select id::text, name, key_prefix, permission, created_at::text,
      last_used_at::text, revoked_at::text
    from public.api_keys
    where user_id = ${context.userId}::uuid
    order by created_at desc, id desc
  ` as ApiKeyListRow[];
  return apiResponse(rows.map((row) => ({
    id: row.id,
    name: row.name,
    permission: row.permission,
    prefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  })));
}

async function postApiKey(request: NextRequest): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return originError;
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
