'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { HeaderLink } from './HeaderLink';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';

export function HeaderDesktopNav() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const pathname = usePathname();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const isToolsActive = SECONDARY_NAV_ITEMS.some((item) => {
    const href = localizedHref(item.path);
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  const label = (key: string, fallback: string) => {
    if (!mounted) return fallback;
    const translated = t(key);
    return translated && translated !== key ? translated : fallback;
  };

  useEffect(() => {
    if (!isToolsOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !toolsRef.current?.contains(event.target)) {
        setIsToolsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsToolsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isToolsOpen]);

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
      <div ref={toolsRef} className="relative">
        <button
          type="button"
          aria-expanded={isToolsOpen}
          aria-haspopup="menu"
          aria-current={isToolsActive ? 'page' : undefined}
          data-active={isToolsActive ? 'true' : undefined}
          onClick={() => setIsToolsOpen((open) => !open)}
          className="group inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-transparent px-1.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-all duration-100 hover:border-border/60 hover:bg-muted/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-primary/25 data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
        >
          {label('nav.tools', 'Tools')}
          <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
        </button>
        {isToolsOpen && (
          <div role="menu" className="glass-surface absolute left-0 top-full z-50 mt-1 min-w-44 overflow-hidden p-1 text-popover-foreground shadow-[var(--shadow-pixel)]">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                href={localizedHref(item.path)}
                role="menuitem"
                aria-current={pathname === localizedHref(item.path) ? 'page' : undefined}
                data-active={pathname === localizedHref(item.path) ? 'true' : undefined}
                onClick={() => setIsToolsOpen(false)}
                className="relative flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" /> {label(item.labelKey, item.fallback)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
