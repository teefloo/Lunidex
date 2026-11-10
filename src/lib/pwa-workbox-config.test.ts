import { describe, expect, it } from 'vitest';
import { NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN } from '../../scripts/pwa/workbox-config';

describe('NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN', () => {
  it('excludes only Next app modal chunks from the Workbox precache', () => {
    // Workbox evaluates exclude patterns against webpack asset names before
    // next-pwa turns them into public URLs.
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      'static/chunks/app/@modal/(.)tcg/cards/[id]/page-b48f8a345e3a4fe2.js',
    )).toBe(true);
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      'static/chunks/app/@modal/[...catchAll]/page-b8234862677ad939.js',
    )).toBe(true);
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      '/_next/static/chunks/app/@modal/%5B...catchAll%5D/page-b8234862677ad939.js',
    )).toBe(true);
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      '/_next/static/chunks/app/@modal/(.)tcg/cards/%5Bid%5D/page-b48f8a345e3a4fe2.js',
    )).toBe(true);
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      'static/chunks/app/pokedex/page-1234.js',
    )).toBe(false);
    expect(NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN.test(
      '/_next/static/chunks/app/pokedex/page-1234.js',
    )).toBe(false);
  });
});
