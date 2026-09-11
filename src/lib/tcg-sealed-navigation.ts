export const SEALED_SUBVIEWS = [
  { key: 'dashboard', labelKey: 'dashboard', path: '/tcg/sealed' },
  { key: 'collection', labelKey: 'collection', path: '/tcg/sealed/collection' },
  { key: 'journal', labelKey: 'journal', path: '/tcg/sealed/journal' },
  { key: 'sales', labelKey: 'sales', path: '/tcg/sealed/sales' },
  { key: 'cashflow', labelKey: 'cashflow', path: '/tcg/sealed/cashflow' },
  { key: 'analytics', labelKey: 'analytics', path: '/tcg/sealed/analytics' },
  { key: 'catalogue', labelKey: 'catalogue', path: '/tcg/sealed/catalogue' },
  { key: 'sources', labelKey: 'sources', path: '/tcg/sealed/sources' },
] as const;

export function getSealedSubnavPath(view: string): string {
  return SEALED_SUBVIEWS.find((item) => item.key === view)?.path ?? SEALED_SUBVIEWS[0].path;
}
