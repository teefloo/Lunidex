import { motion, useReducedMotion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.5 }}
      className={cn(
        'section-frame flex flex-col items-center justify-center rounded-sm border-dashed border border-border/70 py-24 text-foreground/50 md:py-28',
        className
      )}
    >
      <div className="mb-6 rounded-sm border border-border/70 bg-background/70 p-6 shadow-[var(--shadow-pixel)]">
        <Icon aria-hidden="true" className="h-16 w-16 text-foreground/20" />
      </div>
      <p className="page-eyebrow mb-3 justify-center">Lunidex</p>
      <h3 className="mb-2 text-2xl font-black tracking-tight text-foreground/70">{title}</h3>
      <p className="mb-8 max-w-md px-6 text-center text-sm font-medium text-foreground/40">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="glass-btn flex min-h-12 items-center gap-2 px-8 py-4 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-black uppercase tracking-[0.15em] text-sm">{actionLabel}</span>
        </Link>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="glass-btn flex min-h-12 items-center gap-2 px-8 py-4 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="font-black uppercase tracking-[0.15em] text-sm">{actionLabel}</span>
        </button>
      )}
    </motion.div>
  );
}
