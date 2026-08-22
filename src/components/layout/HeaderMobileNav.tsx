'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';
import LunidexLogo from '@/components/ui/LunidexLogo';

export function HeaderMobileNav() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const [isOpen, setIsOpen] = useState(false);

  const label = (key: string, fallback: string) => {
    if (!mounted) return fallback;
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };
  const menuLabel = label('header.open_menu', 'Menu');
  const closeLabel = label('common.close', 'Close');
  const toolsLabel = label('nav.tools', 'Tools');

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <div className="flex items-center lg:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="lunidex-mobile-menu"
        aria-label={menuLabel}
        title={menuLabel}
        onClick={() => setIsOpen(true)}
        className="glass-control touch-target flex h-11 w-11 items-center justify-center text-muted-foreground hover:scale-105 hover:border-border/80 hover:bg-muted/55 hover:text-foreground active:scale-95"
      >
        <Menu className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/25"
          />
          <aside
            id="lunidex-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={menuLabel}
            className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-[350px] flex-col gap-4 overflow-y-auto border-l border-border bg-card pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.5rem+env(safe-area-inset-top))] text-sm shadow-[var(--shadow-pixel)]"
          >
            <div className="relative flex flex-col gap-1 border-b border-foreground/15 p-6">
              <button
                type="button"
                aria-label={closeLabel}
                title={closeLabel}
                onClick={() => setIsOpen(false)}
                className="glass-control touch-target absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 text-left font-display tracking-tight">
                <LunidexLogo alt="" sizes="36px" className="h-9 w-9 object-contain" />
                <div className="flex items-baseline">
                  <span className="text-2xl font-extrabold gradient-text-hero">Luni</span>
                  <span className="text-2xl font-medium italic editorial-italic text-foreground">dex</span>
                </div>
              </div>
              <p className="mt-1 cat-no text-[0.6rem] text-muted-foreground">Chapter I — Field Compendium</p>
            </div>
            <nav className="flex flex-col gap-1 p-4" aria-label={menuLabel}>
              {PRIMARY_NAV_ITEMS.map((item) => (
                <Link key={item.path} href={localizedHref(item.path)} onClick={() => setIsOpen(false)} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                  <item.icon className="h-5 w-5 shrink-0" /> {label(item.labelKey, item.fallback)}
                </Link>
              ))}
              <div className="mt-3 border-t border-foreground/10 pt-3">
                <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{toolsLabel}</p>
                {SECONDARY_NAV_ITEMS.map((item) => (
                  <Link key={item.path} href={localizedHref(item.path)} onClick={() => setIsOpen(false)} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                    <item.icon className="h-5 w-5 shrink-0" /> {label(item.labelKey, item.fallback)}
                  </Link>
                ))}
              </div>
            </nav>
          </aside>
        </>
      )}
    </div>
  );
}
