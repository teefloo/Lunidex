import { describe, expect, it } from 'vitest';
import { buildLunidexHomeFaqJsonLd, getLunidexHomeFaqs } from './lunidex-home-content';
import en from './i18n/en';
import { resolveCollectionEntry } from './tcg-collection-entry';

describe('homepage collection entry', () => {
  it('starts a guest collection even when the browser has local cards', () => {
    expect(resolveCollectionEntry({
      serviceAvailable: true,
      isSignedIn: false,
      hasHydrated: true,
      ownedCount: 6,
    })).toEqual({ mode: 'start', path: '/tcg/start?source=home_cta' });
  });

  it('starts the collection flow for a signed-in account with no cards', () => {
    expect(resolveCollectionEntry({
      serviceAvailable: true,
      isSignedIn: true,
      hasHydrated: true,
      ownedCount: 0,
    })).toEqual({ mode: 'start', path: '/tcg/start?source=home_cta' });
  });

  it('resumes a signed-in collection after persisted state has hydrated', () => {
    expect(resolveCollectionEntry({
      serviceAvailable: true,
      isSignedIn: true,
      hasHydrated: true,
      ownedCount: 1,
    })).toEqual({ mode: 'resume', path: '/tcg/collection' });
  });

  it('does not treat cards as an existing signed-in collection before hydration', () => {
    expect(resolveCollectionEntry({
      serviceAvailable: true,
      isSignedIn: true,
      hasHydrated: false,
      ownedCount: 6,
    })).toEqual({ mode: 'start', path: '/tcg/start?source=home_cta' });
  });

  it('points to the access explanation when the account service is unavailable', () => {
    expect(resolveCollectionEntry({
      serviceAvailable: false,
      isSignedIn: true,
      hasHydrated: true,
      ownedCount: 6,
    })).toEqual({ mode: 'unavailable', path: '#collection-access' });
  });
});

describe('homepage FAQ structured data', () => {
  const copy: Record<string, string> = en.translation.lunidex_home;
  const translate = (key: string) => copy[key.replace('lunidex_home.', '')] ?? key;

  it('uses the same visible questions and answers as the FAQ JSON-LD', () => {
    const visibleFaqs = getLunidexHomeFaqs(translate, 'en');
    const structuredFaqs = buildLunidexHomeFaqJsonLd(translate, 'en').mainEntity;

    expect(structuredFaqs.map(({ name, acceptedAnswer }) => ({ question: name, answer: acceptedAnswer.text })))
      .toEqual(visibleFaqs);
  });
});
