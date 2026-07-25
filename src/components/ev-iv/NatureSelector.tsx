'use client';

export type NatureName =
  | 'hardy' | 'lonely' | 'brave' | 'adamant' | 'naughty'
  | 'bold' | 'docile' | 'relaxed' | 'impish' | 'lax'
  | 'timid' | 'hasty' | 'serious' | 'jolly' | 'naive'
  | 'modest' | 'mild' | 'quiet' | 'bashful' | 'rash'
  | 'calm' | 'gentle' | 'sassy' | 'careful' | 'quirky';

export interface Nature {
  name: NatureName;
  label: string;
  // Multipliers for [atk, def, spatk, spdef, spd]
  mults: [number, number, number, number, number];
}

export const NATURES: Nature[] = [
  { name: 'hardy',   label: 'Hardy',   mults: [1.0, 1.0, 1.0, 1.0, 1.0] },
  { name: 'lonely',  label: 'Lonely',  mults: [1.1, 0.9, 1.0, 1.0, 1.0] },
  { name: 'brave',   label: 'Brave',   mults: [1.1, 1.0, 1.0, 1.0, 0.9] },
  { name: 'adamant', label: 'Adamant', mults: [1.1, 1.0, 0.9, 1.0, 1.0] },
  { name: 'naughty', label: 'Naughty', mults: [1.1, 1.0, 1.0, 0.9, 1.0] },
  { name: 'bold',    label: 'Bold',    mults: [0.9, 1.1, 1.0, 1.0, 1.0] },
  { name: 'docile',  label: 'Docile',  mults: [1.0, 1.0, 1.0, 1.0, 1.0] },
  { name: 'relaxed', label: 'Relaxed', mults: [1.0, 1.1, 1.0, 1.0, 0.9] },
  { name: 'impish',  label: 'Impish',  mults: [1.0, 1.1, 0.9, 1.0, 1.0] },
  { name: 'lax',     label: 'Lax',     mults: [1.0, 1.1, 1.0, 0.9, 1.0] },
  { name: 'timid',   label: 'Timid',   mults: [0.9, 1.0, 1.0, 1.0, 1.1] },
  { name: 'hasty',   label: 'Hasty',   mults: [1.0, 0.9, 1.0, 1.0, 1.1] },
  { name: 'serious', label: 'Serious', mults: [1.0, 1.0, 1.0, 1.0, 1.0] },
  { name: 'jolly',   label: 'Jolly',   mults: [1.0, 1.0, 0.9, 1.0, 1.1] },
  { name: 'naive',   label: 'Naive',   mults: [1.0, 1.0, 1.0, 0.9, 1.1] },
  { name: 'modest',  label: 'Modest',  mults: [0.9, 1.0, 1.1, 1.0, 1.0] },
  { name: 'mild',    label: 'Mild',    mults: [1.0, 0.9, 1.1, 1.0, 1.0] },
  { name: 'quiet',   label: 'Quiet',   mults: [1.0, 1.0, 1.1, 1.0, 0.9] },
  { name: 'bashful', label: 'Bashful', mults: [1.0, 1.0, 1.0, 1.0, 1.0] },
  { name: 'rash',    label: 'Rash',    mults: [1.0, 1.0, 1.1, 0.9, 1.0] },
  { name: 'calm',    label: 'Calm',    mults: [0.9, 1.0, 1.0, 1.1, 1.0] },
  { name: 'gentle',  label: 'Gentle',  mults: [1.0, 0.9, 1.0, 1.1, 1.0] },
  { name: 'sassy',   label: 'Sassy',   mults: [1.0, 1.0, 1.0, 1.1, 0.9] },
  { name: 'careful', label: 'Careful', mults: [1.0, 1.0, 0.9, 1.1, 1.0] },
  { name: 'quirky',  label: 'Quirky',  mults: [1.0, 1.0, 1.0, 1.0, 1.0] },
];

interface NatureSelectorProps {
  value: NatureName;
  onChange: (nature: NatureName) => void;
  label: string;
}

export default function NatureSelector({ value, onChange, label }: NatureSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-foreground/60">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as NatureName)}
        name="nature"
        className="touch-target w-full rounded-sm bg-card/50 border border-border/60 px-3 text-sm font-medium text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-[border-color,box-shadow]"
      >
        {NATURES.map((n) => (
          <option key={n.name} value={n.name}>
            {n.label}
          </option>
        ))}
      </select>
    </div>
  );
}
