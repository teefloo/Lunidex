// Workbox sees webpack asset names (`static/chunks/...`), while the generated
// manifest exposes their public URLs (`/_next/static/chunks/...`). Match both.
export const NEXT_MODAL_ROUTE_CHUNK_EXCLUDE_PATTERN = /(?:^|\/)(?:_next\/)?static\/chunks\/app\/@modal\//;
