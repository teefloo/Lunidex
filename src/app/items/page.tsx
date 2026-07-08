import ItemsPageClient from './ItemsPageClient';

export const revalidate = 3600;

export default function ItemsPage() {
  return <ItemsPageClient />;
}
