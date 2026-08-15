import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import FriendProfileClient from '@/components/friends/FriendProfileClient';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { Users } from 'lucide-react';

interface FriendPageProps {
  params: Promise<{ friendId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('friends.profile_title', { defaultValue: 'Friend profile' });
  const description = t('friends.profile_subtitle', { defaultValue: 'View shared Pokémon TCG data.' });
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${lang}/friends`,
      languages: buildSubpathLanguages('/friends'),
    },
    openGraph: { title, description, url: `/${lang}/friends`, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function FriendPage({ params }: FriendPageProps) {
  const { friendId } = await params;
  const lang = await getServerLanguage();
  const t = await getServerT();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: t('friends.title', { defaultValue: 'Friends' }), path: '/friends' },
    { name: t('friends.profile_title', { defaultValue: 'Friend profile' }), path: `/friends/${friendId}` },
  ], lang);

  return (
    <div className="app-page relative overflow-hidden">
      <Header />
      <main className="page-shell relative z-10 pb-24 pt-8">
        <PageHeader
          icon={Users}
          title={t('friends.profile_title', { defaultValue: 'Friend profile' })}
          subtitle={t('friends.profile_subtitle', { defaultValue: 'View shared Pokémon TCG data.' })}
          eyebrow={t('friends.eyebrow', { defaultValue: 'Community' })}
        />
        <FriendProfileClient friendId={friendId} />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    </div>
  );
}
