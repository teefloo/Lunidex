import { Metadata } from 'next';
import { t } from '@/lib/server-i18n';

export const metadata: Metadata = {
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

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
