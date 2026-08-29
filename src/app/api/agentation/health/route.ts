import { NextResponse } from 'next/server';

const AGENTATION_HEALTH_URL = 'http://localhost:4747/health';

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const response = await fetch(AGENTATION_HEALTH_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(1_000),
    });
    return NextResponse.json(
      { available: response.ok },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
