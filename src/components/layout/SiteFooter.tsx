import Link from 'next/link';
import { ArrowUpRight, Compass, Github, ShieldCheck } from 'lucide-react';

import { ConsentPreferencesButton } from '@/components/layout/ConsentPreferencesButton';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { GITHUB_REPO_URL, SITE_NAME } from '@/lib/site';

interface FooterLinkData {
  href: string;
  label: string;
  external?: boolean;
}

interface FooterLinkProps {
  link: FooterLinkData;
  localize: (href: string) => string;
}

interface FooterLinkGroupProps {
  id: string;
  links: FooterLinkData[];
  localize: (href: string) => string;
  title: string;
}

const footerLinkClassName =
  'group/footer-link inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-muted-foreground transition-[color,background-color] hover:bg-muted/45 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

function FooterLink({ link, localize }: FooterLinkProps) {
  const content = (
    <>
      <span>{link.label}</span>
      {link.external ? (
        <ArrowUpRight
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform group-hover/footer-link:-translate-y-0.5 group-hover/footer-link:translate-x-0.5"
        />
      ) : null}
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={footerLinkClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={localize(link.href)} prefetch={false} className={footerLinkClassName}>
      {content}
    </Link>
  );
}

function FooterLinkGroup({ id, links, localize, title }: FooterLinkGroupProps) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="px-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/55">
        {title}
      </h2>
      <ul className="mt-3 space-y-0.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <FooterLink link={link} localize={localize} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function SiteFooter() {
  const t = await getServerT();
  const language = await getServerLanguage();
  const localizedHref = (href: string) => `/${language}${href}`;
  const year = new Date().getFullYear();

  const explorerLinks: FooterLinkData[] = [
    { href: '/pokedex', label: t('footer.navigation.pokedex') },
    { href: '/types', label: t('footer.navigation.types') },
    { href: '/team', label: t('footer.navigation.team_builder') },
    { href: '/tcg', label: t('footer.navigation.tcg') },
    { href: '/tcg/collection', label: t('tcg.nav_collection') },
    { href: '/quiz', label: t('footer.navigation.quiz') },
    { href: '/favorites', label: t('nav.favorites') },
  ];

  const guideLinks: FooterLinkData[] = [
    { href: '/blog', label: t('nav.blog') },
    { href: '/guides/pokemon-card-collection-tracker', label: t('collection_guide.nav_label') },
    { href: '/guides/team-builder-guide', label: t('team_guide.nav_label', { defaultValue: 'Team building guide' }) },
    { href: '/guides/quiz-guide', label: t('quiz_guide.nav_label', { defaultValue: 'Quiz guide' }) },
    { href: '/guides/nuzlocke-guide', label: t('nuzlocke_guide.nav_label', { defaultValue: 'Nuzlocke guide' }) },
    { href: '/compare/lunidex-vs-pokecardex-zebradex', label: t('comparison.nav_label') },
  ];

  const supportLinks: FooterLinkData[] = [
    { href: '/faq', label: t('nav.faq', { defaultValue: 'FAQ' }) },
    { href: '/about', label: t('about.title', { defaultValue: 'About Lunidex' }) },
    { href: '/contact', label: t('contact.title', { defaultValue: 'Contact' }) },
    { href: '/dashboard', label: t('footer.navigation.dashboard') },
    { href: GITHUB_REPO_URL, label: t('footer.community.github_repo'), external: true },
  ];

  const legalLinks: FooterLinkData[] = [
    { href: '/legal', label: t('footer.legal.legal_notice') },
    { href: '/privacy', label: t('footer.legal.privacy') },
    { href: '/terms', label: t('footer.legal.terms') },
    { href: '/cookies', label: t('footer.legal.cookies') },
  ];

  return (
    <footer
      className="site-footer relative z-0 mt-20 overflow-hidden border-t border-border/50 bg-card/20"
      aria-label={t('footer.navigation.title', { defaultValue: 'Footer navigation' })}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-x-10 gap-y-11 border-b border-border/50 pb-11 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <Link
              href={localizedHref('/')}
              prefetch={false}
              aria-label={SITE_NAME}
              className="group touch-target inline-flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                <LunidexLogo alt="" sizes="44px" className="h-11 w-11 object-contain" />
              </span>
              <span className="flex items-baseline leading-none tracking-tight">
                <span className="font-display text-2xl font-extrabold gradient-text-hero">Luni</span>
                <span className="font-display text-2xl font-medium italic editorial-italic text-foreground">dex</span>
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-sm font-semibold leading-relaxed text-foreground/85">
              {t('footer.brand.description', {
                defaultValue: 'Your Pokémon companion for discovering, building, and collecting.',
              })}
            </p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {t('footer.brand.mission', { defaultValue: 'Mission: Complete the Pokédex' })}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={localizedHref('/pokedex')}
                prefetch={false}
                className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Compass aria-hidden="true" className="h-4 w-4" />
                {t('footer.navigation.pokedex')}
              </Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="touch-target inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border border-border/70 bg-background/25 px-4 text-sm font-bold text-foreground/80 transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-primary/45 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Github aria-hidden="true" className="h-4 w-4" />
                {t('footer.resources.github')}
              </a>
            </div>
          </div>

          <FooterLinkGroup
            id="footer-explorer-title"
            title={t('footer.groups.explorer', { defaultValue: t('footer.navigation.title') })}
            links={explorerLinks}
            localize={localizedHref}
          />
          <FooterLinkGroup
            id="footer-guides-title"
            title={t('footer.groups.guides', { defaultValue: 'Guides' })}
            links={guideLinks}
            localize={localizedHref}
          />
          <FooterLinkGroup
            id="footer-support-title"
            title={t('footer.groups.about_support', { defaultValue: t('footer.community.title') })}
            links={supportLinks}
            localize={localizedHref}
          />
        </div>

        <div className="flex flex-col gap-4 border-b border-border/50 py-7 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-foreground/60">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
              {t('footer.disclaimer.title', { defaultValue: 'Disclaimer' })}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('footer.disclaimer.text', { defaultValue: 'Lunidex is an independent, unofficial Pokémon project.' })}
            </p>
          </div>
          <p className="shrink-0 text-xs font-semibold text-foreground/60 sm:pt-1">
            {t('footer.brand.mission', { defaultValue: 'Mission: Complete the Pokédex' })}
          </p>
        </div>

        <div className="flex flex-col gap-5 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t('home.footer_copyright', { year })}</p>

          <nav aria-label={t('footer.legal.title')}>
            <ul className="flex flex-wrap items-center gap-x-1 gap-y-1">
              <li className="mr-2 font-semibold uppercase tracking-[0.14em] text-foreground/55">
                {t('footer.legal.title')}
              </li>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink link={link} localize={localizedHref} />
                </li>
              ))}
              <li>
                <ConsentPreferencesButton label={t('legal.banner.manage', { defaultValue: 'Manage preferences' })} />
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border/35 pt-5 text-[11px] text-muted-foreground/80 sm:flex-row sm:items-center sm:gap-4">
          <span className="font-semibold uppercase tracking-[0.14em] text-foreground/45">
            {t('footer.resources.title')}
          </span>
          <ul className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <li>
              <a
                href="https://pokeapi.co"
                target="_blank"
                rel="noreferrer"
                className={footerLinkClassName}
              >
                {t('footer.resources.pokeapi')}
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <a
                href="https://tcgdex.net"
                target="_blank"
                rel="noreferrer"
                className={footerLinkClassName}
              >
                {t('footer.resources.tcgdex')}
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
