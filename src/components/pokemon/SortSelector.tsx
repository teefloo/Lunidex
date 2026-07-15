'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { ArrowDownAZ, ArrowUpAZ, Hash, ListOrdered, ArrowDown10, ArrowUp10, Scale } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from '@/lib/i18n';
import { useMemo } from 'react';
import { useMounted } from '@/hooks/useMounted';

export default function SortSelector() {
  const sortBy = usePrimeDexStore(s => s.sortBy);
  const setSortBy = usePrimeDexStore(s => s.setSortBy);
  const { t } = useTranslation();
  const mounted = useMounted();

  const options = useMemo(() => [
    { value: 'id-asc', label: mounted ? t('sort.id-asc') : 'ID Asc', icon: Hash },
    { value: 'id-desc', label: mounted ? t('sort.id-desc') : 'ID Desc', icon: ListOrdered },
    { value: 'name-asc', label: mounted ? t('sort.name-asc') : 'Name Asc', icon: ArrowDownAZ },
    { value: 'name-desc', label: mounted ? t('sort.name-desc') : 'Name Desc', icon: ArrowUpAZ },
    { value: 'height-asc', label: mounted ? t('sort.height-asc') : 'Height Asc', icon: ArrowDown10 },
    { value: 'height-desc', label: mounted ? t('sort.height-desc') : 'Height Desc', icon: ArrowUp10 },
    { value: 'weight-asc', label: mounted ? t('sort.weight-asc') : 'Weight Asc', icon: Scale },
    { value: 'weight-desc', label: mounted ? t('sort.weight-desc') : 'Weight Desc', icon: Scale },
  ] as const, [mounted, t]);

  type SortValue = typeof options[number]['value'];

  const currentSortLabel = options.find(o => o.value === sortBy)?.label
    ?? (mounted ? t('sort.placeholder') : 'Select sort');

  return (
    <div className="flex items-center gap-3">
      <span id="sort-label" className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hidden sm:block">
        {mounted ? t('sort.label') : 'Sort by'}
      </span>
      <Select value={sortBy} onValueChange={(val: SortValue | null) => val && setSortBy(val)}>
        <SelectTrigger aria-labelledby="sort-label" className="touch-target w-full rounded-sm bg-card border-border/70 text-[11px] font-bold uppercase tracking-wider focus:ring-primary/20 hover:border-border transition-[border-color,box-shadow] shadow-[var(--shadow-pixel-sm)] sm:w-[200px]">
          <SelectValue>{currentSortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent className="p-1 border border-border/60">
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="rounded-sm focus:bg-primary/10 focus:text-primary transition-colors cursor-pointer py-2.5"
            >
              <div className="flex items-center gap-2">
                <opt.icon className="w-3.5 h-3.5 opacity-40" />
                <span className="text-[11px] font-bold uppercase tracking-tight">{opt.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
