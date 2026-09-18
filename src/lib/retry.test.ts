import { describe, expect, it } from 'vitest';

import { retryAsync } from './retry';

describe('retryAsync', () => {
  it('retries a transient operation until it succeeds', async () => {
    let attempts = 0;

    await expect(retryAsync(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error('temporary failure');
        return 'ok';
      },
      { attempts: 3, shouldRetry: () => true, sleep: async () => undefined },
    )).resolves.toBe('ok');

    expect(attempts).toBe(3);
  });

  it('does not retry a non-transient failure', async () => {
    let attempts = 0;

    await expect(retryAsync(
      async () => {
        attempts += 1;
        throw new Error('permanent failure');
      },
      { attempts: 3, shouldRetry: () => false, sleep: async () => undefined },
    )).rejects.toThrow('permanent failure');

    expect(attempts).toBe(1);
  });
});
