'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { ChevronDown, Check } from 'lucide-react';
import { TargetGeneration } from '@/lib/auto-complete';
import { cn } from '@/lib/utils';

const GENERATION_OPTIONS: { value: TargetGeneration; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 1, label: 'Gen I' },
  { value: 2, label: 'Gen II' },
  { value: 3, label: 'Gen III' },
  { value: 4, label: 'Gen IV' },
  { value: 5, label: 'Gen V' },
  { value: 6, label: 'Gen VI' },
  { value: 7, label: 'Gen VII' },
  { value: 8, label: 'Gen VIII' },
  { value: 9, label: 'Gen IX' },
];

interface GenerationPickerProps {
  value: TargetGeneration;
  onChange: (value: TargetGeneration) => void;
  label: string;
}

export default function GenerationPicker({ value, onChange, label }: GenerationPickerProps) {
  const selected = GENERATION_OPTIONS.find(o => o.value === value) ?? GENERATION_OPTIONS[0];

  return (
    <SelectPrimitive.Root
      value={String(value)}
      onValueChange={(v: string | null) => {
        if (typeof v === 'string') onChange(parseGenerationValue(v));
      }}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'flex items-center gap-2 rounded-full border border-primary/20 bg-secondary/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
        )}
      >
        <span className="text-foreground/40">{label}</span>
        <SelectPrimitive.Value>
          <span>{selected?.label}</span>
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon>
          <ChevronDown className="h-3 w-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} align="end">
          <SelectPrimitive.Popup
            className={cn(
              'z-50 min-w-[10rem] overflow-hidden rounded-xl border border-border/60 bg-card/95 p-1 shadow-xl backdrop-blur-xl'
            )}
          >
            {GENERATION_OPTIONS.map(option => (
              <SelectPrimitive.Item
                key={String(option.value)}
                value={String(option.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/70 outline-none transition-colors data-[highlighted]:bg-primary/10 data-[selected]:text-primary'
                )}
              >
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3 w-3" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function parseGenerationValue(v: string): TargetGeneration {
  if (v === 'all') return 'all';
  const n = parseInt(v, 10);
  if (Number.isInteger(n) && n >= 1 && n <= 9) return n as TargetGeneration;
  return 'all';
}
