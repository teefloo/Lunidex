import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('user cards route', () => {
  it('returns 400 for malformed JSON bodies', async () => {
    const request = new NextRequest('https://example.com/api/tcg/user-cards', {
      method: 'POST',
      body: '{not json',
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid payload' });
  });
});
