import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  eyebrow?: string | null;
  description?: string;
  badge?: React.ReactNode;
  className?: string;
  iconBgColor?: string;
  iconBorderColor?: string;
  iconColor?: string;
  gradientFrom?: string;
  centered?: boolean;
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  eyebrow,
  description,
  badge,
  className,
  iconBgColor = 'bg-primary/10',
  iconBorderColor = 'border-primary/20',
  iconColor = 'text-foreground',
  gradientFrom = 'from-primary/20',
  centered = false,
}: PageHeaderProps) {
  const resolvedEyebrow = eyebrow === undefined ? 'Lunidex' : eyebrow;
  const resolvedDescription = description ?? subtitle;

  return (
    <section className={cn('page-shell pt-14 mb-10', centered && 'text-center', className)}>
      <div className="page-surface relative overflow-hidden px-5 py-6 md:px-8 md:py-7">
        <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-28 opacity-55 bg-gradient-to-b to-transparent', gradientFrom)} />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className={cn('flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start md:items-center', centered && 'sm:justify-center')}>
          <div className={cn('flex min-w-0 items-center gap-4', centered && 'justify-center')}>
            <div className={cn('flex h-14 w-14 flex-none items-center justify-center rounded-sm border shadow-[var(--shadow-pixel-sm)]', iconBgColor, iconBorderColor)}>
              <Icon aria-hidden="true" className={cn('h-6 w-6', iconColor)} />
            </div>
            <div className={cn('min-w-0 flex-1 space-y-2', centered && 'max-w-3xl')}>
              <div className="space-y-1">
                {resolvedEyebrow && <p className="page-eyebrow">{resolvedEyebrow}</p>}
                <h1 className="page-title break-words text-3xl sm:text-4xl md:text-5xl lg:text-6xl">{title}</h1>
              </div>
              {resolvedDescription && (
                <p className="page-subtitle max-w-2xl">{resolvedDescription}</p>
              )}
            </div>
          </div>
          {badge && <div className="sm:ml-auto flex-none">{badge}</div>}
        </div>
      </div>
      <div className="page-divider mt-4" />
    </section>
  );
}
