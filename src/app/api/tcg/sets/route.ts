import { NextRequest, NextResponse } from 'next/server';
import { getAllSets } from '@/lib/api/tcg';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') ?? 'en';
  const sets = await getAllSets(lang);
  return NextResponse.json({ sets });
}
