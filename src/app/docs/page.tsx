import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Code2,
  Compass,
  Layers3,
  Swords,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE, localeHref } from '@/lib/seo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_NAME } from '@/lib/site';
import { isEditorialIndexable } from '@/lib/editorial';

const PAGE_PATH = '/docs';

type DocumentationLink = {
  href: string;
  label: string;
  plainAnchor?: boolean;
};

type DocumentationGroup = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  links: DocumentationLink[];
  guides?: DocumentationLink[];
  featured?: boolean;
};

const linkClassName = 'group flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-sm border border-border/60 bg-background/45 px-3 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('docs.meta_title');
  const description = t('docs.meta_description');
  const localizedPath = localeHref(PAGE_PATH, language);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: localizedPath,
      languages: buildSubpathLanguages(PAGE_PATH),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: localizedPath,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function DocumentationPage() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const editorialLinks = isEditorialIndexable(language);
  const groups: DocumentationGroup[] = [
    {
      id: 'pokemon',
      icon: Compass,
      title: t('docs.pokemon_title'),
      description: t('docs.pokemon_description'),
      links: [
        { href: '/pokedex', label: t('nav.pokedex') },
        { href: '/types', label: t('nav.types') },
        { href: '/moves', label: t('nav.moves') },
        { href: '/abilities', label: t('nav.abilities') },
        { href: '/items', label: t('nav.items') },
      ],
      guides: editorialLinks
        ? [{ href: '/guides/pokemon-reference-guide', label: t('docs.pokemon_reference_guide') }]
        : [],
    },
    {
      id: 'team-tools',
      icon: Swords,
      title: t('docs.team_title'),
      description: t('docs.team_description'),
      links: [
        { href: '/team', label: t('team.title') },
        { href: '/compare', label: t('nav.compare') },
        { href: '/ev-iv', label: t('ev_iv.title') },
        { href: '/breeding', label: t('breeding.title') },
        { href: '/battle', label: t('battle.meta_title') },
        { href: '/quiz', label: t('quiz.title') },
        { href: '/nuzlocke', label: t('nuzlocke.title') },
      ],
      guides: [
        { href: '/guides/team-builder-guide', label: t('docs.team_builder_guide') },
        { href: '/guides/quiz-guide', label: t('docs.quiz_guide') },
        { href: '/guides/nuzlocke-guide', label: t('docs.nuzlocke_guide') },
        ...(editorialLinks ? [{ href: '/guides/team-tools-guide', label: t('docs.team_tools_guide') }] : []),
      ],
    },
    {
      id: 'tcg-collection',
      icon: Layers3,
      title: t('docs.tcg_title'),
      description: t('docs.tcg_description'),
      links: [
        { href: '/tcg', label: t('nav.tcg') },
        { href: '/tcg/start', label: t('tcg.activation.start_title') },
        { href: '/tcg/collection', label: t('tcg.nav_collection') },
        { href: '/tcg/wishlist', label: t('tcg.nav_wishlist') },
        { href: '/tcg/deck-builder', label: t('tcg.nav_deck_builder') },
        { href: '/tcg/sealed', label: t('tcg.sealed.title') },
      ],
      guides: [
        { href: '/guides/pokemon-card-collection-tracker', label: t('docs.collection_tracker_guide') },
        ...(editorialLinks
          ? [
              { href: '/guides/organize-pokemon-card-collection', label: t('editorial.guides.organize_pokemon_card_collection.nav_label') },
              { href: '/guides/tcg-workspace-guide', label: t('docs.tcg_workspace_guide') },
              { href: '/guides/pokemon-card-collection-value', label: t('docs.collection_value_guide') },
            ]
          : []),
      ],
    },
    {
      id: 'progress-account',
      icon: BarChart3,
      title: t('docs.progress_title'),
      description: t('docs.progress_description'),
      links: [
        { href: '/dashboard', label: t('dashboard.title') },
        { href: '/favorites', label: t('nav.favorites') },
        { href: '/friends', label: t('friends.title') },
      ],
      guides: editorialLinks ? [
        { href: '/guides/progress-account-guide', label: t('docs.progress_account_guide') },
      ] : [],
    },
    {
      id: 'developers',
      icon: Code2,
      title: t('docs.developers_title'),
      description: t('docs.developers_description'),
      featured: true,
      links: [
        { href: '/docs/api', label: t('api_docs.nav_label') },
        { href: '/api/v1/openapi.json', label: t('api_docs.openapi_link'), plainAnchor: true },
      ],
    },
  ];

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('docs.nav_label'), path: PAGE_PATH },
  ], language);

  return (
    <div className="app-page">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <main className="relative z-10 pb-24 pt-8">
        <PageHeader
          icon={BookOpen}
          eyebrow={t('docs.nav_label')}
          title={t('docs.page_title')}
          description={t('docs.page_intro')}
        />

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-2 md:gap-5 lg:px-8">
          {groups.map(({ id, icon: Icon, title, description, links, guides, featured }) => (
            <section
              key={id}
              aria-labelledby={`docs-${id}-title`}
              className={`section-frame min-w-0 p-5 sm:p-6 ${featured ? 'md:col-span-2' : ''}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h2 id={`docs-${id}-title`} className="break-words text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                    {title}
                  </h2>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.1em] text-primary">
                    {t('docs.workflow_label')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              </div>

              <ul className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                {links.map(({ href, label, plainAnchor }) => (
                  <li key={href} className="min-w-0">
                    {plainAnchor ? (
                      <a href={href} className={linkClassName}>
                        <span className="min-w-0 break-words">{label}</span>
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4 flex-none text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </a>
                    ) : (
                      <Link href={localeHref(href, language)} className={linkClassName}>
                        <span className="min-w-0 break-words">{label}</span>
                        <ArrowUpRight aria-hidden="true" className="h-4 w-4 flex-none text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              {guides && guides.length > 0 ? (
                <div className="mt-5 border-t border-border/50 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    {t('docs.guides_label')}
                  </h3>
                  <ul className="mt-2 grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    {guides.map(({ href, label }) => (
                      <li key={href} className="min-w-0">
                        <Link
                          href={localeHref(href, language)}
                          className="flex min-h-10 min-w-0 items-center gap-2 rounded-sm text-sm font-semibold text-foreground/75 underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <BookOpen aria-hidden="true" className="h-4 w-4 flex-none text-primary" />
                          <span className="min-w-0 break-words">{label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <section
          aria-labelledby="docs-more-title"
          className="mx-auto mt-12 w-full max-w-7xl border-t border-border/70 px-4 pt-7 sm:px-6 lg:px-8"
        >
          <h2 id="docs-more-title" className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {t('docs.more_title')}
          </h2>
          <nav aria-label={t('docs.more_title')} className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href={localeHref('/faq', language)}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('nav.faq')}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href={localeHref('/blog', language)}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('nav.blog')}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}
