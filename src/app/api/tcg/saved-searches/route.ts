import { NextRequest, NextResponse } from 'next/server';
import { decodeTCGUserState, encodeTCGUserState, TCG_USER_STATE_COOKIE } from '@/lib/tcg-user-state';
import type { TCGSavedSearch } from '@/types/tcg';

export async function GET(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  return NextResponse.json({ savedSearches: state.savedSearches });
}

export async function POST(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  const payload = await readJsonBody<{ search?: TCGSavedSearch }>(request);

  if (!payload?.search?.id) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const nextState = {
    ...state,
    savedSearches: [payload.search, ...state.savedSearches.filter((item) => item.id !== payload.search?.id)].slice(0, 20),
  };

  return persistState(nextState);
}

export async function DELETE(request: NextRequest) {
  const state = decodeTCGUserState(request.cookies.get(TCG_USER_STATE_COOKIE)?.value);
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const nextState = {
    ...state,
    savedSearches: state.savedSearches.filter((search) => search.id !== id),
  };

  return persistState(nextState);
}

function persistState(state: ReturnType<typeof decodeTCGUserState>) {
  const response = NextResponse.json(state);
  response.cookies.set(TCG_USER_STATE_COOKIE, encodeTCGUserState(state), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

async function readJsonBody<T>(request: NextRequest): Promise<T | null> {
  try {
    const payload = await request.json();
    return payload && typeof payload === 'object' ? (payload as T) : null;
  } catch {
    return null;
  }
}
