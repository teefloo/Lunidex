'use client';

interface IVResultProps {
  label: string;
  min: number;
  max: number;
  /** i18n string with {{min}} and {{max}} tokens */
  rangeLabel: string;
  perfectLabel: string;
}

function ivColor(min: number, max: number): string {
  const mid = (min + max) / 2;
  if (min === 31 && max === 31) return 'text-yellow-400';
  if (mid >= 26) return 'text-emerald-400';
  if (mid >= 16) return 'text-orange-400';
  return 'text-red-400';
}

function ivBg(min: number, max: number): string {
  const mid = (min + max) / 2;
  if (min === 31 && max === 31) return 'bg-yellow-500/10 border-yellow-500/30';
  if (mid >= 26) return 'bg-emerald-500/10 border-emerald-500/30';
  if (mid >= 16) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

export default function IVResult({
  label,
  min,
  max,
  rangeLabel,
  perfectLabel,
}: IVResultProps) {
  const color = ivColor(min, max);
  const bg = ivBg(min, max);
  const isPerfect = min === 31 && max === 31;
  const text = isPerfect
    ? perfectLabel
    : rangeLabel.replace('{{min}}', String(min)).replace('{{max}}', String(max));

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-sm border ${bg}`}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/60 w-16 shrink-0">
        {label}
      </span>
      <span className={`text-xs font-black tabular-nums ${color}`}>{text}</span>
    </div>
  );
}
