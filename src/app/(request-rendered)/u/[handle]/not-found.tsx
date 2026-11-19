import { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';
import EmptyState from '@/components/ui/EmptyState';
import { UserX } from 'lucide-react';
import Header from '@/components/layout/Header';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: {
      absolute: `${t('profile.not_found_title', { defaultValue: 'Profile Not Found' })} | Lunidex`,
    },
    description: t('profile.not_found_desc', {
      defaultValue: 'This profile does not exist or is not public.',
    }),
    robots: { index: false, follow: true },
  };
}

export default async function ProfileNotFound() {
  const t = await getServerT();

  return (
    <>
      <Header />
      <main className="page-shell py-8 relative z-10 mt-16 md:mt-20">
        <EmptyState
          icon={UserX}
          title={t('profile.not_found_title', { defaultValue: 'Profile Not Found' })}
          description={t('profile.not_found_desc', {
            defaultValue: 'This profile does not exist or is not public.',
          })}
          actionLabel={t('nav.home', { defaultValue: 'Home' })}
          actionHref="/"
        />
      </main>
    </>
  );
}
