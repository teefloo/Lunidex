'use client';

import Link from 'next/link';
import { useId } from 'react';
import { usePathname } from 'next/navigation';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { LanguageSelect } from '@/components/layout/LanguageSelect';
import {
  NAVIGATION_DESTINATIONS,
  NAVIGATION_GROUPS,
  resolveNavigationDestination,
  type NavigationGroup,
} from '@/lib/navigation-registry';
import { usePrimeDexStore } from '@/store/primedex';

const SECONDARY_GROUP_ORDER: readonly NavigationGroup[] = [
  'collection',
  'catalog',
  'pokedex',
  'play',
  'space',
  'resources',
];

interface SecondaryNavigationLinksProps {
  onNavigate?: () => void;
}

export function SecondaryNavigationLinks({ onNavigate }: SecondaryNavigationLinksProps) {
  const pathname = usePathname();
  const languageHeadingId = useId();
  const localeHref = useLocaleHref();
  const { t } = useTranslation();
  const toggleSettings = usePrimeDexStore((state) => state.toggleSettings);
  const activeDestination = resolveNavigationDestination(pathname);
  const label = (key: string, fallback: string) => {
    const translated = t(key, { defaultValue: fallback });
    return translated === key ? fallback : translated;
  };

  return (
    <div className="secondary-navigation-groups">
      <section className="secondary-navigation-language" aria-labelledby={languageHeadingId}>
        <h2 id={languageHeadingId} className="secondary-navigation-heading">
          {label('settings.language', 'Language')}
        </h2>
        <LanguageSelect
          className="secondary-navigation-language-field"
          onLanguageChange={onNavigate}
        />
      </section>
      {SECONDARY_GROUP_ORDER.map((group) => {
        const entries = NAVIGATION_DESTINATIONS.filter((item) => item.group === group && !item.primary && !item.paletteOnly);
        if (entries.length === 0) return null;
        const headingId = `secondary-navigation-${group}`;

        return (
          <section key={group} className="secondary-navigation-group" aria-labelledby={headingId}>
            <h2 id={headingId} className="secondary-navigation-heading">
              {label(NAVIGATION_GROUPS[group].labelKey, NAVIGATION_GROUPS[group].fallback)}
            </h2>
            <div className="secondary-navigation-links">
              {entries.map((item) => {
                const Icon = item.icon;
                const itemLabel = label(item.labelKey, item.fallback);
                const isActive = activeDestination?.id === item.id;

                if (item.action === 'settings') {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        toggleSettings();
                        onNavigate?.();
                      }}
                      className="secondary-navigation-link"
                    >
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      <span>{itemLabel}</span>
                    </button>
                  );
                }
                if (!item.path) return null;

                return (
                  <Link
                    key={item.id}
                    href={localeHref(item.path)}
                    prefetch={false}
                    onNavigate={onNavigate}
                    aria-current={isActive ? 'page' : undefined}
                    data-active={isActive ? 'true' : undefined}
                    className="secondary-navigation-link"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span>{itemLabel}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
