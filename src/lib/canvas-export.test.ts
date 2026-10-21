import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvasToBlob } from './canvas-export';

describe('canvasToBlob', () => {
  afterEach(() => vi.useRealTimers());

  it('returns the generated image blob', async () => {
    const canvas = { toBlob: (callback: BlobCallback) => callback(new Blob(['png'])) } as HTMLCanvasElement;
    await expect(canvasToBlob(canvas)).resolves.toBeInstanceOf(Blob);
  });

  it('rejects when the browser cannot create an image blob', async () => {
    const canvas = { toBlob: (callback: BlobCallback) => callback(null) } as HTMLCanvasElement;
    await expect(canvasToBlob(canvas)).rejects.toThrow('could not create');
  });

  it('rejects if the browser never completes image generation', async () => {
    vi.useFakeTimers();
    const canvas = { toBlob: () => undefined } as unknown as HTMLCanvasElement;
    const result = canvasToBlob(canvas, 'image/png', 100);
    const assertion = expect(result).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
