import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';
import { TCGCollectionShowcasePage } from '@/components/tcg/TCGCollectionShowcasePage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('tcg.custom_collections.showcase_title'),
    description: t('tcg.custom_collections.share_description'),
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: { index: false, follow: false, noimageindex: true, noarchive: true },
    },
  };
}

export default async function TCGCollectionShowcaseRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TCGCollectionShowcasePage token={token} />;
}
