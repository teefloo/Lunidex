import Link from 'next/link';
import { getServerTForLanguage } from '@/lib/server-i18n';
import type { SupportedLanguage } from '@/lib/languages';
import { localeHref } from '@/lib/seo';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import HomeHeaderMobileMenu from './HomeHeaderMobileMenu';
import { HomeHeaderMoreMenu } from './HomeHeaderMoreMenu';
import { HeaderActions } from '@/components/layout/HeaderActions';

interface HomeHeaderProps {
  language: SupportedLanguage;
  initialSignedIn?: boolean;
  serviceAvailable?: boolean;
}

export default function HomeHeader({ language, initialSignedIn = false, serviceAvailable = true }: HomeHeaderProps) {
  const t = getServerTForLanguage(language);
  const links = [
    { href: '/tcg', label: t('tcg.nav_catalog', { defaultValue: 'TCG catalog' }) },
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/team', label: t('nav.team', { defaultValue: 'Team Builder' }) },
  ];
  const menuLabel = t('header.open_menu');
  const closeLabel = t('common.close', { defaultValue: 'Close' });

  return (
    <header className="field-header" data-field-header>
      <div className="field-header-inner">
        <Link
          href={localeHref('/', language)}
          aria-label={`Lunidex: ${t('header.home_aria')}`}
          className="field-brand"
          prefetch={false}
        >
          <LunidexLogo alt="" priority sizes="28px" className="h-7 w-7 object-contain" />
          <span className="field-brand-wordmark" aria-hidden="true" translate="no">
            <span className="field-brand-luni">Luni</span><span>dex</span>
          </span>
        </Link>

        <nav className="field-header-nav" aria-label={t('header.navigation', { defaultValue: 'Primary navigation' })}>
          <HomeCollectionEntry
            locale={language}
            startLabel={t('lunidex_home.cta_start')}
            resumeLabel={t('lunidex_home.cta_resume')}
            unavailableLabel={t('lunidex_home.cta_collection_info')}
            navLabel={t('tcg.nav_collection')}
            hrefOverride="/tcg/collection"
            className="field-header-nav-collection"
            initialSignedIn={initialSignedIn}
            serviceAvailable={serviceAvailable}
            showArrow={false}
          />
          {links.map((link) => (
            <Link key={link.href} href={localeHref(link.href, language)}>
              {link.label}
            </Link>
          ))}
          <HomeHeaderMoreMenu />
        </nav>

        <HeaderActions placement="toolbar" />

        <HomeHeaderMobileMenu
          menuLabel={menuLabel}
          navigationLabel={t('header.navigation', { defaultValue: 'Primary navigation' })}
          closeLabel={closeLabel}
          collectionStartLabel={t('lunidex_home.cta_start')}
          collectionResumeLabel={t('lunidex_home.cta_resume')}
          collectionInfoLabel={t('lunidex_home.cta_collection_info')}
          collectionLabel={t('tcg.nav_collection')}
          locale={language}
          initialSignedIn={initialSignedIn}
          serviceAvailable={serviceAvailable}
        />
      </div>
    </header>
  );
}
