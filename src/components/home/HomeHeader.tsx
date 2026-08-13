import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { GITHUB_REPO_URL } from '@/lib/site';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import { HomeCollectionEntry } from './HomeCollectionEntry';
import HomeHeaderMobileMenu from './HomeHeaderMobileMenu';

export default async function HomeHeader() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const links = [
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/tcg/collection', label: t('tcg.nav_collection') },
    { href: '/team', label: t('nav.team') },
  ];
  const menuLabel = t('header.open_menu');
  const closeLabel = t('common.close', { defaultValue: 'Close' });

  return (
    <header className="field-header" data-field-header>
      <div className="field-header-inner">
        <Link
          href={localeHref('/', language)}
          aria-label={`Lunidex — ${t('header.home_aria')}`}
          className="field-brand"
          prefetch={false}
        >
          <PrimeDexLogo className="h-7 w-7" />
          <span className="field-brand-wordmark" aria-hidden="true" translate="no">
            <span className="field-brand-luni">Luni</span><span>dex</span>
          </span>
        </Link>

        <nav className="field-header-nav" aria-label={t('header.navigation', { defaultValue: 'Primary navigation' })}>
          {links.map((link) => (
            <Link key={link.href} href={localeHref(link.href, language)}>
              {link.label}
            </Link>
          ))}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
            {t('footer.resources.github')}
          </a>
        </nav>

        <HomeCollectionEntry
          locale={language}
          startLabel={t('lunidex_home.cta_start')}
          resumeLabel={t('lunidex_home.cta_resume')}
          className="field-header-cta"
        />

        <HomeHeaderMobileMenu
          links={links.map((link) => ({ ...link, href: localeHref(link.href, language) }))}
          menuLabel={menuLabel}
          navigationLabel={t('header.navigation', { defaultValue: 'Primary navigation' })}
          closeLabel={closeLabel}
          collectionStartLabel={t('lunidex_home.cta_start')}
          collectionResumeLabel={t('lunidex_home.cta_resume')}
          githubLabel={t('footer.resources.github')}
          githubUrl={GITHUB_REPO_URL}
          locale={language}
        />
      </div>
    </header>
  );
}
