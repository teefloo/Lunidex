import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, proxy } from './proxy';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('locale proxy matcher', () => {
  it('leaves PWA workers and Workbox imports outside locale rewriting', () => {
    const matcher = config.matcher[0];

    expect(matcher).toContain('sw\\.js');
    expect(matcher).toContain('push-worker\\.js');
    expect(matcher).toContain('workbox-[^/]+\\.js');
  });

  it('returns a hard 404 when a supported upstream resource is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    const response = await proxy(new NextRequest('https://lunidex.test/fr/pokemon/not-a-real-pokemon'));

    expect(response.status).toBe(404);
    expect(response.headers.get('x-middleware-rewrite')).toContain('/__lunidex-not-found');
  });

  it('keeps localized resources on the normal route when the probe succeeds', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));

    const response = await proxy(new NextRequest('https://lunidex.test/fr/pokemon/pikachu'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://pokeapi.co/api/v2/pokemon/pikachu',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('redirects legacy deployment domains to the canonical Lunidex host', async () => {
    const response = await proxy(
      new NextRequest('https://primedex.vercel.app/fr/tcg/cards/basep-1?utm_source=legacy'),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://lunidex.app/fr/tcg/cards/basep-1?utm_source=legacy',
    );
  });
});
