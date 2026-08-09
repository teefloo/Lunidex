import Link from 'next/link';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { localeHref } from '@/lib/seo';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';

export default async function HomeHeader() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const links = [
    { href: '/tcg/collection', label: t('tcg.nav_collection') },
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/team', label: t('nav.team') },
  ];
  const menuLabel = t('header.open_menu');

  return (
    <header className="home-header">
      <div className="home-header-inner">
        <Link
          href={localeHref('/', language)}
          aria-label={`Lunidex — ${t('header.home_aria')}`}
          className="home-brand"
          prefetch={false}
        >
          <PrimeDexLogo className="h-7 w-7" />
          <span className="home-brand-wordmark" aria-hidden="true" translate="no">
            <span className="home-brand-luni">Luni</span><span>dex</span>
          </span>
        </Link>

        <nav className="home-header-nav">
          {links.map((link) => (
            <Link key={link.href} href={localeHref(link.href, language)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href={localeHref('/tcg/collection', language)}
          className="home-header-cta"
        >
          {t('lunidex_archive.open_lunidex')}
        </Link>

        <details className="home-header-menu">
          <summary title={menuLabel}>
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
          </nav>
        </details>
      </div>
    </header>
  );
}
