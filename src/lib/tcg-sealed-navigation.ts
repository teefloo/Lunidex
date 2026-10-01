export const SEALED_SUBVIEWS = [
  { key: 'dashboard', labelKey: 'dashboard', path: '/tcg/sealed', section: 'main' },
  { key: 'collection', labelKey: 'collection', path: '/tcg/sealed/collection', section: 'main' },
  { key: 'journal', labelKey: 'journal', path: '/tcg/sealed/journal', section: 'main' },
  { key: 'sales', labelKey: 'sales', path: '/tcg/sealed/sales', section: 'reports' },
  { key: 'cashflow', labelKey: 'cashflow', path: '/tcg/sealed/cashflow', section: 'reports' },
  { key: 'analytics', labelKey: 'analytics', path: '/tcg/sealed/analytics', section: 'reports' },
  { key: 'catalogue', labelKey: 'catalogue', path: '/tcg/sealed/catalogue', section: 'tools' },
  { key: 'market', labelKey: 'public_market.title', path: '/tcg/sealed/market', section: 'market' },
  { key: 'sources', labelKey: 'sources', path: '/tcg/sealed/sources', section: 'tools' },
] as const;

export function getSealedSubnavPath(view: string): string {
  return SEALED_SUBVIEWS.find((item) => item.key === view)?.path ?? SEALED_SUBVIEWS[0].path;
}
