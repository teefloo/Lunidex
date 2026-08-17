import type { SupportedLanguage } from '@/lib/languages';
import { getActualLegalDocuments } from './actual';

export function getLegalDocuments(lang: SupportedLanguage) {
  return getActualLegalDocuments(lang);
}
