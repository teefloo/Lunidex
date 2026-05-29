'use client';

import { cn } from '@/lib/utils';

interface TCGProgressBarProps {
  owned: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function TCGProgressBar({
  owned,
  total,
  size = 'md',
  showLabel = true,
  className,
}: TCGProgressBarProps) {
  const percentage = total > 0 ? Math.round((owned / total) * 100) : 0;
  const isComplete = owned >= total;

  const heights = { sm: 'h-1', md: 'h-2', lg: 'h-3' };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 overflow-hidden rounded-full bg-muted/40', heights[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            isComplete
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
              : 'bg-gradient-to-r from-primary/60 to-primary',
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn(
          'shrink-0 font-black uppercase tracking-[0.06em]',
          size === 'sm' ? 'text-[9px]' : 'text-[10px]',
          isComplete ? 'text-emerald-400' : 'text-foreground/40',
        )}>
          {owned}/{total}
        </span>
      )}
    </div>
  );
}
