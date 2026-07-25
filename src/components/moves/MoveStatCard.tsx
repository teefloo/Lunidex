import { Gauge, Target, Trophy, Zap, Percent } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MoveDetail } from '@/types/move';

interface MoveStatCardProps {
  move: MoveDetail;
  labels: {
    power: string;
    accuracy: string;
    pp: string;
    priority: string;
    effectChance: string;
  };
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-sm border border-border/70 bg-card/50 p-3 text-center">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">{label}</span>
      <span className="text-lg font-black text-foreground/90">{value}</span>
    </div>
  );
}

export default function MoveStatCard({ move, labels }: MoveStatCardProps) {
  const stats = [
    {
      icon: Trophy,
      label: labels.power,
      value: move.power !== null ? String(move.power) : '—',
    },
    {
      icon: Target,
      label: labels.accuracy,
      value: move.accuracy !== null ? `${move.accuracy}%` : '—',
    },
    {
      icon: Zap,
      label: labels.pp,
      value: String(move.pp),
    },
    {
      icon: Gauge,
      label: labels.priority,
      value: move.priority > 0 ? `+${move.priority}` : String(move.priority),
    },
    ...(move.effect_chance !== null
      ? [
          {
            icon: Percent,
            label: labels.effectChance,
            value: `${move.effect_chance}%`,
          },
        ]
      : []),
  ];

  return (
    <div className={`grid gap-2 ${move.effect_chance !== null ? 'grid-cols-5' : 'grid-cols-4'}`}>
      {stats.map((stat) => (
        <StatBox key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
