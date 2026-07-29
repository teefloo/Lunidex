import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { DELETE, GET, PATCH, POST } from './route';

describe('TCG price alerts API', () => {
  it('fails closed while automatic price alerts are disabled', async () => {
    const request = new NextRequest('https://lunidex.test/api/tcg/price-alerts', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await expect(GET(request)).resolves.toMatchObject({ status: 410 });
    await expect(POST(request)).resolves.toMatchObject({ status: 410 });
    await expect(DELETE(request)).resolves.toMatchObject({ status: 410 });
    await expect(PATCH(request)).resolves.toMatchObject({ status: 410 });
  });
});
