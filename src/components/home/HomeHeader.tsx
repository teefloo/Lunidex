import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import HomeHeaderMobileMenu from './HomeHeaderMobileMenu';
import { HomeLanguageSelect } from './HomeLanguageSelect';
import HomeThemeToggle from './HomeThemeToggle';

interface HomeHeaderProps {
  initialSignedIn?: boolean;
  serviceAvailable?: boolean;
}

export default async function HomeHeader({ initialSignedIn = false, serviceAvailable = true }: HomeHeaderProps) {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const links = [
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/team', label: t('nav.team') },
  ];
  const mobileLinks = [...links, { href: '/quiz', label: t('nav.quiz') }];
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
        </nav>

        <HomeLanguageSelect className="field-header-language" />
        <HomeThemeToggle />

        <Link href={localeHref('/tcg', language)} className="field-header-cta">
          {t('tcg.nav_catalog')}
          <span aria-hidden="true">↗</span>
        </Link>

        <HomeHeaderMobileMenu
          links={mobileLinks.map((link) => ({ ...link, href: localeHref(link.href, language) }))}
          menuLabel={menuLabel}
          navigationLabel={t('header.navigation', { defaultValue: 'Primary navigation' })}
          closeLabel={closeLabel}
          collectionStartLabel={t('lunidex_home.cta_start')}
          collectionResumeLabel={t('lunidex_home.cta_resume')}
          collectionInfoLabel={t('lunidex_home.cta_collection_info')}
          collectionLabel={t('tcg.nav_collection')}
          locale={language}
          languageControl={<HomeLanguageSelect />}
          themeControl={<HomeThemeToggle />}
          initialSignedIn={initialSignedIn}
          serviceAvailable={serviceAvailable}
        />
      </div>
    </header>
  );
}
