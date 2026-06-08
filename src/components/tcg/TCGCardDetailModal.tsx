'use client';

import Link from 'next/link';
import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  X,
  Zap,
  Box,
  Trophy,
  Brush,
  ExternalLink,
  Activity,
  Info,
  Sparkles,
  Shield,
  ScrollText,
  Layers3,
} from 'lucide-react';
import type { TCGCard, TCGCardAbility, TCGCardAttack, TCGCardCategory } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getTCGCard } from '@/lib/api/tcg';
import { tcgKeys } from '@/lib/api/keys';
import { cn } from '@/lib/utils';
import { TCGHolographicCard } from './TCGHolographicCard';

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
  const compared = isTCGCompared(displayCard.id);
  const owned = isTCGOwned(displayCard.id);
  const wishlisted = isTCGWishlist(displayCard.id);

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onClose}
        aria-hidden="true"
        className="fixed inset-0 bg-muted/45 backdrop-blur-sm"
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="glass-surface relative z-[301] flex h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl text-foreground sm:h-[calc(100dvh-3rem)] lg:h-[88dvh]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(0,0,0,0.16))]" />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-border/60 bg-muted/60 p-3 text-foreground/70 backdrop-blur-xl transition-colors hover:bg-card/70 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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

              <div className="mt-5 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-foreground/40">
                <span className="truncate">{displayCard.set?.name || t('tcg.unknown')}</span>
                <span className="shrink-0">#{displayCard.localId}</span>
              </div>
            </div>
          </aside>

          <div className="relative min-h-0 overflow-y-auto p-5 sm:p-6 lg:p-10 scrollbar-premium">
            {isHydrating ? (
              <DetailSkeleton />
            ) : (
              <div className="relative space-y-8">
                <header className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest', getCategoryTone(category).badge)}>
                      {categoryLabel}
                    </span>
                    {displayCard.stage && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                        {getStageLabel(displayCard.stage, t)}
                      </span>
                    )}
                    {displayCard.trainerType && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                        {getTrainerTypeLabel(displayCard.trainerType, t)}
                      </span>
                    )}
                    {displayCard.energyType && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                        {getEnergyTypeLabel(displayCard.energyType, t)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-baseline gap-4">
                    <h2 id={titleId} className="text-3xl font-display font-black uppercase tracking-tight sm:text-4xl xl:text-6xl">
                      {displayCard.name}
                    </h2>

                    {typeof displayCard.hp === 'number' && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground/30">{t('stats.hp')}</span>
                        <span className="text-3xl font-display font-black text-primary sm:text-4xl">
                          {displayCard.hp}
                        </span>
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
                  />
                  <ActionPill
                    active={owned}
                    onClick={() => toggleTCGOwned(displayCard.id)}
                    label={t('tcg.mark_owned')}
                  />
                  <ActionPill
                    active={wishlisted}
                    onClick={() => toggleTCGWishlist(displayCard.id)}
                    label={t('tcg.mark_wishlist')}
                  />
                </div>
              </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <InfoItem
                    icon={Box}
                    label={t('tcg.expansion')}
                    value={displayCard.set?.name || t('tcg.unknown')}
                  />
                  <InfoItem
                    icon={Trophy}
                    label={t('tcg.rarity')}
                    value={displayCard.rarity || t('tcg.unknown')}
                  />
                  <InfoItem
                    icon={Info}
                    label={t('tcg.collector_no')}
                    value={`#${displayCard.localId}${totalCards ? ` / ${totalCards}` : ''}`}
                  />
                  <InfoItem
                    icon={Brush}
                    label={t('tcg.illustrator')}
                    value={displayCard.illustrator || t('tcg.unknown')}
                  />
                  <InfoItem
                    icon={Layers3}
                    label={t('tcg.card_id')}
                    value={displayCard.id}
                  />
                  {pokemonPageHref && (
                    <InfoItem
                      icon={ExternalLink}
                      label={t('tcg.pokemon_page')}
                      value={(
                        <Link
                          href={pokemonPageHref}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary/80 hover:underline"
                        >
                          {t('tcg.open_pokemon_page')}
                        </Link>
                      )}
                    />
                  )}
                  <InfoItem
                    icon={Activity}
                    label={t('tcg.regulation')}
                    value={displayCard.regulationMark || t('tcg.none')}
                  />
                </section>

                {category === 'Pokemon' && (
                  <section className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoItem
                        icon={Zap}
                        label={t('tcg.pokemon_types')}
                        value={displayCard.types?.join(', ') || t('tcg.none')}
                      />
                      <InfoItem
                        icon={Shield}
                        label={t('tcg.stage')}
                        value={displayCard.stage ? getStageLabel(displayCard.stage, t) : t('tcg.none')}
                      />
                      <InfoItem
                        icon={Sparkles}
                        label={t('tcg.evolves_from')}
                        value={displayCard.evolveFrom || t('tcg.none')}
                      />
                    </div>

                    {(displayCard.weaknesses?.length || displayCard.resistances?.length || displayCard.retreat || displayCard.retreatCost) ? (
                      <div className="grid gap-4 sm:grid-cols-3">
                        <InfoItem
                          icon={Shield}
                          label={t('detail.weaknesses')}
                          value={formatCardList(displayCard.weaknesses, t('tcg.none'))}
                        />
                        <InfoItem
                          icon={Shield}
                          label={t('detail.resistances')}
                          value={formatCardList(displayCard.resistances, t('tcg.none'))}
                        />
                        <InfoItem
                          icon={Zap}
                          label={t('tcg.retreat_cost')}
                          value={formatRetreatCost(displayCard.retreat ?? displayCard.retreatCost ?? 0, t)}
                        />
                      </div>
                    ) : null}

                    {abilities.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                          {t('tcg.abilities')}
                        </h3>
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
                      <div className="space-y-4">
                        <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
                          {t('detail.moveset')}
                        </h3>
                        <div className="space-y-3">
                          {attacks.map((attack, index) => (
                            <AttackPanel key={`${attack.name || 'attack'}-${index}`} attack={attack} />
                          ))}
                        </div>
                      </div>
                    )}

                    {effectText && (
                      <EffectPanel
                        icon={ScrollText}
                        title={t('tcg.flavor_text')}
                        text={effectText}
                      />
                    )}
                  </section>
                )}

                {(category === 'Trainer' || category === 'Energy') && (
                  <section className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {displayCard.trainerType && (
                        <InfoItem
                          icon={Shield}
                          label={t('tcg.trainer_type')}
                          value={getTrainerTypeLabel(displayCard.trainerType, t)}
                        />
                      )}
                      {displayCard.energyType && (
                        <InfoItem
                          icon={Zap}
                          label={t('tcg.energy_type')}
                          value={getEnergyTypeLabel(displayCard.energyType, t)}
                        />
                      )}
                      <InfoItem
                        icon={Info}
                        label={t('tcg.effect')}
                        value={effectText || t('tcg.none')}
                      />
                    </div>

                    {effectText && (
                      <EffectPanel
                        icon={Sparkles}
                        title={t('tcg.effect')}
                        text={effectText}
                      />
                    )}
                  </section>
                )}

                <section className="flex flex-col gap-6 border-t border-border/40 pt-8 xl:flex-row xl:items-end xl:justify-between">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <InfoItem
                      icon={Activity}
                      label={t('tcg.card_category')}
                      value={categoryLabel}
                    />
                    <InfoItem
                      icon={Info}
                      label={t('tcg.card_updated')}
                      value={displayCard.updated || t('tcg.none')}
                    />
                    <InfoItem
                      icon={Layers3}
                      label={t('tcg.card_code')}
                      value={`${displayCard.id} / ${displayCard.localId}`}
                    />
                  </div>

                  <a
                    href={`https://api.tcgdex.net/v2/${resolvedLang}/cards/${displayCard.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-foreground/40 transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    {t('tcg.open_raw_data')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </section>
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

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/35 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-3 w-3 text-primary" />
        <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30">{label}</span>
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
    <div className="glass-card space-y-3 rounded-2xl p-6">
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
    <div className="glass-card group rounded-2xl p-6 transition-all hover:bg-card/60">
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {attack.cost?.map((cost, costIndex) => (
              <span
                key={`${cost}-${costIndex}`}
                className="rounded-full border border-border/60 bg-card/55 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-foreground/50"
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
        <div className="h-5 w-28 rounded-full bg-card/65 animate-pulse" />
        <div className="h-12 w-3/4 rounded-full bg-card/60 animate-pulse" />
        <div className="h-4 w-full rounded-full bg-card/55 animate-pulse" />
        <div className="h-4 w-5/6 rounded-full bg-card/55 animate-pulse" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-card/50 animate-pulse" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-4 w-32 rounded-full bg-card/60 animate-pulse" />
        <div className="h-28 rounded-2xl bg-card/50 animate-pulse" />
        <div className="h-28 rounded-2xl bg-card/50 animate-pulse" />
      </div>
    </div>
  );
}

function ActionPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
        active
          ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_18px_rgba(227,53,13,0.12)]'
          : 'border-border/50 bg-card/50 text-foreground/55 hover:border-border/70 hover:bg-card/65 hover:text-foreground',
      )}
    >
      {label}
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
    'Rocket’s Secret Machine': 'tcg.trainer_type_rockets_secret_machine',
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
