'use client';

import { Heart, Users, Search, LayoutGrid, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { ExtensibleMetric } from '@/types/dashboard';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="w-4 h-4" />,
  Heart: <Heart className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  BarChart3: <BarChart3 className="w-4 h-4" />,
};

interface ExtensibleSectionProps {
  metrics: ExtensibleMetric[];
}

export default function ExtensibleSection({ metrics }: ExtensibleSectionProps) {
  const { t } = useTranslation();

  if (metrics.length === 0) return null;

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-4 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h2 id="dashboard-extensible-title" className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        {t('dashboard.extensible.title')}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="p-4 rounded-sm border border-border/40 bg-card/40 flex flex-col items-center gap-2 text-center group hover:border-primary/20 hover:bg-primary/[0.03] transition-[background-color,border-color,box-shadow,transform] duration-300"
          >
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
              {ICON_MAP[metric.icon] || <BarChart3 className="w-4 h-4" />}
            </div>
            <p className="text-lg md:text-xl font-black text-foreground tabular-nums">{metric.value}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/50">
              {metric.label}
            </p>
            {metric.subtitle && (
              <span className={cn(
                'text-[11px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full',
                metric.subtitle === 'TCG'
                  ? 'bg-indigo-500/15 text-indigo-500'
                  : 'bg-muted/60 text-foreground/40'
              )}>
                {metric.subtitle}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
