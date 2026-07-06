'use client';

import dynamic from 'next/dynamic';
import { usePrimeDexStore } from '@/store/primedex';

const CompareBar = dynamic(() => import('@/components/pokemon/CompareBar'), {
  ssr: false,
});

export default function CompareBarSlot() {
  const compareListLength = usePrimeDexStore((state) => state.compareList.length);

  if (compareListLength === 0) return null;

  return <CompareBar />;
}
