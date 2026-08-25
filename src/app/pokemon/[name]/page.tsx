import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { connection } from 'next/server';
import { getPokemonDetailCached as getPokemonDetail, getPokemonEncountersCached as getPokemonEncounters, getPokemonFormCached as getPokemonForm, getPokemonSpeciesCached as getPokemonSpecies, getLocalizedPokemonDataCached as getLocalizedPokemonData } from '@/lib/api/server-cache';
import { PokemonDetailClient } from './PokemonDetailClient';
import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { PokemonDetail, PokemonForm, PokemonSpecies, PokemonEncounter, LocalizedPokemonData } from '@/types/pokemon';
import { getBaseSpeciesName, getPokemonDisplayName } from '@/lib/form-names';
import { getServerLanguage, getServerPokemonLanguage, getServerT } from '@/lib/server-i18n';
import { languageToPokemonLanguageId, languageToMetadataLocale, supportedLanguages, type SupportedLanguage } from '@/lib/languages';
import { OG_SIZE } from '@/lib/og/theme';

// This route reads the locale from request headers/cookies and also accepts
// request search params, so it cannot be safely pre-rendered as ISR.
export const dynamicParams = true; // Allow dynamic params for non-static pages

const normalizeDescription = (value?: string | null) =>
  value?.replace(/\f/g, ' ').replace(/\s+/g, ' ').trim() || '';

type ResolvedSearchParams = { [key: string]: string | string[] | undefined };

const buildPokemonPath = (name: string, searchParams: ResolvedSearchParams) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    // Locale is encoded in the path. Keeping ?lang= would create a second
    // URL variant whose presentation language can contradict its canonical.
    if (key === 'lang') continue;
    if (typeof value === 'string') {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const queryString = query.toString();
  return `/pokemon/${name}${queryString ? `?${queryString}` : ''}`;
};

interface Props {
  params: Promise<{ name: string }>;
  searchParams: Promise<ResolvedSearchParams>;
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  await connection();
  const { name } = await params;
  const lang = await getServerLanguage();
  const speciesLangCode = await getServerPokemonLanguage();
  const t = await getServerT();
  try {
    const pokemon = await getPokemonDetail(name);
    const baseName = pokemon.species?.name || getBaseSpeciesName(name);
    const [species, form] = await Promise.all([
      getPokemonSpecies(baseName).catch(() => null),
      getPokemonForm(name).catch(() => null),
    ]);

    const langId = languageToPokemonLanguageId[lang];
    const localizedData = await getLocalizedPokemonData(name, langId).catch(() => null) as LocalizedPokemonData | null;

    const localizedName = species?.names?.find(n => n.language.name === speciesLangCode)?.name
      || species?.names?.find(n => n.language.name === lang)?.name
      || species?.names?.find(n => n.language.name === 'en')?.name
      || localizedData?.pokemon_v2_pokemonspeciesnames?.[0]?.name
      || baseName;
    const displayName = getPokemonDisplayName({ name, baseLocalizedName: localizedName, baseSpeciesName: baseName, lang, form });

    const dexNumber = `#${String(pokemon.id).padStart(3, '0')}`;
    const types = pokemon.types
      .map(({ type }) => t(`types.${type.name}`, { defaultValue: type.name }))
      .join(', ');
    const title = t('meta.pokemon_title', { name: displayName });
    const socialTitle = `${title} | Lunidex`;
    const seoDescription = normalizeDescription(
      t('meta.pokemon_description', { name: displayName, types })
    );

    const ogImageUrl = `/api/og/pokemon?name=${encodeURIComponent(name)}&lang=${lang}`;

    return {
      title,
      description: seoDescription,
      alternates: {
        canonical: `/${lang}/pokemon/${name}`,
        languages: {
          ...Object.fromEntries(
            supportedLanguages.map((locale: SupportedLanguage) => [locale, `/${locale}/pokemon/${name}`])
          ),
          'x-default': `/en/pokemon/${name}`,
        },
      },
      openGraph: {
        title: socialTitle,
        description: seoDescription,
        type: 'article',
        url: `/${lang}/pokemon/${name}`,
        locale: languageToMetadataLocale[lang],
        siteName: 'Lunidex',
        authors: ['Lunidex'],
        section: 'Pokédex',
        tags: [
          displayName,
          'Pokemon',
          'Pokedex',
          ...pokemon.types.map(t => t.type.name),
          'Lunidex',
          'Stats',
          'Abilities',
        ],
        images: [{ url: ogImageUrl, width: OG_SIZE.width, height: OG_SIZE.height, alt: `${displayName} — ${dexNumber}` }],
      },
      twitter: {
        card: 'summary_large_image',
        title: socialTitle,
        description: seoDescription,
        images: [ogImageUrl],
      },
      authors: [{ name: 'Lunidex', url: 'https://lunidex.app/about' }],
      creator: 'Lunidex',
      publisher: 'Lunidex',
      keywords: [
        displayName,
        'Pokemon',
        'Pokedex',
        ...pokemon.types.map(t => t.type.name),
        'Lunidex',
        'Stats',
        'Abilities'
      ],
      other: {
        'article:author': 'Lunidex',
        'article:section': 'Pokédex',
        'pokemon:dex': String(pokemon.id),
        'pokemon:generation': String(pokemon.id <= 151 ? 1 : pokemon.id <= 251 ? 2 : pokemon.id <= 386 ? 3 : pokemon.id <= 493 ? 4 : pokemon.id <= 649 ? 5 : pokemon.id <= 721 ? 6 : pokemon.id <= 809 ? 7 : pokemon.id <= 905 ? 8 : 9),
        'pokemon:types': pokemon.types.map(t => t.type.name).join(','),
        'citation_title': `${displayName} — Pokédex Entry | Lunidex`,
        'citation_publisher': 'Lunidex',
        'citation_author': 'Lunidex',
        'citation_language': lang,
        'DC.title': displayName,
        'DC.creator': 'Lunidex',
        'DC.subject': pokemon.types.map(t => t.type.name).join(', '),
        'DC.description': seoDescription,
        'DC.language': languageToMetadataLocale[lang],
        'DC.publisher': 'Lunidex',
        'DC.contributor': 'PokéAPI (https://pokeapi.co)',
        'DC.type': 'InteractiveResource',
      },
    };
  } catch {
    notFound();
  }
}

export default async function PokemonPage({ params, searchParams }: Props) {
  await connection();
  const { name } = await params;
  const sParams = await searchParams;
  const lang = await getServerLanguage();
  const t = await getServerT();
  const langId = languageToPokemonLanguageId[lang];

  let pokemon: PokemonDetail;
  let species: PokemonSpecies | null = null;
  let form: PokemonForm | null = null;
  let localized: LocalizedPokemonData | null = null;
  let encounters: PokemonEncounter[] = [];

  try {
    pokemon = await getPokemonDetail(name);
  } catch {
    notFound();
  }

  if (pokemon.name !== name) {
    permanentRedirect(buildPokemonPath(pokemon.name, sParams));
  }

  const baseName = pokemon.species?.name || getBaseSpeciesName(name);

  // Try species for the form name first, fall back to base name for mega/primal/ultra
  const [speciesData, localizedData, encountersData, formData] = await Promise.all([
    getPokemonSpecies(baseName).catch(() => null),
    getLocalizedPokemonData(name, langId).catch(() => null) as Promise<LocalizedPokemonData | null>,
    getPokemonEncounters(pokemon.id).catch(() => []),
    getPokemonForm(name).catch(() => null),
  ]);

  species = speciesData;
  localized = localizedData;
  encounters = encountersData;
  form = formData;

  const baseLocalizedName = localized?.pokemon_v2_pokemonspeciesnames?.[0]?.name
    || species?.names?.find((entry) => entry.language.name === lang)?.name
    || species?.names?.find((entry) => entry.language.name === 'en')?.name
    || baseName;
  const displayName = getPokemonDisplayName({ name, baseLocalizedName, baseSpeciesName: baseName, lang, form });

  return (
    <>
      <Header />
      <Breadcrumbs
        items={[
          { label: t('common.home', { defaultValue: 'Home' }), href: `/${lang}` },
          { label: t('list.pokemon', { defaultValue: 'Pokémon' }), href: `/${lang}/pokedex` },
          { label: displayName },
        ]}
        homeLabel={t('common.home', { defaultValue: 'Home' })}
      />
      <PokemonDetailClient
        initialPokemon={pokemon}
        initialSpecies={species}
        initialForm={form}
        initialLocalized={localized}
        initialEncounters={encounters}
        initialSeoDescription={normalizeDescription(
          t('meta.pokemon_description', {
            name: displayName,
            types: pokemon.types
              .map(({ type }) => t(`types.${type.name}`, { defaultValue: type.name }))
              .join(', '),
          })
        )}
      />
    </>
  );
}
