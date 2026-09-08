import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadTrustedOgImageDataUrl } from './assets';

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

describe('OG image assets', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('embeds a valid image even when the upstream MIME type is unknown', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(PNG_SIGNATURE, {
      status: 200,
      headers: { 'content-type': 'application/octet-stream' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadTrustedOgImageDataUrl('https://assets.tcgdex.net/en/sm/sm9/36/high.png');

    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not fetch untrusted image hosts', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadTrustedOgImageDataUrl('https://example.com/image.png')).resolves.toBe('');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
