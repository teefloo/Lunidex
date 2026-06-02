import type { Metadata } from "next";
import { getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const title = t('meta.quiz_title');
  const description = t('meta.quiz_description');
  return {
    title,
    description,
    alternates: {
      canonical: "/quiz",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: "/quiz",
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
