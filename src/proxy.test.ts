import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('public localized proxy responses', () => {
  it('caches confirmed public 404s at the CDN', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    const response = await proxy(new NextRequest('https://lunidex.test/fr/pokemon/not-a-real-pokemon', {
      headers: { accept: 'text/html', 'user-agent': 'ClaudeBot/1.0' },
    }));

    expect(response.status).toBe(404);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
  });

  it('marks document responses for Vercel CDN caching without enabling browser caching', async () => {
    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg', {
      headers: { accept: 'text/html', 'user-agent': 'ClaudeBot/1.0' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(response.headers.get('CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
    expect(response.headers.get('Cache-Control')).toBeNull();
  });

  it('does not mark Flight navigations as cacheable documents', async () => {
    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg', {
      headers: { accept: 'text/x-component', 'user-agent': 'Mozilla/5.0' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBeNull();
  });

  it('keeps HEAD document probes cacheable even without an Accept header', async () => {
    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg', {
      method: 'HEAD',
      headers: { 'user-agent': 'ClaudeBot/1.0' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
  });
});
