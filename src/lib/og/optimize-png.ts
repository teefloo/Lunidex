import sharp from 'sharp';

/** Reduce generated OG image bytes while keeping compact images lossless. */
export async function optimizeOgPngResponse(image: Response): Promise<Response> {
  const original = new Uint8Array(await image.arrayBuffer());
  let payload = original;
  let contentType = image.headers.get('content-type') ?? 'image/png';

  try {
    const jpeg = await sharp(original)
      .flatten({ background: '#F2F6FF' })
      .jpeg({ quality: 86, chromaSubsampling: '4:4:4' })
      .toBuffer();

    if (jpeg.byteLength <= original.byteLength * 0.6) {
      payload = new Uint8Array(jpeg);
      contentType = 'image/jpeg';
    }
  } catch {
    // Rendering already succeeded; keep its original PNG if conversion fails.
  }

  const headers = new Headers(image.headers);
  headers.delete('content-length');
  headers.set('content-type', contentType);
  return new Response(payload, {
    status: image.status,
    statusText: image.statusText,
    headers,
  });
}
