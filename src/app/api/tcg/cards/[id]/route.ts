import { NextRequest, NextResponse } from 'next/server';
import { getTCGCard } from '@/lib/api/tcg';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    if (!id?.trim()) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
    const card = await getTCGCard(id, lang);

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error('[TCG API] Failed to fetch card detail:', error);
    return NextResponse.json({ error: 'Failed to fetch card' }, { status: 502 });
  }
}
