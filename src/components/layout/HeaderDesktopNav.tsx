'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { HeaderLink } from './HeaderLink';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function HeaderDesktopNav() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const label = (key: string, fallback: string) => mounted ? (t(key) || fallback) : fallback;

  return (
    <nav className="hidden min-w-0 flex-none items-center justify-center gap-0 rounded-sm border border-border bg-background/40 px-1 py-0.5 lg:flex">
      {PRIMARY_NAV_ITEMS.map((item, index) => (
        <Fragment key={item.path}>
          {index > 0 && <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />}
          <HeaderLink href={localizedHref(item.path)} variant="ghost" size="sm" className="gap-1 px-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-primary">
            <item.icon className="h-3 w-3" /> {label(item.labelKey, item.fallback)}
          </HeaderLink>
        </Fragment>
      ))}
      <span aria-hidden="true" className="h-2.5 w-px bg-foreground/15" />
      <DropdownMenu>
        <DropdownMenuTrigger className="group inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-transparent px-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-all duration-100 hover:border-border/60 hover:bg-muted/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:text-primary">
          {label('nav.more', 'More')}
          <ChevronDown className="h-2.5 w-2.5 transition-transform group-data-[popup-open]:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.path}
              render={
                <Link href={localizedHref(item.path)} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary">
                  <item.icon className="h-3.5 w-3.5" /> {label(item.labelKey, item.fallback)}
                </Link>
              }
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
