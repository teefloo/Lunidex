'use client';

import { SYNCED_KEYS, type PersistedState } from '@/store/primedex';
import { pickSyncState, applySyncState } from '@/lib/supabase/sync-state';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { useRef, useState, useCallback } from 'react';
import { Download, Upload, AlertTriangle, Check, X, FileJson } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  tcgWishlistCards: string[];
  badges: string[];
}

function validateImportPayload(
  json: unknown,
): { valid: true; data: PersistedState } | { valid: false; error: string } {
  if (typeof json !== 'object' || json === null) {
    return { valid: false, error: 'Invalid JSON structure' };
  }

  const obj = json as Record<string, unknown>;

  if (!('version' in obj) || typeof obj.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version field' };
  }

  if (!('data' in obj) || typeof obj.data !== 'object' || obj.data === null) {
    return { valid: false, error: 'Missing or invalid data field' };
  }

  const data = obj.data as Record<string, unknown>;

  if (Array.isArray(data.favorites) && data.favorites.length > 2000) {
    return { valid: false, error: 'Favorites list exceeds 2000 entries' };
  }

  if (Array.isArray(data.team) && data.team.length > 6) {
    return { valid: false, error: 'Team exceeds 6 members' };
  }

  if (Array.isArray(data.caughtPokemon) && data.caughtPokemon.length > 2000) {
    return { valid: false, error: 'Caught Pokémon list exceeds 2000 entries' };
  }

  if (Array.isArray(data.tcgOwnedCards) && data.tcgOwnedCards.length > 5000) {
    return { valid: false, error: 'TCG owned cards list exceeds 5000 entries' };
  }

  if (Array.isArray(data.tcgWishlistCards) && data.tcgWishlistCards.length > 5000) {
    return { valid: false, error: 'TCG wishlist exceeds 5000 entries' };
  }

  if (Array.isArray(data.badges) && data.badges.length > 500) {
    return { valid: false, error: 'Badges list exceeds 500 entries' };
  }

  const syncedData: Record<string, unknown> = {};
  for (const key of SYNCED_KEYS) {
    if (key in data) {
      syncedData[key] = data[key];
    }
  }

  return { valid: true, data: syncedData as PersistedState };
}

function getImportPreview(data: PersistedState): ImportPreview {
  return {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    team: Array.isArray(data.team) ? data.team : [],
    caughtPokemon: Array.isArray(data.caughtPokemon) ? data.caughtPokemon : [],
    tcgOwnedCards: Array.isArray(data.tcgOwnedCards) ? data.tcgOwnedCards : [],
    tcgWishlistCards: Array.isArray(data.tcgWishlistCards) ? data.tcgWishlistCards : [],
    badges: Array.isArray(data.badges) ? data.badges : [],
  };
}

export function DataExportImport() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<PersistedState | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  const handleExport = useCallback(() => {
    try {
      const state = pickSyncState();
      const payload: ExportPayload = {
        version: '1.0',
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
      URL.revokeObjectURL(url);
      toast.success(t('settings.export_success'));
    } catch {
      toast.error(t('settings.export_error'));
    }
  }, [t]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          const result = validateImportPayload(json);
          if (!result.valid) {
            toast.error(t('settings.import_invalid') + ': ' + result.error);
            return;
          }
          setImportData(result.data);
          setPreview(getImportPreview(result.data));
          setImportOpen(true);
        } catch {
          toast.error(t('settings.import_parse_error'));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [t],
  );

  const handleImportConfirm = useCallback(() => {
    if (!importData) return;
    try {
      applySyncState(importData);
      setImportOpen(false);
      setImportData(null);
      setPreview(null);
      toast.success(t('settings.import_success'));
    } catch {
      toast.error(t('settings.import_error'));
    }
  }, [importData, t]);

  const handleImportCancel = useCallback(() => {
    setImportOpen(false);
    setImportData(null);
    setPreview(null);
  }, []);

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
              onClick={handleExport}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-bold',
                'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
              )}
              aria-label={t('settings.export')}
            >
              <Download className="w-4 h-4" />
              {t('settings.export')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
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
        </div>
      </div>

      {importOpen && preview && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('settings.import_confirm_title')}
        >
          <div
            className="absolute inset-0 bg-foreground/22"
            onClick={handleImportCancel}
          />
          <div className="glass-surface relative w-full max-w-sm rounded-sm p-6 overflow-hidden z-10">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/60">
              <h3 className="text-lg font-black text-foreground tracking-tight">
                {t('settings.import_confirm_title')}
              </h3>
              <button
                onClick={handleImportCancel}
                className="rounded-full p-1.5 text-foreground/50 hover:text-foreground transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/70">{t('settings.import_warning')}</p>
              </div>

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
                  <span className="font-bold text-foreground/80">{preview.tcgOwnedCards.length}</span>
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
                className={cn(
                  'flex-1 py-2.5 px-4 rounded-sm text-xs font-bold',
                  'bg-muted/55 text-foreground/80 hover:bg-muted/80 transition-colors',
                )}
              >
                {t('common.close')}
              </button>
              <button
                onClick={handleImportConfirm}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm text-xs font-bold',
                  'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
                )}
              >
                <Check className="w-4 h-4" />
                {t('settings.import_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
