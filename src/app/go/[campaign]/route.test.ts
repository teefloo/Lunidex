import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/server-i18n', () => ({
  getServerLanguage: vi.fn().mockResolvedValue('fr'),
}));

import { GET } from './route';

describe('campaign redirect route', () => {
  it('redirects only to the localized TCG start route', async () => {
    const response = await GET(
      new NextRequest('https://lunidex.app/go/summer-2026'),
      { params: Promise.resolve({ campaign: 'summer-2026' }) },
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lunidex.app/fr/tcg/start?source=campaign&campaign=summer-2026');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 404 for values outside the campaign slug grammar', async () => {
    const response = await GET(
      new NextRequest('https://lunidex.app/go/https%3A%2F%2Fevil.test'),
      { params: Promise.resolve({ campaign: 'https://evil.test' }) },
    );

    expect(response.status).toBe(404);
  });
});
