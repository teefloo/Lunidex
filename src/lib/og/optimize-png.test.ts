import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { optimizeOgImageResponse, optimizeOgPngResponse } from './optimize-png';

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

describe('optimizeOgImageResponse', () => {
  it('uses high-quality JPEG when it reduces the payload by at least 30%', async () => {
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
        'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });

    const optimized = await optimizeOgImageResponse(response);
    const result = new Uint8Array(await optimized.arrayBuffer());
    const metadata = await sharp(result).metadata();

    expect(optimized.status).toBe(200);
    expect(optimized.headers.get('Content-Type')).toBe('image/jpeg');
    expect(optimized.headers.get('Vercel-CDN-Cache-Control'))
      .toBe('public, s-maxage=86400, stale-while-revalidate=604800');
    expect(result.byteLength).toBeLessThanOrEqual(source.byteLength * 0.7);
    expect(metadata.width).toBe(width);
    expect(metadata.height).toBe(height);
  });

  it('preserves the optimized PNG when the JPEG does not meet the size threshold', async () => {
    const source = await sharp({ create: { width: 1, height: 1, channels: 4, background: '#5972a8' } })
      .png()
      .toBuffer();
    const response = new Response(new Uint8Array(source), {
      headers: { 'Content-Type': 'image/png' },
    });

    const optimized = await optimizeOgImageResponse(response);
    const result = new Uint8Array(await optimized.arrayBuffer());

    expect(optimized.headers.get('Content-Type')).toBe('image/png');
    expect((await sharp(result).metadata()).format).toBe('png');
  });

  it('falls back to the original PNG response when JPEG encoding fails', async () => {
    const source = new Uint8Array([1, 2, 3, 4]);
    const response = new Response(source, {
      headers: {
        'Content-Type': 'image/png',
        'CDN-Cache-Control': 'public, s-maxage=86400',
      },
    });

    const optimized = await optimizeOgImageResponse(response);
    const result = new Uint8Array(await optimized.arrayBuffer());

    expect(optimized.headers.get('Content-Type')).toBe('image/png');
    expect(optimized.headers.get('CDN-Cache-Control')).toBe('public, s-maxage=86400');
    expect(result).toEqual(source);
  });
});
