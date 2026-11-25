import { renderSitemapIndex, sitemapIndexUrls } from '@/lib/sitemap';
import { getSupabaseDatabaseClient, isSupabaseConfiguredServer } from '@/lib/supabase/database';
import { SEALED_PRODUCT_CATEGORY_IDS } from '@primedex/core/types/sealed';

export const revalidate = 21600;

async function hasSealedProductSitemapData(): Promise<boolean> {
  if (!isSupabaseConfiguredServer) return false;

  try {
    const sql = getSupabaseDatabaseClient();
    if (!sql) return false;

    const rows = await sql.query(`
      select cardmarket_product_id
      from public.tcg_sealed_products
      where active = true and category_id = any($1::int[])
      order by cardmarket_product_id asc
      limit 1
    `, [[...SEALED_PRODUCT_CATEGORY_IDS]]) as unknown as Array<{ cardmarket_product_id: number | string }>;
    return rows.length > 0;
  } catch (error) {
    console.warn('[sitemap-index] omitting sealed-product sitemaps because the data source is unavailable', error);
    return false;
  }
}

export async function GET(): Promise<Response> {
  const includeSealedProducts = await hasSealedProductSitemapData();
  const urls = sitemapIndexUrls().filter((url) => includeSealedProducts || !url.includes('/sitemaps/sealed-products'));
  return new Response(renderSitemapIndex(urls), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
