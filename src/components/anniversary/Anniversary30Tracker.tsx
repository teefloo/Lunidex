'use client';

import { useMemo, useSyncExternalStore } from 'react';

import {
  ANNIVERSARY_30_PIKACHU_SLOTS,
  ANNIVERSARY_30_STORAGE_KEY,
  countAnniversary30Progress,
  createEmptyAnniversary30Progress,
  parseAnniversary30Progress,
  serializeAnniversary30Progress,
  toggleAnniversary30Slot,
  type Anniversary30Progress,
} from '@/lib/anniversary-30';

type Anniversary30TrackerProps = {
  labels: {
    progress: string;
    slot: string;
    loading: string;
    reset: string;
    resetAria: string;
    localNote: string;
  };
};

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function readStoredProgress(): Anniversary30Progress {
  try {
    return parseAnniversary30Progress(window.localStorage.getItem(ANNIVERSARY_30_STORAGE_KEY));
  } catch {
    return createEmptyAnniversary30Progress();
  }
}

function writeStoredProgress(progress: Anniversary30Progress): void {
  try {
    window.localStorage.setItem(
      ANNIVERSARY_30_STORAGE_KEY,
      serializeAnniversary30Progress(progress),
    );
  } catch {
    // The tracker remains usable for the current session when storage is unavailable.
  }

  for (const listener of anniversary30Listeners) listener();
}

const anniversary30Listeners = new Set<() => void>();

function subscribeToAnniversary30Progress(listener: () => void): () => void {
  anniversary30Listeners.add(listener);

  function handleStorage(event: StorageEvent): void {
    if (event.key === ANNIVERSARY_30_STORAGE_KEY) listener();
  }

  window.addEventListener('storage', handleStorage);
  return () => {
    anniversary30Listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function getAnniversary30Snapshot(): string {
  return `client:${serializeAnniversary30Progress(readStoredProgress())}`;
}

function getAnniversary30ServerSnapshot(): string {
  return `server:${serializeAnniversary30Progress(createEmptyAnniversary30Progress())}`;
}

export default function Anniversary30Tracker({ labels }: Anniversary30TrackerProps) {
  const snapshot = useSyncExternalStore(
    subscribeToAnniversary30Progress,
    getAnniversary30Snapshot,
    getAnniversary30ServerSnapshot,
  );
  const hasHydrated = snapshot.startsWith('client:');
  const progress = useMemo(
    () => parseAnniversary30Progress(snapshot.slice(snapshot.indexOf(':') + 1)),
    [snapshot],
  );

  const checkedSlots = useMemo(() => new Set(progress.checkedSlotIds), [progress.checkedSlotIds]);
  const count = countAnniversary30Progress(progress);

  function handleToggle(slotId: Anniversary30Progress['checkedSlotIds'][number]): void {
    const next = toggleAnniversary30Slot(progress, slotId);
    writeStoredProgress(next);
  }

  function handleReset(): void {
    const next = createEmptyAnniversary30Progress();
    writeStoredProgress(next);
  }

  return (
    <div aria-busy={!hasHydrated}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <p className="text-lg font-extrabold tracking-tight" aria-live="polite">
          {hasHydrated
            ? fillTemplate(labels.progress, { count, total: ANNIVERSARY_30_PIKACHU_SLOTS.length })
            : labels.loading}
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasHydrated || count === 0}
          aria-label={labels.resetAria}
          className="glass-btn touch-target px-4 py-2 text-sm font-bold disabled:pointer-events-none disabled:opacity-40"
        >
          {labels.reset}
        </button>
      </div>

      <fieldset className="mt-6" disabled={!hasHydrated}>
        <legend className="sr-only">{labels.progress}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {ANNIVERSARY_30_PIKACHU_SLOTS.map((slot, index) => {
            const number = String(index + 1).padStart(2, '0');
            const slotLabel = fillTemplate(labels.slot, { number });

            return (
              <label
                key={slot.id}
                className="group flex min-h-14 cursor-pointer items-center gap-3 rounded-sm border border-border/70 bg-background/50 px-3 py-3 text-sm font-bold transition-colors hover:border-primary/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
              >
                <input
                  type="checkbox"
                  checked={checkedSlots.has(slot.id)}
                  onChange={() => handleToggle(slot.id)}
                  className="h-4 w-4 accent-primary"
                />
                <span>{slotLabel}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="mt-5 text-sm leading-7 text-foreground/60">{labels.localNote}</p>
    </div>
  );
}
