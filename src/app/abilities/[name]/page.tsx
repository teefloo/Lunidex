import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, Sparkles, Users } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Badge } from '@/components/ui/badge';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { getAbilityDetail } from '@/lib/api/rest';
import { getAbilityPokemon } from '@/lib/api/graphql';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { TYPE_COLORS } from '@/types/pokemon';
import { formatName } from '@/lib/utils';
import { buildBreadcrumbJsonLd, buildDefinedTermJsonLd, buildSubpathLanguages, buildWebPageJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';

export const revalidate = 86400;
export const dynamicParams = true;

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const t = await getServerT();
  const lang = await getServerLanguage();
  const displayName = formatName(name);

  try {
    const ability = await getAbilityDetail(name);
    const localizedName = ability.names.find((n) => n.language.name === lang)?.name
      || ability.names.find((n) => n.language.name === 'en')?.name
      || displayName;
    const description = ability.effect_entries.find((e) => e.language.name === lang)?.short_effect
      || ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect
      || t('abilities_page.subtitle', { defaultValue: `Details about the ${displayName} ability.` });

    return {
      title: `${localizedName} — Ability`,
      description,
      alternates: {
        canonical: `/${lang}/abilities/${name}`,
        languages: buildSubpathLanguages(`/abilities/${name}`),
      },
      openGraph: {
        title: `${localizedName} — Ability`,
        description,
        url: `/${lang}/abilities/${name}`,
        type: 'website',
        images: [DEFAULT_OG_IMAGE],
      },
    };
  } catch {
    notFound();
  }
}

export default async function AbilityDetailPage({ params }: Props) {
  const { name } = await params;
  const t = await getServerT();
  const lang = await getServerLanguage();
  const langId = languageToPokemonLanguageId[lang];

  let ability;
  try {
    ability = await getAbilityDetail(name);
  } catch {
    notFound();
  }

  const displayName = formatName(name);
  const localizedName = ability.names.find((n) => n.language.name === lang)?.name
    || ability.names.find((n) => n.language.name === 'en')?.name
    || displayName;

  const effectEntry = ability.effect_entries.find((e) => e.language.name === lang)
    || ability.effect_entries.find((e) => e.language.name === 'en');
  const flavorEntry = ability.flavor_text_entries.find((e) => e.language.name === lang)
    || ability.flavor_text_entries.find((e) => e.language.name === 'en');
  const effectDescription = (effectEntry?.effect?.replace(/\n|\f/g, ' ').trim()
    || effectEntry?.short_effect?.replace(/\n|\f/g, ' ').trim()
    || t('detail.no_ability_desc'));

  const learners = await getAbilityPokemon(name, langId).catch(() => []);
  const routePath = `/${lang}/abilities/${name}`;
  const abilityTermJsonLd = buildDefinedTermJsonLd({
    lang,
    path: routePath,
    name: localizedName,
    description: effectDescription,
    identifier: ability.id,
    setName: t('abilities_page.title', { defaultValue: 'Abilities' }),
    setPath: '/abilities',
    additionalProperty: [
      { name: 'Main series', value: ability.is_main_series },
      { name: 'Pokémon using ability', value: learners.length },
    ],
  });
  const abilityWebPageJsonLd = {
    ...buildWebPageJsonLd({
      lang,
      path: routePath,
      name: `${localizedName} — ${t('abilities_page.title', { defaultValue: 'Ability' })}`,
      description: effectDescription,
      keywords: `${localizedName}, Pokémon ability, Pokémon abilities`,
    }),
    about: { '@id': `${SITE_URL}${routePath}#term` },
    mainEntity: { '@id': `${SITE_URL}${routePath}#term` },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: t('abilities_page.title', { defaultValue: 'Abilities' }), path: '/abilities' },
    { name: localizedName, path: `/abilities/${name}` },
  ], lang);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({ '@graph': [abilityWebPageJsonLd, abilityTermJsonLd, breadcrumbJsonLd] }),
        }}
      />
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_86%)] opacity-80" />
      </div>

      <Header />
      <Breadcrumbs
        items={[
          { label: t('common.home', { defaultValue: 'Home' }), href: `/${lang}` },
          { label: t('abilities_page.title', { defaultValue: 'Abilities' }), href: `/${lang}/abilities` },
          { label: localizedName },
        ]}
        homeLabel={t('common.home', { defaultValue: 'Home' })}
      />

      <main className="page-shell pb-20 pt-8">
        <div className="mb-6">
          <Link
            href={`/${lang}/abilities`}
            className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-card/50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/55 transition-all hover:border-border/90 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('abilities_page.back_to_abilities', { defaultValue: 'Back to Abilities' })}
          </Link>
        </div>

        <div className="relative mb-8 overflow-hidden rounded-sm border border-border/70 bg-card/50 p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/30">
                #{String(ability.id).padStart(3, '0')}
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                {localizedName}
              </h1>
              {ability.is_main_series && (
                <Badge variant="outline" className="mt-3 border-border/70 text-foreground/60">
                  {t('abilities_page.main_series')}
                </Badge>
              )}
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-sm border border-border/70 bg-card/35 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('abilities_page.effect')}
                </h2>
              </div>
              <p className="text-sm leading-7 text-foreground/70">
                {effectDescription}
              </p>
            </section>

            {flavorEntry && (
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('abilities_page.flavor_text')}
                  </h2>
                </div>
                <p className="text-sm italic leading-7 text-foreground/55">
                  &ldquo;{flavorEntry.flavor_text.replace(/\n|\f/g, ' ').trim()}&rdquo;
                </p>
              </section>
            )}

            {learners.length > 0 && (
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('abilities_page.pokemon_with_ability')} ({learners.length})
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {learners.slice(0, 60).map((learner) => {
                    const pokemon = learner.pokemon_v2_pokemon;
                    if (!pokemon) return null;
                    const mainType = pokemon.pokemon_v2_pokemontypes?.[0]?.pokemon_v2_type?.name;
                    const color = mainType ? TYPE_COLORS[mainType] : '#6B7280';
                    const pokemonName = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames?.[0]?.name
                      || formatName(pokemon.name);
                    return (
                      <Link
                        key={pokemon.id}
                        href={`/${lang}/pokemon/${pokemon.name}`}
                        className="flex items-center gap-2 rounded-sm border border-border/60 bg-background/40 px-2.5 py-2 text-xs font-bold text-foreground/70 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      >
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                        <span className="truncate">{pokemonName}</span>
                        {learner.is_hidden && (
                          <span className="ml-auto shrink-0 text-[11px] font-black uppercase tracking-wider text-foreground/30">H</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-border/70 bg-card/35 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('abilities_page.pokemon_with_ability')}
                </h2>
              </div>
              <dl className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/35">
                    {t('list.pokemon')}
                  </dt>
                  <dd className="text-sm font-bold">{learners.length}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
      </div>
    </>
  );
}
