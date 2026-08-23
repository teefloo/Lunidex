'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { isSupportedLanguage } from '@/lib/languages';
import { useLocaleHref } from '@/hooks/useLocaleHref';

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
  const { t } = useTranslation();
  const mounted = useMounted();
  const localizedHref = useLocaleHref();
  const normalizedPathname = normalizePathname(pathname);

  const isActive = (href: string) => {
    if (href === '/tcg') return normalizedPathname === '/tcg';
    return normalizedPathname.startsWith(href);
  };

  return (
    <div className="glass-toolbar mx-auto mb-8 grid w-full grid-cols-2 items-stretch gap-0.5 p-0.5 sm:inline-flex sm:w-fit sm:items-center">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={localizedHref(tab.href)}
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
          {mounted ? t(tab.key) : initialLabels[tab.key]}
        </Link>
      ))}
    </div>
  );
}

function normalizePathname(pathname: string): string {
  const [firstSegment, ...rest] = pathname.split('/').filter(Boolean);
  if (!isSupportedLanguage(firstSegment ?? '')) return pathname;
  return rest.length > 0 ? `/${rest.join('/')}` : '/';
}
