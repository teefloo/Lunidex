'use client';

import { Calendar, Eye, BrainCircuit, Heart, Sword, Plus, Activity as ActivityIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { DashboardData, ActivityAction } from '@/types/dashboard';

const ACTION_ICONS: Record<ActivityAction['type'], React.ReactNode> = {
  quiz: <BrainCircuit className="w-3.5 h-3.5" />,
  pokemon_view: <Eye className="w-3.5 h-3.5" />,
  tcg_add: <Plus className="w-3.5 h-3.5" />,
  favorite_add: <Heart className="w-3.5 h-3.5" />,
  team_edit: <Sword className="w-3.5 h-3.5" />,
  caught: <Plus className="w-3.5 h-3.5" />,
};

interface GeneralActivityProps {
  data: DashboardData;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function GeneralActivity({ data }: GeneralActivityProps) {
  const { t } = useTranslation();
  const { activity } = data;

  return (
    <div className="glass-card rounded-sm p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />

      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60 flex items-center gap-2">
        <ActivityIcon className="w-3.5 h-3.5 text-primary" />
        {t('dashboard.activity.title')}
      </h3>

      {/* Visit stats */}
      <div className="flex gap-4">
        <div className="flex-1 p-3 rounded-sm border border-border/50 bg-card/50">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1">
            {t('dashboard.activity.visits')}
          </p>
          <p className="text-xl font-black text-foreground tabular-nums">{activity.visitCount}</p>
        </div>
        <div className="flex-1 p-3 rounded-sm border border-border/50 bg-card/50">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {t('dashboard.activity.last_visit')}
          </p>
          <p className="text-sm font-black text-foreground tabular-nums">
            {activity.lastVisitDate ? formatDate(activity.lastVisitDate) : '-'}
          </p>
        </div>
      </div>

      {/* Recent actions */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50 mb-3">
          {t('dashboard.activity.recent_actions')}
        </p>
        {activity.recentActions.length > 0 ? (
          <div className="space-y-1.5">
            {activity.recentActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center gap-3 p-2 rounded-sm border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  {ACTION_ICONS[action.type] || <ActivityIcon className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground/80 truncate">
                    {action.label}
                  </p>
                  {action.details && (
                    <p className="text-[9px] font-medium text-foreground/40 truncate">
                      {action.details}
                    </p>
                  )}
                </div>
                <span className="text-[9px] font-bold text-foreground/30 shrink-0 tabular-nums">
                  {formatDate(action.date)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="p-3 rounded-full bg-muted/40 mb-2">
              <ActivityIcon className="w-6 h-6 text-foreground/20" />
            </div>
            <p className="text-xs font-medium text-foreground/40">{t('dashboard.activity.no_actions')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
