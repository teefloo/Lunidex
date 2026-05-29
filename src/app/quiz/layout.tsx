import type { Metadata } from "next";
import { t } from '@/lib/server-i18n';

export const metadata: Metadata = {
  title: t('meta.quiz_title'),
  description: t('meta.quiz_description'),
  alternates: {
    canonical: "/quiz",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: t('meta.quiz_title'),
    description: t('meta.quiz_description'),
    url: "/quiz",
  },
  twitter: {
    title: t('meta.quiz_title'),
    description: t('meta.quiz_description'),
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
