import { NextRequest, NextResponse } from 'next/server';
import { getTCGCard } from '@/lib/api/tcg';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  const card = await getTCGCard(id, lang);

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  return NextResponse.json({ card });
}
