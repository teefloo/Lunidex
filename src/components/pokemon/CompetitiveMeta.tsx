'use client';

import { useState } from 'react';
import { Trophy, Copy, Check, Download, Loader2, ExternalLink } from 'lucide-react';
import { useSmogonData } from '@/hooks/useSmogonData';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import type { PokemonDetail } from '@/types/pokemon';
import type { SmogonTier } from '@/lib/smogon';

// ─── Tier colours ────────────────────────────────────────────────────────────

const TIER_COLORS: Record<SmogonTier, { bg: string; text: string }> = {
  AG:      { bg: '#8b5cf6', text: '#fff' },
  Uber:    { bg: '#ef4444', text: '#fff' },
  OU:      { bg: '#f97316', text: '#fff' },
  OUBL:    { bg: '#fb923c', text: '#fff' },
  UU:      { bg: '#eab308', text: '#000' },
  UUBL:    { bg: '#fbbf24', text: '#000' },
  RU:      { bg: '#22c55e', text: '#fff' },
  RUBL:    { bg: '#4ade80', text: '#000' },
  NU:      { bg: '#6b7280', text: '#fff' },
  NUBL:    { bg: '#9ca3af', text: '#000' },
  PU:      { bg: '#9ca3af', text: '#000' },
  PUBL:    { bg: '#d1d5db', text: '#000' },
  LC:      { bg: '#3b82f6', text: '#fff' },
  NFE:     { bg: '#d1d5db', text: '#000' },
  Untiered:{ bg: '#374151', text: '#9ca3af' },
};

// Tiers that are meaningful to describe
const TIER_DESCRIPTION_KEYS: Partial<Record<SmogonTier, string>> = {
  AG:       'AG',
  Uber:     'Uber',
  OU:       'OU',
  UU:       'UU',
  RU:       'RU',
  NU:       'NU',
  PU:       'PU',
  LC:       'LC',
  NFE:      'NFE',
};

// ─── Showdown export builder ─────────────────────────────────────────────────

function buildShowdownExport(pokemon: PokemonDetail, displayName: string): string {
  const ability = pokemon.abilities.find(a => !a.is_hidden)?.ability.name
    ?? pokemon.abilities[0]?.ability.name
    ?? 'No Ability';

  const abilityDisplay = ability
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Pick up to 4 moves (level-up first, then others)
  const levelUpMoves = pokemon.moves
    .filter(m => m.version_group_details.some(d => d.move_learn_method.name === 'level-up'))
    .sort((a, b) => {
      const lvlA = a.version_group_details.find(d => d.move_learn_method.name === 'level-up')?.level_learned_at ?? 0;
      const lvlB = b.version_group_details.find(d => d.move_learn_method.name === 'level-up')?.level_learned_at ?? 0;
      return lvlB - lvlA;
    });

  const otherMoves = pokemon.moves.filter(
    m => !levelUpMoves.includes(m)
  );

  const selectedMoves = [...levelUpMoves, ...otherMoves]
    .slice(0, 4)
    .map(m => m.move.name
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    );

  while (selectedMoves.length < 4) selectedMoves.push('- -');

  const name = displayName.charAt(0).toUpperCase() + displayName.slice(1);

  return [
    `${name} @ No Item`,
    `Ability: ${abilityDisplay}`,
    `EVs: 252 Atk / 4 SpD / 252 Spe`,
    `Jolly Nature`,
    ...selectedMoves.map(m => `- ${m}`),
  ].join('\n');
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  pokemon: PokemonDetail;
  displayName: string;
}

export function CompetitiveMeta({ pokemon, displayName }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useSmogonData(pokemon.name);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    const text = buildShowdownExport(pokemon, displayName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download as .txt
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pokemon.name}-showdown.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownload = () => {
    const text = buildShowdownExport(pokemon, displayName);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pokemon.name}-showdown.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tier = data?.tier;
  const doublesTier = data?.doublesTier;
  const colors = tier ? TIER_COLORS[tier] : null;
  const descKey = tier ? TIER_DESCRIPTION_KEYS[tier] : null;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <h3 className="text-xl font-black text-foreground/90 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-sm">
            <Trophy className="w-5 h-5 text-foreground" />
          </div>
          {t('competitive.title')}
        </h3>
        <a
          href={`https://www.smogon.com/dex/sv/pokemon/${pokemon.name}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-foreground/40 hover:text-primary transition-colors"
        >
          Smogon <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Tier data */}
      {isLoading ? (
        <div className="flex items-center gap-3 text-foreground/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-bold">{t('competitive.title')}…</span>
        </div>
      ) : !data || !tier ? (
        <p className="text-sm text-foreground/50 font-bold">{t('competitive.no_data')}</p>
      ) : (
        <div className="space-y-4">
          {/* Single-format tier */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">
                {t('competitive.tier')}
              </p>
              <span
                className="inline-flex items-center px-4 py-1.5 rounded-sm text-sm font-black uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: colors?.bg, color: colors?.text }}
              >
                {tier}
              </span>
            </div>

            {doublesTier && doublesTier !== 'NFE' && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">
                  {t('competitive.vgc_tier')}
                </p>
                <span className="inline-flex items-center px-4 py-1.5 rounded-sm text-sm font-black uppercase tracking-wider bg-secondary/40 border border-border/40 text-foreground/80">
                  {doublesTier}
                </span>
              </div>
            )}
          </div>

          {/* Tier description */}
          {descKey && (
            <p className="text-xs text-foreground/60 leading-relaxed font-medium bg-secondary/20 border border-border/40 rounded-sm px-4 py-3">
              {t(`competitive.tier_description.${descKey}`)}
            </p>
          )}
        </div>
      )}

      {/* Showdown export */}
      <div className="pt-4 border-t border-border/60 space-y-3">
        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">
          {t('competitive.export_showdown')}
        </p>
        <pre className="text-[11px] text-foreground/70 bg-secondary/30 border border-border/40 rounded-sm px-4 py-3 overflow-x-auto leading-relaxed font-mono whitespace-pre">
          {buildShowdownExport(pokemon, displayName)}
        </pre>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2 text-[11px] font-black uppercase tracking-wider rounded-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                {t('competitive.copied')}
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                {t('competitive.export_showdown')}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="gap-2 text-[11px] font-black uppercase tracking-wider rounded-sm text-foreground/50"
          >
            <Download className="w-3.5 h-3.5" />
            .txt
          </Button>
        </div>
      </div>
    </div>
  );
}
