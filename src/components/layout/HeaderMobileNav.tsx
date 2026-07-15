'use client';

import Link from 'next/link';
import { Heart, Menu, X } from 'lucide-react';
import { usePrimeDexStore } from '@/store/primedex';
import { useMounted } from '@/hooks/useMounted';
import { useTranslation } from '@/lib/i18n';
import { NAV_ITEMS } from './nav-items';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

export function HeaderMobileNav() {
  const language = usePrimeDexStore(s => s.language);
  const systemLanguage = usePrimeDexStore(s => s.systemLanguage);
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const label = (key: string, fallback: string) => mounted ? (t(key) || fallback) : fallback;
  const favoritesLabel = label('nav.favorites', 'Favorites');
  const menuLabel = label('header.open_menu', 'Menu');
  const closeMenuLabel = label('common.close', 'Close');
  const homeMenuLabel = mounted ? `${t('header.home_aria')} - PrimeDex` : 'Go to Home - PrimeDex';

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
          <SheetClose
            render={
              <button
                type="button"
                className="touch-target absolute right-3 top-[calc(0.5rem+env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground active:scale-95"
                aria-label={closeMenuLabel}
                title={closeMenuLabel}
              >
                <X className="h-5 w-5" />
              </button>
            }
          />
          <SheetHeader className="border-b border-foreground/15 p-6">
            <SheetTitle className="flex items-baseline text-left font-display tracking-tight">
              <span className="text-2xl font-extrabold gradient-text-hero">Prime</span>
              <span className="text-2xl font-medium italic editorial-italic text-foreground">Dex</span>
            </SheetTitle>
            <p className="mt-1 cat-no text-[0.6rem] text-muted-foreground">Chapter I — Field Compendium</p>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4">
            <SheetClose nativeButton={false} render={
              <Link href={localizedHref('/')} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                <PrimeDexLogo className="h-5 w-5 flex-shrink-0" /> {homeMenuLabel}
              </Link>
            } />
            <SheetClose nativeButton={false} render={
              <Link href={localizedHref('/favorites')} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                <Heart className="h-5 w-5 flex-shrink-0" /> {favoritesLabel}
              </Link>
            } />
            {NAV_ITEMS.map((item) => (
              <SheetClose key={item.path} nativeButton={false} render={
                <Link href={localizedHref(item.path)} className="touch-target flex min-h-[52px] items-center gap-4 rounded-sm p-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                  <item.icon className="h-5 w-5 flex-shrink-0" /> {label(item.labelKey, item.fallback)}
                </Link>
              } />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
