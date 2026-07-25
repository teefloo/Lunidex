'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const TABS = [
  { href: '/tcg', key: 'tcg.nav_catalog' },
  { href: '/tcg/collection', key: 'tcg.nav_collection' },
  { href: '/tcg/wishlist', key: 'tcg.nav_wishlist' },
  { href: '/tcg/deck-builder', key: 'tcg.nav_deck_builder' },
] as const;

export function TCGPageTabs() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const isActive = (href: string) => {
    if (href === '/tcg') return pathname === '/tcg';
    return pathname.startsWith(href);
  };

  return (
    <div className="glass-toolbar mx-auto mb-8 grid w-full grid-cols-2 items-stretch gap-0.5 p-0.5 sm:inline-flex sm:w-fit sm:items-center">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'touch-target relative flex min-h-11 min-w-0 items-center justify-center rounded-sm px-2 text-center text-[11px] font-black uppercase leading-tight tracking-[0.12em] transition-[color,background-color,border-color,box-shadow,transform] duration-100 hover:-translate-x-px hover:-translate-y-px sm:px-3.5',
            isActive(tab.href)
              ? 'border border-primary/40 bg-primary/15 text-primary shadow-[var(--shadow-pixel-sm)]'
              : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50',
          )}
        >
          {t(tab.key)}
        </Link>
      ))}
    </div>
  );
}
