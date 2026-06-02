import type { Metadata } from "next";
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const title = t('meta.favorites_title');
  const description = t('meta.favorites_description');
  return {
    title,
    description,
    alternates: {
      canonical: "/favorites",
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: "/favorites",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
