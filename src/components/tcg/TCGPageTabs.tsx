'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { isSupportedLanguage } from '@/lib/languages';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { TCGLanguageSelector } from './TCGLanguageSelector';
import { isTCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';

const TABS = [
  { href: '/tcg', key: 'tcg.nav_catalog' },
  { href: '/tcg/collection', key: 'tcg.nav_collection' },
  { href: '/tcg/wishlist', key: 'tcg.nav_wishlist' },
  { href: '/tcg/deck-builder', key: 'tcg.nav_deck_builder' },
  { href: '/friends', key: 'friends.title' },
] as const;

const FALLBACK_LABELS: Record<(typeof TABS)[number]['key'], string> = {
  'tcg.nav_catalog': 'Catalog',
  'tcg.nav_collection': 'Collection',
  'tcg.nav_wishlist': 'Wishlist',
  'tcg.nav_deck_builder': 'Deck builder',
  'friends.title': 'Friends',
};

type TCGPageTabLabels = Record<(typeof TABS)[number]['key'], string>;

interface TCGPageTabsProps {
  initialLabels?: TCGPageTabLabels;
}

export function TCGPageTabs({ initialLabels = FALLBACK_LABELS }: TCGPageTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const localizedHref = useLocaleHref();
  const normalizedPathname = normalizePathname(pathname);
  const requestedTcgLanguage = searchParams.get('tcgLang');
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const tcgLanguage = requestedTcgLanguage && isTCGCardLanguage(requestedTcgLanguage)
    ? requestedTcgLanguage
    : hasHydrated
      ? browseLanguage
      : null;

  const isActive = (href: string) => {
    if (href === '/tcg') return normalizedPathname === '/tcg';
    return normalizedPathname.startsWith(href);
  };

  return (
    <div className="mx-auto mb-8 flex w-full flex-col gap-2 sm:w-fit sm:flex-row sm:items-stretch">
      <div className="glass-toolbar grid w-full grid-cols-2 items-stretch gap-0.5 p-0.5 sm:inline-flex sm:w-fit sm:items-center">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={buildTabHref(localizedHref(tab.href), tab.href, tcgLanguage)}
            aria-current={isActive(tab.href) ? 'page' : undefined}
            className={cn(
              'touch-target relative flex min-h-11 min-w-0 items-center justify-center rounded-sm px-2 text-center text-[11px] font-black uppercase leading-tight tracking-[0.12em] transition-[color,background-color,border-color,box-shadow] duration-100 sm:px-3.5',
              isActive(tab.href)
                ? cn(
                  'border border-primary/40 bg-primary/15 text-primary shadow-[var(--shadow-pixel-sm)]',
                  tab.href === '/tcg' && 'rounded-l-[0.95rem]',
                )
                : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50',
            )}
          >
            {t(tab.key, { defaultValue: initialLabels[tab.key] })}
          </Link>
        ))}
      </div>
      <Suspense fallback={<div className="min-h-11 w-full rounded-sm border border-border/45 bg-card/55 sm:w-36" aria-hidden="true" />}>
        <TCGLanguageSelector className="w-full justify-between sm:w-auto sm:shrink-0" />
      </Suspense>
    </div>
  );
}

function buildTabHref(localizedPath: string, tabPath: string, tcgLanguage: string | null): string {
  if (!tcgLanguage || (tabPath !== '/tcg' && !tabPath.startsWith('/tcg/'))) return localizedPath;
  const params = new URLSearchParams({ tcgLang: tcgLanguage });
  return `${localizedPath}?${params.toString()}`;
}

function normalizePathname(pathname: string): string {
  const [firstSegment, ...rest] = pathname.split('/').filter(Boolean);
  if (!isSupportedLanguage(firstSegment ?? '')) return pathname;
  return rest.length > 0 ? `/${rest.join('/')}` : '/';
}
