import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getTCGCardCached } from '@/lib/api/server-cache';
import { normalizeTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { TCGCardDetailModalRoute } from '@/components/tcg/TCGCardDetailModalRoute';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tcgLang?: string | string[] | undefined }>;
}

export default async function InterceptedTCGCardPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const requestedTcgLanguage = Array.isArray(query.tcgLang) ? query.tcgLang[0] : query.tcgLang;
  const tcgLanguage = normalizeTCGCardLanguage(requestedTcgLanguage, 'en') as TCGCardLanguage;
  const card = await getPageCard(id, tcgLanguage);

  if (!card) notFound();

  return <TCGCardDetailModalRoute card={card} tcgLanguage={tcgLanguage} />;
}

const getPageCard = cache(getTCGCardCached);
