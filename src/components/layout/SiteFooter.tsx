import Link from 'next/link';
import { Heart } from 'lucide-react';

import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import { ConsentPreferencesButton } from '@/components/layout/ConsentPreferencesButton';

export default async function SiteFooter() {
  const t = await getServerT();
  const language = await getServerLanguage();
  const localizedHref = (href: string) => `/${language}${href}`;
  const year = new Date().getFullYear();

  const navigationLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/pokedex', label: t('nav.pokedex') },
    { href: '/team', label: t('nav.team') },
    { href: '/tcg', label: t('nav.tcg') },
    { href: '/tcg/collection', label: t('tcg.nav_collection') },
    { href: '/quiz', label: t('nav.quiz') },
    { href: '/faq', label: t('nav.faq') },
  ];

  const legalLinks = [
    { href: '/legal', label: t('footer.legal.legal_notice') },
    { href: '/privacy', label: t('footer.legal.privacy') },
    { href: '/terms', label: t('footer.legal.terms') },
    { href: '/cookies', label: t('footer.legal.cookies') },
  ];

  return (
    <footer className="relative z-0 mt-16 border-t border-foreground/10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <PrimeDexLogo className="h-5 w-5" />
            <span className="text-xs text-muted-foreground">
              {t('home.footer_copyright', { year })}
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={localizedHref(link.href)}
                className="touch-target inline-flex items-center hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={localizedHref('/favorites')}
              aria-label={t('nav.favorites')}
              className="touch-target inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-[var(--action-favorite)]"
            >
              <Heart className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <nav
          aria-label={t('footer.legal.title')}
          className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
        >
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            {t('footer.legal.title')}
          </span>
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={localizedHref(link.href)}
              className="touch-target inline-flex items-center hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <ConsentPreferencesButton label={t('legal.banner.manage', { defaultValue: 'Manage preferences' })} />
        </nav>

        <p className="mt-6 max-w-[65ch] text-[11px] leading-relaxed text-muted-foreground">
          {t('footer.disclaimer.text')}
        </p>
      </div>
    </footer>
  );
}
