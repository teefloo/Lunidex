import { describe, expect, it, vi } from 'vitest';

const sonnerMock = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => sonnerMock);

import { markToasterReady, toast } from './toast';

describe('toast', () => {
  it('queues the first notification until the deferred toaster is mounted', async () => {
    toast.error('Authentication failed.');

    await Promise.resolve();
    expect(sonnerMock.toast.error).not.toHaveBeenCalled();

    markToasterReady();

    await vi.waitFor(() => {
      expect(sonnerMock.toast.error).toHaveBeenCalledWith('Authentication failed.', undefined);
    });
  });
});
