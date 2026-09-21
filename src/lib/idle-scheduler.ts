export type IdleTaskScheduler = {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
};

export type IdleTaskOptions = {
  /** Delay starting optional work until the first-render window has settled. */
  minDelayMs?: number;
};

const IDLE_TIMEOUT_MS = 1_500;

function getDefaultScheduler(): IdleTaskScheduler {
  const root = globalThis as typeof globalThis & {
    requestIdleCallback?: IdleTaskScheduler['requestIdleCallback'];
    cancelIdleCallback?: IdleTaskScheduler['cancelIdleCallback'];
  };

  return {
    requestIdleCallback: root.requestIdleCallback?.bind(root),
    cancelIdleCallback: root.cancelIdleCallback?.bind(root),
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: (handle) => globalThis.clearTimeout(handle),
  };
}

export function scheduleIdleTask(
  callback: () => void,
  scheduler: IdleTaskScheduler = getDefaultScheduler(),
  options: IdleTaskOptions = {},
): () => void {
  let settled = false;
  let idleHandle: number | undefined;
  let fallbackHandle: ReturnType<typeof setTimeout> | undefined;
  let startHandle: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (idleHandle !== undefined) {
      scheduler.cancelIdleCallback?.(idleHandle);
      idleHandle = undefined;
    }
    if (fallbackHandle !== undefined) {
      scheduler.clearTimeout(fallbackHandle);
      fallbackHandle = undefined;
    }
    if (startHandle !== undefined) {
      scheduler.clearTimeout(startHandle);
      startHandle = undefined;
    }
  };

  const run = () => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };

  const start = () => {
    if (settled) return;

    fallbackHandle = scheduler.setTimeout(run, IDLE_TIMEOUT_MS);
    if (scheduler.requestIdleCallback) {
      idleHandle = scheduler.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    }
  };

  const minDelayMs = Math.max(0, options.minDelayMs ?? 0);
  if (minDelayMs > 0) {
    startHandle = scheduler.setTimeout(start, minDelayMs);
  } else {
    start();
  }

  return () => {
    if (settled) return;
    settled = true;
    cleanup();
  };
}
