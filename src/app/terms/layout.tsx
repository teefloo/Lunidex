import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('legal.terms.title') + ' | PrimeDex',
    description: t('legal.terms.intro'),
    alternates: {
      canonical: '/terms',
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
