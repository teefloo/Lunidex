'use client';

import { useEffect, useRef, useState } from 'react';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { SecondaryNavigationLinks } from '@/components/layout/SecondaryNavigationLinks';

interface HomeHeaderMobileMenuProps {
  menuLabel: string;
  navigationLabel: string;
  closeLabel: string;
  collectionStartLabel: string;
  collectionResumeLabel: string;
  collectionInfoLabel: string;
  collectionLabel: string;
  locale: string;
  initialSignedIn?: boolean;
  serviceAvailable?: boolean;
}

export default function HomeHeaderMobileMenu({
  menuLabel,
  navigationLabel,
  closeLabel,
  collectionStartLabel,
  collectionResumeLabel,
  collectionInfoLabel,
  collectionLabel,
  locale,
  initialSignedIn = false,
  serviceAvailable = true,
}: HomeHeaderMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setIsOpen(false);
  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const panel = document.getElementById('lunidex-home-mobile-menu');
      if (panel?.contains(target) || triggerRef.current?.contains(target)) return;
      handleOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div className="field-mobile-menu">
      <Sheet open={isOpen} onOpenChange={handleOpenChange} disablePointerDismissal>
        <SheetTrigger
          type="button"
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-label={menuLabel}
          title={menuLabel}
          className="field-mobile-menu-trigger"
        >
          <span>{menuLabel}</span>
        </SheetTrigger>
        <SheetContent
          id="lunidex-home-mobile-menu"
          side="right"
          showCloseButton={false}
          aria-label={navigationLabel}
          className="field-mobile-menu-panel"
        >
          <SheetHeader className="field-mobile-menu-panel-header">
            <div className="flex items-center gap-2.5">
              <LunidexLogo alt="" sizes="32px" className="h-8 w-8 object-contain" />
              <span className="field-mobile-menu-panel-kicker" aria-hidden="true">LUNIDEX / MENU</span>
            </div>
            <SheetClose
              type="button"
              aria-label={closeLabel}
              title={closeLabel}
              autoFocus
              className="field-mobile-menu-close"
            >
              <span aria-hidden="true">×</span>
            </SheetClose>
            <SheetTitle className="sr-only">{navigationLabel}</SheetTitle>
          </SheetHeader>
          <nav aria-label={navigationLabel} className="field-mobile-menu-links">
            <HomeCollectionEntry
              locale={locale}
              startLabel={collectionStartLabel}
              resumeLabel={collectionResumeLabel}
              unavailableLabel={collectionInfoLabel}
              navLabel={collectionLabel}
              className="field-mobile-menu-link"
              onClick={closeMenu}
              initialSignedIn={initialSignedIn}
              serviceAvailable={serviceAvailable}
              showArrow={false}
            />
            <SecondaryNavigationLinks onNavigate={closeMenu} />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
