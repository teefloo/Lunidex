'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { PRIMARY_NAVIGATION, resolveActivePrimaryNavigation } from '@/lib/navigation-registry';

export function PrimaryBottomNav() {
  const pathname = usePathname();
  const localeHref = useLocaleHref();
  const { t } = useTranslation();
  const activePrimary = resolveActivePrimaryNavigation(pathname);
  const navLabel = t('header.navigation', { defaultValue: 'Primary navigation' });

  return (
    <nav className="primary-bottom-nav" aria-label={navLabel}>
      {PRIMARY_NAVIGATION.map((item) => {
        if (!item.path || !item.primary) return null;
        const Icon = item.icon;
        const label = t(item.labelKey, { defaultValue: item.fallback });
        const isActive = item.primary === activePrimary;

        return (
          <Link
            key={item.id}
            href={localeHref(item.path)}
            prefetch={false}
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive ? 'true' : undefined}
            className="primary-bottom-nav-link"
          >
            <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
