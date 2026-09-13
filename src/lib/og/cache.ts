export const PUBLIC_OG_CACHE_HEADERS = {
  // Keep browser previews revalidated while allowing Vercel to reuse the
  // generated image for a day and refresh it in the background for a week.
  'Cache-Control': 'public, max-age=0, must-revalidate',
  // The generic CDN directive is useful for Vercel and downstream image
  // consumers; it also makes the intent explicit when a platform strips the
  // provider-specific header.
  'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};
