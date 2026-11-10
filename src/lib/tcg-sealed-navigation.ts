export const SEALED_SUBVIEWS = [
  { key: 'dashboard', labelKey: 'dashboard', path: '/tcg/sealed', section: 'main' },
  { key: 'collection', labelKey: 'my_products', path: '/tcg/sealed/collection', section: 'main' },
  { key: 'journal', labelKey: 'journal', path: '/tcg/sealed/journal', section: 'main' },
  { key: 'sales', labelKey: 'sales', path: '/tcg/sealed/sales', section: 'reports' },
  { key: 'cashflow', labelKey: 'cashflow', path: '/tcg/sealed/cashflow', section: 'reports' },
  { key: 'analytics', labelKey: 'analytics', path: '/tcg/sealed/analytics', section: 'reports' },
  { key: 'catalogue', labelKey: 'reference_catalogue', path: '/tcg/sealed/catalogue', section: 'tools' },
  { key: 'market', labelKey: 'public_market.title', path: '/tcg/sealed/market', section: 'market' },
  { key: 'sources', labelKey: 'sources', path: '/tcg/sealed/sources', section: 'tools' },
] as const;

export function getSealedSubnavPath(view: string): string {
  return SEALED_SUBVIEWS.find((item) => item.key === view)?.path ?? SEALED_SUBVIEWS[0].path;
}

export function isValidSealedRouteSegments(segments: readonly string[]): boolean {
  if (segments.length === 0) return true;
  if (segments.length === 1 && segments[0] === 'market') return true;
  if (segments[0] === 'products') {
    if (segments.length !== 2 || !/^[1-9]\d{0,9}$/.test(segments[1])) return false;
    const id = Number(segments[1]);
    return Number.isSafeInteger(id) && id <= 2_147_483_647;
  }
  return segments.length === 1
    && SEALED_SUBVIEWS.some((item) => item.key === segments[0] && item.key !== 'market');
}
