import type { Viewport } from 'next';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import '../globals.css';
import { getServerLanguage } from '@/lib/server-i18n';
import RootLayoutDocument, { buildRootMetadata } from '../root-layout-document';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F6FF' },
    { media: '(prefers-color-scheme: dark)', color: '#07144F' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata() {
  await connection();
  return buildRootMetadata(await getServerLanguage());
}

export default async function RequestRenderedRootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  await connection();
  const [requestHeaders, lang] = await Promise.all([headers(), getServerLanguage()]);

  return (
    <RootLayoutDocument
      lang={lang}
      requestPathname={requestHeaders.get('x-primedex-pathname') ?? ''}
      modal={modal}
    >
      {children}
    </RootLayoutDocument>
  );
}
