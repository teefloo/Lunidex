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

  it('short-circuits automated Next prefetches before rendering the page', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg/sets/sv10', {
      headers: {
        accept: '*/*',
        'next-router-prefetch': '1',
        'user-agent': 'Lightpanda/1.0',
      },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects obvious invalid resource identifiers without an upstream probe', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg/cards/null', {
      headers: { accept: 'text/html', 'user-agent': 'Meta-ExternalAgent/1.0' },
    }));

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
  });

  it('does not treat Flight requests as document probes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const response = await proxy(new NextRequest('https://lunidex.test/fr/tcg/sets/sv10', {
      headers: {
        accept: '*/*',
        rsc: '1',
        'user-agent': 'Mozilla/5.0',
      },
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBeNull();
  });

  it('reuses a confirmed English TCG card across localized document probes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const cardId = 'cost-audit-shared-001';

    for (const locale of ['en', 'fr', 'ja']) {
      const response = await proxy(new NextRequest(`https://lunidex.test/${locale}/tcg/cards/${cardId}`, {
        headers: { accept: 'text/html' },
      }));
      expect(response.status).toBe(200);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`https://api.tcgdex.net/v2/en/cards/${cardId}`);
  });

  it('learns an English fallback without concealing a regional-only Japanese card', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const fallbackId = 'cost-audit-fallback-001';
    const regionalId = 'cost-audit-regional-001';

    const french = await proxy(new NextRequest(`https://lunidex.test/fr/tcg/cards/${fallbackId}`, {
      headers: { accept: 'text/html' },
    }));
    const german = await proxy(new NextRequest(`https://lunidex.test/de/tcg/cards/${fallbackId}`, {
      headers: { accept: 'text/html' },
    }));
    const englishMissing = await proxy(new NextRequest(`https://lunidex.test/en/tcg/cards/${regionalId}`, {
      headers: { accept: 'text/html' },
    }));
    const japanese = await proxy(new NextRequest(`https://lunidex.test/ja/tcg/cards/${regionalId}`, {
      headers: { accept: 'text/html' },
    }));

    expect([french.status, german.status, englishMissing.status, japanese.status]).toEqual([200, 200, 404, 200]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not treat an upstream error as proof that a card exists in English', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const cardId = 'cost-audit-upstream-001';

    await proxy(new NextRequest(`https://lunidex.test/en/tcg/cards/${cardId}`, {
      headers: { accept: 'text/html' },
    }));
    const japanese = await proxy(new NextRequest(`https://lunidex.test/ja/tcg/cards/${cardId}`, {
      headers: { accept: 'text/html' },
    }));

    expect(japanese.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(`https://api.tcgdex.net/v2/ja/cards/${cardId}`);
  });

  it('rechecks English availability after the existing one-hour probe TTL', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const setId = 'cost-audit-set-001';

    await proxy(new NextRequest(`https://lunidex.test/en/tcg/sets/${setId}`, {
      headers: { accept: 'text/html' },
    }));
    await proxy(new NextRequest(`https://lunidex.test/ko/tcg/sets/${setId}`, {
      headers: { accept: 'text/html' },
    }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    now += 60 * 60 * 1000 + 1;
    await proxy(new NextRequest(`https://lunidex.test/fr/tcg/sets/${setId}`, {
      headers: { accept: 'text/html' },
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retains more than 512 recent resource probes during a broad crawl', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    for (let index = 0; index < 513; index += 1) {
      await proxy(new NextRequest(`https://lunidex.test/en/items/cost-audit-item-${index}`, {
        headers: { accept: 'text/html' },
      }));
    }
    await proxy(new NextRequest('https://lunidex.test/en/items/cost-audit-item-0', {
      headers: { accept: 'text/html' },
    }));

    expect(fetchMock).toHaveBeenCalledTimes(513);
  });

  it('marks the localized home document as CDN-cacheable', async () => {
    const response = await proxy(new NextRequest('https://lunidex.test/fr', {
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );
  });
});
