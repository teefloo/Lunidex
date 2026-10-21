'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { useCallback } from 'react';
import type { TCGIllustratorGallery } from '@/lib/tcg-illustrator-gallery';
import { buildTCGIllustratorPath } from '@/lib/tcg-illustrators';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { TCGCardItem } from './TCGCardItem';
import { TCGLanguageSelector } from './TCGLanguageSelector';

export function TCGIllustratorPageClient({ gallery }: { gallery: TCGIllustratorGallery }) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const catalogHref = localeHref(`/tcg?tcgLang=${encodeURIComponent(gallery.language)}`);

  const changeLanguage = useCallback((language: TCGIllustratorGallery['language']) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tcgLang', language);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const openCard = useCallback((card: TCGIllustratorGallery['cards'][number]) => {
    router.push(
      `${localeHref(`/tcg/cards/${encodeURIComponent(card.id)}`)}?tcgLang=${encodeURIComponent(gallery.language)}`,
      { scroll: false },
    );
  }, [gallery.language, localeHref, router]);

  return (
    <main className="page-shell page-shell--header-offset relative space-y-6 pb-24 pt-4">
      <Link
        href={catalogHref}
        prefetch={false}
        className="glass-control inline-flex min-h-11 items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('tcg.illustrator_back_to_catalog')}
      </Link>

      <header className="glass-surface flex flex-col gap-5 rounded-sm p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('tcg.illustrator')}</p>
          <h1 className="mt-2 break-words font-display text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {gallery.artist}
          </h1>
          {!gallery.isUnavailable && (
            <p className="mt-3 text-sm font-bold text-muted-foreground" aria-live="polite">
              {t('tcg.illustrator_cards_count', { count: gallery.total })}
            </p>
          )}
        </div>
        <TCGLanguageSelector
          value={gallery.language}
          onChange={changeLanguage}
          className="w-fit"
          ariaLabel={t('tcg.card_language')}
        />
      </header>

      {gallery.isUnavailable ? (
        <div className="flex flex-col gap-3 rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p>{t('tcg.illustrator_catalog_unavailable')}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-amber-500/40 px-3 font-bold transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            {t('tcg.illustrator_retry')}
          </button>
        </div>
      ) : gallery.hasUnavailableDetails && (
        <div className="flex flex-col gap-3 rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
          <p>{t('tcg.illustrator_details_unavailable')}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-amber-500/40 px-3 font-bold transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70"
          >
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            {t('tcg.illustrator_retry')}
          </button>
        </div>
      )}

      {gallery.isUnavailable ? null : gallery.total === 0 ? (
        <section className="glass-surface rounded-sm p-8 text-center" aria-labelledby="tcg-illustrator-empty-title">
          <h2 id="tcg-illustrator-empty-title" className="text-xl font-black text-foreground">
            {t('tcg.no_cards')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t('tcg.illustrator_empty')}</p>
        </section>
      ) : (
        <>
          <section aria-label={t('tcg.illustrator_cards_count', { count: gallery.total })}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {gallery.cards.map((card, index) => (
                <TCGCardItem
                  key={card.id}
                  card={card}
                  index={index}
                  onClick={openCard}
                  tcgLanguage={gallery.language}
                />
              ))}
            </div>
          </section>

          {gallery.pageCount > 1 && (
            <nav className="flex flex-wrap items-center justify-center gap-3 pt-3" aria-label={t('tcg.illustrator_pagination')}>
              {gallery.page > 1 && (
                <Link
                  href={localeHref(buildTCGIllustratorPath(gallery.identity, gallery.language, gallery.page - 1))}
                  prefetch={false}
                  className="glass-control inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-bold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  {t('common.previous')}
                </Link>
              )}
              <span className="px-2 text-sm font-bold text-muted-foreground" aria-current="page">
                {t('tcg.illustrator_page', { page: gallery.page, total: gallery.pageCount })}
              </span>
              {gallery.page < gallery.pageCount && (
                <Link
                  href={localeHref(buildTCGIllustratorPath(gallery.identity, gallery.language, gallery.page + 1))}
                  prefetch={false}
                  className="glass-control inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-bold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  {t('common.next')}
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
