import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, runPublicApi } from '@/lib/public-api';
import { getSealedCurrentPortfolio } from '@/lib/tcg-sealed-server';

type RouteContext = { params: Promise<{ productId: string }> };

async function getPosition(request: NextRequest, routeContext: RouteContext): Promise<Response> {
  const rawProductId = (await routeContext.params).productId;
  return runPublicApi(request, '/api/v1/sealed/positions/:productId', 'read', 'sealed', async ({ sql, userId }) => {
    const productId = Number(rawProductId);
    if (!/^\d+$/.test(rawProductId) || !Number.isSafeInteger(productId) || productId < 1) {
      return apiError(422, 'VALIDATION_ERROR', 'productId must be a positive integer.');
    }
    const { summary, revision, priceRevision } = await getSealedCurrentPortfolio(sql, userId, new Date().toISOString().slice(0, 10));
    const positions = summary.positions.filter((position) => position.cardmarketProductId === productId && position.quantity > 0);
    if (positions.length === 0) return apiError(404, 'NOT_FOUND', 'The sealed product is not owned by this account.');
    return apiResponse({
      product: positions[0].product,
      positions: positions.map((position) => ({
        language: position.language,
        quantity: position.quantity,
        costCents: position.costCents,
        valueCents: position.valueCents,
        missingPrice: position.quantity > 0 && position.valueCents === null,
        valuation: position.valuation,
      })),
    }, 200, { revision, priceRevision });
  });
}

export const GET = withObservedRouteHandler('/api/v1/sealed/positions/:productId', 'api', getPosition);
