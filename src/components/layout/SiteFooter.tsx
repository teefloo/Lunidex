import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  Compass,
  Database,
  Github,
  LifeBuoy,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ConsentPreferencesButton } from '@/components/layout/ConsentPreferencesButton';
import LunidexLogo from '@/components/ui/LunidexLogo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { cn } from '@/lib/utils';
import { GITHUB_REPO_URL, SITE_NAME } from '@/lib/site';

interface FooterLinkData {
  href: string;
  label: string;
  external?: boolean;
  icon?: LucideIcon;
}

interface FooterLinkProps {
  link: FooterLinkData;
  localize: (href: string) => string;
}

interface FooterLinkGroupProps {
  id: string;
  icon: LucideIcon;
  links: FooterLinkData[];
  localize: (href: string) => string;
  title: string;
  className?: string;
  listClassName?: string;
}

const footerLinkClassName = 'site-footer__link group/footer-link';

function FooterLink({ link, localize }: FooterLinkProps) {
  const LeadingIcon = link.icon;
  const content = (
    <>
      {LeadingIcon ? <LeadingIcon aria-hidden="true" className="site-footer__link-leading-icon h-4 w-4" /> : null}
      <span className="site-footer__link-label">{link.label}</span>
      {link.external ? (
        <ArrowUpRight
          aria-hidden="true"
          className="site-footer__link-icon h-3.5 w-3.5 transition-transform group-hover/footer-link:-translate-y-0.5 group-hover/footer-link:translate-x-0.5"
        />
      ) : null}
    </>
  );

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={footerLinkClassName}>
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

function FooterLinkGroup({
  id,
  icon: Icon,
  links,
  localize,
  title,
  className,
  listClassName,
}: FooterLinkGroupProps) {
  return (
    <nav className={cn('site-footer__link-group', className)} aria-labelledby={id}>
      <h2 id={id} className="site-footer__group-title">
        <Icon aria-hidden="true" className="site-footer__group-icon h-4 w-4" />
        <span>{title}</span>
      </h2>
      <ul className={cn('site-footer__link-list', listClassName)}>
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
    { href: '/dashboard', label: t('footer.navigation.dashboard') },
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
  ];

  const resourceLinks: FooterLinkData[] = [
    { href: 'https://pokeapi.co', label: t('footer.resources.pokeapi'), external: true },
    { href: 'https://tcgdex.net', label: t('footer.resources.tcgdex'), external: true },
  ];

  const legalLinks: FooterLinkData[] = [
    { href: '/legal', label: t('footer.legal.legal_notice') },
    { href: '/privacy', label: t('footer.legal.privacy') },
    { href: '/terms', label: t('footer.legal.terms') },
    { href: '/cookies', label: t('footer.legal.cookies') },
  ];

  return (
    <footer
      className="site-footer"
      aria-label={t('footer.navigation.title', { defaultValue: 'Footer navigation' })}
    >
      <div className="site-footer__inner">
        <div className="site-footer__masthead">
          <div className="site-footer__identity">
            <Link
              href={localizedHref('/')}
              prefetch={false}
              aria-label={SITE_NAME}
              className="site-footer__brand-link group"
            >
              <span className="site-footer__brand-mark">
                <LunidexLogo alt="" sizes="52px" className="h-11 w-11 object-contain" />
              </span>
              <span className="site-footer__wordmark" aria-hidden="true" translate="no">
                <span className="site-footer__wordmark-primary">Luni</span>
                <span className="site-footer__wordmark-secondary">dex</span>
              </span>
            </Link>

            <p className="site-footer__brand-description">
              {t('footer.brand.description', {
                defaultValue: 'Your Pokémon companion for discovering, building, and collecting.',
              })}
            </p>
          </div>

          <div className="site-footer__launch">
            <div>
              <div className="site-footer__launch-heading">
                <Compass aria-hidden="true" className="h-5 w-5" />
                <h2 id="footer-launch-title">{t('footer.navigation.pokedex')}</h2>
              </div>
              <p className="site-footer__launch-copy">
                {t('footer.brand.mission', { defaultValue: 'Mission: Complete the Pokédex' })}
              </p>
            </div>

            <div className="site-footer__launch-actions">
              <Link
                href={localizedHref('/pokedex')}
                prefetch={false}
                className="site-footer__launch-action site-footer__launch-action--primary"
              >
                <span>{t('footer.navigation.pokedex')}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer__launch-action"
              >
                <Github aria-hidden="true" className="h-4 w-4" />
                <span>{t('footer.resources.github')}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="site-footer__directory">
          <FooterLinkGroup
            id="footer-explore-title"
            title={t('footer.groups.explorer', { defaultValue: t('footer.navigation.title') })}
            icon={Compass}
            links={explorerLinks}
            localize={localizedHref}
            className="site-footer__directory-primary"
            listClassName="site-footer__primary-links"
          />

          <div className="site-footer__directory-rail">
            <FooterLinkGroup
              id="footer-guides-title"
              title={t('footer.groups.guides', { defaultValue: t('footer.resources.title') })}
              icon={BookOpen}
              links={guideLinks}
              localize={localizedHref}
            />
            <FooterLinkGroup
              id="footer-support-title"
              title={t('footer.groups.about_support', { defaultValue: t('footer.community.title') })}
              icon={LifeBuoy}
              links={supportLinks}
              localize={localizedHref}
            />
          </div>
        </div>

        <div className="site-footer__details">
          <div className="site-footer__disclaimer">
            <ShieldCheck aria-hidden="true" className="site-footer__disclaimer-icon h-4 w-4" />
            <p>
              <span className="site-footer__disclaimer-title">{t('footer.disclaimer.title')}</span>{' '}
              {t('footer.disclaimer.text', {
                defaultValue: 'Lunidex is an independent, unofficial Pokémon project.',
              })}
            </p>
          </div>

          <nav className="site-footer__sources" aria-labelledby="footer-sources-title">
            <h2 id="footer-sources-title" className="site-footer__group-title">
              <Database aria-hidden="true" className="site-footer__group-icon h-4 w-4" />
              <span>{t('footer.resources.title')}</span>
            </h2>
            <ul className="site-footer__source-list">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink link={link} localize={localizedHref} />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="site-footer__base">
          <p className="site-footer__copyright">{t('home.footer_copyright', { year })}</p>

          <nav aria-label={t('footer.legal.title')}>
            <ul className="site-footer__legal-list">
              <li className="site-footer__legal-label">{t('footer.legal.title')}</li>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <FooterLink link={link} localize={localizedHref} />
                </li>
              ))}
              <li>
                <ConsentPreferencesButton
                  label={t('legal.banner.manage', { defaultValue: 'Manage preferences' })}
                  className="site-footer__link site-footer__link--compact"
                />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
