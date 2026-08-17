import { NextRequest, NextResponse } from 'next/server';

import { getNeonUserFromRequest } from '@/lib/neon/auth';
import { getNeonClient } from '@/lib/neon/server';
import { getNeonAuthServer } from '@/lib/neon/server-auth';
import { readJsonBody } from '@/lib/api/route-helpers';

type DeletePayload = { confirmation?: unknown };

function sameOrigin(request: NextRequest): boolean {
  if (request.headers.get('authorization')?.startsWith('Bearer ')) return true;
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });

  const payload = await readJsonBody<DeletePayload>(request);
  if (payload?.confirmation !== 'DELETE') {
    return NextResponse.json({ error: 'Explicit confirmation required' }, { status: 400 });
  }

  const sql = getNeonClient();
  const auth = getNeonAuthServer();
  if (!sql || !auth) return NextResponse.json({ error: 'Account deletion unavailable' }, { status: 503 });

  const user = await getNeonUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const authDeletion = await auth.deleteUser({});
    if (authDeletion.error || !authDeletion.data?.success) {
      return NextResponse.json({ error: 'Authentication account deletion failed' }, { status: 502 });
    }

    await sql.transaction((tx) => [
      tx`delete from public.battle_rooms where player1_id = ${user.id}::uuid or player2_id = ${user.id}::uuid`,
      tx`delete from app.users where id = ${user.id}::uuid`,
    ]);
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Account deletion failed' }, { status: 503 });
  }
}
