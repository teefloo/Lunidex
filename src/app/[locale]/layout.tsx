import type { Viewport } from 'next';
import { notFound } from 'next/navigation';
import '../globals.css';
import RootLayoutDocument, { buildRootMetadata } from '../root-layout-document';
import { isSupportedLanguage, supportedLanguages } from '@/lib/languages';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return supportedLanguages.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F6FF' },
    { media: '(prefers-color-scheme: dark)', color: '#07144F' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLanguage(locale)) notFound();
  return buildRootMetadata(locale);
}

export default async function LocaleRootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isSupportedLanguage(locale)) notFound();

  return <RootLayoutDocument lang={locale}>{children}</RootLayoutDocument>;
}
