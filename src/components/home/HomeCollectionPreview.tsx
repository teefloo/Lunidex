'use client';

import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { resolveCollectionEntry } from '@/lib/tcg-collection-entry';
import { usePrimeDexStore } from '@/store/primedex';
import { HomeCollectionEntry } from './HomeCollectionEntry';

export function HomeCollectionPreview() {
  const { t } = useTranslation();
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
        {isResume ? t('lunidex_home.preview_owned_eyebrow', { defaultValue: 'Your collection' }) : t('lunidex_home.preview_eyebrow', { defaultValue: 'Collection preview' })}
      </p>
      <h2 id="collection-preview-title" className="mt-2 text-2xl font-black tracking-tight text-foreground">
        {isResume ? t('lunidex_home.preview_owned_title', { defaultValue: 'Your collection is ready.' }) : t('lunidex_home.preview_title', { defaultValue: 'Your collection, at a glance.' })}
      </h2>
      <p className="mt-2 text-sm leading-6 text-foreground/65">
        {isResume
          ? t('lunidex_home.preview_owned_count', { count: ownedCount, defaultValue: '{{count}} cards saved on this device' })
          : t('lunidex_home.preview_body', { defaultValue: 'Choose a set, add your cards, and follow your progress at your own pace.' })}
      </p>
      {!isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{t('lunidex_home.preview_note', { defaultValue: 'Interface preview' })}</p>}
      {isResume && <p className="mt-3 text-xs font-semibold text-foreground/45">{t('lunidex_home.no_account', { defaultValue: 'No account required.' })}</p>}
      <HomeCollectionEntry className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/45 bg-primary/10 px-4 text-sm font-bold text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60" />
    </aside>
  );
}
