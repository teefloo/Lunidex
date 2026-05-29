'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

const TABS = [
  { href: '/tcg', key: 'tcg.nav_catalog' },
  { href: '/tcg/collection', key: 'tcg.nav_collection' },
  { href: '/tcg/wishlist', key: 'tcg.nav_wishlist' },
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
            'relative rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all duration-200',
            isActive(tab.href)
              ? 'bg-primary/15 text-primary shadow-[0_0_12px_-4px_rgba(227,53,13,0.2)]'
              : 'text-foreground/40 hover:text-foreground/70 hover:bg-muted/50',
          )}
        >
          {t(tab.key)}
        </Link>
      ))}
    </div>
  );
}
