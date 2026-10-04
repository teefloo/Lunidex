'use client';

import { useRouter } from 'next/navigation';
import type { TCGCard } from '@/types/tcg';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { TCGCardDetailModal } from './TCGCardDetailModal';

export function TCGCardDetailModalRoute({
  card,
  tcgLanguage,
}: {
  card: TCGCard;
  tcgLanguage: TCGCardLanguage;
}) {
  const router = useRouter();

  return (
    <TCGCardDetailModal
      card={card}
      tcgLanguage={tcgLanguage}
      isOpen
      onClose={() => router.back()}
    />
  );
}
