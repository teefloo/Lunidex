import type { SupportedLanguage } from '@/lib/languages';
import { enLegal } from './en';
import { frLegal } from './fr';
import { deLegal } from './de';
import { esLegal } from './es';
import { itLegal } from './it';
import { jaLegal } from './ja';
import { koLegal } from './ko';
import { zhLegal } from './zh';

const legalByLanguage: Record<SupportedLanguage, typeof enLegal> = {
  en: enLegal,
  fr: frLegal,
  de: deLegal,
  es: esLegal,
  it: itLegal,
  ja: jaLegal,
  ko: koLegal,
  zh: zhLegal,
};

export function getLegalDocuments(lang: SupportedLanguage) {
  return legalByLanguage[lang] ?? enLegal;
}
