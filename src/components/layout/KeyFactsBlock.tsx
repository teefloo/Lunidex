import { getServerT } from '@/lib/server-i18n';
import { supportedLanguages } from '@/lib/languages';

type Stat = {
  value: string;
  label: string;
  source?: { name: string; url: string };
};

const STATS: Stat[] = [
  {
    value: '1,025',
    label: 'Pokémon in the National Pokédex',
    source: { name: 'PokéAPI', url: 'https://pokeapi.co/api/v2/pokemon-species' },
  },
  {
    value: '9',
    label: 'Generations covered (Kanto → Paldea)',
    source: { name: 'PokéAPI', url: 'https://pokeapi.co/api/v2/generation' },
  },
  {
    value: '18',
    label: 'Distinct elemental types',
    source: { name: 'Bulbapedia', url: 'https://bulbapedia.bulbagarden.net/wiki/Type' },
  },
  {
    value: String(supportedLanguages.length),
    label: 'Interface languages supported',
    source: { name: 'Lunidex', url: 'https://lunidex.app' },
  },
];

export default async function KeyFactsBlock() {
  const t = await getServerT();

  return (
    <section
      id="key-facts"
      aria-labelledby="key-facts-title"
      className="relative py-8 md:py-12"
    >
      <div className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="text-center mb-8">
          <p className="page-eyebrow justify-center">
            {t('home.key_facts_eyebrow', { defaultValue: 'By the Numbers' })}
          </p>
          <h2
            id="key-facts-title"
            className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight"
          >
            {t('home.key_facts_title', { defaultValue: 'The most complete Pokédex on the open web' })}
          </h2>
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="section-frame p-5 md:p-6 text-center"
            >
              <dt className="text-3xl md:text-5xl font-extrabold gradient-text-hero leading-none">
                {stat.value}
              </dt>
              <dd className="mt-2 text-sm md:text-base text-foreground/80">
                {stat.label}
              </dd>
              {stat.source && (
                <p className="mt-2 text-xs text-foreground/50">
                  {t('home.key_facts_source', { defaultValue: 'Source' })}:{' '}
                  <a
                    href={stat.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground/80"
                  >
                    {stat.source.name}
                  </a>
                </p>
              )}
            </div>
          ))}
        </dl>

        <p className="mt-6 text-center text-xs md:text-sm text-foreground/55 max-w-2xl mx-auto">
          {t('home.key_facts_caveat', {
            defaultValue: 'Data is sourced from PokéAPI and TCGdex and revalidated hourly. Last verified 2026-08-17.',
          })}
        </p>
      </div>
    </section>
  );
}
