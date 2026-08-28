import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody } from '@/lib/api/route-helpers';
import { ipKey, rateLimit } from '@/lib/rate-limit';
import { sendContactEmail } from '@/lib/resend';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITS = { name: 120, email: 320, subject: 160, message: 5000 } as const;
const headers = { 'Cache-Control': 'no-store' };

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function isText(value: unknown): value is string {
  return typeof value === 'string';
}

function invalid(payload: ContactPayload): boolean {
  if (!isText(payload.name) || !isText(payload.email) || !isText(payload.subject) || !isText(payload.message)) return true;
  const name = payload.name.trim();
  const email = payload.email.trim();
  const subject = payload.subject.trim();
  const message = payload.message.trim();
  return !name || !EMAIL_PATTERN.test(email) || !subject || !message
    || name.length > LIMITS.name
    || email.length > LIMITS.email
    || subject.length > LIMITS.subject
    || message.length > LIMITS.message;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get('content-type') !== 'application/json') {
    return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415, headers });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 12_000) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413, headers });
  }

  if (!rateLimit(`contact:${ipKey(request)}`, 5)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers });
  }

  const payload = await readJsonBody<ContactPayload>(request, { maxBytes: 12_000 });
  if (!payload || (isText(payload.website) && payload.website.trim()) || invalid(payload)) {
    return NextResponse.json({ error: 'invalid_contact' }, { status: 400, headers });
  }

  const name = payload.name as string;
  const email = payload.email as string;
  const subject = payload.subject as string;
  const message = payload.message as string;

  try {
    const delivered = await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
    if (!delivered) return NextResponse.json({ error: 'contact_delivery_unavailable' }, { status: 503, headers });
    return NextResponse.json({ ok: true }, { status: 202, headers });
  } catch {
    return NextResponse.json({ error: 'contact_delivery_failed' }, { status: 503, headers });
  }
}
