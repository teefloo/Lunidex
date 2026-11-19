import { permanentRedirect } from 'next/navigation';
import { getServerLanguage } from '@/lib/server-i18n';

interface ProductAliasPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductAliasPage({ params, searchParams }: ProductAliasPageProps) {
  const [language, { id }, query] = await Promise.all([getServerLanguage(), params, searchParams]);
  const target = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) target.append(key, item);
    } else if (value !== undefined) {
      target.set(key, value);
    }
  }
  const queryString = target.toString();
  permanentRedirect(`/${language}/tcg/sealed/market/${encodeURIComponent(id)}${queryString ? `?${queryString}` : ''}`);
}
