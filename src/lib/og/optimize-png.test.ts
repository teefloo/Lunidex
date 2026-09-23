import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { optimizeOgPngResponse } from './optimize-png';

describe('optimizeOgPngResponse', () => {
  it('shrinks a public OG PNG without changing its pixels or cache headers', async () => {
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

    const source = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 1, palette: false })
      .toBuffer();
    const response = new Response(new Uint8Array(source), {
      headers: {
        'Content-Type': 'image/png',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });

    const optimized = await optimizeOgPngResponse(response);
    const result = Buffer.from(await optimized.arrayBuffer());

    expect(optimized.status).toBe(200);
    expect(optimized.headers.get('Content-Type')).toBe('image/png');
    expect(optimized.headers.get('Vercel-CDN-Cache-Control')).toBe('public, s-maxage=86400');
    expect(result.length).toBeLessThan(source.length);
    expect(await sharp(result).raw().toBuffer()).toEqual(await sharp(source).raw().toBuffer());
  });
});
