'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueries } from '@tanstack/react-query';
import { ChevronDown, Search, Sparkles, Trophy } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { usePrimeDexStore } from '@/store/primedex';
import type { TCGCollectionSetSummary } from '@/types/tcg';
import { useTranslation } from '@/lib/i18n';
import { fetchCollectionValue } from '@/lib/api/tcg';
import { countPhysicalTCGCards, encodeTCGCollectionKey, getTCGCollectionCardIds, getTCGCollectionCardOwnerships } from '@/lib/tcg-collections';
import type { TCGCardLanguage } from '@/lib/tcg-language';
import { getTCGCardLanguageName } from '@/lib/tcg-language';
import { getSetCompletionFromSet, type TCGCollectionValueGroup, type TCGOwnedVariant } from '@/lib/tcg-collection';
import { TCGProgressBar } from './TCGProgressBar';
import { TCGActiveSetInsights } from './TCGActiveSetInsights';
import { TCGImageWithFallback } from './TCGImageWithFallback';
import { getTCGSetImageCandidates } from '@/lib/tcg-images';
import { TCGLanguageSelector } from './TCGLanguageSelector';

export interface TCGCollectionOverviewEntry {
  collectionKey: string;
  set: TCGCollectionSetSummary;
  language: TCGCardLanguage;
}

interface TCGCollectionOverviewProps {
  collections: TCGCollectionOverviewEntry[];
  legacyOwnedCards?: string[];
}

function formatCurrency(group: TCGCollectionValueGroup, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: group.currency, maximumFractionDigits: 2 }).format(group.total);
  } catch {
    return `${group.total.toFixed(2)} ${group.currency}`;
  }
}

export function TCGCollectionOverview({ collections, legacyOwnedCards = [] }: TCGCollectionOverviewProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const router = useRouter();
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const legacyStoreCards = usePrimeDexStore((state) => state.tcgLegacyOwnedCards);
  const activeCollections = usePrimeDexStore((state) => state.tcgActiveCollections);
  const toggleActive = usePrimeDexStore((state) => state.toggleTCGActiveCollection);
  const assignLegacy = usePrimeDexStore((state) => state.assignLegacyTCGSetLanguage);
  const transferCollectionCards = usePrimeDexStore((state) => state.transferTCGCollectionCards);
  const setBrowseLanguage = usePrimeDexStore((state) => state.setTCGBrowseLanguage);
  const displayCurrency = usePrimeDexStore((state) => state.tcgDisplayCurrency);
  const [filterInProgress, setFilterInProgress] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'progress' | 'release-newest' | 'release-oldest' | 'name-asc' | 'name-desc'>('progress');
  const searchId = useId();
  const sortId = useId();
  const setListId = useId();

  const effectiveLegacyCards = legacyOwnedCards.length > 0 ? legacyOwnedCards : legacyStoreCards;
  const physicalCount = useMemo(() => countPhysicalTCGCards(collectionCards, effectiveLegacyCards), [collectionCards, effectiveLegacyCards]);
  const entries = useMemo(() => collections.map((entry) => {
    const ownedIds = new Set(getTCGCollectionCardIds(entry.collectionKey, collectionCards));
    const ownedVariants: TCGOwnedVariant[] = getTCGCollectionCardOwnerships(entry.collectionKey, collectionCards)
      .map(({ cardId, variant, quantity }) => ({ cardId, variant, quantity }));
    return { ...entry, ownedIds, ownedVariants, completion: getSetCompletionFromSet(entry.set, ownedIds) };
  }), [collectionCards, collections]);
  const startedEntries = useMemo(
    () => entries.filter((entry) => entry.ownedVariants.length > 0 || activeCollections.includes(entry.collectionKey)),
    [activeCollections, entries],
  );
  const collectionValueQueries = useQueries({
    queries: startedEntries.map((entry) => {
      const ownership = entry.ownedVariants;
      return {
        // Include the selected currency so switching it immediately rebuilds
        // coverage and totals without mixing EUR and USD source quotes.
        queryKey: ['tcg', 'collection-value-v5', entry.collectionKey, ownership, displayCurrency],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCollectionValue(ownership, entry.language, signal, displayCurrency),
        staleTime: 60 * 60 * 1000,
        enabled: mounted && ownership.length > 0,
      };
    }),
  });
  const totalValueGroups = useMemo(() => {
    const totals = new Map<string, TCGCollectionValueGroup>();
    for (const group of collectionValueQueries.flatMap((query) => query.data?.groups ?? [])) {
      if (group.currency.toUpperCase() !== displayCurrency) continue;
      const key = group.currency.toUpperCase();
      const existing = totals.get(key);
      totals.set(key, existing
        ? { ...existing, total: existing.total + group.total, count: existing.count + group.count }
        : group);
    }
    return [...totals.values()];
  }, [collectionValueQueries, displayCurrency]);
  const valuationCoverage = useMemo(() => {
    const priced = collectionValueQueries.reduce((sum, query) => sum + (query.data?.pricedCount ?? 0), 0);
    return { owned: physicalCount, priced, unpriced: Math.max(0, physicalCount - priced) };
  }, [collectionValueQueries, physicalCount]);
  const stats = useMemo(() => {
    const totalCards = startedEntries.reduce((sum, entry) => sum + entry.completion.total, 0);
    const ownedInCollections = startedEntries.reduce((sum, entry) => sum + entry.completion.owned, 0);
    const completeSets = startedEntries.filter((entry) => entry.completion.total > 0 && entry.completion.owned >= entry.completion.total).length;
    return { totalCards, totalOwned: physicalCount, ownedInCollections, completeSets, totalSets: startedEntries.length, percentage: totalCards > 0 ? Math.round((ownedInCollections / totalCards) * 100) : 0 };
  }, [physicalCount, startedEntries]);
  const filteredEntries = useMemo(() => startedEntries.filter((entry) => {
    if (filterInProgress && !activeCollections.includes(entry.collectionKey)) return false;
    return !search || entry.set.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  }).sort((a, b) => {
    switch (sortMode) {
      case 'release-newest': return a.set.releaseRank - b.set.releaseRank;
      case 'release-oldest': return b.set.releaseRank - a.set.releaseRank;
      case 'name-asc': return a.set.name.localeCompare(b.set.name);
      case 'name-desc': return b.set.name.localeCompare(a.set.name);
      default: return b.completion.percentage - a.completion.percentage || a.set.name.localeCompare(b.set.name) || a.language.localeCompare(b.language);
    }
  }), [activeCollections, filterInProgress, search, sortMode, startedEntries]);
  const legacyGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const cardId of effectiveLegacyCards) {
      const separator = cardId.lastIndexOf('-');
      const setId = separator > 0 ? cardId.slice(0, separator) : cardId;
      groups.set(setId, [...(groups.get(setId) ?? []), cardId]);
    }
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [effectiveLegacyCards]);

  const openCollectionInLanguage = (setId: string, language: TCGCardLanguage, sourceCollectionKey: string) => {
    const targetCollectionKey = encodeTCGCollectionKey(language, setId);
    if (!targetCollectionKey || !transferCollectionCards(sourceCollectionKey, targetCollectionKey)) return;
    setBrowseLanguage(language);
    router.push(localeHref(`/tcg/collection/${language}/${encodeURIComponent(setId)}`));
  };

  if (!mounted) return null;
  return (
    <div className="space-y-8">
      <div className="rounded-sm border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-card/20 p-5 shadow-[var(--shadow-pixel)]">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70">{t('tcg.collection_recap_title')}</h2></div><Link href={localeHref('/tcg/start')} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/15 px-4 text-[11px] font-black uppercase tracking-[0.12em] text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">{t('tcg.activation.start_title', { defaultValue: 'Add a collection' })}</Link></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Stat label={t('tcg.collection_total_owned')} value={physicalCount} /><Stat label={t('tcg.collection_sets_completed')} value={`${stats.completeSets}/${stats.totalSets}`} /><div><p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{t('tcg.collection_overall_progress')}</p><p className="mt-1 text-3xl font-black leading-none">{stats.percentage}%</p><TCGProgressBar owned={stats.ownedInCollections} total={stats.totalCards} size="sm" className="mt-2 w-full" /></div><div><p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{t('tcg.collection_value_estimate')}</p>{collectionValueQueries.some((query) => query.isFetching) ? <p className="mt-1 text-sm font-bold text-foreground/55">{t('tcg.collection_loading')}</p> : totalValueGroups.length ? <><p className="mt-1 break-words text-2xl font-black text-primary">{totalValueGroups.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ')}</p><p className="mt-0.5 text-[11px] font-bold text-foreground/55">{t('tcg.collection_value_coverage', { priced: valuationCoverage.priced, owned: valuationCoverage.owned })}</p>{valuationCoverage.unpriced > 0 && <p className="text-[11px] font-bold text-amber-200/70">{t('tcg.collection_value_unpriced', { count: valuationCoverage.unpriced })}</p>}</> : physicalCount > 0 ? <><p className="mt-1 text-sm font-bold text-foreground/55">{t('tcg.collection_value_unavailable')}</p><p className="mt-0.5 text-[11px] font-bold text-foreground/55">{t('tcg.collection_value_coverage', { priced: 0, owned: physicalCount })}</p><p className="text-[11px] font-bold text-amber-200/70">{t('tcg.collection_value_unpriced', { count: physicalCount })}</p></> : <p className="mt-1 text-sm font-bold text-foreground/55">{t('tcg.collection_value_unavailable')}</p>}</div></div>
      </div>

      {legacyGroups.length > 0 && <section className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-5" aria-labelledby="tcg-legacy-title"><div><h2 id="tcg-legacy-title" className="text-sm font-black uppercase tracking-[0.12em] text-amber-100">{t('tcg.collection_legacy_title', { defaultValue: 'Historical cards need a language' })}</h2><p className="mt-1 text-sm leading-6 text-amber-100/70">{t('tcg.collection_legacy_description', { defaultValue: 'These cards were saved before language-aware collections. Attribute each set explicitly.' })}</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{legacyGroups.map(([setId, cards]) => <LegacySetAttributionRow key={setId} setId={setId} cards={cards} browseLanguage={browseLanguage} onAssign={assignLegacy} />)}</div></section>}

      <section className="space-y-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-foreground/40" aria-hidden="true" /><h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/65">{t('tcg.collection_active_insights')}</h2></div>{filteredEntries.filter((entry) => activeCollections.includes(entry.collectionKey)).length === 0 ? <p className="rounded-sm border border-dashed border-border/30 bg-card/20 p-4 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/30">{t('tcg.collection_active_insights_hint')}</p> : <div className="grid gap-4 lg:grid-cols-2">{filteredEntries.filter((entry) => activeCollections.includes(entry.collectionKey)).map((entry) => <TCGActiveSetInsights key={entry.collectionKey} set={entry.set} ownedIds={entry.ownedIds} ownedVariants={entry.ownedVariants} resolvedLang={entry.language} />)}</div>}</section>

      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-foreground/40" aria-hidden="true" /><h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/65">{t('tcg.collection_per_set')}</h2></div><p className="mt-1 max-w-2xl text-xs leading-5 text-foreground/50">{t('tcg.collection_language_per_set_hint', { defaultValue: 'Choose the card language separately for each collection. Changing it transfers the cards to the selected language; an empty previous variant remains in history but is hidden from this list.' })}</p></div><div className="grid w-full gap-2 sm:flex sm:w-auto sm:items-center"><label htmlFor={searchId} className="sr-only">{t('tcg.collection_search_sets')}</label><div className="flex min-h-11 w-full items-center gap-2 rounded-sm border border-border/30 bg-card/40 px-3 sm:w-48"><Search className="h-4 w-4 shrink-0 text-foreground/45" aria-hidden="true" /><input id={searchId} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('tcg.collection_search_sets')} className="min-h-11 min-w-0 flex-1 bg-transparent text-[11px] font-bold text-foreground placeholder:text-foreground/45 focus:outline-none" /></div><div className="flex min-h-11 items-center gap-1 rounded-sm border border-border/30 bg-card/40 pl-3 pr-2"><label htmlFor={sortId} className="sr-only">{t('tcg.collection_sort_label')}</label><select id={sortId} value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)} className="min-h-11 min-w-0 appearance-none bg-transparent text-[11px] font-bold text-foreground/75 focus:outline-none"><option value="progress">{t('tcg.collection_sort_default')}</option><option value="release-newest">{t('tcg.collection_sort_release_newest')}</option><option value="release-oldest">{t('tcg.collection_sort_release_oldest')}</option><option value="name-asc">{t('tcg.collection_sort_name_asc')}</option><option value="name-desc">{t('tcg.collection_sort_name_desc')}</option></select><ChevronDown className="pointer-events-none h-4 w-4 text-foreground/45" aria-hidden="true" /></div><button type="button" onClick={() => setFilterInProgress((value) => !value)} aria-pressed={filterInProgress} aria-controls={setListId} className={`min-h-11 rounded-sm border px-3 text-[11px] font-bold ${filterInProgress ? 'border-primary/40 bg-primary/15 text-primary' : 'border-border/30 bg-card/40 text-foreground/70 hover:border-primary/30 hover:text-primary/60'}`}>{t('tcg.collection_in_progress')}</button></div></div>
        {filteredEntries.length === 0 ? <div className="flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-border/30 bg-card/20 py-16 text-center"><p className="text-sm font-black uppercase tracking-[0.1em] text-foreground/50">{t('tcg.collection_not_started', { defaultValue: 'No collections started yet' })}</p><Link href={localeHref('/tcg/start')} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-[11px] font-black uppercase tracking-[0.08em] text-primary hover:bg-primary/15">{t('tcg.activation.start_title', { defaultValue: 'Add a collection' })}</Link></div> : <div id={setListId} className="flex flex-col gap-3">{filteredEntries.map((entry) => { const isActive = activeCollections.includes(entry.collectionKey); const missing = Math.max(entry.completion.total - entry.completion.owned, 0); const entryIndex = startedEntries.findIndex((candidate) => candidate.collectionKey === entry.collectionKey); const setValue = collectionValueQueries[entryIndex]?.data?.bySet[entry.set.id]; const languageName = getTCGCardLanguageName(entry.language, interfaceLanguage); return <div key={entry.collectionKey} className="group flex flex-col gap-3 rounded-sm border border-border/15 bg-card/30 p-3 shadow-[var(--shadow-pixel-sm)] transition-colors hover:border-primary/20 hover:bg-card/50 sm:flex-row sm:items-center sm:gap-4 sm:p-4"><Link href={localeHref(`/tcg/collection/${entry.language}/${encodeURIComponent(entry.set.id)}`)} aria-label={t('tcg.collection_view_set', { name: `${entry.set.name} — ${languageName}` })} className="flex min-w-0 flex-1 items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:gap-4">{entry.set.logo && <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-card/40"><TCGImageWithFallback candidates={getTCGSetImageCandidates(entry.set)} alt="" fill sizes="48px" className="object-contain p-1" /></div>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold transition-colors group-hover:text-primary">{entry.set.name}</p><span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-primary">{languageName}</span></div><TCGProgressBar owned={entry.completion.owned} total={entry.completion.total} size="sm" className="mt-2" /><p className="mt-1 text-[11px] font-bold text-foreground/60">{entry.completion.owned}/{entry.completion.total} · {missing} {t('tcg.collection_missing_count')}</p></div></Link><div className="min-w-0 shrink-0 sm:w-36 sm:text-right"><p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/45">{t('tcg.collection_set_owned_value')}</p>{setValue && setValue.ownedCount > 0 ? <><p className="break-words text-sm font-black text-primary">{setValue.groups.length ? setValue.groups.map((group) => formatCurrency(group, interfaceLanguage)).join(' · ') : t('tcg.collection_value_unavailable')}</p><p className="mt-0.5 text-[11px] font-bold text-foreground/55">{t('tcg.collection_value_coverage', { priced: setValue.pricedCount, owned: setValue.ownedCount })}</p>{(setValue.unpricedCount ?? 0) > 0 && <p className="text-[11px] font-bold text-amber-200/70">{t('tcg.collection_value_unpriced', { count: setValue.unpricedCount })}</p>}</> : <span className="text-[11px] font-bold text-foreground/45">{entry.completion.owned === 0 ? '—' : t('tcg.collection_value_unavailable')}</span>}</div><div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end"><TCGLanguageSelector value={entry.language} onChange={(nextLanguage) => openCollectionInLanguage(entry.set.id, nextLanguage, entry.collectionKey)} preserveQuery={false} ariaLabel={t('tcg.collection_language_for_set', { defaultValue: `Language for ${entry.set.name}` })} /><button type="button" onClick={() => toggleActive(entry.collectionKey)} aria-pressed={isActive} aria-label={t(isActive ? 'tcg.collection_active_set_remove' : 'tcg.collection_active_set_add', { name: `${entry.set.name} — ${languageName}` })} className={`min-h-11 rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.06em] ${isActive ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border/35 text-foreground/55 hover:border-primary/30 hover:text-primary/70'}`}>{isActive ? t('tcg.collection_in_progress') : t('tcg.collection_active_sets_singular')}</button></div></div>; })}</div>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div><p className="text-[11px] font-black uppercase tracking-[0.1em] text-foreground/60">{label}</p><p className="mt-1 text-3xl font-black leading-none">{value}</p></div>;
}

function LegacySetAttributionRow({
  setId,
  cards,
  browseLanguage,
  onAssign,
}: {
  setId: string;
  cards: string[];
  browseLanguage: TCGCardLanguage;
  onAssign: (setId: string, language: TCGCardLanguage) => string;
}) {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<TCGCardLanguage | undefined>();
  const language = selectedLanguage ?? browseLanguage;

  return (
    <div className="flex min-h-12 flex-col gap-2 rounded-sm border border-amber-200/20 bg-card/35 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 truncate text-sm font-bold text-amber-50">
        {setId} <span className="text-amber-100/60">({cards.length})</span>
      </span>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <TCGLanguageSelector
          value={selectedLanguage}
          onChange={setSelectedLanguage}
          preserveQuery={false}
          ariaLabel={t('tcg.collection_language_for_set', { defaultValue: `Language for ${setId}` })}
          className="bg-card/25"
        />
        <button type="button" onClick={() => onAssign(setId, language)} className="min-h-10 shrink-0 rounded-sm border border-amber-200/30 px-3 text-[11px] font-black uppercase tracking-[0.08em] text-amber-100 hover:bg-amber-200/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">
          {t('tcg.collection_attribute', { defaultValue: 'Attribute' })}
        </button>
      </div>
    </div>
  );
}
