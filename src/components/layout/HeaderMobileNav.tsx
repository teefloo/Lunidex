'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { AuthModalBoundary } from '@/components/auth/AuthModalBoundary';
import { HeaderActions } from './HeaderActions';
import { HeaderLogo } from './HeaderLogo';
import { PRIMARY_NAV_ITEMS, SECONDARY_NAV_ITEMS } from './nav-items';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export function HeaderMobileNav() {
  const mounted = useMounted();
  const { t } = useTranslation();
  const resolvedLang = useClientLanguage();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const localizedHref = (path: string) => `/${resolvedLang}${path}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusOnCloseRef = useRef(true);

  const label = (key: string, fallback: string) => {
    if (!mounted) return fallback;
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  const menuLabel = label('header.open_menu', 'Open menu');
  const navigationLabel = label('header.navigation', 'Primary navigation');
  const menuDescription = label('header.menu_description', 'Browse Lunidex navigation and account tools.');
  const closeLabel = label('common.close', 'Close');
  const toolsLabel = label('nav.tools', 'Tools');
  const moreLabel = label('nav.more', 'More');
  const isToolsActive = SECONDARY_NAV_ITEMS.some((item) => {
    const href = localizedHref(item.path);
    return pathname === href || pathname.startsWith(`${href}/`);
  });
  const [isToolsOpen, setIsToolsOpen] = useState<boolean | null>(null);
  const showToolsOpen = isToolsOpen ?? isToolsActive;

  const closeMenu = () => {
    restoreFocusOnCloseRef.current = false;
    setIsOpen(false);
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen && restoreFocusOnCloseRef.current) {
      triggerRef.current?.focus();
    }
    restoreFocusOnCloseRef.current = true;
  };
  const restoreMenuFocus = () => {
    triggerRef.current?.focus();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const handleAuthOpenChange = (nextOpen: boolean) => {
    setAuthOpen(nextOpen);
    if (!nextOpen) restoreMenuFocus();
  };

  return (
    <div className="xl:hidden">
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger
          type="button"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="lunidex-mobile-menu"
          aria-label={menuLabel}
          title={menuLabel}
          className="site-header-menu-trigger site-header-action"
        >
          <Menu aria-hidden="true" className="h-4 w-4" />
        </SheetTrigger>

        <SheetContent
          id="lunidex-mobile-menu"
          side="right"
          showCloseButton={false}
          aria-label={navigationLabel}
          className="header-mobile-sheet motion-reduce:!transform-none motion-reduce:!transition-none"
        >
          <SheetHeader className="header-mobile-sheet-header">
            <HeaderLogo />
            <SheetClose
              type="button"
              aria-label={closeLabel}
              title={closeLabel}
              className="site-header-action header-mobile-sheet-close"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </SheetClose>
            <SheetTitle className="sr-only">{navigationLabel}</SheetTitle>
            <SheetDescription className="sr-only">{menuDescription}</SheetDescription>
          </SheetHeader>

          <div className="header-mobile-sheet-body">
            <nav aria-label={navigationLabel} className="header-mobile-sheet-nav">
              <div className="header-mobile-sheet-section-label">{navigationLabel}</div>
              {PRIMARY_NAV_ITEMS.map((item) => {
                const href = localizedHref(item.path);
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={item.path}
                    href={href}
                    prefetch={false}
                    onClick={closeMenu}
                    aria-current={isActive ? 'page' : undefined}
                    data-active={isActive ? 'true' : undefined}
                    className="header-mobile-sheet-link"
                  >
                    <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{label(item.labelKey, item.fallback)}</span>
                  </Link>
                );
              })}

              <div className="header-mobile-sheet-tools">
                <button
                  type="button"
                  aria-expanded={showToolsOpen}
                  onClick={() => setIsToolsOpen(!showToolsOpen)}
                  className="header-mobile-sheet-tools-trigger"
                >
                  <span className="flex items-center gap-3">
                    <span className="header-mobile-sheet-tools-mark" aria-hidden="true">+</span>
                    <span>{toolsLabel}</span>
                  </span>
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${showToolsOpen ? 'rotate-180' : ''}`} />
                </button>
                {showToolsOpen && (
                  <div className="header-mobile-sheet-tools-list">
                    {SECONDARY_NAV_ITEMS.map((item) => {
                      const href = localizedHref(item.path);
                      const isActive = pathname === href || pathname.startsWith(`${href}/`);

                      return (
                        <Link
                          key={item.path}
                          href={href}
                          prefetch={false}
                          onClick={closeMenu}
                          aria-current={isActive ? 'page' : undefined}
                          data-active={isActive ? 'true' : undefined}
                          className="header-mobile-sheet-link header-mobile-sheet-tool-link"
                        >
                          <item.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span>{label(item.labelKey, item.fallback)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>

            <section className="header-mobile-sheet-actions" aria-labelledby="header-mobile-actions-title">
              <h2 id="header-mobile-actions-title" className="header-mobile-sheet-section-label">{moreLabel}</h2>
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
        </SheetContent>
      </Sheet>
      {authOpen && (
        <AuthModalBoundary onClose={() => handleAuthOpenChange(false)}>
          <AuthModal open onOpenChange={handleAuthOpenChange} />
        </AuthModalBoundary>
      )}
    </div>
  );
}
