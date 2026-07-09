import { NextRequest, NextResponse } from 'next/server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim() : '';

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // No storage backend wired yet — logged so signups aren't silently dropped
  // until this is connected to Supabase or an email provider.
  console.info('[early-access] signup', email);

  return NextResponse.json({ ok: true });
}
