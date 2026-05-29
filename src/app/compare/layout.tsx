import type { Metadata } from "next";
import { t } from '@/lib/server-i18n';

export const metadata: Metadata = {
  title: t('meta.compare_title'),
  description: t('meta.compare_description'),
  alternates: {
    canonical: "/compare",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: t('meta.compare_title'),
    description: t('meta.compare_description'),
    url: "/compare",
  },
  twitter: {
    title: t('meta.compare_title'),
    description: t('meta.compare_description'),
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
