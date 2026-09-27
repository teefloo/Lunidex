import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';

import Header from '@/components/layout/Header';
import { API_GUIDE_OPERATIONS, API_GUIDE_QUOTAS } from '@/lib/public-api-docs';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE, localeHref } from '@/lib/seo';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const PAGE_PATH = '/docs/api';
const API_BASE_URL = `${SITE_URL}/api/v1`;

const curlExample = `curl --fail-with-body \\
  -H "Authorization: Bearer $LUNIDEX_API_KEY" \\
  ${API_BASE_URL}/me`;

const nodeExample = `const API_BASE_URL = "${API_BASE_URL}";
const apiKey = process.env.LUNIDEX_API_KEY;

if (!apiKey) throw new Error("Missing LUNIDEX_API_KEY");

const response = await fetch(API_BASE_URL + "/me", {
  headers: { Authorization: "Bearer " + apiKey },
});
const result = await response.json();

if (!response.ok) {
  throw new Error(result.error?.code ?? "REQUEST_FAILED");
}

console.log(result.data);`;

const paginationExample = `const API_BASE_URL = "${API_BASE_URL}";
const apiKey = process.env.LUNIDEX_API_KEY;
let cursor = null;

if (!apiKey) throw new Error("Missing LUNIDEX_API_KEY");

do {
  const query = new URLSearchParams({ limit: "100" });
  if (cursor) query.set("cursor", cursor);

  const response = await fetch(API_BASE_URL + "/cards?" + query, {
    headers: { Authorization: "Bearer " + apiKey },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.code ?? "REQUEST_FAILED");

  console.log(result.data);
  cursor = result.meta?.nextCursor ?? null;
} while (cursor);`;

const cardWriteExample = `{
  "language": "en",
  "variant": "reverse",
  "quantity": 2
}`;

const sealedBuyExample = `curl --request POST "${API_BASE_URL}/sealed/transactions" \\
  -H "Authorization: Bearer $LUNIDEX_API_KEY" \\
  -H "Idempotency-Key: lunidex-import-example-001" \\
  -H "Content-Type: application/json" \\
  --data '{
    "expectedRevision": 0,
    "kind": "buy",
    "cardmarketProductId": 12345,
    "language": "en",
    "date": "2026-09-27",
    "quantity": 1,
    "unitPriceCents": 2500
  }'`;

const voidExample = `{
  "revision": 1,
  "expectedRevision": 0
}`;

const tocIds = ['quickstart', 'auth', 'pagination', 'routes', 'cards', 'sealed', 'mutations', 'errors', 'quotas'] as const;
const operationGroups = [
  { id: 'account', translationKey: 'group_account' },
  { id: 'cards', translationKey: 'group_cards' },
  { id: 'sealed', translationKey: 'group_sealed' },
] as const;

const methodClasses: Record<(typeof API_GUIDE_OPERATIONS)[number]['method'], string> = {
  GET: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  PUT: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  POST: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  PATCH: 'border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300',
};

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <figure className="min-w-0 overflow-hidden rounded-sm border border-border/70 bg-[#07144f] text-[#fff8fc]">
      <figcaption className="border-b border-white/10 px-4 py-2 text-xs font-semibold text-slate-300">
        {label}
      </figcaption>
      <pre className="max-w-full overflow-x-auto p-4 text-[13px] leading-6 [tab-size:2]"><code>{code}</code></pre>
    </figure>
  );
}

function SectionHeading({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-5 border-b border-border/70 pb-3">
      <h2 id={id} className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{title}</h2>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('api_docs.meta_title');
  const description = t('api_docs.meta_description');
  const localizedPath = localeHref(PAGE_PATH, language);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: localizedPath,
      languages: buildSubpathLanguages(PAGE_PATH),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: localizedPath,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function PublicApiGuidePage() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const dashboardHref = localeHref('/dashboard', language);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('api_docs.nav_label'), path: PAGE_PATH },
  ], language);
  const formatNumber = (value: number) => new Intl.NumberFormat(language).format(value);
  const tocLabels = tocIds.map((id) => ({ id, label: t(`api_docs.${id}_title`) }));

  return (
    <div className="app-page">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      <main className="page-shell relative min-h-screen pb-24 pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="relative overflow-hidden rounded-sm border border-primary/20 bg-card/80 px-5 py-10 text-center shadow-sm sm:px-9 sm:py-14 lg:px-12 lg:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-primary/70 to-accent" />
            <h1 className="mx-auto max-w-5xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('api_docs.page_title')}
            </h1>
            <p className="mx-auto mt-5 max-w-4xl text-base leading-relaxed text-foreground/75 sm:text-lg sm:leading-8">
              {t('api_docs.intro')}
            </p>
            <div className="mx-auto mt-8 flex w-fit max-w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <div className="flex min-h-11 w-full max-w-full flex-col items-start gap-1 rounded-sm border border-border/70 bg-background/75 px-4 py-2.5 text-left sm:w-fit sm:flex-row sm:items-center sm:gap-3">
                <span className="shrink-0 text-xs font-semibold text-foreground/60">{t('api_docs.api_base_label')}</span>
                <code className="max-w-full break-words font-mono text-[13px] font-semibold text-foreground">{API_BASE_URL}</code>
              </div>
              <Link
                href={dashboardHref}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
              >
                <KeyRound aria-hidden="true" className="h-4 w-4" />
                {t('api_docs.dashboard_link')}
              </Link>
              <a
                href={`${API_BASE_URL}/openapi.json`}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-sm border border-[var(--border-strong)] bg-background px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto"
              >
                {t('api_docs.openapi_link')}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </header>

          <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
            <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
              <nav aria-label={t('api_docs.toc_title')} className="hidden rounded-sm border border-border/70 bg-card/70 p-4 lg:block">
              <h2 className="mb-3 px-2 text-xs font-bold uppercase tracking-[0.14em] text-foreground/55">
                {t('api_docs.toc_title')}
              </h2>
              <ul className="space-y-1">
                {tocLabels.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex min-h-11 items-center rounded-sm px-2 text-sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
              <details className="group rounded-sm border border-border/70 bg-card/70 lg:hidden">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                  {t('api_docs.toc_title')}
                  <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
                </summary>
                <nav aria-label={t('api_docs.toc_title')} className="border-t border-border/70 p-2">
                  <ul className="space-y-1">
                    {tocLabels.map(({ id, label }) => (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          className="flex min-h-11 items-center rounded-sm px-3 text-sm text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </details>
            </aside>

            <div className="min-w-0 space-y-12">
            <section aria-labelledby="api-security-title" className="rounded-sm border border-amber-500/35 bg-amber-500/5 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                <div>
                  <h2 id="api-security-title" className="font-bold text-foreground">{t('api_docs.security_title')}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{t('api_docs.security_warning')}</p>
                </div>
              </div>
            </section>

            <section id="quickstart" aria-labelledby="api-quickstart-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-quickstart-title" title={t('api_docs.quickstart_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.quickstart_intro')}</p>
              <ol className="grid overflow-hidden rounded-sm border border-border/70 bg-card/60 divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
                {[
                  ['step_1_title', 'step_1_body'],
                  ['step_2_title', 'step_2_body'],
                  ['step_3_title', 'step_3_body'],
                ].map(([titleKey, bodyKey], index) => (
                  <li key={titleKey} className="min-w-0 p-4 sm:p-5">
                    <span className="font-mono text-sm font-bold tabular-nums text-primary">{index + 1}</span>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{t(`api_docs.${titleKey}`)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t(`api_docs.${bodyKey}`)}</p>
                  </li>
                ))}
              </ol>
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <CodeBlock label={t('api_docs.curl_caption')} code={curlExample} />
                <CodeBlock label={t('api_docs.node_caption')} code={nodeExample} />
              </div>
            </section>

            <section id="auth" aria-labelledby="api-auth-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-auth-title" title={t('api_docs.auth_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.auth_intro')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-sm border border-border/70 bg-card/60 p-5">
                  <h3 className="font-bold text-foreground">{t('api_docs.read_only_title')}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t('api_docs.read_only_body')}</p>
                </article>
                <article className="rounded-sm border border-border/70 bg-card/60 p-5">
                  <h3 className="font-bold text-foreground">{t('api_docs.read_write_title')}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t('api_docs.read_write_body')}</p>
                </article>
              </div>
              <p className="flex items-start gap-3 rounded-sm border border-border/70 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/70">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t('api_docs.data_scope')}
              </p>
            </section>

            <section id="pagination" aria-labelledby="api-pagination-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-pagination-title" title={t('api_docs.pagination_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.pagination_intro')}</p>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/70 marker:text-primary">
                <li>{t('api_docs.pagination_rules')}</li>
                <li>{t('api_docs.pagination_filters')}</li>
                <li>{t('api_docs.pagination_stale')}</li>
              </ul>
              <CodeBlock label={t('api_docs.pagination_caption')} code={paginationExample} />
            </section>

            <section id="routes" aria-labelledby="api-routes-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-routes-title" title={t('api_docs.routes_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.routes_intro')}</p>
              <div className="space-y-6">
                {operationGroups.map((group) => (
                  <section key={group.id} aria-labelledby={`api-route-group-${group.id}`}>
                    <h3 id={`api-route-group-${group.id}`} className="mb-3 text-sm font-bold text-foreground">
                      {t(`api_docs.${group.translationKey}`)}
                    </h3>
                    <ul className="space-y-2">
                      {API_GUIDE_OPERATIONS.filter((operation) => operation.group === group.id).map((operation) => (
                        <li key={`${operation.method}-${operation.path}`} className="grid min-w-0 gap-2 border-b border-border/70 py-3 last:border-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:items-start sm:gap-4 sm:py-4">
                          <span className={`inline-flex min-h-7 w-fit min-w-14 items-center justify-center rounded-sm border px-2 font-mono text-[11px] font-bold ${methodClasses[operation.method]}`}>
                            {operation.method}
                          </span>
                          <div className="min-w-0">
                            <code className="block break-all font-mono text-sm font-semibold text-foreground">{operation.path}</code>
                            <p className="mt-1 text-sm leading-relaxed text-foreground/60">
                              {t(`api_docs.operations.${operation.translationKey}`)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>

            <section id="cards" aria-labelledby="api-cards-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-cards-title" title={t('api_docs.cards_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.cards_intro')}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.cards_detail')}</p>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-foreground/70">{t('api_docs.cards_variants')}</p>
                <CodeBlock label="PUT /cards/{cardId} · application/json" code={cardWriteExample} />
              </div>
              <p className="text-sm leading-relaxed text-foreground/70">{t('api_docs.cards_legacy')}</p>
              <p className="flex items-start gap-3 rounded-sm border border-border/70 bg-muted/30 p-4 text-sm leading-relaxed text-foreground/70">
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t('api_docs.cards_values')}
              </p>
            </section>

            <section id="sealed" aria-labelledby="api-sealed-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-sealed-title" title={t('api_docs.sealed_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.sealed_intro')}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.sealed_summary_missing')}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-sm border border-border/70 bg-card/60 p-5">
                  <h3 className="font-mono text-sm font-bold text-foreground">GET /sealed/catalogue</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t('api_docs.sealed_catalogue')}</p>
                </article>
                <article className="rounded-sm border border-border/70 bg-card/60 p-5">
                  <h3 className="font-mono text-sm font-bold text-foreground">GET /sealed/positions</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t('api_docs.sealed_positions')}</p>
                </article>
                <article className="rounded-sm border border-border/70 bg-card/60 p-5 md:col-span-2">
                  <h3 className="font-mono text-sm font-bold text-foreground">GET /sealed/transactions</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/65">{t('api_docs.sealed_transactions')}</p>
                </article>
              </div>
            </section>

            <section id="mutations" aria-labelledby="api-mutations-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-mutations-title" title={t('api_docs.mutations_title')} />
              <article className="rounded-sm border border-border/70 bg-card/60 p-5">
                <h3 className="font-bold text-foreground">{t('api_docs.card_mutation_title')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/70">{t('api_docs.card_mutation_body')}</p>
              </article>
              <article className="space-y-4 rounded-sm border border-border/70 bg-card/60 p-5">
                <div>
                  <h3 className="font-bold text-foreground">{t('api_docs.transaction_mutation_title')}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{t('api_docs.transaction_mutation_body')}</p>
                </div>
                <CodeBlock label={t('api_docs.mutation_example_caption')} code={sealedBuyExample} />
                <p className="text-sm leading-relaxed text-foreground/70">{t('api_docs.transaction_revision_body')}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <p className="rounded-sm border border-border/70 bg-background/70 p-4 text-sm leading-relaxed text-foreground/70">
                    <code className="font-semibold text-foreground">PATCH /sealed/transactions/{'{id}'}</code>
                  </p>
                  <div className="rounded-sm border border-border/70 bg-background/70 p-4">
                    <p className="mb-3 text-sm leading-relaxed text-foreground/70">
                      <code className="font-semibold text-foreground">POST /sealed/transactions/{'{id}'}/void</code>
                      <br />{t('api_docs.transaction_void_body')}
                    </p>
                    <CodeBlock label="application/json" code={voidExample} />
                  </div>
                </div>
              </article>
            </section>

            <section id="errors" aria-labelledby="api-errors-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-errors-title" title={t('api_docs.errors_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.errors_intro')}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.errors_codes')}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <p className="rounded-sm border border-border/70 bg-card/60 p-4 text-sm leading-relaxed text-foreground/70">{t('api_docs.errors_conflict')}</p>
                <p className="rounded-sm border border-border/70 bg-card/60 p-4 text-sm leading-relaxed text-foreground/70">{t('api_docs.errors_rate')}</p>
              </div>
              <p className="text-sm leading-relaxed text-foreground/60">{t('api_docs.cache_note')}</p>
            </section>

            <section id="quotas" aria-labelledby="api-quotas-title" className="scroll-mt-24 space-y-5">
              <SectionHeading id="api-quotas-title" title={t('api_docs.quotas_title')} />
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/70">{t('api_docs.quotas_intro')}</p>
              <div className="overflow-hidden rounded-sm border border-border/70 bg-card/50">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">{t('api_docs.quotas_title')}</caption>
                  <tbody className="divide-y divide-border/70">
                    {[
                      [t('api_docs.quota_reads_minute'), API_GUIDE_QUOTAS.readsPerMinute],
                      [t('api_docs.quota_writes_minute'), API_GUIDE_QUOTAS.writesPerMinute],
                      [t('api_docs.quota_reads_day'), API_GUIDE_QUOTAS.readsPerDay],
                      [t('api_docs.quota_writes_day'), API_GUIDE_QUOTAS.writesPerDay],
                      [t('api_docs.quota_card_detail'), API_GUIDE_QUOTAS.cardDetailsPerDay],
                      [t('api_docs.quota_sealed_calc'), API_GUIDE_QUOTAS.sealedCalculationsPerDay],
                      [t('api_docs.quota_global'), API_GUIDE_QUOTAS.cardDetailsGlobalPerDay],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <th scope="row" className="px-4 py-3 font-medium leading-relaxed text-foreground/70">{label}</th>
                        <td className="w-28 px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">{typeof value === 'number' ? formatNumber(value) : value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm leading-relaxed text-foreground/70">{t('api_docs.quota_retry')}</p>
              <a
                href={`${API_BASE_URL}/openapi.json`}
                className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('api_docs.openapi_link')}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
