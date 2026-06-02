import type { Metadata } from "next";
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const title = t('meta.compare_title');
  const description = t('meta.compare_description');
  return {
    title,
    description,
    alternates: {
      canonical: "/compare",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: "/compare",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
