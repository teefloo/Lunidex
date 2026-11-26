import { NextResponse, type NextRequest } from 'next/server';
import { ensureSupabaseUser } from '@/lib/supabase/auth';
import { getSupabaseDatabaseClient } from '@/lib/supabase/database';
import { verifySupabaseUserFromRequest } from '@/lib/supabase/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Confirm that the current session is enabled for this temporary deployment. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifySupabaseUserFromRequest(request);
  if (authResult.status === 'unavailable') {
    return NextResponse.json(
      { allowed: false },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  if (authResult.status === 'denied') {
    return NextResponse.json(
      { allowed: false },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  const { user } = authResult;

  try {
    const sql = getSupabaseDatabaseClient();
    if (!sql) {
      return NextResponse.json(
        { allowed: false },
        { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
    if (!await ensureSupabaseUser(sql, user)) {
      return NextResponse.json(
        { allowed: false },
        { status: 410, headers: { 'Cache-Control': 'private, no-store' } },
      );
    }
  } catch {
    return NextResponse.json(
      { allowed: false },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  return NextResponse.json(
    { allowed: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
