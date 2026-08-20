import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { GET } from './route';

const fetchMock = vi.fn();

function request(): NextRequest {
  return new NextRequest('https://lunidex.test/api/smogon/test');
}

describe('/api/smogon/[name] input bounds', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('rejects oversized or path-like format names before fetching upstream data', async () => {
    const oversized = await GET(request(), {
      params: Promise.resolve({ name: 'a'.repeat(65) }),
    });
    const pathLike = await GET(request(), {
      params: Promise.resolve({ name: '../formats-data.json' }),
    });

    expect(oversized.status).toBe(400);
    expect(pathLike.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not resolve inherited object properties as format entries', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const response = await GET(request(), {
      params: Promise.resolve({ name: 'constructor' }),
    });

    expect(response.status).toBe(404);
  });
});
