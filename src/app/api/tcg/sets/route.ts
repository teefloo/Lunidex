import { NextRequest, NextResponse } from 'next/server';
import { getAllSets } from '@/lib/api/tcg';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  try {
    const sets = await getAllSets(lang);
    return NextResponse.json(
      { sets },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch TCG sets' },
      { status: 502 }
    );
  }
}
