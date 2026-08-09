import { NextRequest, NextResponse } from 'next/server';

// Cache the full PS formats-data payload at the module level so the Edge
// runtime re-uses it across requests within the same invocation.
let psCache: Record<string, unknown> | null = null;
let psCacheTime = 0;
const PS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

const PS_FORMATS_URL =
  'https://play.pokemonshowdown.com/data/formats-data.json';

async function getPSData(): Promise<Record<string, unknown>> {
  const now = Date.now();
  if (psCache && now - psCacheTime < PS_CACHE_TTL) return psCache;

  const res = await fetch(PS_FORMATS_URL, {
    next: { revalidate: 86400 },
    headers: { 'User-Agent': 'PrimeDex/1.0 (+https://lunidex.app)' },
  });

  if (!res.ok) throw new Error(`PS data fetch failed: ${res.status}`);

  const data = (await res.json()) as Record<string, unknown>;
  psCache = data;
  psCacheTime = now;
  return data;
}

export const runtime = 'edge';
export const revalidate = 86400; // 24 h

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  if (!name || typeof name !== 'string') {
    return NextResponse.json(null, { status: 400 });
  }

  try {
    const data = await getPSData();
    const entry = data[name] ?? data[name.toLowerCase()] ?? null;

    if (!entry) {
      return NextResponse.json(null, {
        status: 404,
        headers: { 'Cache-Control': 'public, max-age=86400' },
      });
    }

    return NextResponse.json(entry, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    });
  } catch {
    return NextResponse.json(null, { status: 502 });
  }
}
