'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HomeCollectionEntry } from './HomeCollectionEntry';

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
}: HomeHeaderMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        triggerRef.current?.focus();
      }
      return;
    }

    wasOpenRef.current = true;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className="field-mobile-menu">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="lunidex-home-mobile-menu"
        aria-haspopup="dialog"
        title={menuLabel}
        onClick={() => setIsOpen((open) => !open)}
        className="field-mobile-menu-trigger"
      >
        <span aria-hidden="true">01</span>
        <span>{menuLabel}</span>
      </button>

      {isOpen && (
        <>
          <div
            aria-hidden="true"
            onPointerDown={closeMenu}
            className="field-mobile-menu-backdrop"
          />
          <aside
            ref={panelRef}
            id="lunidex-home-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={navigationLabel}
            className="field-mobile-menu-panel"
          >
            <div className="field-mobile-menu-panel-header">
              <span className="field-mobile-menu-panel-kicker" aria-hidden="true">LUNIDEX / MENU</span>
              <button
                ref={closeRef}
                type="button"
                aria-label={closeLabel}
                title={closeLabel}
                onClick={closeMenu}
                className="field-mobile-menu-close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <nav aria-label={navigationLabel} className="field-mobile-menu-links">
              {links.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu}>
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
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
          </aside>
        </>
      )}
    </div>
  );
}
