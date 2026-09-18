export interface RetryOptions {
  attempts?: number;
  shouldRetry: (error: unknown) => boolean;
  delayMs?: (attempt: number) => number;
  sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function retryAsync<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 1));
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === attempts - 1;
      if (isLastAttempt || !options.shouldRetry(error)) throw error;

      const milliseconds = Math.max(0, options.delayMs?.(attempt) ?? 0);
      if (milliseconds > 0) await sleep(milliseconds);
    }
  }

  throw new Error('Retry operation exhausted without a result.');
}
