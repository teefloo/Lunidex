'use client';

import { useMounted } from '@/hooks/useMounted';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { HomeCardPreview } from './HomeCardPreview';
import { useHomeFeaturedCards } from './useHomeFeaturedCards';
import { countPhysicalTCGCards } from '@/lib/tcg-collections';

interface HomeCollectionPreviewProps {
  locale: string;
  copy: Record<string, string>;
  showAction?: boolean;
}

export function HomeCollectionPreview({ locale, copy, showAction = true }: HomeCollectionPreviewProps) {
  const mounted = useMounted();
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const ownedCount = usePrimeDexStore((state) => countPhysicalTCGCards(state.tcgCollectionCards, state.tcgLegacyOwnedCards));
  const { cards: featuredCards } = useHomeFeaturedCards(true);
  const entry = resolveCollectionEntry({ hasHydrated: mounted && hasHydrated, ownedCount });
  const isResume = entry.mode === 'resume';

  return (
    <aside className="home-collection-preview" aria-labelledby="collection-preview-title">
      <div aria-hidden="true" className="mb-6 grid grid-cols-3 items-center gap-3 px-1">
        {[0, 1, 2].map((index) => {
          const card = featuredCards[index];
          const rotationClass = index === 0 ? '-rotate-2' : index === 2 ? 'rotate-2' : 'rotate-0';

          return card ? (
            <HomeCardPreview
              key={card.id}
              card={card}
              rotationClass={rotationClass}
              sizes="(min-width: 1024px) 9rem, 28vw"
            />
          ) : (
            <div
              key={`card-placeholder-${index}`}
              className={`aspect-[2.15/3] min-w-0 bg-card [border-radius:4.55%_/_3.5%] ${rotationClass}`}
            />
          );
        })}
      </div>
      <h3 id="collection-preview-title" className="mt-2 text-2xl font-black tracking-tight text-foreground">
        {isResume ? copy.previewOwnedTitle : copy.previewTitle}
      </h3>
      <p className="mt-2 text-sm leading-6 text-foreground/65">
        {isResume
          ? (ownedCount === 1 ? copy.previewOwnedCountOne : copy.previewOwnedCountOther).replace('{{count}}', String(ownedCount))
          : copy.previewBody}
      </p>
      {!isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{copy.previewNote}</p>}
      {isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{copy.noAccount}</p>}
      {showAction && (
        <HomeCollectionEntry locale={locale} startLabel={copy.startLabel} resumeLabel={copy.resumeLabel} className="mt-5 inline-flex min-h-11 min-w-56 items-center justify-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-4 text-sm font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" />
      )}
    </aside>
  );
}
