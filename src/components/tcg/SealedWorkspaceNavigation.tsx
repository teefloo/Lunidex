'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout/Breadcrumbs';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getNavigationAriaCurrent, normalizeNavigationPath } from '@/lib/navigation-registry';
import { SEALED_SUBVIEWS } from '@/lib/tcg-sealed-navigation';
import { TCGPageTabs } from './TCGPageTabs';

export type SealedWorkspaceView =
  | 'dashboard'
  | 'collection'
  | 'journal'
  | 'sales'
  | 'cashflow'
  | 'analytics'
  | 'catalogue'
  | 'sources'
  | 'market'
  | 'product'
  | 'portfolio-product'
  | 'releases'
  | 'buy-safely';

interface SealedWorkspaceNavigationProps {
  view: SealedWorkspaceView;
  currentLabel?: string;
}

export function SealedWorkspaceNavigation({ view, currentLabel }: SealedWorkspaceNavigationProps) {
  const { t } = useTranslation();
  const localizedHref = useLocaleHref();
  const pathname = normalizeNavigationPath(usePathname());
  const reportMenuRef = useRef<HTMLDetailsElement>(null);
  const toolsMenuRef = useRef<HTMLDetailsElement>(null);
  const activeView = view === 'portfolio-product' ? 'collection'
    : view === 'product' || view === 'releases' || view === 'buy-safely' ? 'market'
      : view;
  const primaryViews = SEALED_SUBVIEWS.filter((item) => item.section === 'main');
  const reportViews = SEALED_SUBVIEWS.filter((item) => item.section === 'reports');
  const toolViews = SEALED_SUBVIEWS.filter((item) => item.section === 'tools');
  const activeReportItem = reportViews.find((item) => item.key === activeView);
  const activeToolItem = toolViews.find((item) => item.key === activeView);
  const isPublicMarketContext = view === 'market' || view === 'product' || view === 'releases' || view === 'buy-safely';
  const sealedLabel = t('tcg.sealed.title', { defaultValue: 'Sealed portfolio' });
  const marketLabel = t('tcg.sealed.public_market.title', { defaultValue: 'Sealed market' });

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      for (const menu of [reportMenuRef.current, toolsMenuRef.current]) {
        if (menu?.open && !menu.contains(event.target)) menu.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const openedMenu = [reportMenuRef.current, toolsMenuRef.current].find((menu) => menu?.open);
      if (!openedMenu) return;
      event.preventDefault();
      openedMenu.open = false;
      openedMenu.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const renderLinks = (items: (typeof SEALED_SUBVIEWS)[number][]) => items.map((item) => (
    <Link
      key={item.key}
      href={localizedHref(item.path)}
      data-active={activeView === item.key ? 'true' : undefined}
      aria-current={getNavigationAriaCurrent(activeView === item.key, pathname, item.path)}
      className="sealed-subnav-link"
    >
      {t(`tcg.sealed.${item.labelKey}`)}
    </Link>
  ));

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: t('common.home', { defaultValue: 'Home' }), href: localizedHref('/') },
    { label: t('tcg.nav_catalog', { defaultValue: 'TCG catalog' }), href: localizedHref('/tcg') },
  ];
  if (isPublicMarketContext && view !== 'market') {
    breadcrumbItems.push({ label: marketLabel, href: localizedHref('/tcg/sealed/market') });
    breadcrumbItems.push({
      label: currentLabel ?? t(view === 'product' ? 'tcg.sealed.product' : `tcg.editorial_sealed.${view === 'releases' ? 'releases' : 'safety'}.title`),
    });
  }

  return (
    <>
      <TCGPageTabs context={isPublicMarketContext ? 'catalog' : 'collection'} showLanguageSelector={false} />
      {isPublicMarketContext && view !== 'market' ? (
        <Breadcrumbs items={breadcrumbItems} homeLabel={t('common.home', { defaultValue: 'Home' })} className="!px-0 !pt-0 mb-4" />
      ) : null}
      {!isPublicMarketContext ? <nav className="sealed-subnav" aria-label={sealedLabel}>
        <div className="sealed-subnav-primary">{renderLinks(primaryViews)}</div>
        {activeReportItem ? (
          <Link href={localizedHref(activeReportItem.path)} data-active="true" className="sealed-subnav-link">
            {t(`tcg.sealed.${activeReportItem.labelKey}`)}
          </Link>
        ) : null}
        <details ref={reportMenuRef} className="sealed-subnav-menu">
          <summary className={activeReportItem ? 'sealed-subnav-menu-trigger is-active' : 'sealed-subnav-menu-trigger'}>
            {t('tcg.sealed.reports', { defaultValue: 'Reports' })}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </summary>
          <div className="sealed-subnav-menu-panel">{renderLinks(reportViews.filter((item) => item.key !== activeReportItem?.key))}</div>
        </details>
        {activeToolItem ? (
          <Link href={localizedHref(activeToolItem.path)} data-active="true" className="sealed-subnav-link">
            {t(`tcg.sealed.${activeToolItem.labelKey}`)}
          </Link>
        ) : null}
        <details ref={toolsMenuRef} className="sealed-subnav-menu">
          <summary className={activeToolItem ? 'sealed-subnav-menu-trigger is-active' : 'sealed-subnav-menu-trigger'}>
            {t('nav.tools', { defaultValue: 'Tools' })}<ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          </summary>
          <div className="sealed-subnav-menu-panel">{renderLinks(toolViews.filter((item) => item.key !== activeToolItem?.key))}</div>
        </details>
      </nav> : null}
    </>
  );
}
