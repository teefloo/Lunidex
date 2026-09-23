import sharp from 'sharp';

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
