'use client';

import type { TCGCard } from '@/types/tcg';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { getCardMarketValue, getTCGVariantValue } from '@/lib/tcg-collection';
import { TCG_DEFAULT_VARIANT_ORDER } from '@/lib/tcg-collections';
import type { TCGPhysicalVariant } from '@/types/tcg';
import { cn } from '@/lib/utils';
import { usePrimeDexStore } from '@/store/primedex';
import type { SupportedLanguage } from '@/lib/languages';

interface TCGMarketSummaryProps {
  card: TCGCard;
  compact?: boolean;
  interfaceLanguage?: SupportedLanguage;
  evidenceOnly?: boolean;
}

export function TCGMarketSummary({ card, compact = false, interfaceLanguage, evidenceOnly = false }: TCGMarketSummaryProps) {
  const { t } = useTranslation();
  const clientLanguage = useClientLanguage();
  const locale = interfaceLanguage ?? clientLanguage;
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const value = getCardMarketValue(card, displayCurrency);
  const representativeVariant = card.variants
    ? TCG_DEFAULT_VARIANT_ORDER.find((variant) => (
      card.variants?.[variant] === true && getTCGVariantValue(card, variant, displayCurrency) !== null
    ))
    : undefined;
  const variantTranslation: Record<TCGPhysicalVariant, string> = {
    normal: 'tcg.collection_variant_normal',
    holo: 'tcg.collection_variant_holo',
    reverse: 'tcg.collection_variant_reverse',
  };
  const provider = value?.provider
    ?? (value?.currency === 'EUR' ? 'cardmarket' : value?.currency === 'USD' ? 'tcgplayer' : undefined);
  const source = provider === 'cardmarket'
    ? 'Cardmarket'
    : provider === 'tcgplayer'
      ? 'TCGplayer'
      : null;
  let formattedValue: string | null = null;
  let formattedTimestamp: string | null = null;

  if (value) {
    try {
      formattedValue = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: value.currency,
        maximumFractionDigits: 2,
      }).format(value.amount);
    } catch {
      formattedValue = value.amount.toFixed(2) + ' ' + value.currency;
    }
  }

  if (value?.updatedAt) {
    const timestamp = new Date(value.updatedAt);
    if (Number.isFinite(timestamp.getTime())) {
      formattedTimestamp = new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(timestamp);
    }
  }

  return (
    <div className={cn(
      'min-w-0 rounded-sm border border-border/50 bg-card/50',
      evidenceOnly ? 'border-0 bg-transparent px-0 py-0' : compact ? 'px-2.5 py-2' : 'px-4 py-3',
    )}>
      {!evidenceOnly && <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{t('tcg.market_price')}</p>}
      {!evidenceOnly && <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('font-black tabular-nums', formattedValue ? 'text-foreground' : 'text-muted-foreground', compact ? 'text-sm' : 'text-xl')}>
          {formattedValue ?? t('investments.price_unavailable')}
        </span>
        {source && <span className="text-[11px] font-medium text-muted-foreground">{source}</span>}
      </div>}
      {source && (
        <>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {formattedTimestamp
              ? t('tcg.market_provider_timestamp', { date: `${formattedTimestamp} UTC` })
              : t('tcg.market_provider_timestamp_unavailable')}
          </p>
          {!compact && (
            <details className="mt-1 text-[10px] text-muted-foreground">
              <summary className="min-h-7 cursor-pointer font-semibold underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                {t('tcg.market_method_and_limits')}
              </summary>
              <div className="space-y-1 pb-1">
                <p>{t(provider === 'cardmarket' ? 'tcg.market_method_cardmarket' : 'tcg.market_method_tcgplayer')}</p>
                <p>{t('tcg.market_price_limits')}</p>
              </div>
            </details>
          )}
        </>
      )}
      {evidenceOnly && value && (
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
          {representativeVariant
            ? t('tcg.custom_collections.market_representative_variant', { variant: t(variantTranslation[representativeVariant]) })
            : t('tcg.custom_collections.market_representative_limit')}
        </p>
      )}
      {!source && evidenceOnly && <p className="text-[11px] font-medium text-muted-foreground">{t('investments.price_unavailable')}</p>}
    </div>
  );
}
