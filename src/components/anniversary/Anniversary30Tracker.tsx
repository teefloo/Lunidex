'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Anniversary30CardGrid,
  type Anniversary30CardGridLabels,
} from '@/components/anniversary/Anniversary30CardGrid';
import {
  ANNIVERSARY_30_LEGACY_STORAGE_KEY,
  ANNIVERSARY_30_STORAGE_KEY,
  type Anniversary30Card,
  type Anniversary30Language,
} from '@/lib/anniversary-30';
import {
  getAnniversary30CardIdByLegacySlot,
  getAnniversary30MigrationPlan,
  type Anniversary30MigrationPlan,
} from '@/lib/anniversary-30-migration';
import { getTCGCollectionCardIds } from '@/lib/tcg-collections';
import { capturePostHogEvent } from '@/lib/posthog-client';
import { hasSyncAccess, requestSyncAccess } from '@/store/sync-access';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';
import { usePrimeDexStore } from '@/store/primedex';

type Anniversary30TrackerProps = {
  cards: readonly Anniversary30Card[];
  collectionKey: string;
  language: Anniversary30Language;
  cardLabels: Anniversary30CardGridLabels;
  labels: {
    progress: string;
    loading: string;
    reset: string;
    resetAria: string;
    localNote: string;
    migrationTitle: string;
    migrationPendingAuth: string;
    migrationPendingIdentity: string;
    migrationReady: string;
    migrationDone: string;
    migrationAction: string;
    migrationRetry: string;
    migrationPreserved: string;
  };
};

function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function readStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function getMigrationMessage(
  plan: Anniversary30MigrationPlan,
  labels: Anniversary30TrackerProps['labels'],
): string | null {
  switch (plan.status) {
    case 'pending-auth':
      return labels.migrationPendingAuth;
    case 'pending-identity':
      return labels.migrationPendingIdentity;
    case 'ready':
      return plan.cardIdsToAdd.length > 0 ? labels.migrationReady : labels.migrationDone;
    case 'empty':
    default:
      return null;
  }
}

export default function Anniversary30Tracker({
  cards,
  collectionKey,
  language,
  cardLabels,
  labels,
}: Anniversary30TrackerProps) {
  const collectionCards = usePrimeDexStore((state) => state.tcgCollectionCards);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const setVariantQuantity = usePrimeDexStore((state) => state.setTCGCollectionVariantQuantity);
  const removeCollectionCard = usePrimeDexStore((state) => state.removeTCGCollectionCard);
  const [migrationRun, setMigrationRun] = useState(0);
  const [migrationBusy, setMigrationBusy] = useState(false);
  const attemptedMigration = useRef<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const syncStatus = useSyncAccessStatus();

  const ownedIds = useMemo(
    () => new Set(getTCGCollectionCardIds(collectionKey, collectionCards)),
    [collectionCards, collectionKey],
  );
  const ownedCount = useMemo(
    () => cards.filter((card) => ownedIds.has(card.id)).length,
    [cards, ownedIds],
  );
  const cardIdBySlot = useMemo(() => getAnniversary30CardIdByLegacySlot(cards), [cards]);

  const migrationPlan = useMemo(() => {
    if (!hasHydrated) return null;
    void migrationRun;
    return getAnniversary30MigrationPlan(
      {
        legacyValue: readStorageValue(ANNIVERSARY_30_LEGACY_STORAGE_KEY),
        stateValue: readStorageValue(ANNIVERSARY_30_STORAGE_KEY),
      },
      {
        collectionKey,
        cardIdBySlot,
        alreadyOwnedCardIds: [...ownedIds],
      },
    );
  }, [cardIdBySlot, collectionKey, hasHydrated, migrationRun, ownedIds]);

  const migration = useMemo(() => {
    if (!migrationPlan || migrationPlan.status === 'empty') return migrationPlan;
    return syncStatus === 'ready' || migrationPlan.status === 'pending-identity'
      ? migrationPlan
      : { ...migrationPlan, status: 'pending-auth' as const };
  }, [migrationPlan, syncStatus]);

  const runMigration = useCallback((plan: Anniversary30MigrationPlan): void => {
    setMigrationBusy(true);
    let migratedAll = true;
    for (const cardId of plan.cardIdsToAdd) {
      setVariantQuantity(collectionKey, cardId, 'unspecified', 1);
      if (!usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, cardId)) {
        migratedAll = false;
        break;
      }
    }

    if (migratedAll && writeStorageValue(ANNIVERSARY_30_STORAGE_KEY, plan.serializedState)) {
      setActionMessage(labels.migrationDone);
      capturePostHogEvent('anniversary_30_migration', { status: 'completed' });
    } else if (!migratedAll) {
      setActionMessage(labels.migrationPendingIdentity);
      capturePostHogEvent('anniversary_30_migration', { status: 'partial' });
    }
    setMigrationBusy(false);
  }, [collectionKey, labels.migrationDone, labels.migrationPendingIdentity, setVariantQuantity]);

  useEffect(() => {
    if (!hasHydrated || migrationBusy) return;

    if (!migrationPlan || migrationPlan.status !== 'ready') return;
    if (migrationPlan.cardIdsToAdd.length === 0) {
      if (migrationPlan.serializedState !== readStorageValue(ANNIVERSARY_30_STORAGE_KEY)) {
        writeStorageValue(ANNIVERSARY_30_STORAGE_KEY, migrationPlan.serializedState);
      }
      return;
    }
    if (!hasSyncAccess()) return;
    const attemptKey = migrationPlan.cardIdsToAdd.join('|');
    if (attemptedMigration.current === attemptKey) return;
    attemptedMigration.current = attemptKey;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) runMigration(migrationPlan);
    });
    return () => { cancelled = true; };
  }, [hasHydrated, migrationBusy, migrationPlan, runMigration]);

  function handleMigrationAction(): void {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      return;
    }
    attemptedMigration.current = null;
    setActionMessage(null);
    setMigrationRun((value) => value + 1);
  }

  function handleReset(): void {
    if (!hasSyncAccess()) {
      requestSyncAccess();
      setActionMessage(cardLabels.syncRequired);
      return;
    }
    for (const card of cards) {
      if (usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, card.id)) {
        removeCollectionCard(collectionKey, card.id);
      }
    }
    setActionMessage(null);
  }

  const migrationText = migration ? getMigrationMessage(migration, labels) : null;
  const canRunMigration = migration?.status === 'pending-auth'
    || migration?.status === 'pending-identity'
    || migration?.status === 'ready';
  const migrationActionLabel = migration?.status === 'pending-auth'
    ? labels.migrationAction
    : labels.migrationRetry;

  return (
    <div aria-busy={!hasHydrated || migrationBusy}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
        <p className="text-lg font-extrabold tracking-tight" aria-live="polite">
          {hasHydrated
            ? fillTemplate(labels.progress, { count: ownedCount, total: cards.length })
            : labels.loading}
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasHydrated || ownedCount === 0 || migrationBusy}
          aria-label={labels.resetAria}
          className="glass-btn touch-target px-4 py-2 text-sm font-bold disabled:pointer-events-none disabled:opacity-40"
        >
          {labels.reset}
        </button>
      </div>

      {migrationText && (
        <div className="mt-5 rounded-sm border border-primary/25 bg-primary/5 p-4" role="status" aria-live="polite">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-primary">{labels.migrationTitle}</p>
          <p className="mt-2 text-sm leading-6 text-foreground/65">{migrationText}</p>
          {migration.preservedSlotIds.length > 0 && (
            <p className="mt-2 text-xs leading-5 text-foreground/50">
              {fillTemplate(labels.migrationPreserved, { count: migration.preservedSlotIds.length })}
            </p>
          )}
          {canRunMigration && (
            <button
              type="button"
              onClick={handleMigrationAction}
              disabled={migrationBusy}
              className="mt-4 inline-flex min-h-11 items-center rounded-sm border border-primary/40 bg-primary/10 px-4 text-xs font-black uppercase tracking-[0.08em] text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 disabled:opacity-50"
            >
              {migrationActionLabel}
            </button>
          )}
        </div>
      )}

      {actionMessage && (
        <p className="mt-4 text-sm font-bold text-amber-300" role="status" aria-live="polite">{actionMessage}</p>
      )}

      <p className="mt-5 text-sm leading-7 text-foreground/60">{labels.localNote}</p>

      <Anniversary30CardGrid
        cards={cards}
        collectionKey={collectionKey}
        language={language}
        labels={cardLabels}
        filters={['all', 'owned', 'missing']}
        className="mt-7"
      />
    </div>
  );
}
