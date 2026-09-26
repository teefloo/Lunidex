'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchAppApi } from '@/lib/app-api';
import { useTranslation } from '@/lib/i18n';

type ApiKey = {
  id: string;
  name: string;
  permission: 'read' | 'read_write';
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type ApiKeyResponse = {
  id: string;
  name: string;
  permission: ApiKey['permission'];
  prefix: string;
  key: string;
  createdAt: string;
  warning: string;
};

export default function ApiKeysCard() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [permission, setPermission] = useState<ApiKey['permission']>('read');
  const [secret, setSecret] = useState<ApiKeyResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tt = useCallback((key: string, fallback: string) => {
    const value = t(key, { defaultValue: fallback });
    return value === key ? fallback : value;
  }, [t]);

  const loadKeys = useCallback(async () => {
    const response = await fetchAppApi('/api/account/api-keys', { cache: 'no-store' });
    if (!response.ok) throw new Error(tt('api_keys.load_error', 'Could not load API keys.'));
    const payload = await response.json() as { data?: ApiKey[] };
    setKeys(Array.isArray(payload.data) ? payload.data : []);
  }, [tt]);

  useEffect(() => {
    let active = true;
    void fetchAppApi('/api/account/api-keys', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error(tt('api_keys.load_error', 'Could not load API keys.'));
        const payload = await response.json() as { data?: ApiKey[] };
        if (active) setKeys(Array.isArray(payload.data) ? payload.data : []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : tt('api_keys.load_error', 'Could not load API keys.'));
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [tt]);

  const createKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetchAppApi('/api/account/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, permission }),
      });
      const payload = await response.json().catch(() => null) as { data?: ApiKeyResponse; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data?.key) {
        throw new Error(payload?.error?.message ?? tt('api_keys.create_error', 'Could not create this API key.'));
      }
      setSecret(payload.data);
      setName('');
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : tt('api_keys.create_error', 'Could not create this API key.'));
    } finally {
      setBusy(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetchAppApi(`/api/account/api-keys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(tt('api_keys.revoke_error', 'Could not revoke this API key.'));
      await loadKeys();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : tt('api_keys.revoke_error', 'Could not revoke this API key.'));
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret.key);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(tt('api_keys.copy_error', 'Clipboard access is unavailable.'));
    }
  };

  return (
    <section className="glass-card space-y-4 rounded-sm p-5" aria-labelledby="api-keys-heading">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-foreground/50" aria-hidden="true" />
        <h2 id="api-keys-heading" className="text-xs font-black uppercase tracking-[0.15em] text-foreground/60">
          {tt('api_keys.title', 'Public API keys')}
        </h2>
      </div>
      <p className="text-xs leading-relaxed text-foreground/55">
        {tt('api_keys.description', 'Create keys for server-side integrations. Never put an API key in a browser, public repository, or shared log.')}
      </p>

      {loaded && (
        <ul className="space-y-2" aria-label={tt('api_keys.list_label', 'Your API keys')}>
          {keys.map((key) => (
            <li key={key.id} className="flex flex-col gap-3 rounded-sm border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-foreground">{key.name}</p>
                <p className="break-all font-mono text-[11px] text-foreground/45">{key.prefix}…</p>
                <p className="text-[11px] text-foreground/50">
                  {key.permission === 'read_write'
                    ? tt('api_keys.read_write', 'Read and write')
                    : tt('api_keys.read_only', 'Read only')}
                  {' · '}
                  {tt('api_keys.created', 'Created')}: {new Date(key.createdAt).toLocaleString()}
                  {' · '}
                  {key.lastUsedAt
                    ? `${tt('api_keys.last_used', 'Last used')}: ${new Date(key.lastUsedAt).toLocaleString()}`
                    : tt('api_keys.never_used', 'Never used')}
                  {key.revokedAt ? ` · ${tt('api_keys.revoked', 'Revoked')}` : ''}
                </p>
              </div>
              {!key.revokedAt && (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void revokeKey(key.id)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {tt('api_keys.revoke', 'Revoke')}
                </Button>
              )}
            </li>
          ))}
          {keys.length === 0 && <li className="text-xs text-foreground/45">{tt('api_keys.empty', 'No API keys yet.')}</li>}
        </ul>
      )}

      {secret && (
        <div className="space-y-3 rounded-sm border border-amber-500/35 bg-amber-500/5 p-3" role="status">
          <p className="text-xs font-semibold text-foreground">{tt('api_keys.created_once', 'Copy this key now. It will not be shown again.')}</p>
          <p className="break-all rounded-sm bg-background/60 p-2 font-mono text-xs text-foreground">{secret.key}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void copySecret()}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? tt('api_keys.copied', 'Copied') : tt('api_keys.copy', 'Copy key')}
          </Button>
          <p className="text-[11px] leading-relaxed text-foreground/55">
            {tt('api_keys.secret_warning', 'Store it in a server-side secret manager. Do not paste it into client-side code or screenshots.')}
          </p>
          <button type="button" className="text-xs text-foreground/60 underline underline-offset-2" onClick={() => setSecret(null)}>
            {tt('api_keys.dismiss_secret', 'Hide key')}
          </button>
        </div>
      )}

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => void createKey(event)}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={tt('api_keys.name_placeholder', 'Integration name')}
          aria-label={tt('api_keys.name_label', 'API key name')}
          maxLength={80}
          required
        />
        <select
          value={permission}
          onChange={(event) => setPermission(event.target.value as ApiKey['permission'])}
          aria-label={tt('api_keys.permission_label', 'API key permission')}
          className="h-9 rounded-sm border border-border/50 bg-background px-3 text-xs text-foreground"
        >
          <option value="read">{tt('api_keys.read_only', 'Read only')}</option>
          <option value="read_write">{tt('api_keys.read_write', 'Read and write')}</option>
        </select>
        <Button type="submit" size="sm" disabled={!loaded || busy || name.trim().length === 0 || keys.filter((key) => !key.revokedAt).length >= 5}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {tt('api_keys.create', 'Create key')}
        </Button>
      </form>
      {keys.filter((key) => !key.revokedAt).length >= 5 && (
        <p className="text-[11px] text-foreground/50">{tt('api_keys.limit', 'You can have up to five active keys.')}</p>
      )}
      {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </section>
  );
}
