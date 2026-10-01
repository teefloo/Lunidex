'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { PRIMARY_NAVIGATION, resolveActivePrimaryNavigation, resolveNavigationDestination } from '@/lib/navigation-registry';
import { SecondaryNavigationLinks } from './SecondaryNavigationLinks';

export function HeaderDesktopNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const localeHref = useLocaleHref();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const activePrimary = resolveActivePrimaryNavigation(pathname);
  const activeDestination = resolveNavigationDestination(pathname);
  const moreIsActive = activeDestination?.group === 'space' || activeDestination?.group === 'resources';

  const closeMore = () => {
    if (!moreRef.current) return;
    moreRef.current.open = false;
  };

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (moreRef.current?.open && event.target instanceof Node && !moreRef.current.contains(event.target)) {
        closeMore();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  return (
    <nav className="site-header-nav hidden min-w-0 items-center gap-1 lg:flex" aria-label={label('header.navigation', 'Primary navigation')}>
      <div className="site-header-nav-primary flex min-w-0 items-center gap-0.5">
        {PRIMARY_NAVIGATION.map((item) => {
          if (!item.path || !item.primary) return null;
          const isActive = item.primary === activePrimary;
          return (
            <Link
              key={item.id}
              href={localeHref(item.path)}
              prefetch={false}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? 'true' : undefined}
              className="site-header-nav-link"
            >
              {label(item.labelKey, item.fallback)}
            </Link>
          );
        })}
      </div>

      <details
        ref={moreRef}
        className="site-header-more"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !moreRef.current?.open) return;
          event.preventDefault();
          moreRef.current.open = false;
          moreRef.current.querySelector('summary')?.focus();
        }}
      >
        <summary className="site-header-more-trigger" data-active={moreIsActive ? 'true' : undefined}>
          <span>{label('nav.more', 'More')}</span>
          <ChevronDown aria-hidden="true" className="site-header-tools-chevron h-3.5 w-3.5 transition-transform duration-150" />
        </summary>
        <div className="site-header-more-menu" onClick={(event) => {
          if ((event.target as HTMLElement).closest('a, button')) closeMore();
        }}>
          <SecondaryNavigationLinks onNavigate={closeMore} />
        </div>
      </details>
    </nav>
  );
}
