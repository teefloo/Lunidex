'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useTranslation } from '@/lib/i18n';
import { fetchPublicSealedGuide, type PublicSealedGuideResponse } from '@/lib/api/tcg-sealed';

function guideDate(value: string | undefined, language: string): string {
  if (!value) return '—';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(timestamp)
    : '—';
}

function guideDay(value: string, language: string): string {
  const timestamp = Date.parse(`${value}T12:00:00.000Z`);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(timestamp)
    : '—';
}

function guidePercent(value: number, language: string): string {
  return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value)}%`;
}

function guideNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function guideCoverage(value: number, language: string): string {
  return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(value);
}

export default function PublicSealedGuideSection() {
  const language = useClientLanguage();
  const { t } = useTranslation();
  const base = 'tcg.sealed.public_guide.';
  const guide = useQuery<PublicSealedGuideResponse>({
    queryKey: ['tcg-sealed', 'public-guide'],
    queryFn: ({ signal }) => fetchPublicSealedGuide(signal),
  });
  const points = guide.data?.index.status === 'available' ? guide.data.index.points.slice(-6).reverse() : [];
  const error = guide.error !== null;
  const renderStatus = (available: boolean, children: React.ReactNode) => guide.isPending
    ? <p className="text-sm text-foreground/55">{t('tcg.sealed.public_market.loading')}</p>
    : error || !available ? <p className="text-sm text-foreground/55">{t(`${base}unavailable`)}</p>
    : children;

  return <section className="space-y-4" aria-label={t(`${base}title`)}>
    <div>
      <h2 className="text-xl font-black tracking-tight">{t(`${base}title`)}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground/60">{t(`${base}method`)}</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>{t(`${base}index`)}</CardTitle></CardHeader>
        <CardContent>
          {renderStatus(guide.data?.index.status === 'available', <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <strong className="text-3xl tabular-nums">{guide.data?.index.status === 'available' ? guideNumber(guide.data.index.points.at(-1)?.value ?? 100, language) : '—'}</strong>
              {guide.data?.index.status === 'available' ? <span className="text-xs text-foreground/55">{t(`${base}basket`, { count: guide.data.index.basketSize, version: guide.data.index.version })}</span> : null}
            </div>
            <ol className="mt-4 divide-y divide-border/50">
              {points.map((point) => <li key={`${point.day}-${point.sourceAt}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="text-foreground/60">{guideDate(point.sourceAt, language)}</span>
                <strong className="tabular-nums">{guideNumber(point.value, language)}</strong>
                <span className="text-foreground/50">{t(`${base}coverage`)} {guideCoverage(point.coverage, language)}</span>
              </li>)}
            </ol>
          </>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t(`${base}series_movers`)}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {renderStatus(guide.data?.series.status === 'available', <>
            {guide.data?.series.status === 'available' ? guide.data.series.movers.map((mover) => <div key={mover.expansionId} className="rounded-sm border border-border/50 p-3">
              <div className="flex items-center justify-between gap-3"><span className="font-bold">{mover.name}</span><strong className="tabular-nums">{guidePercent(mover.changePercent, language)}</strong></div>
              <p className="mt-1 text-xs text-foreground/55">{guideDay(mover.fromDay, language)} → {guideDay(mover.toDay, language)} · {t(`${base}coverage`)} {guideCoverage(mover.coverage, language)}</p>
            </div>) : null}
            <p className="text-xs leading-5 text-foreground/50">{t(`${base}series_scope`)}</p>
          </>)}
        </CardContent>
      </Card>
    </div>
    <Card>
      <CardHeader><CardTitle>{t(`${base}product_movers`)}</CardTitle></CardHeader>
      <CardContent>
        {renderStatus(guide.data?.products.status === 'available', <ol className="grid gap-2 sm:grid-cols-2">
          {guide.data?.products.status === 'available' ? guide.data.products.movers.map((mover) => <li key={mover.productId} className="rounded-sm border border-border/50 p-3">
            <div className="flex items-start justify-between gap-3"><span className="font-bold">{mover.name}</span><strong className="shrink-0 tabular-nums">{guidePercent(mover.changePercent, language)}</strong></div>
            <p className="mt-1 text-xs text-foreground/55">{guideDate(mover.fromSourceAt, language)} → {guideDate(mover.toSourceAt, language)} · {t(`${base}elapsed_days`, { count: Number(mover.elapsedDays.toFixed(1)) })}</p>
          </li>) : null}
        </ol>)}
      </CardContent>
    </Card>
  </section>;
}
