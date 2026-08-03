import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfileByHandle } from '@/lib/api/public-profile';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, buildWebPageJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';
import { languageToMetadataLocale } from '@/lib/languages';
import PublicProfileCard from '@/components/dashboard/PublicProfileCard';
import Header from '@/components/layout/Header';

export const revalidate = 3600;

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const lang = await getServerLanguage();
  const t = await getServerT();

  const profile = await getPublicProfileByHandle(handle);
  if (!profile) {
    return {
      title: t('profile.not_found_title', { defaultValue: 'Profile Not Found' }),
      robots: { index: false, follow: true },
    };
  }

  const title = `${profile.displayName} (@${profile.handle})`;
  const description = t('profile.meta_description', {
    defaultValue: `${profile.displayName}'s Lunidex profile — ${profile.caughtCount}/${profile.totalPokemon} Pokémon caught, ${profile.unlockedBadges.length} badges unlocked.`,
    name: profile.displayName,
    count: profile.caughtCount,
    total: profile.totalPokemon,
    badges: profile.unlockedBadges.length,
  });

  const profilePath = `/u/${handle}`;

  return {
    title,
    description,
    alternates: {
      canonical: profilePath,
      languages: buildSubpathLanguages(profilePath),
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: profilePath,
      locale: languageToMetadataLocale[lang],
      siteName: 'Lunidex',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;
  const lang = await getServerLanguage();

  const profile = await getPublicProfileByHandle(handle);
  if (!profile) {
    notFound();
  }

  const profilePath = `/u/${handle}`;
  const jsonLd = buildWebPageJsonLd({
    lang,
    path: profilePath,
    name: `${profile.displayName} — Lunidex`,
    headline: `${profile.displayName}'s Profile`,
    description: `${profile.displayName}'s Lunidex profile — ${profile.caughtCount}/${profile.totalPokemon} Pokémon caught.`,
  });

  const profilePageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: profile.displayName,
      description: `${profile.caughtCount}/${profile.totalPokemon} Pokémon caught, ${profile.unlockedBadges.length} badges.`,
      url: `${SITE_URL}${profilePath}`,
    },
  };

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(profilePageJsonLd) }}
      />
      <main className="page-shell py-8 relative z-10 mt-16 md:mt-20">
        <PublicProfileCard profile={profile} />
      </main>
    </>
  );
}
