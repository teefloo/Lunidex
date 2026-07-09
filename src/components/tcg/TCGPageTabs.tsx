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
    <div className="glass-toolbar inline-flex w-fit items-center gap-0.5 p-0.5 mx-auto mb-8">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'relative rounded-sm px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-100 hover:-translate-x-px hover:-translate-y-px',
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
