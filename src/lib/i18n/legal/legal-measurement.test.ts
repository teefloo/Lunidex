import { describe, expect, it } from 'vitest';
import { getLegalDocuments } from './index';
import type { SupportedLanguage } from '@/lib/languages';
import en from '../en';
import fr from '../fr';
import es from '../es';
import de from '../de';
import italian from '../it';
import ja from '../ja';
import ko from '../ko';
import zh from '../zh';

const languages: SupportedLanguage[] = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'];
const translationBundles = { en, fr, es, de, it: italian, ja, ko, zh };
const contradictoryClaims = [
  /no analytics, advertising, or profiling cookie is currently set/i,
  /no analytics, advertising, or profiling cookie is set/i,
  /aucun cookie de mesure d'audience.*n'est (actuellement )?déposé/i,
  /ninguna cookie de análisis.*se (establece|instala)/i,
  /keine analyse-, werbe- oder profiling-cookies gesetzt/i,
  /nessun cookie di analisi.*è (attualmente )?(impostato|installato)/i,
  /分析.*Cookie.*(設定していません|設定されていません|インストールされていません)/,
  /분석.*쿠키.*(설정하지 않습니다|설정되지 않습니다|설치되지 않습니다)/,
  /任何分析.*Cookie.*(不设置|未安装)/,
];

function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(textOf).join('\n');
  if (value && typeof value === 'object') return Object.values(value).map(textOf).join('\n');
  return '';
}

describe('legal measurement disclosures', () => {
  it.each(languages)('does not retain a claim that %s has no analytics installed', (language) => {
    const legalText = textOf(getLegalDocuments(language));
    const bundleText = textOf(translationBundles[language]);
    for (const claim of contradictoryClaims) expect(legalText).not.toMatch(claim);
    for (const claim of contradictoryClaims) expect(bundleText).not.toMatch(claim);
    expect(legalText).toMatch(/Vercel/);
    expect(legalText).toMatch(/Supabase/);
  });
});
