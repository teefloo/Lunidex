import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { ipKey, rateLimit, trustedClientIp } from './rate-limit';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://lunidex.app/api/test', { headers });
}

describe('trusted client IP rate-limit identity', () => {
  it('uses the rightmost non-empty forwarded address', () => {
    expect(trustedClientIp(makeRequest({
      'x-forwarded-for': '198.51.100.10, 203.0.113.7, ',
      'x-real-ip': '192.0.2.1',
    }))).toBe('203.0.113.7');
  });

  it('treats rotated caller-supplied prefixes as the same client', () => {
    const first = makeRequest({ 'x-forwarded-for': '198.51.100.10, 203.0.113.7' });
    const rotated = makeRequest({ 'x-forwarded-for': '198.51.100.11, 203.0.113.7' });

    expect(ipKey(first)).toBe(ipKey(rotated));
    const key = `rate-limit-test:${ipKey(first)}`;
    expect(rateLimit(key, 1)).toBe(true);
    expect(rateLimit(`rate-limit-test:${ipKey(rotated)}`, 1)).toBe(false);
  });

  it('does not use X-Real-IP when the trusted forwarded address is absent', () => {
    expect(trustedClientIp(makeRequest({ 'x-real-ip': '203.0.113.7' }))).toBe('unknown');
    expect(ipKey(makeRequest({ 'x-real-ip': '203.0.113.7' }))).toBe(ipKey(makeRequest()));
  });
});
