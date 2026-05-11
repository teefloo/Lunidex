import type { Metadata } from 'next';
import { getTCGCard } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { TCGCardDetailRoute } from '@/components/tcg/TCGCardDetailRoute';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { lang } = await searchParams;
  const card = await getTCGCard(id, lang ?? 'en');

  return {
    title: card ? `${card.name} - PrimeDex TCG` : 'TCG Card - PrimeDex',
    description: card ? `${card.name} card details on PrimeDex.` : 'Pokemon TCG card details.',
    openGraph: {
      title: card ? `${card.name} - PrimeDex TCG` : 'TCG Card - PrimeDex',
      description: card ? `${card.name} card details on PrimeDex.` : 'Pokemon TCG card details.',
      url: `${SITE_URL}/tcg/cards/${id}`,
    },
  };
}

export default async function TCGCardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { lang } = await searchParams;
  const card = await getTCGCard(id, lang ?? 'en');
  return <TCGCardDetailRoute card={card} />;
}
