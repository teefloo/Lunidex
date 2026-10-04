'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { AuthModalBoundary } from '@/components/auth/AuthModalBoundary';
import { getFocusTrapTarget } from '@/lib/focus-management';
import { resolveNavigationDestination } from '@/lib/navigation-registry';
import { HeaderActions } from './HeaderActions';
import { HeaderLogo } from './HeaderLogo';
import { SecondaryNavigationLinks } from './SecondaryNavigationLinks';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export function HeaderMobileNav() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };
  const menuLabel = label('nav.more', 'More');
  const navigationLabel = label('header.navigation', 'Primary navigation');
  const closeLabel = label('common.close', 'Close');
  const activeDestination = resolveNavigationDestination(pathname);
  const moreIsActive = activeDestination?.group === 'space' || activeDestination?.group === 'resources';

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };
  const restoreMenuFocus = () => {
    triggerRef.current?.focus();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const handleAuthOpenChange = (nextOpen: boolean) => {
    setAuthOpen(nextOpen);
    if (!nextOpen) restoreMenuFocus();
  };

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const activeElement = document.activeElement;
      const destination = getFocusTrapTarget({
        backwards: event.shiftKey,
        focusIsInside: activeElement instanceof HTMLElement && focusable.includes(activeElement),
        focusIsFirst: activeElement === focusable[0],
        focusIsLast: activeElement === focusable[focusable.length - 1],
        focusableCount: focusable.length,
      });
      if (destination) {
        event.preventDefault();
        focusable[destination === 'first' ? 0 : focusable.length - 1]?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="lunidex-mobile-menu"
        data-active={moreIsActive ? 'true' : undefined}
        aria-label={menuLabel}
        title={menuLabel}
        className="site-header-menu-trigger site-header-action"
      >
        <Menu aria-hidden="true" className="h-4 w-4" />
      </button>

      {isOpen && createPortal(
        <>
          <button
            type="button"
            aria-label={closeLabel}
            aria-hidden="true"
            tabIndex={-1}
            className="header-mobile-sheet-overlay"
            onClick={closeMenu}
          />
          <div
            id="lunidex-mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={navigationLabel}
            tabIndex={-1}
            className="header-mobile-sheet motion-reduce:!transform-none motion-reduce:!transition-none"
          >
            <div className="header-mobile-sheet-header">
              <HeaderLogo />
              <button
                type="button"
                onClick={closeMenu}
                aria-label={closeLabel}
                title={closeLabel}
                className="site-header-action header-mobile-sheet-close"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="header-mobile-sheet-body">
              <nav aria-label={navigationLabel} className="header-mobile-sheet-nav">
                <SecondaryNavigationLinks onNavigate={closeMenu} />
              </nav>
              <section className="header-mobile-sheet-actions" aria-labelledby="header-mobile-actions-title">
                <h2 id="header-mobile-actions-title" className="header-mobile-sheet-section-label">
                  {label('nav.account', 'Account')}
                </h2>
                <HeaderActions
                  placement="sheet"
                  onInteraction={closeMenu}
                  onRequestAuth={() => {
                    closeMenu();
                    setAuthOpen(true);
                  }}
                />
              </section>
            </div>
          </div>
        </>,
        document.body,
      )}
      {authOpen && (
        <AuthModalBoundary onClose={() => handleAuthOpenChange(false)}>
          <AuthModal open onOpenChange={handleAuthOpenChange} />
        </AuthModalBoundary>
      )}
    </div>
  );
}
