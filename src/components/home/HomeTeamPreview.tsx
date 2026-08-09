import Image from 'next/image';
import Link from 'next/link';
import { localeHref } from '@/lib/seo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';

const TEAM_PREVIEW = [
  { id: 6, name: 'Charizard', types: ['fire', 'flying'] as const },
  { id: 9, name: 'Blastoise', types: ['water'] as const },
  { id: 94, name: 'Gengar', types: ['ghost', 'poison'] as const },
  { id: 448, name: 'Lucario', types: ['fighting', 'steel'] as const },
  { id: 700, name: 'Sylveon', types: ['fairy'] as const },
  { id: 25, name: 'Pikachu', types: ['electric'] as const },
];

function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export default async function HomeTeamPreview() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);

  return (
    <div className="home-team-specimen">
      <div className="home-team-specimen-header">
        <div>
          <span className="home-data-label">{t('lunidex_archive.team_eyebrow')}</span>
          <h3>{t('lunidex_archive.team_title')}</h3>
        </div>
        <span className="home-team-count">06 / 06</span>
      </div>

      <ul className="home-team-roster">
        {TEAM_PREVIEW.map((pokemon, index) => (
          <li key={pokemon.id} className="home-team-slot">
            <span className="home-team-index">0{index + 1}</span>
            <div className="home-team-artwork">
              <Image
                src={artworkUrl(pokemon.id)}
                alt={t('pokemon.artwork', { name: pokemon.name })}
                width={180}
                height={180}
                sizes="(max-width: 767px) 24vw, 9rem"
              />
            </div>
            <span className="home-team-name">{pokemon.name}</span>
            <span className="home-team-types">
              {pokemon.types.map((type) => (
                <span key={type} className={`home-type-chip home-type-${type}`}>
                  {t(`types.${type}`)}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <div className="home-team-specimen-footer">
        <p>{t('lunidex_home.tools_team_body')}</p>
        <Link href={localeHref('/team', language)} className="home-inline-link">
          {t('lunidex_archive.team_title')}
          <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
