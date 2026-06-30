import Link from 'next/link';
import { Github, Heart } from 'lucide-react';

import { getServerT } from '@/lib/server-i18n';
import PrimeDexLogo from '@/components/ui/PrimeDexLogo';
import { GITHUB_REPO_URL } from '@/lib/site';

export default async function SiteFooter() {
  const t = await getServerT();
  const year = new Date().getFullYear();

  const navigationLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/team', label: t('nav.team') },
    { href: '/compare', label: t('nav.compare') },
    { href: '/tcg', label: t('nav.tcg') },
    { href: '/types', label: t('nav.types') },
    { href: '/moves', label: t('nav.moves') },
    { href: '/quiz', label: t('nav.quiz') },
    { href: '/favorites', label: t('nav.favorites') },
    { href: '/faq', label: t('nav.faq') },
    { href: '/ev-iv', label: t('nav.ev_iv') },
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
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/favorites"
              aria-label={t('nav.favorites')}
              className="text-muted-foreground transition-colors hover:text-[var(--action-favorite)]"
            >
              <Heart className="h-4 w-4" />
            </Link>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t('footer.resources.github')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
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
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 max-w-[65ch] text-[11px] leading-relaxed text-muted-foreground">
          {t('footer.disclaimer.text')}
        </p>
      </div>
    </footer>
  );
}
