import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllPokemonNames, getPokemonDetail, getPokemonSpecies, getLocalizedPokemonData, getPokemonEncounters } from '@/lib/api';
import { PokemonDetailClient } from './PokemonDetailClient';
import Header from '@/components/layout/Header';
import { PokemonDetail, PokemonSpecies, PokemonEncounter, LocalizedPokemonData } from '@/types/pokemon';
import { getBaseSpeciesName } from '@/lib/form-names';
import { formatPokemonSlugName } from '@/lib/utils';
import { getServerLanguage, getServerPokemonLanguage } from '@/lib/server-i18n';
import { languageToPokemonLanguageId, isSupportedLanguage, languageToMetadataLocale, supportedLanguages, type SupportedLanguage } from '@/lib/languages';
import { OG_SIZE } from '@/lib/og/theme';

// Route segment config for performance optimization
export const revalidate = 3600; // Revalidate every hour
export const dynamicParams = true; // Allow dynamic params for non-static pages

const normalizeDescription = (value?: string | null) =>
  value?.replace(/\f/g, ' ').replace(/\s+/g, ' ').trim() || '';

type ResolvedSearchParams = { [key: string]: string | string[] | undefined };

const buildPokemonPath = (name: string, searchParams: ResolvedSearchParams) => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
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
  { params, searchParams }: Props
): Promise<Metadata> {
  const { name } = await params;
  const sParams = await searchParams;
  const urlLang = isSupportedLanguage((sParams.lang as string) ?? '') ? (sParams.lang as SupportedLanguage) : null;
  const cookieLang = await getServerLanguage();
  const lang: SupportedLanguage = urlLang ?? cookieLang;
  const speciesLangCode = await getServerPokemonLanguage();
  const baseName = getBaseSpeciesName(name);

  try {
    const [pokemon, species] = await Promise.all([
      getPokemonDetail(name),
      getPokemonSpecies(baseName).catch(() => null),
    ]);

    const langId = languageToPokemonLanguageId[lang];
    const localizedData = await getLocalizedPokemonData(name, langId).catch(() => null) as LocalizedPokemonData | null;

    const localizedName = localizedData?.pokemon_v2_pokemonspeciesnames?.[0]?.name
      || species?.names?.find(n => n.language.name === speciesLangCode)?.name
      || species?.names?.find(n => n.language.name === lang)?.name
      || species?.names?.find(n => n.language.name === 'en')?.name
      || baseName;
    const displayName = name.includes('-') ? formatPokemonSlugName(name) : localizedName;
    const flavorTexts = localizedData?.pokemon_v2_pokemonspeciesflavortexts || [];
    const description = normalizeDescription(flavorTexts[0]?.flavor_text);

    const dexNumber = `#${String(pokemon.id).padStart(3, '0')}`;
    const title = `${displayName} | PrimeDex`;
    const seoDescription = description || `Detailed information about ${displayName}, including stats, abilities, types, and evolutions.`;

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
        title,
        description: seoDescription,
        type: 'article',
        url: `/${lang}/pokemon/${name}`,
        locale: languageToMetadataLocale[lang],
        siteName: 'PrimeDex',
        publishedTime: '2024-01-15T00:00:00Z',
        modifiedTime: new Date().toISOString(),
        authors: ['PrimeDex'],
        section: 'Pokédex',
        tags: [
          displayName,
          'Pokemon',
          'Pokedex',
          ...pokemon.types.map(t => t.type.name),
          'PrimeDex',
          'Stats',
          'Abilities',
        ],
        images: [{ url: ogImageUrl, width: OG_SIZE.width, height: OG_SIZE.height, alt: `${displayName} — ${dexNumber}` }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: seoDescription,
        images: [ogImageUrl],
      },
      authors: [{ name: 'PrimeDex', url: 'https://primedex.vercel.app/about' }],
      creator: 'PrimeDex',
      publisher: 'PrimeDex',
      keywords: [
        displayName,
        'Pokemon',
        'Pokedex',
        ...pokemon.types.map(t => t.type.name),
        'PrimeDex',
        'Stats',
        'Abilities'
      ],
      other: {
        'article:published_time': '2024-01-15T00:00:00Z',
        'article:modified_time': new Date().toISOString(),
        'article:author': 'PrimeDex',
        'article:section': 'Pokédex',
        'pokemon:dex': String(pokemon.id),
        'pokemon:generation': String(pokemon.id <= 151 ? 1 : pokemon.id <= 251 ? 2 : pokemon.id <= 386 ? 3 : pokemon.id <= 493 ? 4 : pokemon.id <= 649 ? 5 : pokemon.id <= 721 ? 6 : pokemon.id <= 809 ? 7 : pokemon.id <= 905 ? 8 : 9),
        'pokemon:types': pokemon.types.map(t => t.type.name).join(','),
        'citation_title': `${displayName} — Pokédex Entry | PrimeDex`,
        'citation_publisher': 'PrimeDex',
        'citation_author': 'PrimeDex',
        'citation_language': lang,
        'citation_release_date': '2024-01-15',
        'citation_online_date': '2026-06-04',
        'DC.title': displayName,
        'DC.creator': 'PrimeDex',
        'DC.subject': pokemon.types.map(t => t.type.name).join(', '),
        'DC.description': seoDescription,
        'DC.language': languageToMetadataLocale[lang],
        'DC.publisher': 'PrimeDex',
        'DC.contributor': 'PokéAPI (https://pokeapi.co)',
        'DC.date': new Date().toISOString(),
        'DC.type': 'InteractiveResource',
      },
    };
  } catch {
    return {
      title: 'Pokemon Not Found | PrimeDex',
    };
  }
}

export async function generateStaticParams() {
  // Pre-render first 151 pokemons for better SEO and performance
  const pokemonList = await getAllPokemonNames();
  return pokemonList.slice(0, 151).map((pokemon) => ({
    name: pokemon.name,
  }));
}

export default async function PokemonPage({ params, searchParams }: Props) {
  const { name } = await params;
  const sParams = await searchParams;
  const urlLang = isSupportedLanguage((sParams.lang as string) ?? '') ? (sParams.lang as SupportedLanguage) : null;
  const cookieLang = await getServerLanguage();
  const lang: SupportedLanguage = urlLang ?? cookieLang;
  const langId = languageToPokemonLanguageId[lang];

  const baseName = getBaseSpeciesName(name);

  let pokemon: PokemonDetail;
  let species: PokemonSpecies | null = null;
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

  // Try species for the form name first, fall back to base name for mega/primal/ultra
  const [speciesData, localizedData, encountersData] = await Promise.all([
    getPokemonSpecies(baseName).catch(() => null),
    getLocalizedPokemonData(name, langId).catch(() => null) as Promise<LocalizedPokemonData | null>,
    getPokemonEncounters(pokemon.id).catch(() => []),
  ]);

  species = speciesData;
  localized = localizedData;
  encounters = encountersData;

  return (
    <>
      <Header />
      <PokemonDetailClient
        initialPokemon={pokemon}
        initialSpecies={species}
        initialLocalized={localized}
        initialEncounters={encounters}
      />
    </>
  );
}
