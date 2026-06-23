import { NextRequest, NextResponse } from 'next/server';
import { decodeTCGUserState, encodeTCGUserState, TCG_USER_STATE_COOKIE } from '@/lib/tcg-user-state';
import { readJsonBody } from '@/lib/api/route-helpers';
import type { TCGUserCardEntry } from '@/types/tcg';

export async function GET(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  return NextResponse.json(state);
}

export async function POST(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  const payload = await readJsonBody<{ cardId?: string; state?: string; note?: string }>(request);

  if (!payload?.cardId || !isValidOwnedState(payload.state)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const nextState = upsertEntry(state, {
    cardId: payload.cardId,
    state: payload.state,
    note: payload.note,
    updatedAt: new Date().toISOString(),
  });

  return persistState(nextState);
}

export async function PATCH(request: NextRequest) {
  return POST(request);
}

export async function DELETE(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  const cardId = request.nextUrl.searchParams.get('cardId');
  const ownedState = request.nextUrl.searchParams.get('state');

  if (!cardId) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 });
  }

  const nextState = removeEntry(state, cardId, ownedState);
  return persistState(nextState);
}

function upsertEntry(
  state: ReturnType<typeof decodeTCGUserState>,
  entry: TCGUserCardEntry,
) {
  const nextOwned = state.owned.filter((item) => item.cardId !== entry.cardId || item.state !== entry.state);
  nextOwned.unshift(entry);

  return {
    ...state,
    owned: nextOwned.slice(0, 200),
  };
}

function removeEntry(
  state: ReturnType<typeof decodeTCGUserState>,
  cardId: string,
  ownedState: string | null,
) {
  return {
    ...state,
    owned: state.owned.filter((item) => item.cardId !== cardId || (ownedState ? item.state !== ownedState : false)),
  };
}

function persistState(state: ReturnType<typeof decodeTCGUserState>) {
  const response = NextResponse.json(state);
  response.cookies.set(TCG_USER_STATE_COOKIE, encodeTCGUserState(state), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function isValidOwnedState(state: unknown): state is TCGUserCardEntry['state'] {
  return state === 'owned' || state === 'wishlist';
}
