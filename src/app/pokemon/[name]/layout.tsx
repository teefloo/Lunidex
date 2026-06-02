import { Metadata } from 'next';
import { getPokemonDetail, getPokemonSpecies } from '@/lib/api';
import { getServerT, getServerPokemonLanguage, getServerLanguage } from '@/lib/server-i18n';
import { getBaseSpeciesName } from '@/lib/form-names';
import { formatPokemonSlugName } from '@/lib/utils';
import { SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = (await params).name;
  const t = await getServerT();
  const lang = await getServerLanguage();
  const speciesLangCode = await getServerPokemonLanguage();
  try {
    const baseName = getBaseSpeciesName(name);
    const [pokemon, species] = await Promise.all([
      getPokemonDetail(name),
      getPokemonSpecies(baseName).catch(() => null),
    ]);
    const baseLocalizedName = species?.names?.find((entry) => entry.language.name === speciesLangCode)?.name
      || species?.names?.find((entry) => entry.language.name === 'en')?.name
      || baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const displayName = name.includes('-') ? formatPokemonSlugName(name) : baseLocalizedName;
    const types = pokemon.types
      .map((type) => t(`types.${type.type.name}`, { defaultValue: type.type.name }))
      .join(', ');
    const artwork = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;

    const title = t('meta.pokemon_title', { name: displayName });
    const description = t('meta.pokemon_description', { name: displayName, types });

    return {
      title,
      description,
      alternates: {
        canonical: `/pokemon/${name}`,
      },
      openGraph: {
        title,
        description,
        url: `/pokemon/${name}`,
        images: [{ url: artwork || '', width: 475, height: 475, alt: `${displayName} official artwork` }],
        type: 'article',
        locale: lang,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [artwork || ''],
      },
      keywords: [
        displayName.toLowerCase(),
        `${displayName.toLowerCase()} stats`,
        `${displayName.toLowerCase()} evolution`,
        `${displayName.toLowerCase()} moveset`,
        `${displayName.toLowerCase()} weakness`,
        `${displayName.toLowerCase()} builds`,
        ...pokemon.types.map((typeItem: { type: { name: string } }) => `${typeItem.type.name} type pokemon`),
        'pokemon', 'pokedex',
      ],
    };
  } catch {
    return {
      title: t('meta.pokemon_fallback_title'),
    };
  }
}

export default async function PokemonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const speciesLangCode = await getServerPokemonLanguage();
  const baseUrl = SITE_URL;
  let jsonLd = null;
  let breadcrumbJsonLd = null;

  try {
    const baseName = getBaseSpeciesName(name);
    const [pokemon, species] = await Promise.all([
      getPokemonDetail(name),
      getPokemonSpecies(baseName).catch(() => null),
    ]);
    const baseLocalizedName = species?.names?.find((entry) => entry.language.name === speciesLangCode)?.name
      || species?.names?.find((entry) => entry.language.name === 'en')?.name
      || baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const displayName = name.includes('-') ? formatPokemonSlugName(name) : baseLocalizedName;
    const imageUrl = pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default;
    const totalStats = pokemon.stats.reduce((sum: number, s: { base_stat: number }) => sum + s.base_stat, 0);
    const typesArr = pokemon.types.map((typeItem: { type: { name: string } }) => typeItem.type.name);

    jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${displayName} — Complete Pokémon Guide`,
      headline: `${displayName} — Stats, Evolutions, Moves & Builds`,
      description: `Comprehensive data for ${displayName}: base stat total of ${totalStats}, ${typesArr.join('/')} type. Full evolution chain, competitive builds, moveset analysis, abilities, and TCG cards.`,
      url: `${baseUrl}/pokemon/${name}`,
      primaryImageOfPage: imageUrl ? {
        '@type': 'ImageObject',
        url: imageUrl,
      } : undefined,
      about: {
        '@type': 'Thing',
        name: displayName,
        description: `Pokemon data for ${displayName}`,
        image: imageUrl,
        url: `${baseUrl}/pokemon/${name}`,
      },
      author: {
        '@type': 'Organization',
        name: 'PrimeDex',
        url: baseUrl,
      },
      publisher: {
        '@type': 'Organization',
        name: 'PrimeDex',
        url: baseUrl,
      },
      keywords: `${displayName}, Pokemon, ${typesArr.join(', ')}, Pokedex, stats, evolution, moveset, competitive builds`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `${baseUrl}/pokemon/${name}`,
      },
    };

    breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'PrimeDex',
          item: baseUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: displayName,
          item: `${baseUrl}/pokemon/${name}`,
        },
      ],
    };
  } catch {
    // Silently fail for JSON-LD generation
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
