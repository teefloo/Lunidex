import { describe, expect, it } from 'vitest';
import {
  NAVIGATION_DESTINATIONS,
  PRIMARY_NAVIGATION,
  matchesDestinationSearch,
  normalizeNavigationPath,
  resolveActivePrimaryNavigation,
  resolveNavigationDestination,
} from './navigation-registry';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import de from './i18n/de';
import itLocale from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';

describe('navigation registry', () => {
  it('keeps four direct primary activities and a complete unique destination inventory', () => {
    expect(PRIMARY_NAVIGATION.map((item) => item.id)).toEqual([
      'collection',
      'catalog',
      'pokedex',
      'play',
    ]);
    expect(new Set(NAVIGATION_DESTINATIONS.map((item) => item.id)).size).toBe(NAVIGATION_DESTINATIONS.length);
    expect(NAVIGATION_DESTINATIONS.some((item) => item.id === 'settings' && item.action === 'settings')).toBe(true);
  });

  it('normalizes localized paths without changing route parameters', () => {
    expect(normalizeNavigationPath('/fr/tcg/collection/fr/base-set?tcgLang=fr')).toBe('/tcg/collection/fr/base-set');
    expect(normalizeNavigationPath('/zh/pokemon/pikachu?tab=cards')).toBe('/pokemon/pikachu');
  });

  it.each([
    ['/fr/tcg/collection/fr/base-set', 'collection', 'collection'],
    ['/en/tcg/cards/base1-4', 'catalog', 'catalog'],
    ['/de/tcg/sealed/market/123', 'sealed-market', 'catalog'],
    ['/fr/tcg/sealed/releases', 'sealed-market', 'catalog'],
    ['/zh/tcg/sealed/buy-safely', 'sealed-market', 'catalog'],
    ['/ja/pokemon/pikachu', 'pokedex', 'pokedex'],
    ['/ko/compare', 'compare', 'play'],
    ['/fr/quiz', 'quiz', 'play'],
    ['/zh/pokemon/charizard?tab=cards', 'pokedex', 'pokedex'],
    ['/fr/compare/lunidex-vs-pokecardex-zebradex', 'compare-article', null],
  ] as const)('resolves %s to its most specific route', (path, destinationId, primaryId) => {
    expect(resolveNavigationDestination(path)?.id).toBe(destinationId);
    expect(resolveActivePrimaryNavigation(path)).toBe(primaryId);
  });

  it('resolves every registered direct link to its owning destination', () => {
    for (const destination of NAVIGATION_DESTINATIONS) {
      if (!destination.path) continue;
      expect(resolveNavigationDestination(destination.path)?.id).toBe(destination.id);
    }
  });

  it('finds localized names and aliases throughout the full inventory', () => {
    const collection = NAVIGATION_DESTINATIONS.find((item) => item.id === 'collection');
    const friends = NAVIGATION_DESTINATIONS.find((item) => item.id === 'friends');
    expect(collection).toBeDefined();
    expect(friends).toBeDefined();
    expect(matchesDestinationSearch(collection!, 'collection', 'fr', 'Collection')).toBe(true);
    expect(matchesDestinationSearch(collection!, 'mes cartes', 'fr', 'Collection')).toBe(true);
    expect(matchesDestinationSearch(friends!, 'amis', 'fr', 'Amis')).toBe(true);
  });

  it('uses a localized friends label in every supported language', () => {
    const labels = [en, fr, es, de, itLocale, ja, ko, zh].map(({ translation }) => translation.friends.title);

    expect(labels).toEqual(['Friends', 'Amis', 'Amigos', 'Freunde', 'Amici', '友達', '친구', '好友']);
  });

  it('keeps contextual guides searchable without adding them to the global link groups', () => {
    const quizGuide = NAVIGATION_DESTINATIONS.find((item) => item.id === 'quiz-guide');
    expect(quizGuide?.paletteOnly).toBe(true);
    expect(matchesDestinationSearch(quizGuide!, 'guide du quiz', 'fr', 'Guide du quiz')).toBe(true);
    expect(resolveNavigationDestination('/fr/guides/quiz-guide')?.id).toBe('quiz-guide');
  });

  it('includes localized guide labels in the navigation bundle for every supported language', () => {
    const localizedLabels = [en, fr, es, de, itLocale, ja, ko, zh].map(({ translation }) => [
      translation.nav.guide_pokedex,
      translation.nav.guide_team,
      translation.nav.guide_quiz,
      translation.nav.guide_nuzlocke,
      translation.nav.guide_team_tools,
    ]);

    expect(fr.translation.nav.guide_quiz).toBe('Guide du quiz');
    for (const labels of localizedLabels) {
      expect(labels.every((label) => typeof label === 'string' && label.trim().length > 0)).toBe(true);
    }
  });
});
