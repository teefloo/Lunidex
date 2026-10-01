'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { resolveNavigationDestination } from '@/lib/navigation-registry';
import { SecondaryNavigationLinks } from '@/components/layout/SecondaryNavigationLinks';

export function HomeHeaderMoreMenu() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const moreRef = useRef<HTMLDetailsElement>(null);
  const destination = resolveNavigationDestination(pathname);
  const moreIsActive = destination?.group === 'space' || destination?.group === 'resources';
  const label = t('nav.more', { defaultValue: 'More' });

  const closeMenu = () => {
    if (moreRef.current) moreRef.current.open = false;
  };

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (moreRef.current?.open && event.target instanceof Node && !moreRef.current.contains(event.target)) {
        closeMenu();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, []);

  return (
    <details
      ref={moreRef}
      className="site-header-more home-header-more"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !moreRef.current?.open) return;
        event.preventDefault();
        closeMenu();
        moreRef.current.querySelector('summary')?.focus();
      }}
    >
      <summary className="site-header-more-trigger" data-active={moreIsActive ? 'true' : undefined}>
        <span>{label}</span>
        <ChevronDown aria-hidden="true" className="site-header-tools-chevron h-3.5 w-3.5 transition-transform duration-150" />
      </summary>
      <div className="site-header-more-menu" onClick={(event) => {
        if ((event.target as HTMLElement).closest('a, button')) closeMenu();
      }}>
        <SecondaryNavigationLinks onNavigate={closeMenu} />
      </div>
    </details>
  );
}
