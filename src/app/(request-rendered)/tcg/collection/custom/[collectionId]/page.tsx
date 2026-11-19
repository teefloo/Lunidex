import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';
import { TCGCustomCollectionDetail } from '@/components/tcg/TCGCustomCollectionDetail';

interface PageProps {
  params: Promise<{ collectionId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t('tcg.custom_collections.title'),
    description: t('tcg.custom_collections.description'),
    robots: { index: false, follow: false },
  };
}

export default async function CustomCollectionPage({ params }: PageProps) {
  const { collectionId } = await params;
  return <TCGCustomCollectionDetail collectionId={collectionId} />;
}
