'use client';

import { useMounted } from '@/hooks/useMounted';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';
import { HomeCollectionEntry } from './HomeCollectionEntry';

interface HomeCollectionPreviewProps {
  locale: string;
  copy: Record<string, string>;
}

export function HomeCollectionPreview({ locale, copy }: HomeCollectionPreviewProps) {
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => state.tcgOwnedCards.length);
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });
  const isResume = entry.mode === 'resume';

  return (
    <aside className="min-h-[22rem] rounded-sm border border-border/60 bg-card/45 p-5 shadow-[var(--shadow-pixel)] sm:p-6" aria-labelledby="collection-preview-title">
      <div aria-hidden="true" className="mb-6 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="aspect-[2/3] rounded-sm border border-primary/25 bg-primary/5" />
        ))}
      </div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
        {isResume ? copy.previewOwnedEyebrow : copy.previewEyebrow}
      </p>
      <h2 id="collection-preview-title" className="mt-2 text-2xl font-black tracking-tight text-foreground">
        {isResume ? copy.previewOwnedTitle : copy.previewTitle}
      </h2>
      <p className="mt-2 text-sm leading-6 text-foreground/65">
        {isResume
          ? (ownedCount === 1 ? copy.previewOwnedCountOne : copy.previewOwnedCountOther).replace('{{count}}', String(ownedCount))
          : copy.previewBody}
      </p>
      {!isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{copy.previewNote}</p>}
      {isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{copy.noAccount}</p>}
      <HomeCollectionEntry locale={locale} startLabel={copy.startLabel} resumeLabel={copy.resumeLabel} className="mt-5 inline-flex min-h-11 min-w-56 items-center justify-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-4 text-sm font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" />
    </aside>
  );
}
