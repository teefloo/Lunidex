import { TYPE_COLORS } from '@/types/pokemon';
import { cn } from '@/lib/utils';

interface TypeBadgeProps {
  type: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function TypeBadge({ type, size = 'md', className }: TypeBadgeProps) {
  const color = TYPE_COLORS[type] || '#A8A77A';
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] sm:text-[11px]',
    md: 'px-3 py-1 text-[10px]',
    lg: 'px-4 py-1.5 text-xs',
  };

  return (
    <span
      className={cn(
        'glass-tag type-accent inline-block',
        sizeClasses[size],
        className
      )}
      style={{ '--type-color': color } as React.CSSProperties}
    >
      {type}
    </span>
  );
}
