import { NextRequest, NextResponse } from 'next/server';
import { withObservedRouteHandler } from '@/lib/api/observed-route';
import { rateLimit } from '@/lib/rate-limit';
import { getSealedImageUrl } from '@/lib/tcg-sealed-server';
import { getSealedRequestContext, isSealedRequestContext, positiveId, sealedErrorResponse } from '@/lib/tcg-sealed-route';

export const runtime = 'nodejs';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function getImage(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const auth = await getSealedRequestContext(request);
  if (!isSealedRequestContext(auth)) return auth;
  if (!rateLimit(`tcg-sealed-image:${auth.userId}`, 60)) return NextResponse.json({ error: 'Too many sealed portfolio requests.' }, { status: 429, headers: { 'Cache-Control': 'private, no-store' } });
  const id = positiveId((await context.params).id);
  if (id === null) return NextResponse.json({ error: 'Invalid sealed product id.' }, { status: 400 });
  try {
    const candidates = await getSealedImageUrl(auth.sql, id);
    for (const url of candidates) {
      try {
        const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8_000) });
        if (!response.ok) continue;
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) continue;
        const declaredLength = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) continue;
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_IMAGE_BYTES) continue;
        return new Response(bytes, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      } catch {
        // Try Cardmarket's alternate extension before returning a placeholder.
      }
    }
    return NextResponse.json({ error: 'Sealed product image unavailable.' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return sealedErrorResponse(error);
  }
}

export const GET = withObservedRouteHandler('/api/tcg/sealed/products/:id/image', 'tcg-sealed', getImage);
