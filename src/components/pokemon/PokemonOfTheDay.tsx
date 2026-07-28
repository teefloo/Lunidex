import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, BrainCircuit } from 'lucide-react';
import { getServerT, getServerLanguage, getServerPokemonLanguage } from '@/lib/server-i18n';
import { getPokemonDetailCached, getPokemonSpeciesCached, getLocalizedPokemonDataCached } from '@/lib/api/server-cache';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { TYPE_COLORS } from '@/types/pokemon';
import { getBaseSpeciesName } from '@/lib/form-names';
import { localeHref } from '@/lib/seo';

const NATIONAL_DEX_SIZE = 1025;

function dailyPokemonId(size: number): number {
  const now = new Date();
  const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - startOfYear) / 86400000);
  return (dayOfYear % size) + 1;
}

export default async function PokemonOfTheDay() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const speciesLangCode = await getServerPokemonLanguage();
  const langId = languageToPokemonLanguageId[lang];

  const id = dailyPokemonId(NATIONAL_DEX_SIZE);
  const name = String(id);

  let pokemon;
  let species;
  let localized;
  try {
    [pokemon, species, localized] = await Promise.all([
      getPokemonDetailCached(name),
      getPokemonSpeciesCached(getBaseSpeciesName(name)),
      getLocalizedPokemonDataCached(name, langId).catch(() => null),
    ]);
  } catch {
    return null;
  }

  const displayName = localized?.pokemon_v2_pokemonspeciesnames?.[0]?.name
    || species?.names?.find((n) => n.language.name === speciesLangCode)?.name
    || species?.names?.find((n) => n.language.name === 'en')?.name
    || pokemon.name;

  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default;
  const mainType = pokemon.types[0]?.type.name;
  const color = mainType ? TYPE_COLORS[mainType] : '#A8A77A';

  return (
    <section className="mx-auto w-full max-w-6xl px-5 md:px-8 mb-8">
      <div
        className="relative overflow-hidden rounded-sm border border-border/70 bg-card/40 p-5 md:p-6 flex items-center gap-5 md:gap-8"
        style={{ background: `linear-gradient(120deg, color-mix(in oklab, ${color} 10%, transparent), transparent 60%)` }}
      >
        <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />

        <Link
          href={localeHref(`/pokemon/${pokemon.name}`, lang)}
          className="relative shrink-0 h-24 w-24 md:h-32 md:w-32 group"
        >
          {artwork && (
            <Image
              src={artwork}
              alt={displayName}
              width={128}
              height={128}
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
              unoptimized
              priority
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3 w-3" />
            {t('home.pokemon_of_the_day', { defaultValue: 'Pokémon of the Day' })}
          </p>
          <Link href={localeHref(`/pokemon/${pokemon.name}`, lang)} className="mt-1 block text-2xl md:text-3xl font-black uppercase tracking-tight text-foreground hover:text-primary transition-colors">
            {displayName}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {pokemon.types.map((typeItem) => (
              <span
                key={typeItem.type.name}
                className="rounded-sm px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: TYPE_COLORS[typeItem.type.name] || '#6B7280' }}
              >
                {t(`types.${typeItem.type.name}`, { defaultValue: typeItem.type.name })}
              </span>
            ))}
            <Link
              href={localeHref('/quiz', lang)}
              className="ml-1 inline-flex items-center gap-1.5 rounded-sm border border-border/60 bg-background/40 px-2.5 py-0.5 text-[11px] font-bold text-foreground/60 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <BrainCircuit className="h-3 w-3" />
              {t('home.play_daily_quiz', { defaultValue: 'Play the daily quiz' })}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
