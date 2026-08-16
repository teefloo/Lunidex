import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Cpu,
  Info,
  Sparkles,
  Swords,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { TYPE_COLORS } from '@/types/pokemon';
import type { MoveDetail } from '@/types/move';
import MoveStatCard from '@/components/moves/MoveStatCard';
import MoveLearnerGrid from '@/components/moves/MoveLearnerGrid';
import MoveBestUsers from '@/components/moves/MoveBestUsers';
import type { LearnerEntry } from '@/components/moves/MoveLearnerGrid';
import { REST_API_BASE } from '@/lib/api/client';
import { buildBreadcrumbJsonLd, buildDefinedTermJsonLd, buildSubpathLanguages, buildWebPageJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';

export const revalidate = 86400;
export const dynamicParams = true;

const GENERATION_LABELS: Record<string, string> = {
  'generation-i': 'Gen I',
  'generation-ii': 'Gen II',
  'generation-iii': 'Gen III',
  'generation-iv': 'Gen IV',
  'generation-v': 'Gen V',
  'generation-vi': 'Gen VI',
  'generation-vii': 'Gen VII',
  'generation-viii': 'Gen VIII',
  'generation-ix': 'Gen IX',
};

async function fetchMoveDetail(name: string): Promise<MoveDetail | null> {
  try {
    const res = await fetch(`${REST_API_BASE}/move/${name}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MoveDetail;
  } catch {
    return null;
  }
}

interface PokemonStatResult {
  id: number;
  name: string;
  types: { type: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

async function fetchPokemonStats(pokemonName: string): Promise<PokemonStatResult | null> {
  try {
    const res = await fetch(`${REST_API_BASE}/pokemon/${pokemonName}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PokemonStatResult;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${REST_API_BASE}/move?limit=200`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results: { name: string }[] };
    return data.results.map((m) => ({ name: m.name }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const t = await getServerT();
  const lang = await getServerLanguage();
  const move = await fetchMoveDetail(name);

  if (!move) {
    notFound();
  }

  const localizedName = move.name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const effectEntry = move.effect_entries.find((e) => e.language.name === 'en');
  const description = effectEntry?.short_effect ?? t('moves_page.no_description_detail');

  return {
    title: `${localizedName} — Move | Lunidex`,
    description,
    alternates: {
      canonical: `/${lang}/moves/${name}`,
      languages: buildSubpathLanguages(`/moves/${name}`),
    },
    openGraph: {
      title: `${localizedName} — Move | Lunidex`,
      description,
      url: `/${lang}/moves/${name}`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary',
      title: `${localizedName} — Move | Lunidex`,
      description,
    },
  };
}

export default async function MoveDetailPage({ params }: Props) {
  const { name } = await params;
  const t = await getServerT();
  const lang = await getServerLanguage();

  const move = await fetchMoveDetail(name);
  if (!move) notFound();

  const typeColor = TYPE_COLORS[move.type.name] || '#6B7280';
  const damageClass = move.damage_class.name;

  // Human-readable move name (capitalize words)
  const displayName = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Effect description (English first, fallback to whatever is available)
  const effectEntry =
    move.effect_entries.find((e) => e.language.name === 'en') ??
    move.effect_entries[0];

  // Flavor text — pick the most recent version group entry in English
  const flavorEntries = move.flavor_text_entries.filter((e) => e.language.name === 'en');
  const flavorText = flavorEntries[flavorEntries.length - 1]?.flavor_text?.replace(/\n/g, ' ').trim() ?? null;

  // Generation label
  const genName = move.generation.name;
  const genLabel = GENERATION_LABELS[genName] ?? genName;
  const effectDescription = (effectEntry?.effect ?? effectEntry?.short_effect ?? t('moves_page.no_description_detail'))
    .replace(/\n|\f/g, ' ')
    .trim();

  const routePath = `/${lang}/moves/${name}`;
  const moveTermJsonLd = buildDefinedTermJsonLd({
    lang,
    path: routePath,
    name: displayName,
    description: effectDescription,
    identifier: move.id,
    setName: t('moves_page.title'),
    setPath: '/moves',
    additionalProperty: [
      { name: 'Type', value: move.type.name },
      { name: 'Damage class', value: damageClass },
      { name: 'Generation', value: genName },
      ...(move.power !== null ? [{ name: 'Power', value: move.power }] : []),
      ...(move.accuracy !== null ? [{ name: 'Accuracy', value: move.accuracy, unitText: '%' }] : []),
      { name: 'PP', value: move.pp },
      { name: 'Priority', value: move.priority },
      ...(move.effect_chance !== null ? [{ name: 'Effect chance', value: move.effect_chance, unitText: '%' }] : []),
    ],
  });
  const moveWebPageJsonLd = {
    ...buildWebPageJsonLd({
      lang,
      path: routePath,
      name: `${displayName} — ${t('moves_page.title')}`,
      description: effectDescription,
      keywords: `${displayName}, Pokémon move, ${move.type.name}, ${damageClass}`,
    }),
    about: { '@id': `${SITE_URL}${routePath}#term` },
    mainEntity: { '@id': `${SITE_URL}${routePath}#term` },
  };
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: t('moves_page.title'), path: '/moves' },
    { name: displayName, path: `/moves/${name}` },
  ], lang);

  // Learners — build flat list from learned_by_pokemon (up to all of them)
  // We'll fetch stats of up to 20 to determine best users
  const learnedBy = move.learned_by_pokemon;

  // Build learner entries for the grid
  // We keep them as just name/url for now — the grid will display from this list
  // We need to fetch sprites: IDs come from the URL pattern
  const getLearnerIdFromUrl = (url: string): number => {
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1]) || 0;
  };

  const learnerEntries: LearnerEntry[] = learnedBy.map((p) => ({
    id: getLearnerIdFromUrl(p.url),
    name: p.name,
    localizedName: p.name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    types: [],
    learnMethod: 'level-up',
    level: null,
  }));

  // Fetch stats for best users (up to 20 first learners)
  interface BestUser {
    id: number;
    name: string;
    localizedName: string;
    types: string[];
    statValue: number;
  }

  let bestUsers: BestUser[] = [];
  if (damageClass !== 'status' && learnedBy.length > 0) {
    const statName = damageClass === 'physical' ? 'attack' : 'special-attack';
    const sampleSize = Math.min(20, learnedBy.length);
    const sample = learnedBy.slice(0, sampleSize);

    const results = await Promise.allSettled(sample.map((p) => fetchPokemonStats(p.name)));

    const statsData = results
      .filter((r): r is PromiseFulfilledResult<PokemonStatResult> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value);

    bestUsers = statsData
      .map((p) => {
        const stat = p.stats.find((s) => s.stat.name === statName);
        return {
          id: p.id,
          name: p.name,
          localizedName: p.name
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' '),
          types: p.types.map((pt) => pt.type.name),
          statValue: stat?.base_stat ?? 0,
        };
      })
      .sort((a, b) => b.statValue - a.statValue)
      .slice(0, 6);
  }

  const statLabels = {
    power: t('moves_page.stat_power'),
    accuracy: t('moves_page.stat_accuracy'),
    pp: t('moves_page.stat_pp'),
    priority: t('moves_page.stat_priority'),
    effectChance: t('moves_page.stat_effect_chance'),
  };

  const learnerLabels = {
    title: t('moves_page.learners_section_title'),
    byLevel: t('moves_page.learners_by_level'),
    byTm: t('moves_page.learners_by_tm'),
    byEgg: t('moves_page.learners_by_egg'),
    byTutor: t('moves_page.learners_by_tutor'),
    showAll: t('moves_page.show_all_learners'),
    noLearners: t('moves_page.no_learners'),
  };

  const bestUsersLabels = {
    title: t('moves_page.best_users_title'),
    subtitle: t('moves_page.best_users_subtitle'),
    attackStat: t('stats.attack'),
    spAttackStat: t('stats.sp_attack'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({ '@graph': [moveWebPageJsonLd, moveTermJsonLd, breadcrumbJsonLd] }),
        }}
      />
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 20% 0%, ${typeColor}40, transparent)`,
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_86%)] opacity-80" />
      </div>

      <Header />

      <main className="page-shell pb-20 pt-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/${lang}/moves`}
            className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-card/50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/55 transition-all hover:border-border/90 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('moves_page.back_to_moves')}
          </Link>
        </div>

        {/* Header */}
        <div className="relative mb-8 overflow-hidden rounded-sm border border-border/70 bg-card/50 p-6">
          <div
            className="absolute inset-x-0 top-0 h-1.5"
            style={{ backgroundColor: typeColor }}
          />
          <div
            className="absolute inset-0 opacity-60"
            style={{ background: `linear-gradient(180deg, ${typeColor}12, transparent 60%)` }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/30">
                #{String(move.id).padStart(4, '0')}
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                {displayName}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge
                  className="text-primary-foreground"
                  style={{ backgroundColor: typeColor }}
                >
                  {t(`types.${move.type.name}`)}
                </Badge>
                <Badge variant="outline" className="border-border/70 text-foreground/60">
                  {t(`moves.damage_class.${damageClass}`)}
                </Badge>
                <Badge variant="ghost" className="text-foreground/45">
                  {t('moves_page.generation_intro').replace('{{gen}}', genLabel)}
                </Badge>
              </div>
            </div>

            {/* Damage class icon */}
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-border/70"
              style={{ background: `${typeColor}18` }}
            >
              {damageClass === 'status' ? (
                <Sparkles className="h-8 w-8" style={{ color: typeColor }} />
              ) : damageClass === 'special' ? (
                <Cpu className="h-8 w-8" style={{ color: typeColor }} />
              ) : (
                <Swords className="h-8 w-8" style={{ color: typeColor }} />
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-6">
            <MoveStatCard move={move} labels={statLabels} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Effect description */}
            <section className="rounded-sm border border-border/70 bg-card/35 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('moves_page.full_effect_label')}
                </h2>
              </div>
              <p className="text-sm leading-7 text-foreground/70">{effectDescription}</p>
            </section>

            {/* Flavor text */}
            {flavorText && (
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('moves_page.flavor_text_label')}
                  </h2>
                </div>
                <p className="text-sm italic leading-7 text-foreground/55">
                  &ldquo;{flavorText}&rdquo;
                </p>
              </section>
            )}

            {/* Learners grid */}
            {learnerEntries.length > 0 && (
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <MoveLearnerGrid
                  learners={learnerEntries}
                  moveName={displayName}
                  labels={learnerLabels}
                />
              </section>
            )}

            {/* Best users */}
            {bestUsers.length > 0 && (
              <MoveBestUsers
                users={bestUsers}
                damageClass={damageClass}
                labels={bestUsersLabels}
              />
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {/* Move info card */}
            <div className="rounded-sm border border-border/70 bg-card/35 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('moves_page.detail_title')}
                </h2>
              </div>

              <dl className="space-y-3">
                <InfoRow label={t('moves_page.damage_class_label')} value={t(`moves.damage_class.${damageClass}`)} />
                <InfoRow label={t('moves_page.stat_power')} value={move.power !== null ? String(move.power) : '—'} />
                <InfoRow
                  label={t('moves_page.stat_accuracy')}
                  value={move.accuracy !== null ? `${move.accuracy}%` : '—'}
                />
                <InfoRow label={t('moves_page.stat_pp')} value={String(move.pp)} />
                <InfoRow
                  label={t('moves_page.stat_priority')}
                  value={move.priority > 0 ? `+${move.priority}` : String(move.priority)}
                />
                {move.effect_chance !== null && (
                  <InfoRow label={t('moves_page.stat_effect_chance')} value={`${move.effect_chance}%`} />
                )}
                <InfoRow
                  label={t('moves_page.generation')}
                  value={genLabel}
                />
                <InfoRow
                  label={t('types.select_type')}
                  value={t(`types.${move.type.name}`)}
                  color={typeColor}
                />
              </dl>
            </div>

            {/* TM/HM info if available */}
            {move.machines.length > 0 && (
              <div className="rounded-sm border border-border/70 bg-card/35 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40">
                    {t('moves_page.learners_by_tm')}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {move.machines.slice(0, 6).map((m) => (
                    <Badge
                      key={m.version_group.name}
                      variant="outline"
                      className="border-border/70 text-[11px] text-foreground/55"
                    >
                      {m.version_group.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
      </div>
    </>
  );
}

function InfoRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/35">{label}</dt>
      <dd className="text-sm font-bold" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}
