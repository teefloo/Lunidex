import type { Metadata } from "next";
import { t } from '@/lib/server-i18n';

export const metadata: Metadata = {
  title: t('meta.favorites_title'),
  description: t('meta.favorites_description'),
  alternates: {
    canonical: "/favorites",
  },
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: t('meta.favorites_title'),
    description: t('meta.favorites_description'),
    url: "/favorites",
  },
  twitter: {
    title: t('meta.favorites_title'),
    description: t('meta.favorites_description'),
  },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
