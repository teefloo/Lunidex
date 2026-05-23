import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TCG Card Catalog - PrimeDex",
  description: "Browse and search the Pokémon Trading Card Game collection. View card details, set information, and rarity levels.",
  openGraph: {
    title: "TCG Card Catalog - PrimeDex",
    description: "Browse and search the Pokémon Trading Card Game collection.",
  },
  twitter: {
    title: "TCG Card Catalog - PrimeDex",
    description: "Browse and search the Pokémon Trading Card Game collection.",
  },
};

export default function TcgLayout({ children }: { children: React.ReactNode }) {
  return children;
}
