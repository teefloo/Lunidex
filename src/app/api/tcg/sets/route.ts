import { NextRequest, NextResponse } from 'next/server';
import { getAllSets } from '@/lib/api/tcg';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  try {
    const sets = await getAllSets(lang);
    return NextResponse.json({ sets });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch TCG sets' },
      { status: 502 }
    );
  }
}
