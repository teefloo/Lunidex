export const PUBLIC_OG_CACHE_HEADERS = {
  // Keep browser previews revalidated while allowing Vercel to reuse the
  // generated image for a day and refresh it in the background for a week.
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Vercel-CDN-Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};
