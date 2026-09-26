import { describe, expect, it } from 'vitest';
import {
  createApiKeyMaterial,
  decodeApiCursor,
  encodeApiCursor,
  hashRequestBody,
  parsePageSize,
  sha256,
} from '@/lib/public-api';

describe('public API primitives', () => {
  it('creates an opaque 32-byte API secret and stores a digest only', () => {
    const material = createApiKeyMaterial();
    const [prefix, secret] = material.token.split('.');

    expect(prefix).toBe(material.prefix);
    expect(prefix).toMatch(/^lxd_v1_[0-9a-f-]{36}$/);
    expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
    expect(material.hash).toBe(sha256(material.token));
    expect(material.hash).not.toContain(material.token);
  });

  it('hashes JSON independent of object key order for transaction retries', () => {
    expect(hashRequestBody({ kind: 'buy', transaction: { quantity: 1, price: 200 } }))
      .toBe(hashRequestBody({ transaction: { price: 200, quantity: 1 }, kind: 'buy' }));
    expect(hashRequestBody({ quantity: 1 })).not.toBe(hashRequestBody({ quantity: 2 }));
  });

  it('bounds page sizes and round-trips cursors', () => {
    expect(parsePageSize(null)).toBe(25);
    expect(parsePageSize('100')).toBe(100);
    expect(parsePageSize('101')).toBeNull();
    expect(parsePageSize('0')).toBeNull();
    const cursor = encodeApiCursor({ offset: 25, snapshot: '2026-09-26T10:00:00Z' });
    expect(decodeApiCursor(cursor)).toEqual({ offset: 25, snapshot: '2026-09-26T10:00:00Z' });
    expect(decodeApiCursor('%%%')).toBeNull();
  });
});
