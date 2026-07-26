import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import FriendsClient from '@/components/friends/FriendsClient';
import FriendPrivacyCard from '@/components/friends/FriendPrivacyCard';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { Users } from 'lucide-react';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('friends.title', { defaultValue: 'Friends' });
  const description = t('friends.subtitle', { defaultValue: 'Manage friends and explore shared TCG collections.' });
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

export default async function FriendsPage() {
  const lang = await getServerLanguage();
  const t = await getServerT();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: t('friends.title', { defaultValue: 'Friends' }), path: '/friends' },
  ], lang);

  return (
    <div className="app-page relative overflow-hidden">
      <Header />
      <main className="page-shell relative z-10 pb-24 pt-8">
        <PageHeader
          icon={Users}
          title={t('friends.title', { defaultValue: 'Friends' })}
          subtitle={t('friends.subtitle', { defaultValue: 'Manage friends and explore shared TCG collections.' })}
          eyebrow={t('friends.eyebrow', { defaultValue: 'Community' })}
        />
        <div className="space-y-6">
          <FriendsClient />
          <FriendPrivacyCard />
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </div>
  );
}
