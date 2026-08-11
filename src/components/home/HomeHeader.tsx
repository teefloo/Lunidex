import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import { GITHUB_REPO_URL } from '@/lib/site';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';

export default async function HomeHeader() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const links = [
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/tcg/collection', label: t('tcg.nav_collection') },
    { href: '/team', label: t('nav.team') },
  ];
  const menuLabel = t('header.open_menu');

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

        <Link
          href={localeHref('/tcg/collection', language)}
          className="field-header-cta"
        >
          {t('lunidex_archive.open_lunidex')}
        </Link>

        <details className="field-header-menu">
          <summary title={menuLabel} aria-label={menuLabel}>
            <span aria-hidden="true">01</span>
            <span>{menuLabel}</span>
          </summary>
          <nav>
            {links.map((link) => (
              <Link key={link.href} href={localeHref(link.href, language)}>
                {link.label}
              </Link>
            ))}
            <Link href={localeHref('/tcg/collection', language)}>
              {t('lunidex_archive.open_lunidex')}
            </Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              {t('footer.resources.github')}
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
