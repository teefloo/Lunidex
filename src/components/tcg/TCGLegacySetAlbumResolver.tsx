'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useMounted } from '@/hooks/useMounted';
import { useClientLanguage, useLocaleHref } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { usePrimeDexStore } from '@/store/primedex';
import { decodeTCGCollectionKey, getTCGCollectionKeysForSet, type TCGCollection } from '@/lib/tcg-collections';
import { getTCGCardLanguageName, type TCGCardLanguage } from '@/lib/tcg-language';
import { TCGLanguageSelector } from './TCGLanguageSelector';
import { SyncRequiredPanel } from '@/components/auth/SyncRequiredPanel';
import { SyncStatusPanel } from '@/components/auth/SyncStatusPanel';
import { useAuth } from '@/lib/neon/AuthProvider';
import { useSyncAccessStatus } from '@/hooks/useSyncAccessStatus';

interface TCGLegacySetAlbumResolverProps {
  setId: string;
  activation?: boolean;
}

export function TCGLegacySetAlbumResolver({ setId, activation = false }: TCGLegacySetAlbumResolverProps) {
  const { t } = useTranslation();
  const mounted = useMounted();
  const router = useRouter();
  const interfaceLanguage = useClientLanguage();
  const localeHref = useLocaleHref();
  const { loading: authLoading, user } = useAuth();
  const syncStatus = useSyncAccessStatus();
  const collections = usePrimeDexStore((state) => state.tcgCollections);
  const legacyCards = usePrimeDexStore((state) => state.tcgLegacyOwnedCards);
  const browseLanguage = usePrimeDexStore((state) => state.tcgBrowseLanguage);
  const hasHydrated = usePrimeDexStore((state) => state._hasHydrated);
  const assignLegacy = usePrimeDexStore((state) => state.assignLegacyTCGSetLanguage);
  const matchingCollections = useMemo(() => getTCGCollectionKeysForSet(collections, setId), [collections, setId]);
  const legacyCount = useMemo(
    () => legacyCards.filter((cardId) => cardId.trim().toLowerCase().startsWith(`${setId.trim().toLowerCase()}-`)).length,
    [legacyCards, setId],
  );
  // Leave the choice unset until the persisted TCG preference has hydrated.
  // Initialising this to `en` made every historical set look English after a
  // reload, even when the user had selected another language before.
  const [selectedLanguage, setSelectedLanguage] = useState<TCGCardLanguage | undefined>();
  const promptLanguage = selectedLanguage ?? browseLanguage;

  useEffect(() => {
    // A known language variant is safe to resolve automatically only when
    // there are no v1 cards left to classify.  If historical cards for this
    // set remain, the resolver must stop and ask for an explicit attribution
    // instead of silently leaving that group language-less.
    if (!mounted || syncStatus !== 'ready' || matchingCollections.length !== 1 || legacyCount > 0) return;
    const collection = decodeTCGCollectionKey(matchingCollections[0]);
    if (!collection) return;
    const activationQuery = activation ? '?activation=1' : '';
    router.replace(`${localeHref(`/tcg/collection/${collection.language}/${encodeURIComponent(collection.setId)}`)}${activationQuery}`);
  }, [activation, legacyCount, localeHref, matchingCollections, mounted, router, syncStatus]);

  if (!mounted || !hasHydrated || authLoading) {
    return <ResolverStatus><Loader2 className="h-7 w-7 animate-spin text-primary/50" /></ResolverStatus>;
  }
  if (!user || syncStatus === 'unauthenticated') return <ResolverStatus><SyncRequiredPanel /></ResolverStatus>;
  if (syncStatus !== 'ready') return <ResolverStatus><SyncStatusPanel status={syncStatus} /></ResolverStatus>;
  if (matchingCollections.length === 1 && legacyCount === 0) {
    return <ResolverStatus><Loader2 className="h-7 w-7 animate-spin text-primary/50" /></ResolverStatus>;
  }

  const collectionOptions = matchingCollections
    .map((key) => decodeTCGCollectionKey(key))
    .filter((entry): entry is TCGCollection => Boolean(entry));

  const handleAttribute = () => {
    const key = assignLegacy(setId, promptLanguage);
    if (!key) return;
    router.replace(`${localeHref(`/tcg/collection/${promptLanguage}/${encodeURIComponent(setId.toLowerCase())}`)}${activation ? '?activation=1' : ''}`);
  };

  return (
    <ResolverStatus>
      <section className="w-full max-w-2xl page-surface p-6 sm:p-8" aria-labelledby="legacy-collection-title">
        <h1 id="legacy-collection-title" className="text-2xl font-black tracking-tight">
          {t('tcg.collection_choose_language', { defaultValue: 'Choose a collection language' })}
        </h1>
        {legacyCount > 0 ? (
          <>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              {t('tcg.collection_legacy_attribution', { defaultValue: `${legacyCount} historical cards have no language yet. Choose one explicitly to continue.` })}
            </p>
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <TCGLanguageSelector
                value={promptLanguage}
                onChange={setSelectedLanguage}
                preserveQuery={false}
                ariaLabel={t('tcg.collection_language_for_set', { defaultValue: `Language for ${setId}` })}
              />
              <button type="button" onClick={handleAttribute} className="min-h-11 rounded-sm border border-primary/40 bg-primary/15 px-4 text-sm font-bold text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                {t('tcg.collection_attribute', { defaultValue: 'Attribute cards' })}
              </button>
            </div>
          </>
        ) : collectionOptions.length > 1 ? (
          <>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              {t('tcg.collection_multiple_languages', { defaultValue: 'This set has more than one collection. Choose which one to open.' })}
            </p>
            <div className="mt-6 space-y-2">
              {collectionOptions.map((collection) => (
                <Link
                  key={collection.key}
                  href={`${localeHref(`/tcg/collection/${collection.language}/${encodeURIComponent(collection.setId)}`)}${activation ? '?activation=1' : ''}`}
                  className="flex min-h-12 items-center justify-between rounded-sm border border-border/45 bg-card/50 px-4 text-sm font-bold transition-colors hover:border-primary/40 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <span>{getTCGCardLanguageName(collection.language, interfaceLanguage)}</span>
                  <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-foreground/60">
              {t('tcg.collection_not_started', { defaultValue: 'This collection has not been started yet.' })}
            </p>
            <Link href={localeHref(`/tcg/start?tcgLang=${encodeURIComponent(browseLanguage)}`)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-primary/40 bg-primary/15 px-4 text-sm font-bold text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
              {t('tcg.activation.start_title', { defaultValue: 'Add a collection' })}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        )}
      </section>
    </ResolverStatus>
  );
}

function ResolverStatus({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[50vh] items-center justify-center py-10">{children}</div>;
}
