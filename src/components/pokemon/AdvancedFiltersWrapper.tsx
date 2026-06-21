'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AdvancedFilters = dynamic(() => import('@/components/pokemon/AdvancedFilters'), {
    loading: () => <Skeleton className="h-12 w-32 rounded-sm" />,
    ssr: false
});

export default function AdvancedFiltersWrapper() {
    return <AdvancedFilters />;
}
