import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Info, Package, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { getItemDetail } from '@/lib/api/graphql';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { formatName } from '@/lib/utils';

export const revalidate = 86400;
export const dynamicParams = true;

const itemSpriteUrl = (name: string) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`;

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const lang = await getServerLanguage();
  const langId = languageToPokemonLanguageId[lang];
  const displayName = formatName(name);

  const item = await getItemDetail(name, langId).catch(() => null);
  if (!item) return { title: `${displayName} — Item | PrimeDex` };

  const localizedName = item.pokemon_v2_itemnames?.[0]?.name || displayName;
  const description = item.pokemon_v2_itemeffecttexts?.[0]?.short_effect
    || `Details about the ${displayName} item.`;

  return {
    title: `${localizedName} — Item | PrimeDex`,
    description,
    alternates: { canonical: `/${lang}/items/${name}` },
    openGraph: {
      title: `${localizedName} — Item | PrimeDex`,
      description,
      url: `/${lang}/items/${name}`,
      type: 'website',
      images: [{ url: itemSpriteUrl(name) }],
    },
  };
}

export default async function ItemDetailPage({ params }: Props) {
  const { name } = await params;
  const t = await getServerT();
  const lang = await getServerLanguage();
  const langId = languageToPokemonLanguageId[lang];

  const item = await getItemDetail(name, langId);
  if (!item) notFound();

  const displayName = formatName(name);
  const localizedName = item.pokemon_v2_itemnames?.[0]?.name || displayName;
  const effect = item.pokemon_v2_itemeffecttexts?.[0];
  const flavor = item.pokemon_v2_itemflavortexts?.[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_86%)] opacity-80" />
      </div>

      <Header />

      <main className="page-shell pb-20 pt-8">
        <div className="mb-6">
          <Link
            href="/items"
            className="inline-flex items-center gap-2 rounded-sm border border-border/70 bg-card/50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/55 transition-all hover:border-border/90 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('items_page.back_to_items', { defaultValue: 'Back to Items' })}
          </Link>
        </div>

        <div className="relative mb-8 overflow-hidden rounded-sm border border-border/70 bg-card/50 p-6">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-primary" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-background/50 p-3">
              <Image
                src={itemSpriteUrl(name)}
                alt={localizedName}
                width={56}
                height={56}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/30">
                #{String(item.id).padStart(4, '0')}
              </p>
              <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-foreground sm:text-4xl">
                {localizedName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.pokemon_v2_itemcategory && (
                  <Badge variant="outline" className="border-border/70 text-foreground/60">
                    {formatName(item.pokemon_v2_itemcategory.name)}
                  </Badge>
                )}
                {item.cost > 0 && (
                  <Badge variant="ghost" className="text-foreground/45">
                    ₽{item.cost.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-sm border border-border/70 bg-card/35 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('items_page.effect_label', { defaultValue: 'Effect' })}
                </h2>
              </div>
              <p className="text-sm leading-7 text-foreground/70">
                {effect?.effect?.replace(/\n|\f/g, ' ').trim()
                  || effect?.short_effect?.replace(/\n|\f/g, ' ').trim()
                  || t('items_page.no_description', { defaultValue: 'No description available.' })}
              </p>
            </section>

            {flavor && (
              <section className="rounded-sm border border-border/70 bg-card/35 p-5">
                <p className="text-sm italic leading-7 text-foreground/55">
                  &ldquo;{flavor.flavor_text.replace(/\n|\f/g, ' ').trim()}&rdquo;
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-sm border border-border/70 bg-card/35 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                  {t('items_page.info_label', { defaultValue: 'Item Info' })}
                </h2>
              </div>
              <dl className="space-y-3">
                {item.pokemon_v2_itemcategory && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/35">
                      <Tag className="h-3 w-3" />
                      {t('items_page.category_label', { defaultValue: 'Category' })}
                    </dt>
                    <dd className="text-sm font-bold">{formatName(item.pokemon_v2_itemcategory.name)}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-foreground/35">
                    {t('items_page.cost_label', { defaultValue: 'Cost' })}
                  </dt>
                  <dd className="text-sm font-bold">{item.cost > 0 ? `₽${item.cost.toLocaleString()}` : '—'}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
