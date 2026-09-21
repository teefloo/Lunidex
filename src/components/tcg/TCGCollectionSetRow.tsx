'use client';

import Link from 'next/link';
import { BarChart3, ChevronDown, ExternalLink } from 'lucide-react';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getTCGCardLanguageName, type TCGCardLanguage } from '@/lib/tcg-language';
import type { TCGCollectionSetValuation, TCGCollectionValueGroup } from '@/lib/tcg-collection';
import type {
  TCGCollectionOverviewEntryWithProgress,
  TCGCollectionView,
} from '@/lib/tcg-collection-overview';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { TCGActiveSetInsights } from './TCGActiveSetInsights';
import { TCGCollectionLanguageDialog } from './TCGCollectionLanguageDialog';
import { TCGImageWithFallback } from './TCGImageWithFallback';
import { TCGProgressBar } from './TCGProgressBar';

interface TCGCollectionSetRowProps {
  entry: TCGCollectionOverviewEntryWithProgress;
  view: TCGCollectionView;
  albumHref: string;
  valuation?: TCGCollectionSetValuation;
  valuationLoading: boolean;
  analysisOpen: boolean;
  onAnalysisToggle: () => void;
  onLanguageChange: (nextLanguage: TCGCardLanguage) => boolean;
}

function formatCurrency(group: TCGCollectionValueGroup, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: group.currency,
      maximumFractionDigits: 2,
    }).format(group.total);
  } catch {
    return `${group.total.toFixed(2)} ${group.currency}`;
  }
}

export function TCGCollectionSetRow({
  entry,
  view,
  albumHref,
  valuation,
  valuationLoading,
  analysisOpen,
  onAnalysisToggle,
  onLanguageChange,
}: TCGCollectionSetRowProps) {
  const { t } = useTranslation();
  const interfaceLanguage = useClientLanguage();
  const started = entry.ownedVariants.length > 0;
  const completed = entry.completion.total > 0 && entry.completion.owned >= entry.completion.total;
  const missing = Math.max(entry.completion.total - entry.completion.owned, 0);
  const ownedQuantity = entry.ownedVariants.reduce((total, ownership) => total + ownership.quantity, 0);
  const languageName = getTCGCardLanguageName(entry.language, interfaceLanguage);
  const unpricedCount = valuation
    ? Math.max(0, valuation.unpricedCount ?? 0, valuation.ownedCount - valuation.pricedCount)
    : 0;
  const canAnalyze = view === 'mine' && started;
  const analysisId = `tcg-set-analysis-${entry.collectionKey.replace(/[^a-z0-9_-]/gi, '-')}`;

  return (
    <article className="min-w-0 rounded-sm border border-border/20 bg-card/35 p-3 shadow-[var(--shadow-pixel-sm)] transition-[border-color,background-color] duration-100 hover:border-primary/30 hover:bg-card/55 sm:p-4">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center">
        <Link
          href={albumHref}
          aria-label={t('tcg.collection_view_set', { name: `${entry.set.name} — ${languageName}` })}
          className="group min-w-0 flex flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:gap-4"
        >
          {entry.set.logo && (
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card/45">
              <TCGImageWithFallback
                candidates={getTCGSetImageCandidates(entry.set)}
                alt=""
                fill
                sizes="48px"
                className="object-contain p-1"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-sm font-bold transition-colors group-hover:text-primary">{entry.set.name}</h3>
              <span className="rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-primary">
                {languageName}
              </span>
              <span className={completed
                ? 'rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-emerald-200'
                : started
                  ? 'rounded-sm border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-primary'
                  : 'rounded-sm border border-border/30 bg-card/30 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-foreground/50'}
              >
                {t(completed ? 'tcg.collection_complete' : started ? 'tcg.collection_started' : 'tcg.collection_not_started_label', {
                  defaultValue: completed ? 'Complete' : started ? 'Started' : 'Not started',
                })}
              </span>
            </div>
            <TCGProgressBar owned={entry.completion.owned} total={entry.completion.total} size="sm" className="mt-2" />
            <p className="mt-1 text-[11px] font-bold text-foreground/60">
              <span className="tabular-nums">{entry.completion.owned}/{entry.completion.total}</span>
              {started && <><span aria-hidden="true"> · </span><span className="tabular-nums">×{ownedQuantity}</span> {t('tcg.collection_copies', { defaultValue: 'copies' })}</>}
              {!completed && <><span aria-hidden="true"> · </span><span className="tabular-nums">{missing}</span> {t('tcg.collection_missing_count')}</>}
            </p>
          </div>
        </Link>

        <div className="min-w-0 lg:w-44 lg:text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/45">
            {t('tcg.collection_set_owned_value')}
          </p>
          {started && valuationLoading && !valuation ? (
            <p className="mt-1 text-sm font-bold text-foreground/50" aria-live="polite">{t('tcg.collection_loading')}</p>
          ) : valuation?.groups.length ? (
            <p className="mt-1 break-words text-sm font-black leading-tight text-primary">
              {valuation.groups.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ')}
            </p>
          ) : started ? (
            <p className="mt-1 text-[11px] font-bold text-foreground/50">{t('tcg.collection_value_unavailable')}</p>
          ) : (
            <p className="mt-1 text-[11px] font-bold text-foreground/45">{t('tcg.collection_value_none_owned')}</p>
          )}
          {unpricedCount > 0 && (
            <p className="mt-1 text-[11px] font-bold text-amber-200/70">
              {t('tcg.collection_value_partial', { count: unpricedCount })}
            </p>
          )}
        </div>

        <div className="flex min-h-11 flex-wrap items-center gap-2 lg:justify-end">
          {canAnalyze && (
            <button
              type="button"
              onClick={onAnalysisToggle}
              aria-expanded={analysisOpen}
              aria-controls={analysisId}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border/45 bg-card/55 px-3 text-[11px] font-black uppercase tracking-[0.07em] text-foreground/70 transition-[border-color,background-color,color] duration-100 hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              {t('tcg.collection_analysis', { defaultValue: 'Analysis' })}
              <ChevronDown className={`h-4 w-4 transition-transform duration-100 motion-reduce:transition-none ${analysisOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          )}
          <TCGCollectionLanguageDialog
            currentLanguage={entry.language}
            setName={entry.set.name}
            hasCards={started}
            onConfirm={onLanguageChange}
            compact
          />
          <Link
            href={albumHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/35 bg-primary/10 px-3 text-[11px] font-black uppercase tracking-[0.07em] text-primary transition-[background-color,color] duration-100 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {t('tcg.collection_open_set', { defaultValue: 'Open set' })}
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {canAnalyze && analysisOpen && (
        <div id={analysisId} className="mt-4 border-t border-border/20 pt-4">
          <TCGActiveSetInsights
            set={entry.set}
            ownedIds={entry.ownedIds}
            ownedVariants={entry.ownedVariants}
            resolvedLang={entry.language}
            enabled={analysisOpen}
            albumHref={albumHref}
          />
        </div>
      )}
    </article>
  );
}
