import { NextRequest } from 'next/server';
import { isSealedProductLanguage } from '@primedex/core/lib/sealed-ledger';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, decodeApiCursor, encodeApiCursor, parsePageSize, runPublicApi } from '@/lib/public-api';
import { getSealedCurrentPortfolio } from '@/lib/tcg-sealed-server';

async function getPositions(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/sealed/positions', 'read', 'sealed', async ({ sql, userId }) => {
    const params = request.nextUrl.searchParams;
    const limit = parsePageSize(params.get('limit'));
    if (limit === null) return apiError(422, 'VALIDATION_ERROR', 'limit must be between 1 and 100.');
    const productText = params.get('productId');
    const productId = productText === null ? undefined : Number(productText);
    if (productText !== null && (!/^\d+$/.test(productText) || !Number.isSafeInteger(productId) || (productId ?? 0) < 1)) {
      return apiError(422, 'VALIDATION_ERROR', 'productId must be a positive integer.');
    }
    const language = params.get('language') ?? undefined;
    if (language && !isSealedProductLanguage(language)) return apiError(422, 'VALIDATION_ERROR', 'language is invalid.');
    const rawCursor = params.get('cursor');
    const cursor = decodeApiCursor(rawCursor);
    if (rawCursor && !cursor) return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');
    const offset = cursor
      ? typeof cursor.offset === 'number' && Number.isSafeInteger(cursor.offset) && cursor.offset >= 0 ? cursor.offset : null
      : 0;
    if (offset === null) return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');

    const { summary, revision, priceRevision } = await getSealedCurrentPortfolio(sql, userId, new Date().toISOString().slice(0, 10));
    if (cursor && (cursor.snapshot !== revision || cursor.priceRevision !== priceRevision)) {
      return apiError(409, 'CURSOR_STALE', 'The sealed portfolio or market prices changed after this cursor was created.');
    }
    if (cursor && (cursor.productId !== (productId ?? null) || cursor.language !== (language ?? null))) {
      return apiError(409, 'CURSOR_STALE', 'The position filters changed after this cursor was created.');
    }
    const positions = summary.positions
      .filter((position) => position.quantity > 0
        && (productId === undefined || position.cardmarketProductId === productId)
        && (!language || position.language === language))
      .sort((left, right) => left.cardmarketProductId - right.cardmarketProductId || left.language.localeCompare(right.language));
    const page = positions.slice(offset, offset + limit + 1);
    const hasMore = page.length > limit;
    const data = page.slice(0, limit).map((position) => ({
      product: position.product,
      language: position.language,
      quantity: position.quantity,
      costCents: position.costCents,
      valueCents: position.valueCents,
      missingPrice: position.quantity > 0 && position.valueCents === null,
      valuation: position.valuation,
    }));
    return apiResponse(data, 200, {
      limit,
      total: positions.length,
      revision,
      priceRevision,
      nextCursor: hasMore ? encodeApiCursor({
        snapshot: revision,
        priceRevision,
        offset: offset + limit,
        productId: productId ?? null,
        language: language ?? null,
      }) : null,
    });
  });
}

export const GET = withObservedRouteHandler('/api/v1/sealed/positions', 'api', getPositions);
