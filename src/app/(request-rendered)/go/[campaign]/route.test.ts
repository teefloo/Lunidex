import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/server-i18n', () => ({ getServerLanguage: async () => 'fr' }));
import { GET } from './route';

describe('campaign redirect attribution', () => {
  it('redirects to the locale start page with validated campaign attribution only', async () => {
    const response = await GET(new NextRequest('https://lunidex.app/go/Summer-2026?email=private&redirect=https://other.example'), { params: Promise.resolve({ campaign: 'Summer-2026' }) });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://lunidex.app/fr/tcg/start?source=campaign&campaign=summer-2026');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
  it('rejects invalid slugs instead of propagating arbitrary data', async () => {
    const response = await GET(new NextRequest('https://lunidex.app/go/invalid'), { params: Promise.resolve({ campaign: 'private@example.com' }) });
    expect(response.status).toBe(404); expect(response.headers.get('location')).toBeNull();
  });
});
