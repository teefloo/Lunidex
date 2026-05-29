import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllPokemonNames, getPokemonDetail, getPokemonSpecies, getLocalizedPokemonData, getPokemonEncounters } from '@/lib/api';
import { PokemonDetailClient } from './PokemonDetailClient';
import Header from '@/components/layout/Header';
import { PokemonDetail, PokemonSpecies, PokemonEncounter, LocalizedPokemonData } from '@/types/pokemon';
import { getBaseSpeciesName } from '@/lib/form-names';
import { formatPokemonSlugName } from '@/lib/utils';

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
  const lang = (sParams.lang as string) || 'en';
  const baseName = getBaseSpeciesName(name);
  
  try {
    const [pokemon, species] = await Promise.all([
      getPokemonDetail(name),
      getPokemonSpecies(baseName).catch(() => null),
    ]);
    
    // lang ID 5 is French, 9 is English in PokeAPI GraphQL
    const langId = lang === 'fr' ? 5 : 9;
    const localizedData = await getLocalizedPokemonData(name, langId).catch(() => null) as LocalizedPokemonData | null;
    
    const localizedName = localizedData?.pokemon_v2_pokemonspeciesnames?.[0]?.name
      || species?.names?.find(n => n.language.name === lang)?.name
      || species?.names?.find(n => n.language.name === 'en')?.name
      || baseName;
    const displayName = name.includes('-') ? formatPokemonSlugName(name) : localizedName;
    const flavorTexts = localizedData?.pokemon_v2_pokemonspeciesflavortexts || [];
    const description = normalizeDescription(flavorTexts[0]?.flavor_text);

    const title = `${displayName} | PrimeDex`;
    const seoDescription = description || `Detailed information about ${displayName}, including stats, abilities, types, and evolutions.`;

    const image = pokemon.sprites.other?.['official-artwork'].front_default || pokemon.sprites.front_default;

    return {
      title,
      description: seoDescription,
      openGraph: {
        title,
        description: seoDescription,
        type: 'website',
        images: [
          {
            url: image,
            width: 475,
            height: 475,
            alt: displayName,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: seoDescription,
        images: [image],
      },
      keywords: [
        displayName, 
        'Pokemon', 
        'Pokedex', 
        ...pokemon.types.map(t => t.type.name),
        'PrimeDex',
        'Stats',
        'Abilities'
      ],
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
  const lang = (sParams.lang as string) || 'en';
  const langId = lang === 'fr' ? 5 : 9;

  // For alternate forms, derive the base species name
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

  const baseLocalizedName = localized?.pokemon_v2_pokemonspeciesnames?.[0]?.name
    || species?.names?.find(n => n.language.name === lang)?.name
    || species?.names?.find(n => n.language.name === 'en')?.name
    || baseName;
  const displayName = name.includes('-') ? formatPokemonSlugName(name) : baseLocalizedName;

  // JSON-LD structured data for Pokemon
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    name: displayName,
    description: normalizeDescription(localized?.pokemon_v2_pokemonspeciesflavortexts?.[0]?.flavor_text) || `Stats and details for ${displayName}`,
    image: pokemon.sprites.other?.['official-artwork'].front_default || pokemon.sprites.front_default,
    url: `/pokemon/${name}`,
    sku: pokemon.id.toString(),
    brand: {
      '@type': 'Brand',
      name: 'Pokémon',
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Height',
        value: `${pokemon.height / 10} m`,
      },
      {
        '@type': 'PropertyValue',
        name: 'Weight',
        value: `${pokemon.weight / 10} kg`,
      },
      ...pokemon.stats.map(s => ({
        '@type': 'PropertyValue',
        name: s.stat.name,
        value: s.base_stat
      }))
    ],
  };

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PokemonDetailClient 
        initialPokemon={pokemon} 
        initialSpecies={species} 
        initialLocalized={localized}
        initialEncounters={encounters}
      />
    </>
  );
}
