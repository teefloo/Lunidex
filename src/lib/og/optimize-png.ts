import sharp from 'sharp';

const MINIMUM_JPEG_SAVINGS_RATIO = 0.3;

/** Recompress a generated OG image losslessly before it reaches Vercel's CDN. */
export async function optimizeOgPngResponse(image: Response): Promise<Response> {
  const original = new Uint8Array(await image.arrayBuffer());
  let payload = original;

  try {
    const compressed = await sharp(original)
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer();
    if (compressed.byteLength < original.byteLength) {
      payload = new Uint8Array(compressed);
    }
  } catch {
    // Rendering already succeeded; keep the original PNG if recompression fails.
  }

  const headers = new Headers(image.headers);
  headers.delete('content-length');
  return new Response(payload, {
    status: image.status,
    statusText: image.statusText,
    headers,
  });
}

/**
 * Use a high-quality JPEG for opaque social cards when it saves at least 30%.
 * Keep the existing optimized PNG as a fallback for small or failed encodes.
 */
export async function optimizeOgImageResponse(image: Response): Promise<Response> {
  const original = new Uint8Array(await image.arrayBuffer());

  try {
    const compressed = await sharp(original)
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
      .toBuffer();

    if (compressed.byteLength <= original.byteLength * (1 - MINIMUM_JPEG_SAVINGS_RATIO)) {
      const headers = new Headers(image.headers);
      headers.set('Content-Type', 'image/jpeg');
      headers.delete('content-length');

      return new Response(new Uint8Array(compressed), {
        status: image.status,
        statusText: image.statusText,
        headers,
      });
    }
  } catch {
    // Keep the existing PNG path when JPEG encoding is unavailable.
  }

  return optimizeOgPngResponse(new Response(original, {
    status: image.status,
    statusText: image.statusText,
    headers: image.headers,
  }));
}
