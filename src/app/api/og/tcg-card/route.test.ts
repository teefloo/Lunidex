import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getTCGCardCached: vi.fn(),
  loadTrustedOgImageDataUrl: vi.fn(),
  loadOgFonts: vi.fn(),
  optimizeOgPngResponse: vi.fn(),
}));

vi.mock('@/lib/api/server-cache', () => ({ getTCGCardCached: mocks.getTCGCardCached }));
vi.mock('@/lib/og/assets', () => ({ loadTrustedOgImageDataUrl: mocks.loadTrustedOgImageDataUrl }));
vi.mock('@/lib/og/fonts', () => ({ loadOgFonts: mocks.loadOgFonts }));
vi.mock('@/lib/og/optimize-png', () => ({ optimizeOgPngResponse: mocks.optimizeOgPngResponse }));
vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(_element: unknown, init: ResponseInit = {}) {
      super(null, init);
    }
  },
}));

import { GET } from './route';

function requestFor(userAgent: string): NextRequest {
  return new NextRequest('https://lunidex.app/api/og/tcg-card?id=sv01-001&lang=en', {
    headers: { 'user-agent': userAgent },
  });
}

describe('TCG card OG route crawler policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTCGCardCached.mockResolvedValue(null);
    mocks.loadTrustedOgImageDataUrl.mockResolvedValue('');
    mocks.loadOgFonts.mockResolvedValue([]);
    mocks.optimizeOgPngResponse.mockImplementation((image: Response) => image);
  });

  it.each(['ClaudeBot/1.0', 'Meta-ExternalAgent/1.0'])(
    'blocks %s before fetching card data or rendering an image',
    async (userAgent) => {
      const response = await GET(requestFor(userAgent));

      expect(response.status).toBe(403);
      expect(response.headers.get('Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('CDN-Cache-Control')).toBe('private, no-store');
      expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('private, no-store');
      expect(mocks.getTCGCardCached).not.toHaveBeenCalled();
      expect(mocks.loadTrustedOgImageDataUrl).not.toHaveBeenCalled();
      expect(mocks.loadOgFonts).not.toHaveBeenCalled();
      expect(mocks.optimizeOgPngResponse).not.toHaveBeenCalled();
    },
  );

  it.each(['Claude-User/1.0', 'Meta-ExternalFetcher/1.0', 'facebookexternalhit/1.1']) (
    'preserves social or user initiated previews for %s',
    async (userAgent) => {
      const response = await GET(requestFor(userAgent));

      expect(response.status).not.toBe(403);
    },
  );
});
