'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  X,
  Zap,
  Box,
  Brush,
  ExternalLink,
  Activity,
  Info,
  Sparkles,
  Shield,
  ScrollText,
  BadgeDollarSign,
} from 'lucide-react';
import type { TCGCard, TCGCardAbility, TCGCardAttack, TCGCardCategory } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getTCGCard } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { getCardMarketValue } from '@/lib/tcg-collection';
import { cn } from '@/lib/utils';
import { TCGHolographicCard } from './TCGHolographicCard';
import { PriceAlertManager } from './PriceAlertManager';

// Lazy-load the heavy Recharts-based chart only when the card detail is open.
const PriceChart = dynamic(
  () => import('./PriceChart').then((m) => ({ default: m.PriceChart })),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-foreground/5" /> },
);

interface TCGCardDetailModalProps {
  card: TCGCard | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TCGCardDetailModal({ card, isOpen, onClose }: TCGCardDetailModalProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const store = usePrimeDexStore();
  const language = store.language;
  const systemLanguage = store.systemLanguage;
  const addTCGCompare = store.addTCGCompare ?? (() => undefined);
  const removeTCGCompare = store.removeTCGCompare ?? (() => undefined);
  const isTCGCompared = store.isTCGCompared ?? (() => false);
  const toggleTCGOwned = store.toggleTCGOwned ?? (() => undefined);
  const toggleTCGWishlist = store.toggleTCGWishlist ?? (() => undefined);
  const isTCGOwned = store.isTCGOwned ?? (() => false);
  const isTCGWishlist = store.isTCGWishlist ?? (() => false);
  const resolvedLang = mounted ? (language === 'auto' ? (systemLanguage || 'en') : language) : 'en';

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const { data: hydratedCard, isFetching } = useQuery({
    queryKey: card ? tcgKeys.card(card.id, resolvedLang) : tcgKeys.card('missing', resolvedLang),
    queryFn: async () => (card ? getTCGCard(card.id, resolvedLang) : null),
    enabled: mounted && isOpen && !!card,
    staleTime: 30 * 60 * 1000,
    placeholderData: card ?? undefined,
  });

  if (!mounted || !card || !isOpen) return null;

  const displayCard = hydratedCard ?? card;
  const isHydrating = isFetching && !displayCard.category;
  const titleId = `tcg-card-detail-title-${card.id}`;
  const descriptionId = `tcg-card-detail-description-${card.id}`;
  const totalCards = displayCard.set?.cardCount?.total ?? displayCard.set?.totalCards;
  const category = displayCard.category ?? 'Pokemon';
  const categoryLabel = getCategoryLabel(category, t);
  const effectText = displayCard.effect || displayCard.description || displayCard.flavorText || '';
  const attacks = displayCard.attacks ?? [];
  const abilities = normalizeAbilities(displayCard.abilities);
  const pokemonPageHref = category === 'Pokemon' && displayCard.dexId?.[0]
    ? `/pokemon/${displayCard.dexId[0]}?lang=${resolvedLang}`
    : null;
  const tcgCompareList = store.tcgCompareList ?? [];
  const compared = isTCGCompared(displayCard.id);
  const owned = isTCGOwned(displayCard.id);
  const wishlisted = isTCGWishlist(displayCard.id);
  const marketValue = getCardMarketValue(displayCard);
  const marketValueLabel = marketValue
    ? (() => {
        try {
          return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: marketValue.currency,
            maximumFractionDigits: 2,
          }).format(marketValue.amount);
        } catch {
          return `${marketValue.amount.toFixed(2)} ${marketValue.currency}`;
        }
      })()
    : null;

  const handleShareCard = async () => {
    const url = new URL(
      `/tcg/cards/${displayCard.id}?lang=${resolvedLang}`,
      window.location.origin,
    ).toString();
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('detail.copied'));
    } catch {
      window.prompt(t('detail.copied'), url);
    }
  };

  return createPortal(
    <div lang={resolvedLang} className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-muted/45"
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="glass-surface relative z-[301] flex h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-sm text-foreground sm:h-[calc(100dvh-3rem)] lg:h-[88dvh]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(0,0,0,0.16))]" />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-sm border border-border/60 bg-muted/60 p-3 text-foreground/70 transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          aria-label={t('common.close')}
          title={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
          <aside className="relative flex min-h-0 shrink-0 items-center justify-center border-b border-border/60 bg-card/50 p-0 sm:p-0 lg:border-b-0 lg:border-r lg:p-0">
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/10 via-transparent to-transparent" />

            <div className="relative w-full max-w-[240px] sm:max-w-[320px] lg:max-w-[460px]">
              <TCGHolographicCard
                card={displayCard}
                priority
                noFrame
                sizes="(min-width: 1024px) 460px, (min-width: 640px) 320px, 240px"
              />

              <div className="mt-5 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.24em] text-foreground/40">
                <span className="truncate">{displayCard.set?.name || t('tcg.unknown')}</span>
                <span className="shrink-0">#{displayCard.localId}</span>
              </div>
            </div>
          </aside>

          <div className="relative min-h-0 overflow-y-auto p-5 sm:p-6 lg:p-10 scrollbar-premium">
            {isHydrating ? (
              <DetailSkeleton />
            ) : (
              <div className="relative space-y-7">

                {/* ── Identity ─────────────────────────────────────── */}
                <header className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-sm border px-3 py-1 text-[11px] font-black uppercase tracking-widest', getCategoryTone(category).badge)}>
                      {categoryLabel}
                    </span>
                    {displayCard.rarity && (
                      <span className="rounded-sm border border-border/30 bg-card/35 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-foreground/45">
                        {displayCard.rarity}
                      </span>
                    )}
                    {displayCard.stage && (
                      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/35">
                        {getStageLabel(displayCard.stage, t)}
                      </span>
                    )}
                    {displayCard.trainerType && (
                      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/35">
                        {getTrainerTypeLabel(displayCard.trainerType, t)}
                      </span>
                    )}
                    {displayCard.energyType && (
                      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground/35">
                        {getEnergyTypeLabel(displayCard.energyType, t)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4">
                    <h2 id={titleId} className="text-3xl font-display font-black uppercase tracking-tight sm:text-4xl xl:text-5xl">
                      {displayCard.name}
                    </h2>
                    {typeof displayCard.hp === 'number' && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground/30">{t('stats.hp')}</span>
                        <span className="text-3xl font-display font-black text-primary sm:text-4xl">{displayCard.hp}</span>
                      </div>
                    )}
                  </div>

                  <p id={descriptionId} className="max-w-2xl text-sm leading-6 text-foreground/50">
                    {effectText || t('tcg.detail_empty')}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <ActionPill
                      active={compared}
                      onClick={() => (compared ? removeTCGCompare(displayCard.id) : addTCGCompare(displayCard.id))}
                      label={compared ? t('tcg.remove_from_compare') : t('tcg.add_to_compare')}
                      badge={compared ? tcgCompareList.length : undefined}
                    />
                    <ActionPill active={owned} onClick={() => toggleTCGOwned(displayCard.id)} label={t('tcg.mark_owned')} />
                    <ActionPill active={wishlisted} onClick={() => toggleTCGWishlist(displayCard.id)} label={t('tcg.mark_wishlist')} />
                    <ActionPill active={false} onClick={handleShareCard} label={t('detail.share')} />
                  </div>
                </header>

                {/* ── Market price ─────────────────────────────────── */}
                {marketValue && (
                  <div className="flex items-center justify-between rounded-sm border border-primary/20 bg-primary/5 px-5 py-4">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/40">
                        {t('tcg.market_price')}
                      </p>
                      <p className="mt-1 text-2xl font-black leading-none text-primary">{marketValueLabel}</p>
                      <p className="mt-1.5 text-[11px] font-bold text-foreground/30">
                        via {marketValue.currency === 'EUR' ? 'Cardmarket' : 'TCGplayer'}
                      </p>
                    </div>
                    <BadgeDollarSign className="h-8 w-8 shrink-0 text-primary/20" />
                  </div>
                )}

                {/* ── Card details ─────────────────────────────────── */}
                <section className="space-y-3">
                  <SectionLabel>{t('tcg.expansion')}</SectionLabel>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoItem icon={Box} label={t('tcg.expansion')} value={displayCard.set?.name || t('tcg.unknown')} />
                    <InfoItem icon={Info} label={t('tcg.collector_no')} value={`#${displayCard.localId}${totalCards ? ` / ${totalCards}` : ''}`} />
                    <InfoItem icon={Brush} label={t('tcg.illustrator')} value={displayCard.illustrator || t('tcg.unknown')} />
                    <InfoItem icon={Activity} label={t('tcg.regulation')} value={displayCard.regulationMark || t('tcg.none')} />
                    {pokemonPageHref && (
                      <InfoItem
                        icon={ExternalLink}
                        label={t('tcg.pokemon_page')}
                        value={(
                          <Link href={pokemonPageHref} className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline">
                            {t('tcg.open_pokemon_page')}
                          </Link>
                        )}
                      />
                    )}
                  </div>
                </section>

                {/* ── Pokémon ──────────────────────────────────────── */}
                {category === 'Pokemon' && (
                  <section className="space-y-5">
                    <SectionLabel>{t('tcg.card_category_pokemon')}</SectionLabel>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoItem icon={Zap} label={t('tcg.pokemon_types')} value={displayCard.types?.join(', ') || t('tcg.none')} />
                      <InfoItem icon={Shield} label={t('tcg.stage')} value={displayCard.stage ? getStageLabel(displayCard.stage, t) : t('tcg.none')} />
                      <InfoItem icon={Sparkles} label={t('tcg.evolves_from')} value={displayCard.evolveFrom || t('tcg.none')} />
                    </div>

                    {(displayCard.weaknesses?.length || displayCard.resistances?.length || displayCard.retreat || displayCard.retreatCost) ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <InfoItem icon={Shield} label={t('detail.weaknesses')} value={formatCardList(displayCard.weaknesses, t('tcg.none'))} />
                        <InfoItem icon={Shield} label={t('detail.resistances')} value={formatCardList(displayCard.resistances, t('tcg.none'))} />
                        <InfoItem icon={Zap} label={t('tcg.retreat_cost')} value={formatRetreatCost(displayCard.retreat ?? displayCard.retreatCost ?? 0, t)} />
                      </div>
                    ) : null}

                    {abilities.length > 0 && (
                      <div className="space-y-3">
                        <SectionLabel>{t('tcg.abilities')}</SectionLabel>
                        <div className="space-y-3">
                          {abilities.map((ability, index) => (
                            <EffectPanel
                              key={`${ability.name || 'ability'}-${index}`}
                              icon={Sparkles}
                              title={ability.name || t('tcg.unknown')}
                              text={ability.effect || ability.text || t('tcg.none')}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {attacks.length > 0 && (
                      <div className="space-y-3">
                        <SectionLabel>{t('detail.moveset')}</SectionLabel>
                        <div className="space-y-3">
                          {attacks.map((attack, index) => (
                            <AttackPanel key={`${attack.name || 'attack'}-${index}`} attack={attack} />
                          ))}
                        </div>
                      </div>
                    )}

                    {effectText && (
                      <EffectPanel icon={ScrollText} title={t('tcg.flavor_text')} text={effectText} />
                    )}
                  </section>
                )}

                {/* ── Trainer / Energy ─────────────────────────────── */}
                {(category === 'Trainer' || category === 'Energy') && (
                  <section className="space-y-4">
                    <SectionLabel>{categoryLabel}</SectionLabel>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {displayCard.trainerType && (
                        <InfoItem icon={Shield} label={t('tcg.trainer_type')} value={getTrainerTypeLabel(displayCard.trainerType, t)} />
                      )}
                      {displayCard.energyType && (
                        <InfoItem icon={Zap} label={t('tcg.energy_type')} value={getEnergyTypeLabel(displayCard.energyType, t)} />
                      )}
                    </div>
                    {effectText && (
                      <EffectPanel icon={Sparkles} title={t('tcg.effect')} text={effectText} />
                    )}
                  </section>
                )}

                {/* ── Price history chart ──────────────────────────── */}
                <section className="space-y-3">
                  <PriceChart cardId={displayCard.id} />
                </section>

                {/* ── Price alerts ─────────────────────────────────── */}
                <section className="space-y-3">
                  <PriceAlertManager cardId={displayCard.id} cardName={displayCard.name} />
                </section>

                {/* ── Footer ───────────────────────────────────────── */}
                <div className="flex justify-end border-t border-border/20 pt-5">
                  <a
                    href={`https://api.tcgdex.net/v2/${resolvedLang}/cards/${displayCard.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-sm border border-border/40 bg-card/60 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-foreground/40 transition-all hover:bg-primary/10 hover:text-primary shadow-[var(--shadow-pixel-sm)]"
                  >
                    {t('tcg.open_raw_data')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </div>,
    document.body,
  );
}

interface InfoItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/30">{children}</span>
      <div className="h-px flex-1 bg-border/20" />
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="rounded-sm border border-border/40 bg-card/35 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-3 w-3 text-primary" />
        <span className="text-[11px] font-black uppercase tracking-widest text-foreground/30">{label}</span>
      </div>
      <span className="block break-words text-xs font-bold leading-snug text-foreground/80">
        {value}
      </span>
    </div>
  );
}

function EffectPanel({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="glass-card space-y-3 p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-black uppercase tracking-widest text-primary">
          {title}
        </h3>
      </div>
      <p className="font-body text-sm leading-relaxed text-foreground/60">{text}</p>
    </div>
  );
}

function AttackPanel({ attack }: { attack: TCGCardAttack }) {
  return (
    <div className="glass-card group p-6 transition-all hover:bg-card/60">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {attack.cost?.map((cost, costIndex) => (
              <span
                key={`${cost}-${costIndex}`}
                className="rounded-sm border border-border/60 bg-card/55 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.16em] text-foreground/50"
              >
                {cost}
              </span>
            ))}
          </div>
          <h4 className="text-base font-display font-black uppercase text-foreground/90 transition-colors group-hover:text-primary">
            {attack.name}
          </h4>
        </div>

        {attack.damage && (
          <span className="text-xl font-display font-black text-foreground/40">
            {attack.damage}
          </span>
        )}
      </div>

      <p className="font-body text-sm leading-relaxed text-foreground/50">
        {attack.effect || attack.text || ''}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-5 w-28 rounded-sm bg-card/65 animate-pulse" />
        <div className="h-12 w-3/4 rounded-sm bg-card/60 animate-pulse" />
        <div className="h-4 w-full rounded-sm bg-card/55 animate-pulse" />
        <div className="h-4 w-5/6 rounded-sm bg-card/55 animate-pulse" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 rounded-sm bg-card/50 animate-pulse" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-4 w-32 rounded-sm bg-card/60 animate-pulse" />
        <div className="h-28 rounded-sm bg-card/50 animate-pulse" />
        <div className="h-28 rounded-sm bg-card/50 animate-pulse" />
      </div>
    </div>
  );
}

function ActionPill({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-sm border px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-100 shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        active
          ? 'border-primary/60 bg-primary/15 text-primary shadow-[var(--shadow-pixel-sm)]'
          : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
      )}
    >
      {label}
      {typeof badge === 'number' && badge > 0 && (
        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-black leading-none text-primary-foreground">
          {badge}
        </span>
      )}
    </button>
  );
}

function getCategoryLabel(category: TCGCardCategory, t: (key: string, options?: { defaultValue?: string }) => string) {
  switch (category) {
    case 'Trainer':
      return t('tcg.card_category_trainer');
    case 'Energy':
      return t('tcg.card_category_energy');
    default:
      return t('tcg.card_category_pokemon');
  }
}

function getCategoryTone(category: TCGCardCategory) {
  switch (category) {
    case 'Trainer':
      return {
        badge: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
      };
    case 'Energy':
      return {
        badge: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200',
      };
    default:
      return {
        badge: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
      };
  }
}

function getStageLabel(stage: string, t: (key: string, options?: { defaultValue?: string }) => string) {
  const mapping: Record<string, string> = {
    Basic: 'tcg.phase_basic',
    Stage1: 'tcg.phase_stage_1',
    Stage2: 'tcg.phase_stage_2',
    LevelX: 'tcg.phase_level_x',
    V: 'tcg.phase_v',
    VSTAR: 'tcg.phase_vstar',
    VMAX: 'tcg.phase_vmax',
    EX: 'tcg.phase_ex',
    GX: 'tcg.phase_gx',
    MEGA: 'tcg.phase_mega',
  };

  return mapping[stage] ? t(mapping[stage]) : stage;
}

function getTrainerTypeLabel(type: string, t: (key: string, options?: { defaultValue?: string }) => string) {
  const mapping: Record<string, string> = {
    Supporter: 'tcg.trainer_type_supporter',
    Item: 'tcg.trainer_type_item',
    Stadium: 'tcg.trainer_type_stadium',
    Tool: 'tcg.trainer_type_tool',
    'Ace Spec': 'tcg.trainer_type_ace_spec',
    'Technical Machine': 'tcg.trainer_type_technical_machine',
    'Goldenrod Game Corner': 'tcg.trainer_type_goldenrod_game_corner',
    'Rocket\'s Secret Machine': 'tcg.trainer_type_rockets_secret_machine',
  };

  return mapping[type] ? t(mapping[type]) : type;
}

function getEnergyTypeLabel(type: string, t: (key: string, options?: { defaultValue?: string }) => string) {
  switch (type) {
    case 'Basic':
      return t('tcg.energy_type_basic');
    case 'Special':
      return t('tcg.energy_type_special');
    default:
      return type;
  }
}

function formatCardList(items: { type: string; value: string }[] | undefined, fallback: string) {
  if (!items || items.length === 0) return fallback;
  return items.map((item) => `${item.type} ${item.value}`).join(' · ');
}

function formatRetreatCost(retreat: number, t: (key: string, options?: { defaultValue?: string }) => string) {
  if (!retreat) return t('tcg.none');
  return Array.from({ length: retreat }).map(() => '●').join(' ');
}

function normalizeAbilities(abilities?: TCGCardAbility | TCGCardAbility[]) {
  if (!abilities) return [];
  return Array.isArray(abilities) ? abilities : [abilities];
}
