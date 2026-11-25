import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readJsonBodyResult, requireTrustedMutationOrigin } from '@/lib/api/route-helpers';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { ensureSupabaseUser, getSupabaseUserFromRequest, type SupabaseRequestUser } from '@/lib/supabase/auth';
import { isInactiveAccountError } from '@/lib/supabase/errors';
import { getSupabaseDatabaseClient, type SupabaseSql } from '@/lib/supabase/database';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL } from '@/lib/site';
import { getShareableTCGCollection } from '@/lib/tcg-collection-share';
import { isSupportedLanguage } from '@/lib/languages';

export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface ShareSettingsRow {
  show_quantities: boolean;
  show_prices: boolean;
}

interface UserStateRow {
  data: unknown;
}

interface RouteParams {
  params: Promise<{ collectionId: string }>;
}

type AuthorizedCollection =
  | { authorized: false; response: NextResponse }
  | { authorized: true; sql: SupabaseSql; user: SupabaseRequestUser };

function noStoreJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

async function authorizedCollection(
  request: NextRequest,
  collectionId: string,
  action: string,
): Promise<AuthorizedCollection> {
  const sql = getSupabaseDatabaseClient();
  if (!sql) return { authorized: false, response: noStoreJson({ error: 'Application database unavailable' }, 503) };

  const user = await getSupabaseUserFromRequest(request);
  if (!user) return { authorized: false, response: noStoreJson({ error: 'Authentication required' }, 401) };
  if (!UUID_PATTERN.test(collectionId)) return { authorized: false, response: noStoreJson({ error: 'Collection not found' }, 404) };
  if (!rateLimit(`tcg-collection-share:${action}:${user.id}`, action === 'read' ? 120 : 30)) {
    return { authorized: false, response: noStoreJson({ error: 'Too many requests' }, 429) };
  }
  if (await ensureSupabaseUser(sql, user) === false) {
    return { authorized: false, response: noStoreJson({ error: 'Account deletion is in progress' }, 410) };
  }
  return { authorized: true, sql, user };
}

async function collectionIsSynced(sql: NonNullable<ReturnType<typeof getSupabaseDatabaseClient>>, userId: string, collectionId: string): Promise<boolean> {
  const rows = await sql`
    select data
    from public.user_state
    where user_id = ${userId}::uuid
    limit 1
  ` as UserStateRow[];
  return Boolean(rows[0] && getShareableTCGCollection(rows[0].data, collectionId));
}

async function getSettings(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { collectionId } = await params;
  const auth = await authorizedCollection(request, collectionId, 'read');
  if (!auth.authorized) return auth.response;
  try {
    if (!await collectionIsSynced(auth.sql, auth.user.id, collectionId)) return noStoreJson({ error: 'Collection not found' }, 404);
    const rows = await auth.sql`
      select show_quantities, show_prices
      from public.tcg_collection_shares
      where user_id = ${auth.user.id}::uuid and collection_id = ${collectionId}::uuid
      limit 1
    ` as ShareSettingsRow[];
    const settings = rows[0];
    return noStoreJson({
      active: Boolean(settings),
      showQuantities: settings?.show_quantities ?? false,
      showPrices: settings?.show_prices ?? false,
    });
  } catch (error) {
    if (isInactiveAccountError(error)) return noStoreJson({ error: 'Account deletion is in progress' }, 410);
    return noStoreJson({ error: 'Share settings unavailable' }, 503);
  }
}

async function createOrRotate(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return noStoreJson({ error: 'Invalid request origin' }, 403);
  const { collectionId } = await params;
  const auth = await authorizedCollection(request, collectionId, 'create');
  if (!auth.authorized) return auth.response;
  const payload = await readJsonBodyResult<{ rotate?: unknown }>(request, { maxBytes: 256 });
  if (payload.kind !== 'ok' || typeof payload.value.rotate !== 'boolean') return noStoreJson({ error: 'Invalid share request' }, 400);

  try {
    if (!await collectionIsSynced(auth.sql, auth.user.id, collectionId)) return noStoreJson({ error: 'Collection not found' }, 404);
    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const rows = payload.value.rotate
      ? await auth.sql`
          insert into public.tcg_collection_shares (user_id, collection_id, token_hash)
          values (${auth.user.id}::uuid, ${collectionId}::uuid, ${tokenHash})
          on conflict (user_id, collection_id) do update
            set token_hash = excluded.token_hash,
                updated_at = now()
          returning show_quantities, show_prices
        ` as ShareSettingsRow[]
      : await auth.sql`
          insert into public.tcg_collection_shares (user_id, collection_id, token_hash)
          values (${auth.user.id}::uuid, ${collectionId}::uuid, ${tokenHash})
          on conflict (user_id, collection_id) do nothing
          returning show_quantities, show_prices
        ` as ShareSettingsRow[];
    if (!rows[0]) return noStoreJson({ error: 'A share already exists; rotate it to create a new link.' }, 409);

    const localeHeader = request.headers.get('x-primedex-lang');
    const locale = typeof localeHeader === 'string' && isSupportedLanguage(localeHeader) ? localeHeader : 'en';
    return noStoreJson({
      active: true,
      showQuantities: rows[0].show_quantities,
      showPrices: rows[0].show_prices,
      url: `${SITE_URL}/${locale}/tcg/showcase/${token}`,
    }, 201);
  } catch (error) {
    if (isInactiveAccountError(error)) return noStoreJson({ error: 'Account deletion is in progress' }, 410);
    return noStoreJson({ error: 'Share could not be created' }, 503);
  }
}

async function updateSettings(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return noStoreJson({ error: 'Invalid request origin' }, 403);
  const { collectionId } = await params;
  const auth = await authorizedCollection(request, collectionId, 'update');
  if (!auth.authorized) return auth.response;
  const payload = await readJsonBodyResult<{ showQuantities?: unknown; showPrices?: unknown }>(request, { maxBytes: 256 });
  if (payload.kind !== 'ok'
    || typeof payload.value.showQuantities !== 'boolean'
    || typeof payload.value.showPrices !== 'boolean') return noStoreJson({ error: 'Invalid share settings' }, 400);

  try {
    const rows = await auth.sql`
      update public.tcg_collection_shares
      set show_quantities = ${payload.value.showQuantities},
          show_prices = ${payload.value.showPrices},
          updated_at = now()
      where user_id = ${auth.user.id}::uuid and collection_id = ${collectionId}::uuid
      returning show_quantities, show_prices
    ` as ShareSettingsRow[];
    if (!rows[0]) return noStoreJson({ error: 'No active share' }, 404);
    return noStoreJson({ active: true, showQuantities: rows[0].show_quantities, showPrices: rows[0].show_prices });
  } catch (error) {
    if (isInactiveAccountError(error)) return noStoreJson({ error: 'Account deletion is in progress' }, 410);
    return noStoreJson({ error: 'Share settings could not be saved' }, 503);
  }
}

async function revokeShare(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const originError = requireTrustedMutationOrigin(request);
  if (originError) return noStoreJson({ error: 'Invalid request origin' }, 403);
  const { collectionId } = await params;
  const auth = await authorizedCollection(request, collectionId, 'revoke');
  if (!auth.authorized) return auth.response;
  try {
    await auth.sql`
      delete from public.tcg_collection_shares
      where user_id = ${auth.user.id}::uuid and collection_id = ${collectionId}::uuid
    `;
    return noStoreJson({ active: false, showQuantities: false, showPrices: false });
  } catch (error) {
    if (isInactiveAccountError(error)) return noStoreJson({ error: 'Account deletion is in progress' }, 410);
    return noStoreJson({ error: 'Share could not be revoked' }, 503);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/custom-collections/:id/share', 'tcg', getSettings);
export const POST = withObservedRouteHandler('/api/tcg/custom-collections/:id/share', 'tcg', createOrRotate);
export const PATCH = withObservedRouteHandler('/api/tcg/custom-collections/:id/share', 'tcg', updateSettings);
export const DELETE = withObservedRouteHandler('/api/tcg/custom-collections/:id/share', 'tcg', revokeShare);
