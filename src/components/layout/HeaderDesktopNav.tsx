'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HeaderLink } from './HeaderLink';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';

export function HeaderDesktopNav() {
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const pathname = usePathname();
  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const isToolsActive = SECONDARY_NAV_ITEMS.some((item) => {
    const href = localizedHref(item.path);
    return pathname === href || pathname.startsWith(`${href}/`);
  });

  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated && translated !== key ? translated : fallback;
  };

  const navigationLabel = label('header.navigation', 'Primary navigation');
  const toolsLabel = label('nav.tools', 'Tools');

  return (
    <nav className="site-header-nav hidden min-w-0 items-center gap-1 xl:flex" aria-label={navigationLabel}>
      <div className="site-header-nav-primary flex min-w-0 items-center gap-0.5">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <HeaderLink
            key={item.path}
            href={localizedHref(item.path)}
            variant="ghost"
            className="site-header-nav-link"
          >
            {label(item.labelKey, item.fallback)}
          </HeaderLink>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          data-active={isToolsActive ? 'true' : undefined}
          className="site-header-tools-trigger"
        >
          <span>{toolsLabel}</span>
          <ChevronDown aria-hidden="true" className="site-header-tools-chevron h-3.5 w-3.5 transition-transform duration-150" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="site-header-tools-menu">
          {SECONDARY_NAV_ITEMS.map((item) => {
            const href = localizedHref(item.path);
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <DropdownMenuItem
                key={item.path}
                render={
                  <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    data-active={isActive ? 'true' : undefined}
                  />
                }
                data-active={isActive ? 'true' : undefined}
                className="site-header-tools-item"
              >
                <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{label(item.labelKey, item.fallback)}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
