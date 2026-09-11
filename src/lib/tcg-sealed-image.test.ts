import { describe, expect, it } from 'vitest';
import { sealedImageContentType } from './tcg-sealed-image';

describe('sealed Cardmarket image validation', () => {
  it('detects the formats served by Cardmarket', () => {
    expect(sealedImageContentType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe('image/png');
    expect(sealedImageContentType(Uint8Array.from([255, 216, 255, 224]))).toBe('image/jpeg');
  });

  it('rejects non-image responses even when a remote server labels them as images', () => {
    expect(sealedImageContentType(Uint8Array.from([60, 104, 116, 109, 108, 62]))).toBeNull();
  });
});
