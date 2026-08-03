'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

export function HeaderMobileNav() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const label = (key: string, fallback: string) => {
    if (!mounted) return fallback;
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };
  const menuLabel = label('header.open_menu', 'Menu');
  const toolsLabel = label('nav.tools', 'Tools');

  return (
    <div className="flex items-center lg:hidden">
      <Sheet>
        <SheetTrigger
          render={
            <button type="button" className="glass-control touch-target flex h-11 w-11 items-center justify-center text-muted-foreground hover:scale-105 hover:border-border/80 hover:bg-muted/55 hover:text-foreground active:scale-95" aria-label={menuLabel}>
              <Menu className="h-4 w-4" />
            </button>
          }
        />
        <SheetContent side="right" className="w-[85vw] max-w-[350px] p-0 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="border-b border-foreground/15 p-6">
            <SheetTitle className="flex items-baseline text-left font-display tracking-tight">
              <span className="text-2xl font-extrabold gradient-text-hero">Luni</span>
              <span className="text-2xl font-medium italic editorial-italic text-foreground">dex</span>
            </SheetTitle>
            <p className="mt-1 cat-no text-[0.6rem] text-muted-foreground">Chapter I — Field Compendium</p>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4">
            {PRIMARY_NAV_ITEMS.map((item) => (
              <SheetClose key={item.path} nativeButton={false} render={
                <Link href={localizedHref(item.path)} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                  <item.icon className="h-5 w-5 flex-shrink-0" /> {label(item.labelKey, item.fallback)}
                </Link>
              } />
            ))}
            <div className="mt-3 border-t border-foreground/10 pt-3">
              <p className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{toolsLabel}</p>
              {SECONDARY_NAV_ITEMS.map((item) => (
                <SheetClose key={item.path} nativeButton={false} render={
                  <Link href={localizedHref(item.path)} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                    <item.icon className="h-5 w-5 flex-shrink-0" /> {label(item.labelKey, item.fallback)}
                  </Link>
                } />
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
