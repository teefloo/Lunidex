import MovesPageClient from './MovesPageClient';

export const revalidate = 3600;

export default function MovesPage() {
  return <MovesPageClient />;
}
