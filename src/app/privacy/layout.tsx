import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('legal.privacy.title') + ' | PrimeDex',
    description: t('legal.privacy.intro'),
    alternates: {
      canonical: '/privacy',
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
