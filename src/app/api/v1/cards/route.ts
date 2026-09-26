import { NextRequest } from 'next/server';
import { normalizeTCGCardLanguage } from '@primedex/core/lib/tcg-language';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, decodeApiCursor, encodeApiCursor, parsePageSize, runPublicApi, sha256 } from '@/lib/public-api';
import { listCardHoldings, getCardSnapshot } from '@/lib/public-api-tcg';
import { apiQueryError, cursorOffset, sameCursorSnapshot } from '@/lib/public-api-route';

async function listCards(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/cards', 'read', undefined, async ({ sql, userId }) => {
    const query = request.nextUrl.searchParams;
    const limit = parsePageSize(query.get('limit'));
    if (limit === null) return apiQueryError('limit must be between 1 and 100.');
    const rawLanguage = query.get('language');
    const language = rawLanguage ? normalizeTCGCardLanguage(rawLanguage) ?? undefined : undefined;
    const rawSetId = query.get('set') ?? undefined;
    const setId = rawSetId?.toLowerCase();
    if (rawLanguage && !language) return apiQueryError('language is invalid.');
    if (setId && (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(setId))) return apiQueryError('set is invalid.');
    const cursorText = query.get('cursor');
    const cursor = decodeApiCursor(cursorText);
    if (cursorText && !cursor) return apiQueryError('cursor is invalid.');
    const pageOffset = cursorOffset(cursor);
    if (pageOffset === null) return apiQueryError('cursor is invalid.');

    const snapshot = await getCardSnapshot(sql, userId);
    const version = sha256(JSON.stringify([
      snapshot.updatedAt,
      snapshot.state.tcgCollections,
      snapshot.state.tcgCollectionCards,
      snapshot.state.tcgLegacyOwnedCards,
      snapshot.state.tcgActiveCollections,
    ]));
    if (cursor && !sameCursorSnapshot(cursor, version)) {
      return apiError(409, 'CURSOR_STALE', 'The collection changed after this cursor was created.');
    }
    if (cursor && (cursor.language !== (language ?? null) || cursor.setId !== (setId ?? null))) {
      return apiError(409, 'CURSOR_STALE', 'The card filters changed after this cursor was created.');
    }
    const holdings = listCardHoldings(snapshot.state, { language, setId });
    const page = holdings.slice(pageOffset, pageOffset + limit + 1);
    const hasMore = page.length > limit;
    const data = page.slice(0, limit);
    return apiResponse(data, 200, {
      limit,
      total: holdings.length,
      nextCursor: hasMore ? encodeApiCursor({
        snapshot: version,
        offset: pageOffset + limit,
        language: language ?? null,
        setId: setId ?? null,
      }) : null,
      snapshot: version,
    });
  });
}

export const GET = withObservedRouteHandler('/api/v1/cards', 'api', listCards);
