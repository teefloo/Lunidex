import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { optimizeOgPngResponse } from './optimize-png';

const cacheHeaders = {
  'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
  'CDN-Cache-Control': 'public, s-maxage=86400',
};

async function meanAbsolutePixelError(left: Buffer, right: Buffer): Promise<number> {
  const leftPixels = await sharp(left).ensureAlpha().raw().toBuffer();
  const rightPixels = await sharp(right).ensureAlpha().raw().toBuffer();
  let difference = 0;
  for (let index = 0; index < leftPixels.length; index += 1) {
    difference += Math.abs((leftPixels[index] ?? 0) - (rightPixels[index] ?? 0));
  }
  return difference / leftPixels.length;
}

describe('optimizeOgPngResponse', () => {
  it('serves a quality 86 4:4:4 JPEG when it saves at least 40 percent', async () => {
    const width = 320;
    const height = 180;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        pixels[offset] = Math.floor(x / 2);
        pixels[offset + 1] = Math.floor(y / 2);
        pixels[offset + 2] = 80;
        pixels[offset + 3] = 255;
      }
    }
    const overlay = Buffer.from(
      '<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"><rect x="110" y="20" width="195" height="145" rx="10" fill="#fff" stroke="#16202b" stroke-width="5"/><text x="125" y="80" font-size="24" font-family="Arial" font-weight="700" fill="#16202b">Pikachu</text><text x="125" y="112" font-size="12" font-family="Arial" fill="#4f6075">Illustration Rare</text></svg>',
    );
    const source = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .composite([{ input: overlay }])
      .png({ compressionLevel: 1, palette: false })
      .toBuffer();

    const optimized = await optimizeOgPngResponse(new Response(new Uint8Array(source), {
      headers: { 'Content-Type': 'image/png', ...cacheHeaders },
    }));
    const result = Buffer.from(await optimized.arrayBuffer());

    expect(optimized.status).toBe(200);
    expect(optimized.headers.get('Content-Type')).toBe('image/jpeg');
    expect(optimized.headers.get('Vercel-CDN-Cache-Control')).toBe(cacheHeaders['Vercel-CDN-Cache-Control']);
    expect(optimized.headers.get('CDN-Cache-Control')).toBe(cacheHeaders['CDN-Cache-Control']);
    expect(optimized.headers.has('content-length')).toBe(false);
    expect(result.length).toBeLessThanOrEqual(source.length * 0.6);
    expect(await meanAbsolutePixelError(source, result)).toBeLessThan(10);
  });

  it('keeps a compact image lossless as PNG when JPEG would not save 40 percent', async () => {
    const source = await sharp({
      create: { width: 320, height: 180, channels: 4, background: '#f2f6ff' },
    }).png({ compressionLevel: 9 }).toBuffer();

    const optimized = await optimizeOgPngResponse(new Response(new Uint8Array(source), {
      headers: { 'Content-Type': 'image/png', ...cacheHeaders },
    }));
    const result = Buffer.from(await optimized.arrayBuffer());

    expect(optimized.headers.get('Content-Type')).toBe('image/png');
    expect(optimized.headers.get('Vercel-CDN-Cache-Control')).toBe(cacheHeaders['Vercel-CDN-Cache-Control']);
    expect(await sharp(result).raw().toBuffer()).toEqual(await sharp(source).raw().toBuffer());
  });
});
