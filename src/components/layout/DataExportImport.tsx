'use client';

import { hasSyncAccess, requestSyncAccess } from '@/store/sync-access';
import { type PersistedState } from '@/store/primedex';
import { pickSyncState, applySyncState } from '@/lib/supabase/sync-state';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Download, Upload, AlertTriangle, Check, FileJson, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countPhysicalTCGCards } from '@/lib/tcg-collections';
import { validateImportPayload } from '@/lib/user-backup';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { waitForSyncChange } from '@/lib/sync-confirmation';

interface ExportPayload {
  version: string;
  exportedAt: string;
  data: PersistedState;
}

interface ImportPreview {
  favorites: number[];
  team: number[];
  caughtPokemon: number[];
  tcgOwnedCards: string[];
  tcgPhysicalCards: number;
  tcgCollections: string[];
  tcgWishlistCards: string[];
  badges: string[];
}

function getImportPreview(data: PersistedState): ImportPreview {
  return {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    team: Array.isArray(data.team) ? data.team : [],
    caughtPokemon: Array.isArray(data.caughtPokemon) ? data.caughtPokemon : [],
    tcgOwnedCards: Array.isArray(data.tcgOwnedCards) ? data.tcgOwnedCards : [],
    tcgPhysicalCards: countPhysicalTCGCards(
      Array.isArray(data.tcgCollectionCards) ? data.tcgCollectionCards : [],
      Array.isArray(data.tcgLegacyOwnedCards) ? data.tcgLegacyOwnedCards : data.tcgOwnedCards,
    ),
    tcgCollections: Array.isArray(data.tcgCollections) ? data.tcgCollections : [],
    tcgWishlistCards: Array.isArray(data.tcgWishlistCards) ? data.tcgWishlistCards : [],
    badges: Array.isArray(data.badges) ? data.badges : [],
  };
}

export function DataExportImport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileReaderRef = useRef<FileReader | null>(null);
  const exportGuardRef = useRef(false);
  const importGuardRef = useRef(false);
  const mountedRef = useRef(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importPhase, setImportPhase] = useState<'idle' | 'reading' | 'validating' | 'saving' | 'error'>('idle');
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [fileErrorKey, setFileErrorKey] = useState<'settings.import_invalid' | 'settings.import_parse_error' | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<PersistedState | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const reader = fileReaderRef.current;
      fileReaderRef.current = null;
      reader?.abort();
    };
  }, []);

  const handleExport = useCallback(async () => {
    if (exportGuardRef.current) return;
    exportGuardRef.current = true;
    setIsExporting(true);
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const state = pickSyncState();
      // The v3 envelope carries the v3 physical-variant collection state while
      // validation below remains backwards compatible with v1 and v2 files.
      const payload: ExportPayload = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        data: state,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `primedex-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success(t('settings.export_success'));
    } catch {
      toast.error(t('settings.export_error'));
    } finally {
      exportGuardRef.current = false;
      setIsExporting(false);
    }
  }, [t]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      const previousReader = fileReaderRef.current;
      const reader = new FileReader();
      fileReaderRef.current = reader;
      previousReader?.abort();
      setImportPhase('reading');
      setFileProgress(null);
      setImportError('');
      setFileErrorKey(null);
      reader.onprogress = (event) => {
        if (fileReaderRef.current !== reader || !event.lengthComputable || event.total <= 0) return;
        setFileProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      };
      reader.onload = async (event) => {
        if (fileReaderRef.current !== reader) return;
        fileReaderRef.current = null;
        setImportPhase('validating');
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
        if (!mountedRef.current) return;
        try {
          const resultText = event.target?.result;
          if (typeof resultText !== 'string') throw new Error('Invalid file contents');
          const json = JSON.parse(resultText);
          const result = validateImportPayload(json);
          if (!result.valid) {
            setImportPhase('error');
            setFileErrorKey('settings.import_invalid');
            toast.error(t('settings.import_invalid'));
            return;
          }
          setImportData(result.data);
          setPreview(getImportPreview(result.data));
          setImportPhase('idle');
          setImportOpen(true);
        } catch {
          setImportPhase('error');
          setFileErrorKey('settings.import_parse_error');
          toast.error(t('settings.import_parse_error'));
        }
      };
      reader.onerror = () => {
        if (fileReaderRef.current !== reader) return;
        fileReaderRef.current = null;
        setImportPhase('error');
        setFileErrorKey('settings.import_parse_error');
        toast.error(t('settings.import_parse_error'));
      };
      reader.onabort = () => {
        if (fileReaderRef.current !== reader) return;
        fileReaderRef.current = null;
        setImportPhase('error');
        setFileErrorKey('settings.import_parse_error');
      };
      reader.readAsText(file);
    },
    [t],
  );

  const handleImportConfirm = useCallback(async () => {
    if (!importData || importGuardRef.current) return;
    if (!hasSyncAccess()) {
      requestSyncAccess();
      toast.info(t('settings.import_requires_sync'));
      return;
    }
    importGuardRef.current = true;
    setIsImporting(true);
    setImportPhase('saving');
    setImportError('');
    try {
      applySyncState(importData);
      const expected = pickSyncState();
      const result = await waitForSyncChange(expected, pickSyncState);
      if (!result.ok) {
        const messageKey = result.reason === 'too-large'
          ? 'common.sync_too_large'
          : result.reason === 'conflict'
            ? 'common.sync_conflict'
            : result.reason === 'session'
              ? 'common.sync_session'
              : 'common.sync_failed';
        setImportError(t(messageKey));
        return;
      }
      setImportOpen(false);
      setImportData(null);
      setPreview(null);
      setImportPhase('idle');
      toast.success(t('settings.import_success'));
    } catch {
      setImportError(t('settings.import_error'));
    }
    finally {
      importGuardRef.current = false;
      setIsImporting(false);
      setImportPhase((phase) => phase === 'saving' ? 'idle' : phase);
    }
  }, [importData, t]);

  const handleImportCancel = useCallback(() => {
    if (isImporting) return;
    setImportOpen(false);
    setImportData(null);
    setPreview(null);
    setImportError('');
  }, [isImporting]);

  const importProgressLabel = importPhase === 'reading'
    ? t('common.reading_file')
    : importPhase === 'validating'
      ? t('common.validating_file')
      : importPhase === 'saving'
        ? t('common.saving_changes')
        : null;

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2.5 rounded-sm text-foreground/70 bg-secondary/30 border border-border/50">
            <FileJson className="w-5 h-5" />
          </div>
          <span className="font-bold text-foreground/80">{t('settings.data')}</span>
        </div>
        <div className="glass-card p-4 space-y-3">
          <p className="text-xs text-foreground/50">{t('settings.data_desc')}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting}
              aria-busy={isExporting}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-bold',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              )}
              aria-label={isExporting ? t('common.preparing_download') : t('settings.export')}
            >
              {isExporting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? t('common.preparing_download') : t('settings.export')}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExporting || importPhase === 'reading' || importPhase === 'validating' || isImporting}
              aria-busy={importPhase === 'reading' || importPhase === 'validating'}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-bold',
                'bg-muted/55 text-foreground/80 hover:bg-muted/80 transition-colors',
              )}
              aria-label={t('settings.import')}
            >
              <Upload className="w-4 h-4" />
              {t('settings.import')}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
          {importProgressLabel ? (
            <div className="space-y-2" aria-busy="true" role="status">
              <p className="text-xs font-semibold text-foreground/75">{importProgressLabel}</p>
              {importPhase === 'reading' && fileProgress !== null ? (
                <progress aria-label={importProgressLabel} className="h-2 w-full accent-primary" value={fileProgress} max={100} />
              ) : importPhase === 'reading' ? (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70"><div className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-pulse" /></div>
              ) : null}
            </div>
          ) : null}
          {importPhase === 'error' && fileErrorKey ? <p role="alert" className="text-xs text-destructive">{t(fileErrorKey)}</p> : null}
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={(open) => { if (!open) handleImportCancel(); }}>
        {preview && (
          <DialogContent className="max-w-sm" aria-busy={isImporting}>
            <DialogHeader>
              <DialogTitle>{t('settings.import_confirm_title')}</DialogTitle>
              <DialogDescription className="sr-only">{t('settings.import_warning')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/70">{t('settings.import_warning')}</p>
              </div>

              {importError ? <p role="alert" className="rounded-sm border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{importError}</p> : null}

              <div className="space-y-1.5 text-xs text-foreground/60">
                <div className="flex justify-between">
                  <span>{t('settings.import_favorites')}</span>
                  <span className="font-bold text-foreground/80">{preview.favorites.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.import_team')}</span>
                  <span className="font-bold text-foreground/80">{preview.team.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.import_caught')}</span>
                  <span className="font-bold text-foreground/80">{preview.caughtPokemon.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.import_tcg')}</span>
                  <span className="font-bold text-foreground/80">{preview.tcgPhysicalCards}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.import_wishlist')}</span>
                  <span className="font-bold text-foreground/80">{preview.tcgWishlistCards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('settings.import_badges')}</span>
                  <span className="font-bold text-foreground/80">{preview.badges.length}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImportCancel}
                disabled={isImporting}
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-sm text-xs font-bold',
                  'bg-muted/55 text-foreground/80 hover:bg-muted/80 transition-colors',
                )}
              >
                {t('common.close')}
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={isImporting}
                aria-busy={isImporting}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-bold',
                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                )}
              >
                {isImporting ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" /> : <Check className="w-4 h-4" />}
                {isImporting ? t('common.saving_changes') : t('settings.import_confirm')}
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
