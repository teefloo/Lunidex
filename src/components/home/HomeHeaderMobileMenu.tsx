'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface HomeHeaderMobileMenuProps {
  links: Array<{ href: string; label: string }>;
  menuLabel: string;
  navigationLabel: string;
  closeLabel: string;
  collectionStartLabel: string;
  collectionResumeLabel: string;
  githubLabel: string;
  githubUrl: string;
  locale: string;
  languageControl?: ReactNode;
}

export default function HomeHeaderMobileMenu({
  links,
  menuLabel,
  navigationLabel,
  closeLabel,
  collectionStartLabel,
  collectionResumeLabel,
  githubLabel,
  githubUrl,
  locale,
  languageControl = null,
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
          title={menuLabel}
          className="field-mobile-menu-trigger"
        >
          <span aria-hidden="true">01</span>
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
            <span className="field-mobile-menu-panel-kicker" aria-hidden="true">LUNIDEX / MENU</span>
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
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu}>
                  {link.label}
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
              {languageControl}
              <HomeCollectionEntry
                locale={locale}
                startLabel={collectionStartLabel}
                resumeLabel={collectionResumeLabel}
                className="field-mobile-menu-cta"
                onClick={closeMenu}
              />
              <a href={githubUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>
                {githubLabel}
                <span aria-hidden="true">↗</span>
              </a>
            </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
