import { describe, expect, it } from 'vitest';
import { PUBLISHED_PULL_STUDIES_V1 } from '@/content/tcg/published-pull-studies.v1';
import { supportedLanguages } from '@/lib/languages';
import { publishedPullStudyCopy } from '@/lib/i18n/booster-guides';

describe('published pull-rate study registry', () => {
  it('keeps independent study provenance and undisclosed geography explicit', () => {
    expect(PUBLISHED_PULL_STUDIES_V1).toHaveLength(17);
    expect(new Set(PUBLISHED_PULL_STUDIES_V1.map((study) => study.id)).size).toBe(17);
    for (const study of PUBLISHED_PULL_STUDIES_V1) {
      expect(study.language).toBe('English');
      expect(study.market).toBe('not-reported');
      expect(study.sample.packCount).toBeGreaterThan(0);
      expect(study.sample.packCountQualifier).toMatch(/^(more-than|exact)$/);
      expect(study.sample.scope).toMatch(/^(study|each-set)$/);
      expect(study.sample.productType).toBe('booster-pack');
      expect(study.sample.samplingPeriod).toBe('not-reported');
      const expectedHost = {
        TCGplayer: 'www.tcgplayer.com',
        PokéBeach: 'www.pokebeach.com',
        'Obsidia TCG': 'obsidia-tcg.store',
      }[study.source.publisher];
      expect(new URL(study.source.url).hostname).toBe(expectedHost);
      expect([undefined, 'TCGplayer', 'not-reported']).toContain(study.source.collector);
      expect(study.source.verifiedAt).toBe('2026-09-30');
      expect(study.rates.length).toBeGreaterThan(0);
      for (const rate of study.rates) {
        if (rate.ratePercent !== undefined) {
          expect(rate.ratePercent).toBeGreaterThan(0);
          expect(rate.ratePercent).toBeLessThanOrEqual(100);
          expect(rate.marginOfError95Percent).toBeGreaterThanOrEqual(0);
          expect(rate.ratePercent + rate.marginOfError95Percent!).toBeLessThanOrEqual(100);
          expect(rate.packsPerHit).toBeUndefined();
        } else {
          expect(rate.packsPerHit).toBeGreaterThan(0);
          expect(rate.marginOfError95Percent).toBeUndefined();
        }
      }
    }
  });

  it('adds the source-reported 2024–2026 studies without implying French pack coverage', () => {
    const addedStudies = [
      ['twilight-masquerade', 8000, 'more-than', 'PokéBeach'],
      ['surging-sparks', 8000, 'more-than', 'TCGplayer'],
      ['journey-together', 8000, 'more-than', 'TCGplayer'],
      ['destined-rivals', 8000, 'more-than', 'TCGplayer'],
      ['mega-evolution', 5000, 'more-than', 'PokéBeach'],
      ['phantasmal-flames', 5000, 'more-than', 'PokéBeach'],
      ['ascended-heroes', 2000, 'more-than', 'PokéBeach'],
      ['perfect-order', 3500, 'more-than', 'TCGplayer'],
      ['chaos-rising', 8500, 'more-than', 'TCGplayer'],
      ['pitch-black', 4000, 'more-than', 'Obsidia TCG'],
    ] as const;

    for (const [id, packCount, qualifier, publisher] of addedStudies) {
      expect(PUBLISHED_PULL_STUDIES_V1.find((study) => study.id === id)).toMatchObject({
        language: 'English',
        market: 'not-reported',
        sample: { packCount, packCountQualifier: qualifier, productType: 'booster-pack', samplingPeriod: 'not-reported' },
        source: { publisher },
      });
    }

    expect(PUBLISHED_PULL_STUDIES_V1.find((study) => study.id === 'pitch-black')?.source.collector).toBe('not-reported');
    expect(PUBLISHED_PULL_STUDIES_V1.find((study) => study.id === 'ascended-heroes')?.notes).toContain('god-packs-excluded');
  });

  it('preserves the multi-hit interpretation caveat for Prismatic Evolutions', () => {
    const prismatic = PUBLISHED_PULL_STUDIES_V1.find((study) => study.id === 'prismatic-evolutions');
    expect(prismatic?.rates.find((rate) => rate.rarity === 'Special Illustration Rare')).toMatchObject({
      ratePercent: 2.22,
      marginOfError95Percent: 0.81,
      note: 'multi-hit-packs',
    });
    expect(prismatic?.rates.filter((rate) => rate.note === 'multi-hit-packs')).toHaveLength(1);
  });

  it('provides a localized label for every rarity in every supported language', () => {
    const rarities = new Set(PUBLISHED_PULL_STUDIES_V1.flatMap((study) => study.rates.map((rate) => rate.rarity)));
    for (const language of supportedLanguages) {
      expect(publishedPullStudyCopy[language].boosterPackType).toBeTruthy();
      expect(publishedPullStudyCopy[language].samplePeriodNotReported).toBeTruthy();
      expect(publishedPullStudyCopy[language].collectorNotReported).toBeTruthy();
      expect(publishedPullStudyCopy[language].godPacksExcludedNote).toBeTruthy();
      for (const rarity of rarities) {
        expect(publishedPullStudyCopy[language].rarityLabels[rarity]).toBeTruthy();
      }
    }
  });

  it('keeps the 30th Celebration source-reported rounded rates separate from confidence intervals', () => {
    const study = PUBLISHED_PULL_STUDIES_V1.find((candidate) => candidate.id === '30th-celebration');
    expect(study).toMatchObject({
      sample: { packCount: 3000, packCountQualifier: 'exact' },
      source: { publisher: 'PokéBeach', collector: 'TCGplayer' },
      notes: ['unmeasured-rarities'],
    });
    expect(study?.rates).toEqual([
      { rarity: 'Illustration Rare', packsPerHit: 5 },
      { rarity: 'Classic Collection', packsPerHit: 10 },
      { rarity: 'Special Illustration Rare', packsPerHit: 21 },
      { rarity: 'Futuristic Rare', packsPerHit: 120 },
    ]);
  });
});
