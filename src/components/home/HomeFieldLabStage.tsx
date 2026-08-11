import Image from 'next/image';
import type { CSSProperties } from 'react';
import { HOME_FEATURED_CARDS } from './homeFeaturedCards';
import { HomeCardPreview } from './HomeCardPreview';

interface HomeFieldLabStageCopy {
  indexLabel: string;
  indexContextLabel: string;
  labLabel: string;
  onlineLabel: string;
  specimenLabel: string;
  statsLabel: string;
  evolutionLabel: string;
  teamLabel: string;
  typeCoverageLabel: string;
  progressLabel: string;
  progressTitle: string;
  progressBody: string;
  caughtLabel: string;
  favoritesLabel: string;
  badgesLabel: string;
  cardsLabel: string;
  baseSetLabel: string;
  ownedLabel: string;
  missingLabel: string;
  wishlistLabel: string;
  connectedLabel: string;
  scrollLabel: string;
  demoLabel: string;
  electricLabel: string;
  fireLabel: string;
  waterLabel: string;
  ghostLabel: string;
  fightingLabel: string;
  steelLabel: string;
  fairyLabel: string;
}

interface HomeFieldLabStageProps {
  copy: HomeFieldLabStageCopy;
}

const TEAM_PREVIEW = [
  { id: 6, name: 'Charizard', type: 'fire' },
  { id: 9, name: 'Blastoise', type: 'water' },
  { id: 94, name: 'Gengar', type: 'ghost' },
  { id: 448, name: 'Lucario', type: 'fighting' },
  { id: 700, name: 'Sylveon', type: 'fairy' },
  { id: 25, name: 'Pikachu', type: 'electric' },
] as const;

const TYPE_LABELS: Record<(typeof TEAM_PREVIEW)[number]['type'], keyof HomeFieldLabStageCopy> = {
  fire: 'fireLabel',
  water: 'waterLabel',
  ghost: 'ghostLabel',
  fighting: 'fightingLabel',
  fairy: 'fairyLabel',
  electric: 'electricLabel',
};

function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function stageCard(index: number, className: string) {
  const card = HOME_FEATURED_CARDS[index];
  if (!card) return null;

  return (
    <HomeCardPreview
      card={card}
      rotationClass={className}
      sizes="(max-width: 767px) 22vw, 10rem"
    />
  );
}

export function HomeFieldLabStage({ copy }: HomeFieldLabStageProps) {
  return (
    <div className="field-stage" data-field-stage>
      <div className="field-stage-rail field-stage-rail-left" aria-hidden="true">
        <span>01</span><i /><span>02</span><i /><span>03</span>
      </div>
      <div className="field-stage-rail field-stage-rail-right" aria-hidden="true">
        <span>1025</span><i /><span>TCG</span><i /><span>{copy.labLabel}</span>
      </div>

      <div className="field-terminal" aria-hidden="true">
        <div className="field-terminal-header">
          <div>
            <span className="field-terminal-kicker">LUNIDEX / {copy.labLabel}</span>
            <strong>{copy.indexLabel}</strong>
          </div>
          <div className="field-terminal-header-meta">
            <span className="field-terminal-demo">{copy.demoLabel}</span>
            <span className="field-terminal-status"><i /> {copy.onlineLabel}</span>
          </div>
        </div>

        <div className="field-terminal-screen">
          <div className="field-screen-grid" />
          <div className="field-screen-ring field-screen-ring-one" />
          <div className="field-screen-ring field-screen-ring-two" />
          <div className="field-screen-crosshair field-screen-crosshair-top" />
          <div className="field-screen-crosshair field-screen-crosshair-bottom" />

          <div className="field-layer field-layer-threshold" data-field-layer-index="0">
            <div className="field-threshold-orbit field-threshold-orbit-one" />
            <div className="field-threshold-orbit field-threshold-orbit-two" />
            <div className="field-threshold-core">
              <span className="field-core-label">{copy.indexLabel}</span>
              <strong>1025</strong>
              <span className="field-core-caption">{copy.indexContextLabel}</span>
            </div>
            <div className="field-threshold-sprite field-threshold-sprite-left">
              <Image src={artworkUrl(25)} alt="" width={220} height={220} sizes="10rem" priority />
            </div>
            <div className="field-threshold-sprite field-threshold-sprite-right">
              <Image src={artworkUrl(94)} alt="" width={200} height={200} sizes="9rem" />
            </div>
            <div className="field-threshold-cards">
              {stageCard(0, '-rotate-6')}
              {stageCard(1, 'rotate-2')}
              {stageCard(2, 'rotate-6')}
            </div>
          </div>

          <div className="field-layer field-layer-specimen" data-field-layer-index="1">
            <div className="field-specimen-card">
              <div className="field-specimen-card-header">
                <span>{copy.specimenLabel}</span><span>NO. 0025</span>
              </div>
              <div className="field-specimen-card-body">
                <div className="field-specimen-art">
                  <span className="field-specimen-halo" />
                  <Image src={artworkUrl(25)} alt="" width={360} height={360} sizes="18rem" />
                </div>
                <div className="field-specimen-meta">
                  <strong>Pikachu</strong>
                  <span className="field-type-pill field-type-electric">{copy.electricLabel}</span>
                  <div className="field-specimen-stat-head"><span>{copy.statsLabel}</span><span>BST 320</span></div>
                  <div className="field-specimen-stats">
                    <span>HP <b>35</b><i><em style={{ width: '35%' }} /></i></span>
                    <span>ATK <b>55</b><i><em style={{ width: '55%' }} /></i></span>
                    <span>DEF <b>40</b><i><em style={{ width: '40%' }} /></i></span>
                    <span>SPD <b>90</b><i><em style={{ width: '90%' }} /></i></span>
                  </div>
                  <div className="field-specimen-evolution"><span>{copy.evolutionLabel}</span><strong>Pichu → Pikachu → Raichu</strong></div>
                </div>
              </div>
            </div>
          </div>

          <div className="field-layer field-layer-team" data-field-layer-index="2">
            <div className="field-team-board">
              <div className="field-team-board-header"><span>{copy.teamLabel}</span><strong>06 / 06</strong></div>
              <div className="field-team-slots">
                {TEAM_PREVIEW.map((pokemon, index) => (
                  <div className="field-team-slot" key={pokemon.id}>
                    <small>0{index + 1}</small>
                    <Image src={artworkUrl(pokemon.id)} alt="" width={150} height={150} sizes="6rem" />
                    <strong>{pokemon.name}</strong>
                    <span className={`field-type-pill field-type-${pokemon.type}`}>{copy[TYPE_LABELS[pokemon.type]]}</span>
                  </div>
                ))}
              </div>
              <div className="field-team-coverage"><span>{copy.typeCoverageLabel}</span><i><em /><em /><em /><em /><em /><em /><em /><em /></i><strong>14 / 18</strong></div>
            </div>
          </div>

          <div className="field-layer field-layer-progress" data-field-layer-index="3">
            <div className="field-progress-board">
              <div className="field-progress-copy"><span>{copy.progressLabel}</span><strong>{copy.progressTitle}</strong><p>{copy.progressBody}</p></div>
              <div className="field-progress-dial" style={{ '--field-dial-progress': '72.4%' } as CSSProperties}>
                <div><strong>742</strong><span>/ 1025</span></div>
              </div>
              <div className="field-progress-metrics">
                <span><b>184</b><small>{copy.caughtLabel}</small></span>
                <span><b>32</b><small>{copy.favoritesLabel}</small></span>
                <span><b>08</b><small>{copy.badgesLabel}</small></span>
              </div>
            </div>
          </div>

          <div className="field-layer field-layer-cards" data-field-layer-index="4">
            <div className="field-card-desk">
              <div className="field-card-desk-header"><span>{copy.cardsLabel}</span><strong>{copy.baseSetLabel}</strong></div>
              <div className="field-card-desk-stack">
                {stageCard(1, '-rotate-7')}
                {stageCard(0, 'rotate-2')}
                {stageCard(2, 'rotate-6')}
              </div>
              <div className="field-card-desk-footer">
                <span><b>68</b> {copy.ownedLabel}</span>
                <span><b>34</b> {copy.missingLabel}</span>
                <span><b>12</b> {copy.wishlistLabel}</span>
              </div>
              <div className="field-card-progress"><i><em /></i><strong>68%</strong></div>
            </div>
          </div>

          <div className="field-layer field-layer-connected" data-field-layer-index="5">
            <div className="field-connected-board">
              <div className="field-connected-core"><span>LUNIDEX</span><strong>∞</strong><small>{copy.connectedLabel}</small></div>
              <div className="field-connected-node field-connected-node-pokedex"><i /><span>{copy.specimenLabel}</span><b>1025</b></div>
              <div className="field-connected-node field-connected-node-team"><i /><span>{copy.teamLabel}</span><b>06 / 06</b></div>
              <div className="field-connected-node field-connected-node-progress"><i /><span>{copy.progressLabel}</span><b>742 / 1025</b></div>
              <div className="field-connected-node field-connected-node-cards"><i /><span>{copy.cardsLabel}</span><b>68%</b></div>
              <div className="field-connected-line field-connected-line-one" />
              <div className="field-connected-line field-connected-line-two" />
              <div className="field-connected-line field-connected-line-three" />
              <div className="field-connected-line field-connected-line-four" />
            </div>
          </div>
        </div>

        <div className="field-terminal-footer">
          <span>{copy.scrollLabel}</span>
          <span>LOC / 45.7°N 4.8°E</span>
        </div>
      </div>
    </div>
  );
}
