import { BackToTopButton } from '@/components/layout/BackToTopButton';

export default async function TcgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Resource hints for the TCG card-image CDN. Holographic card CSS is
          loaded only by the catalog and detail modal. */}
      <link rel="preconnect" href="https://api.tcgdex.net" />
      <link rel="preconnect" href="https://assets.tcgdex.net" />
      <link rel="dns-prefetch" href="https://api.tcgdex.net" />
      <link rel="dns-prefetch" href="https://assets.tcgdex.net" />
      {children}
      <BackToTopButton />
    </>
  );
}
