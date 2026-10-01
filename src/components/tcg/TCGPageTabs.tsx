'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { ChevronDown, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { normalizeNavigationPath, resolveNavigationDestination, NAVIGATION_DESTINATIONS } from '@/lib/navigation-registry';
import { TCGLanguageSelector } from './TCGLanguageSelector';
import { resolveRequestedTCGCardLanguage } from '@/lib/tcg-language';
import { usePrimeDexStore } from '@/store/primedex';

interface TCGPageTabsProps {
  initialLabels?: Readonly<Record<string, string>>;
}

export function TCGPageTabs({ initialLabels = {} }: TCGPageTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const localizedHref = useLocaleHref();
  const normalizedPathname = normalizeNavigationPath(pathname);
  const toolsRef = useRef<HTMLDetailsElement>(null);
  const requestedTcgLanguage = searchParams.get('tcgLang');
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const tcgLanguage = requestedTcgLanguage !== null
    ? resolveRequestedTCGCardLanguage(requestedTcgLanguage)
    : hasHydrated
      ? browseLanguage
      : null;
  const destination = resolveNavigationDestination(pathname);
  const isPersonalCollection = destination?.group === 'collection';
  const visibleTabs = isPersonalCollection
    ? NAVIGATION_DESTINATIONS.filter((item) => ['collection', 'wishlist', 'sealed-portfolio'].includes(item.id) && item.path !== null)
    : NAVIGATION_DESTINATIONS.filter((item) => (item.id === 'catalog' || item.id === 'sealed-market') && item.path !== null);
  const toolItems = NAVIGATION_DESTINATIONS.filter((item) => item.group === 'catalog' && !['catalog', 'sealed-market'].includes(item.id) && item.path !== null);
  const selectedTool = toolItems.find((item) => item.id === destination?.id);
  const showLanguageSelector = normalizedPathname === '/tcg'
    || normalizedPathname === '/tcg/collection'
    || normalizedPathname === '/tcg/wishlist'
    || normalizedPathname === '/tcg/deck-builder';
  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: initialLabels[key] ?? fallback });
    return translated === key ? (initialLabels[key] ?? fallback) : translated;
  };
  const buildHref = (path: string) => {
    const href = localizedHref(path);
    if (!tcgLanguage || (!path.startsWith('/tcg/collection') && path !== '/tcg' && !path.startsWith('/tcg/'))) return href;
    const params = new URLSearchParams({ tcgLang: tcgLanguage });
    return `${href}?${params.toString()}`;
  };

  const closeTools = () => {
    if (toolsRef.current) toolsRef.current.open = false;
  };

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (toolsRef.current?.open && event.target instanceof Node && !toolsRef.current.contains(event.target)) {
        closeTools();
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && toolsRef.current?.open) closeTools();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <nav className="tcg-local-navigation" aria-label={label('tcg.page_title', 'TCG workspace')}>
      <div className="tcg-local-navigation-main">
        <div className="tcg-local-navigation-links">
          {visibleTabs.map((item) => {
            if (!item.path) return null;
            const Icon = item.icon;
            const isActive = destination?.id === item.id || (destination?.id === 'collection-start' && item.id === 'collection');
            const itemLabel = label(item.labelKey, item.fallback);
            return (
              <Link
                key={item.id}
                href={buildHref(item.path)}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive ? 'true' : undefined}
                className="tcg-local-navigation-link"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{itemLabel}</span>
              </Link>
            );
          })}
        </div>

        {!isPersonalCollection && toolItems.length > 0 ? (
          <details ref={toolsRef} className="tcg-local-tools">
            <summary className={cn('tcg-local-navigation-link tcg-local-tools-trigger', selectedTool && 'is-context-active')}>
              <Wrench aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>{selectedTool ? label(selectedTool.labelKey, selectedTool.fallback) : label('nav.tools', 'TCG tools')}</span>
              <ChevronDown aria-hidden="true" className="tcg-local-tools-chevron h-3.5 w-3.5 shrink-0" />
            </summary>
            <div className="tcg-local-tools-menu" onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) closeTools();
            }}>
              {toolItems.map((item) => {
                if (!item.path) return null;
                const Icon = item.icon;
                const isActive = destination?.id === item.id;
                return (
                  <Link
                    key={item.id}
                    href={buildHref(item.path)}
                    aria-current={isActive ? 'page' : undefined}
                    data-active={isActive ? 'true' : undefined}
                    className="tcg-local-tool-link"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{label(item.labelKey, item.fallback)}</span>
                  </Link>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>

      {showLanguageSelector ? (
        <Suspense fallback={<div className="h-11 w-full rounded-sm border border-border/45 bg-card/55 sm:w-36" aria-hidden="true" />}>
          <TCGLanguageSelector className="w-full justify-between sm:w-auto sm:shrink-0" />
        </Suspense>
      ) : null}
    </nav>
  );
}
