import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('compare route', () => {
  it('rejects requests without ids', async () => {
    const request = new NextRequest('https://example.com/api/tcg/compare');

    const response = await GET(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing ids' });
  });
});
