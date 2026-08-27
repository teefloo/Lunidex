import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import AbilitiesPageClient from './AbilitiesPageClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { getInitialAbilitiesCached } from '@/lib/api/server-cache';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { ServerIndexLinks } from '@/components/seo/ServerIndexLinks';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('abilities_page.title');
  const description = t('abilities_page.subtitle');

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/abilities`,
      languages: buildSubpathLanguages('/abilities'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/abilities`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function AbilitiesPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const initialLanguageId = languageToPokemonLanguageId[lang];
  const initialAbilities = await getInitialAbilitiesCached(initialLanguageId)
    .catch(() => []);
  const queryClient = new QueryClient();
  queryClient.setQueryData(['abilities', initialLanguageId], initialAbilities);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AbilitiesPageClient initialAbilities={initialAbilities} />
      <ServerIndexLinks
        title={t('abilities_page.title', { defaultValue: 'Abilities' })}
        links={initialAbilities.slice(0, 12).map((ability) => ({
          href: `/${lang}/abilities/${ability.name}`,
          label: ability.pokemon_v2_abilitynames?.[0]?.name || ability.name,
        }))}
      />
    </HydrationBoundary>
  );
}
