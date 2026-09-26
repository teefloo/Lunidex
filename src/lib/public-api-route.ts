import { apiError, type PublicApiContext } from '@/lib/public-api';
import { PublicCardError } from '@/lib/public-api-tcg';
import { SealedServerError } from '@/lib/tcg-sealed-server';

export type PublicApiHandler = (context: PublicApiContext) => Promise<Response>;

export function publicApiRouteError(error: unknown): Response {
  if (error instanceof PublicCardError) {
    return apiError(error.status, error.code, error.message);
  }
  if (error instanceof SealedServerError) {
    const code = error.status === 404
      ? 'NOT_FOUND'
      : error.status === 409
        ? 'CONFLICT'
        : error.status === 400 || error.status === 422
          ? 'VALIDATION_ERROR'
          : 'SEALED_REQUEST_FAILED';
    return apiError(error.status, code, error.message);
  }
  return apiError(500, 'INTERNAL_ERROR', 'The API request failed.');
}

export function cursorOffset(value: Record<string, unknown> | null): number | null {
  if (!value) return value === null ? 0 : null;
  return typeof value.offset === 'number' && Number.isSafeInteger(value.offset) && value.offset >= 0
    ? value.offset
    : null;
}

export function sameCursorSnapshot(value: Record<string, unknown>, snapshot: string | number): boolean {
  return value.snapshot === snapshot;
}

export function apiQueryError(message: string, details?: unknown): Response {
  return apiError(422, 'VALIDATION_ERROR', message, details === undefined ? {} : { details });
}
