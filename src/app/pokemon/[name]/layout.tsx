import { connection } from 'next/server';
import { getPokemonDetailCached as getPokemonDetail, getPokemonFormCached as getPokemonForm, getPokemonSpeciesCached as getPokemonSpecies } from '@/lib/api/server-cache';
import { getServerT, getServerPokemonLanguage, getServerLanguage } from '@/lib/server-i18n';
import { getBaseSpeciesName, getPokemonDisplayName } from '@/lib/form-names';
import { SITE_URL } from '@/lib/site';
import { languageToMetadataLocale } from '@/lib/languages';
import { serializeJsonLd } from '@/lib/json-ld';

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
    const pokemon = await getPokemonDetail(name);
    const baseName = pokemon.species?.name || getBaseSpeciesName(name);
    const [species, form] = await Promise.all([
      getPokemonSpecies(baseName).catch(() => null),
      getPokemonForm(name).catch(() => null),
    ]);
    const baseLocalizedName = species?.names?.find((entry) => entry.language.name === speciesLangCode)?.name
      || species?.names?.find((entry) => entry.language.name === 'en')?.name
      || baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const displayName = getPokemonDisplayName({ name, baseLocalizedName, baseSpeciesName: baseName, lang, form });
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
        '@id': `${baseUrl}/#organization`,
      },
      publisher: { '@id': `${baseUrl}/#organization` },
      citation: {
        '@type': 'WebPage',
        name: 'PokéAPI',
        url: 'https://pokeapi.co',
      },
      keywords: `${displayName}, Pokémon, ${typesString}, Pokédex`,
      isPartOf: { '@id': `${baseUrl}/#website` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${baseUrl}/${lang}/pokemon/${name}` },
    };

    breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Lunidex', item: `${baseUrl}/${lang}` },
        { '@type': 'ListItem', position: 2, name: t('nav.pokedex', { defaultValue: 'Pokédex' }), item: `${baseUrl}/${lang}/pokedex` },
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
