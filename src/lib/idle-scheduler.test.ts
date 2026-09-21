import { describe, expect, it } from 'vitest';

import { scheduleIdleTask, type IdleTaskScheduler } from './idle-scheduler';

describe('scheduleIdleTask', () => {
  it('runs once on idle and cancels the fallback timer', () => {
    let idleCallback: (() => void) | undefined;
    let fallbackCallback: (() => void) | undefined;
    let idleCancelled = false;
    let timerCleared = false;
    const timerHandle = {} as ReturnType<typeof setTimeout>;

    const scheduler: IdleTaskScheduler = {
      requestIdleCallback: (callback) => {
        idleCallback = callback;
        return 7;
      },
      cancelIdleCallback: (id) => {
        idleCancelled = id === 7;
      },
      setTimeout: (callback) => {
        fallbackCallback = callback;
        return timerHandle;
      },
      clearTimeout: (id) => {
        timerCleared = id === timerHandle;
      },
    };
    let calls = 0;

    const cancel = scheduleIdleTask(() => {
      calls += 1;
    }, scheduler);

    idleCallback?.();
    fallbackCallback?.();

    expect(calls).toBe(1);
    expect(timerCleared).toBe(true);

    cancel();

    expect(idleCancelled).toBe(true);
  });

  it('uses only the fallback timer when idle callbacks are unavailable', () => {
    let fallbackCallback: (() => void) | undefined;
    const timerHandle = {} as ReturnType<typeof setTimeout>;
    const scheduler: IdleTaskScheduler = {
      setTimeout: (callback) => {
        fallbackCallback = callback;
        return timerHandle;
      },
      clearTimeout: () => undefined,
    };
    let calls = 0;

    scheduleIdleTask(() => {
      calls += 1;
    }, scheduler);

    fallbackCallback?.();

    expect(calls).toBe(1);
  });

  it('does not start the idle window before the configured minimum delay', () => {
    let startCallback: (() => void) | undefined;
    let idleCallback: (() => void) | undefined;
    let calls = 0;
    const scheduler: IdleTaskScheduler = {
      requestIdleCallback: (callback) => {
        idleCallback = callback;
        return 8;
      },
      cancelIdleCallback: () => undefined,
      setTimeout: (callback, delay) => {
        if (delay === 1_000) startCallback = callback;
        return {} as ReturnType<typeof setTimeout>;
      },
      clearTimeout: () => undefined,
    };

    scheduleIdleTask(() => {
      calls += 1;
    }, scheduler, { minDelayMs: 1_000 });

    expect(idleCallback).toBeUndefined();
    expect(calls).toBe(0);

    startCallback?.();
    expect(calls).toBe(0);
    idleCallback?.();
    expect(calls).toBe(1);
  });
});
