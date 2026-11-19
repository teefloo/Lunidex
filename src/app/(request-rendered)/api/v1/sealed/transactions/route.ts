import { NextRequest } from 'next/server';
import { isSealedDate, isSealedProductLanguage } from '@primedex/core/lib/sealed-ledger';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import {
  apiError,
  apiResponse,
  decodeApiCursor,
  encodeApiCursor,
  hashRequestBody,
  parsePageSize,
  readJsonObject,
  runPublicApi,
  sha256,
} from '@/lib/public-api';
import {
  getSealedRevision,
  getSealedTransactionPage,
  isSealedUuid,
  mutateSealedTransaction,
  type SealedTransactionPageOptions,
} from '@/lib/tcg-sealed-server';
import { publicApiRouteError } from '@/lib/public-api-route';

function parseRevision(value: unknown, minimum: number): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : null;
}

async function getTransactions(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/sealed/transactions', 'read', undefined, async ({ sql, userId }) => {
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
    const kindText = params.get('type');
    if (kindText && !['buy', 'sell', 'exchange'].includes(kindText)) return apiError(422, 'VALIDATION_ERROR', 'type is invalid.');
    const includeVoidedText = params.get('includeVoided');
    if (includeVoidedText !== null && includeVoidedText !== 'true' && includeVoidedText !== 'false') {
      return apiError(422, 'VALIDATION_ERROR', 'includeVoided must be true or false.');
    }
    const includeVoided = includeVoidedText === 'true';
    const voidedText = params.get('voided');
    if (voidedText !== null && voidedText !== 'true' && voidedText !== 'false') {
      return apiError(422, 'VALIDATION_ERROR', 'voided must be true or false.');
    }
    const voided = voidedText === null ? undefined : voidedText === 'true';
    const revision = await getSealedRevision(sql, userId);
    const rawCursor = params.get('cursor');
    const cursor = decodeApiCursor(rawCursor);
    if (rawCursor && !cursor) return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');
    let cursorPosition: SealedTransactionPageOptions['cursor'];
    if (cursor) {
      if (cursor.revision !== revision) return apiError(409, 'CURSOR_STALE', 'The sealed journal changed after this cursor was created.');
      if (cursor.productId !== (productId ?? null)
        || cursor.language !== (language ?? null)
        || cursor.kind !== (kindText ?? null)
        || cursor.includeVoided !== includeVoided
        || cursor.voided !== (voided ?? null)) {
        return apiError(409, 'CURSOR_STALE', 'The transaction filters changed after this cursor was created.');
      }
      if (typeof cursor.date !== 'string' || !isSealedDate(cursor.date)
        || typeof cursor.createdAt !== 'string' || cursor.createdAt.length > 64 || !Number.isFinite(Date.parse(cursor.createdAt))
        || !isSealedUuid(cursor.id)) {
        return apiError(422, 'VALIDATION_ERROR', 'cursor is invalid.');
      }
      cursorPosition = { date: cursor.date, createdAt: cursor.createdAt, id: cursor.id };
    }
    const result = await getSealedTransactionPage(sql, userId, {
      limit,
      cursor: cursorPosition,
      productId,
      language,
      kind: kindText ? kindText as SealedTransactionPageOptions['kind'] : undefined,
      includeVoided,
      voided,
    });
    const last = result.transactions.at(-1);
    return apiResponse(result.transactions, 200, {
      limit,
      revision,
      nextCursor: result.hasMore && last
        ? encodeApiCursor({
          revision,
          date: last.date,
          createdAt: last.createdAt,
          id: last.id,
          productId: productId ?? null,
          language: language ?? null,
          kind: kindText ?? null,
          includeVoided,
          voided: voided ?? null,
        })
        : null,
    });
  });
}

async function createTransaction(request: NextRequest): Promise<Response> {
  return runPublicApi(request, '/api/v1/sealed/transactions', 'write', undefined, async ({ sql, userId }) => {
    const body = await readJsonObject<Record<string, unknown>>(request, 16_384);
    if (!body) return apiError(422, 'VALIDATION_ERROR', 'A JSON object is required.');
    const expectedRevision = parseRevision(body.expectedRevision, 0);
    if (expectedRevision === null) return apiError(422, 'VALIDATION_ERROR', 'expectedRevision is required.');
    const idempotencyKey = request.headers.get('idempotency-key')?.trim() ?? '';
    if (idempotencyKey.length < 8 || idempotencyKey.length > 200 || /[\u0000-\u001f\u007f]/.test(idempotencyKey)) {
      return apiError(422, 'IDEMPOTENCY_KEY_REQUIRED', 'A valid Idempotency-Key header is required.');
    }
    try {
      const result = await mutateSealedTransaction(sql, userId, body, {
        mode: 'create',
        expectedRevision,
        idempotency: { keyHash: sha256(idempotencyKey), requestHash: hashRequestBody(body) },
      });
      const replayed = 'replayed' in result && result.replayed === true;
      return apiResponse({ ...result, replayed }, replayed ? 200 : 201);
    } catch (error) {
      return publicApiRouteError(error);
    }
  });
}

export const GET = withObservedRouteHandler('/api/v1/sealed/transactions', 'api', getTransactions);
export const POST = withObservedRouteHandler('/api/v1/sealed/transactions', 'api', createTransaction);
