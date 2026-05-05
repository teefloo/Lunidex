import type { Metadata } from 'next';
import { getTCGCard } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { TCGCardDetailRoute } from '@/components/tcg/TCGCardDetailRoute';

export async function generateMetadata({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string } }): Promise<Metadata> {
  const { id } = params;
  const { lang } = searchParams;
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

export default async function TCGCardPage({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string } }) {
  const { id } = params;
  const { lang } = searchParams;
  const card = await getTCGCard(id, lang ?? 'en');
  return <TCGCardDetailRoute card={card} />;
}
