import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rpc = vi.fn();
vi.mock('@/lib/supabase/product-metrics-server', () => ({ isProductMetricsConfigured: false, getProductMetricsClient: () => ({ schema: () => ({ rpc }) }) }));
import { POST } from './route';

function request(body: string, headers: Record<string, string> = {}) { return new NextRequest('https://example.test/api/analytics/product', { method: 'POST', headers: { origin: 'https://example.test', host: 'example.test', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...headers }, body }); }
describe('product metrics endpoint', () => {
  beforeEach(() => vi.clearAllMocks());
  it('rejects missing or malformed origins', async () => { expect((await POST(request('{}', { origin: '' }))).status).toBe(403); expect((await POST(request('{}', { origin: '://bad' }))).status).toBe(403); });
  it('rejects excessive, unknown and invalid input', async () => { expect((await POST(request('x'.repeat(513)))).status).toBe(413); expect((await POST(request(JSON.stringify({ event: 'nope' })))).status).toBe(400); expect((await POST(request(JSON.stringify({ event: 'tcg_set_selected', propertyA: 'card-name' })))).status).toBe(400); });
  it('enforces the exact property arity for every event', async () => {
    expect((await POST(request(JSON.stringify({ event: 'tcg_start_opened' })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ event: 'tcg_activation_completed' })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ event: 'tcg_returned_after_activation', propertyA: 'day_0_7' })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ event: 'tcg_first_value_reached', propertyA: 'unexpected' })))).status).toBe(400);
  });
  it('accepts each declared property shape before the unavailable server response', async () => {
    expect((await POST(request(JSON.stringify({ event: 'tcg_first_value_reached' })))).status).toBe(503);
    expect((await POST(request(JSON.stringify({ event: 'tcg_sync_prompt_shown' })))).status).toBe(503);
    expect((await POST(request(JSON.stringify({ event: 'tcg_activation_completed', propertyA: 'wishlist' })))).status).toBe(503);
    expect((await POST(request(JSON.stringify({ event: 'tcg_returned_after_activation', propertyA: 'day_0_7', propertyB: 'album_open' })))).status).toBe(503);
  });
  it('is no-store and unavailable without server configuration', async () => { const response = await POST(request(JSON.stringify({ event: 'tcg_start_opened', propertyA: 'direct' }))); expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store'); });
  it('limits each ephemeral client independently', async () => {
    const body = JSON.stringify({ event: 'tcg_start_opened', propertyA: 'direct' });
    for (let index = 0; index < 30; index += 1) expect((await POST(request(body, { 'x-forwarded-for': '192.0.2.10' }))).status).toBe(503);
    expect((await POST(request(body, { 'x-forwarded-for': '192.0.2.10' }))).status).toBe(429);
    expect((await POST(request(body, { 'x-forwarded-for': '192.0.2.11' }))).status).toBe(503);
  });
});
