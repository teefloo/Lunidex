import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';

import { isTrustedMutationOrigin, readJsonBody, requireTrustedMutationOrigin } from './route-helpers';

function request(headers?: HeadersInit): NextRequest {
  return new NextRequest('https://lunidex.test/api/profile', {
    method: 'PATCH',
    headers,
  });
}

describe('mutation origin protection', () => {
  it('allows bearer-token clients without browser origin headers', () => {
    expect(isTrustedMutationOrigin(request({ authorization: 'Bearer mobile-token' }))).toBe(true);
    expect(requireTrustedMutationOrigin(request({ authorization: 'Bearer mobile-token' }))).toBeNull();
  });

  it('allows an exact same-host browser origin', () => {
    const response = requireTrustedMutationOrigin(request({ origin: 'https://lunidex.test' }));

    expect(response).toBeNull();
  });

  it('allows a same-origin referer fallback', () => {
    expect(isTrustedMutationOrigin(request({ referer: 'https://lunidex.test/account/settings' }))).toBe(true);
  });

  it('rejects cross-site and originless cookie-style mutations', () => {
    const crossSite = requireTrustedMutationOrigin(request({ origin: 'https://evil.example' }));
    const originless = requireTrustedMutationOrigin(request());

    expect(crossSite?.status).toBe(403);
    expect(originless?.status).toBe(403);
  });
});

describe('readJsonBody size pre-check', () => {
  it('rejects a declared body above maxBytes without parsing it', async () => {
    const oversized = new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'content-length': '100' },
      body: JSON.stringify({ data: {} }),
    });

    await expect(readJsonBody(oversized, { maxBytes: 10 })).resolves.toBeNull();
  });

  it('parses a declared body within maxBytes', async () => {
    const body = JSON.stringify({ data: {} });
    const request = new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'content-length': String(body.length) },
      body,
    });

    await expect(readJsonBody(request, { maxBytes: 1024 })).resolves.toEqual({ data: {} });
  });

  it('rejects a chunked body after reading past the byte limit', async () => {
    const body = JSON.stringify({ data: { payload: 'x'.repeat(64) } });
    const request = new NextRequest('https://lunidex.test/api/user-state', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body,
    });

    await expect(readJsonBody(request, { maxBytes: 32 })).resolves.toBeNull();
  });
});
