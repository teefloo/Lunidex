'use client';

interface StatInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Show as a range slider instead of number input */
  slider?: boolean;
  /** Accent color class for the slider thumb / indicator */
  accent?: string;
  disabled?: boolean;
}

export default function StatInput({
  label,
  value,
  onChange,
  min = 0,
  max = 252,
  slider = false,
  accent = 'text-primary',
  disabled = false,
}: StatInputProps) {
  const pct = Math.round(((value - min) / (max - min)) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
          {label}
        </span>
        <span className={`text-xs font-black tabular-nums ${accent}`}>{value}</span>
      </div>

      {slider ? (
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full accent-current cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ accentColor: 'var(--primary)' }}
          aria-label={label}
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        />
      ) : (
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const n = Math.min(max, Math.max(min, Number(e.target.value) || 0));
            onChange(n);
          }}
          inputMode="numeric"
          name={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
          className="touch-target w-full rounded-sm bg-card/50 border border-border/60 px-2.5 text-sm font-semibold text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-[border-color,box-shadow] disabled:opacity-40"
          aria-label={label}
        />
      )}

      {slider && (
        <div className="w-full h-0.5 bg-secondary/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
