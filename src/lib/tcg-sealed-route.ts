import { NextResponse, type NextRequest } from 'next/server';
import { getNeonUserFromRequest, ensureNeonUser } from '@/lib/neon/auth';
import { isInactiveAccountError } from '@/lib/neon/errors';
import { getNeonClient, type NeonSql } from '@/lib/neon/server';
import { SealedDomainError } from '@primedex/core/lib/sealed-ledger';
import {
  SealedServerError,
  SEALED_NO_STORE_HEADERS,
} from '@/lib/tcg-sealed-server';

export interface SealedRequestContext {
  sql: NeonSql;
  userId: string;
}

export function unavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Sealed portfolio is temporarily unavailable.' },
    { status: 503, headers: SEALED_NO_STORE_HEADERS },
  );
}

export function accountDeletionResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Account deletion is in progress.' },
    { status: 410, headers: SEALED_NO_STORE_HEADERS },
  );
}

export async function getSealedRequestContext(request: NextRequest): Promise<SealedRequestContext | NextResponse> {
  const sql = getNeonClient();
  if (!sql) return unavailableResponse();
  const user = await getNeonUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401, headers: SEALED_NO_STORE_HEADERS },
    );
  }
  try {
    if (await ensureNeonUser(sql, user) === false) return accountDeletionResponse();
  } catch (error) {
    if (isInactiveAccountError(error)) return accountDeletionResponse();
    return unavailableResponse();
  }
  return { sql, userId: user.id };
}

export function isSealedRequestContext(value: SealedRequestContext | NextResponse): value is SealedRequestContext {
  return 'sql' in value;
}

export function sealedErrorResponse(error: unknown): NextResponse {
  if (error instanceof SealedServerError) {
    return NextResponse.json({ error: error.message }, { status: error.status, headers: SEALED_NO_STORE_HEADERS });
  }
  if (error instanceof SealedDomainError) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: SEALED_NO_STORE_HEADERS });
  }
  if (isInactiveAccountError(error)) return accountDeletionResponse();
  return NextResponse.json(
    { error: 'The sealed portfolio request failed.' },
    { status: 500, headers: SEALED_NO_STORE_HEADERS },
  );
}

export function positiveId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function dateParam(value: string | null, fallback: string): string {
  return value === null ? fallback : value;
}
