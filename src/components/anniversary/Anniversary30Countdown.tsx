'use client';

import { useEffect, useState } from 'react';

import {
  getAnniversary30ReleaseState,
  type Anniversary30ReleaseState,
} from '@/lib/anniversary-30';

type Anniversary30CountdownProps = {
  releaseDate: string;
  labels: {
    releaseDate: string;
    upcoming: string;
    available: string;
  };
};

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function getDuration(totalSeconds: number): { days: number; hours: number; minutes: number; seconds: number } {
  const safeSeconds = Math.max(0, totalSeconds);
  return {
    days: Math.floor(safeSeconds / 86_400),
    hours: Math.floor((safeSeconds % 86_400) / 3_600),
    minutes: Math.floor((safeSeconds % 3_600) / 60),
    seconds: safeSeconds % 60,
  };
}

export function Anniversary30Countdown({ releaseDate, labels }: Anniversary30CountdownProps) {
  // Keep the server HTML and the first client render identical. The live
  // clock starts after hydration and is therefore never a hydration hazard.
  const [state, setState] = useState<Anniversary30ReleaseState | null>(null);

  useEffect(() => {
    const update = () => setState(getAnniversary30ReleaseState(new Date(), releaseDate));
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [releaseDate]);

  const message = state === null
    ? labels.releaseDate
    : state.status === 'available'
      ? labels.available
      : fillTemplate(labels.upcoming, getDuration(state.totalSeconds));

  return (
    <div className="rounded-sm border border-primary/30 bg-primary/5 px-5 py-4" aria-live="polite">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground/50">{labels.releaseDate}</p>
      <p className="mt-2 text-lg font-black tabular-nums text-primary">
        <time dateTime={releaseDate}>
        {message}
        </time>
      </p>
    </div>
  );
}
