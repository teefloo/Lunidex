import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, decodeApiCursor, encodeApiCursor, runPublicApi } from '@/lib/public-api';
import { searchPublicSealedCatalogue } from '@/lib/tcg-sealed-server';

const PAGE_SIZE = 24;

async function getCatalogue(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/sealed/catalogue', 'read', undefined, async ({ sql }) => {
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 150);
    const rawCursor = request.nextUrl.searchParams.get('cursor');
    const cursor = decodeApiCursor(rawCursor);
    if (rawCursor && !cursor) return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');
    const revisionRows = await sql`
      select max(updated_at)::text as revision from public.tcg_sealed_products
    ` as Array<{ revision: string | null }>;
    const revision = revisionRows[0]?.revision ?? 'empty';
    let page = 0;
    if (cursor) {
      if (cursor.query !== query) return apiError(409, 'CURSOR_STALE', 'The catalogue cursor does not match this search.');
      if (cursor.snapshot !== revision) return apiError(409, 'CURSOR_STALE', 'The catalogue changed after this cursor was created.');
      if (typeof cursor.page !== 'number' || !Number.isSafeInteger(cursor.page) || cursor.page < 0 || cursor.page > 10_000) {
        return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');
      }
      page = cursor.page;
    }
    const result = await searchPublicSealedCatalogue(sql, query, page, PAGE_SIZE);
    const nextPage = result.page + 1;
    return apiResponse(result.products.map((product) => ({
      cardmarketProductId: product.cardmarketProductId,
      name: product.name,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      expansionId: product.expansionId,
      cardmarketUrl: product.cardmarketUrl,
      imageAvailable: product.imageAvailable,
    })), 200, {
      limit: PAGE_SIZE,
      total: result.total,
      nextCursor: nextPage * PAGE_SIZE < result.total
        ? encodeApiCursor({ query, page: nextPage, snapshot: revision })
        : null,
    });
  });
}

export const GET = withObservedRouteHandler('/api/v1/sealed/catalogue', 'api', getCatalogue);
