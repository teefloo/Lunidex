import { Metadata } from 'next';
import { connection } from 'next/server';
import { getPokemonDetailCached as getPokemonDetail, getPokemonSpeciesCached as getPokemonSpecies } from '@/lib/api/server-cache';
import { getServerT, getServerPokemonLanguage, getServerLanguage } from '@/lib/server-i18n';
import { getBaseSpeciesName } from '@/lib/form-names';
import { formatPokemonSlugName } from '@/lib/utils';
import { SITE_URL } from '@/lib/site';
import { supportedLanguages, languageToMetadataLocale } from '@/lib/languages';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
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
    const title = t('meta.pokemon_title', { name: displayName });
    const description = t('meta.pokemon_description', { name: displayName, types });
    const languages: Record<string, string> = {};
    for (const locale of supportedLanguages) {
      languages[locale] = `/${locale}/pokemon/${name}`;
    }

    return {
      title,
      description,
      alternates: {
        canonical: `/${lang}/pokemon/${name}`,
        languages: { ...languages, 'x-default': `/en/pokemon/${name}` },
      },
      openGraph: {
        title,
        description,
        url: `/${lang}/pokemon/${name}`,
        images: [DEFAULT_OG_IMAGE],
        type: 'article',
        locale: languageToMetadataLocale[lang],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [DEFAULT_OG_IMAGE.url],
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
  await connection();
  const { name } = await params;
  const speciesLangCode = await getServerPokemonLanguage();
  const lang = await getServerLanguage();
  const t = await getServerT();
  const baseUrl = SITE_URL;
  let webPageJsonLd = null;
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
    const typesString = typesArr.map((type) => t(`types.${type}`, { defaultValue: type })).join('/');
    const pageTitle = t('meta.pokemon_title', { name: displayName });
    const pageDescription = t('meta.pokemon_description', { name: displayName, types: typesString });
    const statProperties = pokemon.stats.map((s: { stat: { name: string }; base_stat: number }) => ({
      '@type': 'PropertyValue',
      name: s.stat.name,
      value: s.base_stat,
    }));

    webPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${baseUrl}/${lang}/pokemon/${name}#webpage`,
      name: pageTitle,
      headline: pageTitle,
      description: pageDescription,
      url: `${baseUrl}/${lang}/pokemon/${name}`,
      inLanguage: languageToMetadataLocale[lang],
      primaryImageOfPage: imageUrl ? {
        '@type': 'ImageObject',
        url: imageUrl,
        width: 475,
        height: 475,
      } : undefined,
      about: {
        '@type': 'Thing',
        name: displayName,
        alternateName: species?.names?.map((n) => n.name).filter(Boolean) || [],
        description: `Pokémon data for ${displayName} (${typesString} type, BST ${totalStats}).`,
        image: imageUrl,
        url: `${baseUrl}/${lang}/pokemon/${name}`,
        identifier: pokemon.id.toString(),
        sameAs: [
          `https://pokeapi.co/api/v2/pokemon/${pokemon.id}`,
          `https://bulbapedia.bulbagarden.net/wiki/${displayName.replace(/\s/g, '_')}`,
        ],
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'National Dex Number', value: pokemon.id },
          { '@type': 'PropertyValue', name: 'Height', value: `${pokemon.height / 10} m` },
          { '@type': 'PropertyValue', name: 'Weight', value: `${pokemon.weight / 10} kg` },
          { '@type': 'PropertyValue', name: 'Base Stat Total', value: totalStats },
          { '@type': 'PropertyValue', name: 'Types', value: typesString },
          ...statProperties,
        ],
      },
      author: {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Lunidex',
        url: baseUrl,
      },
      publisher: { '@id': `${baseUrl}/#organization` },
      sourceOrganization: {
        '@type': 'Organization',
        name: 'PokéAPI',
        url: 'https://pokeapi.co',
      },
      keywords: `${displayName}, Pokémon, ${typesString}, Pokédex`,
      isPartOf: { '@id': `${baseUrl}/#website` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', 'h2', '#pokemon-stats'],
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/${lang}/pokemon/${name}` },
    };

    breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lunidex', item: `${baseUrl}/${lang}` },
        { '@type': 'ListItem', position: 2, name: t('nav.pokedex', { defaultValue: 'Pokédex' }), item: `${baseUrl}/${lang}` },
        { '@type': 'ListItem', position: 3, name: displayName, item: `${baseUrl}/${lang}/pokemon/${name}` },
      ],
    };
  } catch {
    // Silently fail for JSON-LD generation
  }

  return (
    <>
      {webPageJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }}
        />
      )}
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
        />
      )}
      {children}
    </>
  );
}
