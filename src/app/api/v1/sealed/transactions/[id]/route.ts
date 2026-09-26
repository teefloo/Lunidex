import { NextRequest } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { apiError, apiResponse, readJsonObject, runPublicApi } from '@/lib/public-api';
import { getSealedTransaction, isSealedUuid, mutateSealedTransaction } from '@/lib/tcg-sealed-server';
import { publicApiRouteError } from '@/lib/public-api-route';

type RouteContext = { params: Promise<{ id: string }> };

async function getTransaction(request: NextRequest, routeContext: RouteContext): Promise<Response> {
  const id = (await routeContext.params).id;
  return runPublicApi(request, '/api/v1/sealed/transactions/:id', 'read', undefined, async ({ sql, userId }) => {
    if (!isSealedUuid(id)) return apiError(422, 'VALIDATION_ERROR', 'Transaction id is invalid.');
    const transaction = await getSealedTransaction(sql, userId, id);
    if (!transaction) return apiError(404, 'NOT_FOUND', 'The sealed transaction was not found.');
    return apiResponse(transaction);
  });
}

async function patchTransaction(request: NextRequest, routeContext: RouteContext): Promise<Response> {
  const id = (await routeContext.params).id;
  return runPublicApi(request, '/api/v1/sealed/transactions/:id', 'write', undefined, async ({ sql, userId }) => {
    if (!isSealedUuid(id)) return apiError(422, 'VALIDATION_ERROR', 'Transaction id is invalid.');
    const body = await readJsonObject<Record<string, unknown>>(request, 16_384);
    if (!body || typeof body.revision !== 'number' || !Number.isSafeInteger(body.revision) || body.revision < 1
      || typeof body.expectedRevision !== 'number' || !Number.isSafeInteger(body.expectedRevision) || body.expectedRevision < 0) {
      return apiError(422, 'VALIDATION_ERROR', 'revision and expectedRevision are required.');
    }
    try {
      const result = await mutateSealedTransaction(sql, userId, body, {
        mode: 'update',
        id,
        transactionRevision: body.revision,
        expectedRevision: body.expectedRevision,
      });
      return apiResponse(result);
    } catch (error) {
      return publicApiRouteError(error);
    }
  });
}

export const GET = withObservedRouteHandler('/api/v1/sealed/transactions/:id', 'api', getTransaction);
export const PATCH = withObservedRouteHandler('/api/v1/sealed/transactions/:id', 'api', patchTransaction);
