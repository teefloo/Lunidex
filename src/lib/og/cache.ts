export const PUBLIC_OG_CACHE_HEADERS = {
  // Keep browser previews revalidated while allowing a downstream cache to
  // reuse the generated image for a day and refresh it in the background.
  'Cache-Control': 'public, max-age=0, must-revalidate',
  // Generic CDN directive for downstream image caches.
  'CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};
