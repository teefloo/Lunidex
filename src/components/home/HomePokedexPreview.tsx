import Image from 'next/image';
import Link from 'next/link';
import { localeHref } from '@/lib/seo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';

const PIKACHU_ARTWORK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png';

const stats = [
  { key: 'hp', value: 35 },
  { key: 'attack', value: 55 },
  { key: 'defense', value: 40 },
  { key: 'sp_attack', value: 50 },
  { key: 'sp_defense', value: 50 },
  { key: 'speed', value: 90 },
] as const;

export default async function HomePokedexPreview() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);

  return (
    <div className="home-pokedex-specimen">
      <div className="home-pokedex-specimen-topline">
        <span>NO. 0025</span>
        <span>{t('pokedex.title')}</span>
      </div>

      <div className="home-pokedex-specimen-body">
        <figure className="home-pokedex-artwork">
          <div className="home-pokedex-artwork-halo" aria-hidden="true" />
          <Image
            src={PIKACHU_ARTWORK}
            alt={t('pokemon.artwork', { name: 'Pikachu' })}
            width={420}
            height={420}
            sizes="(max-width: 767px) 60vw, 24rem"
            className="relative z-10 h-auto w-full object-contain drop-shadow-[0_1.2rem_1.5rem_rgba(0,0,0,0.34)]"
          />
          <figcaption>
            <span className="home-specimen-name">Pikachu</span>
            <span className="home-type-chip home-type-electric">{t('types.electric')}</span>
          </figcaption>
        </figure>

        <div className="home-pokedex-data">
          <div className="home-data-heading">
            <span>{t('detail.stats')}</span>
            <span aria-hidden="true">25 / 1025</span>
          </div>
          <dl className="home-stat-grid">
            {stats.map((stat) => (
              <div key={stat.key}>
                <dt>{t(`stats.${stat.key}`)}</dt>
                <dd>{stat.value}</dd>
                <span aria-hidden="true" className="home-stat-line">
                  <span style={{ width: `${Math.min(stat.value, 100)}%` }} />
                </span>
              </div>
            ))}
          </dl>

          <div className="home-evolution-strip">
            <span className="home-data-label">{t('detail.evolution')}</span>
            <ol>
              <li>Pichu</li>
              <li aria-hidden="true">→</li>
              <li className="is-current">Pikachu</li>
              <li aria-hidden="true">→</li>
              <li>Raichu</li>
            </ol>
          </div>
        </div>
      </div>

      <Link href={localeHref('/pokedex', language)} className="home-inline-link">
        {t('lunidex_home.tools_pokedex_title')}
        <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
