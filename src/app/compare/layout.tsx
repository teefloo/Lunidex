import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Pokémon - PrimeDex",
  description: "Compare stats, types, abilities, and more between any two Pokémon side by side. Find out which Pokémon comes out on top.",
  alternates: {
    canonical: "/compare",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Compare Pokémon - PrimeDex",
    description: "Compare stats, types, abilities, and more between any two Pokémon side by side.",
    url: "/compare",
  },
  twitter: {
    title: "Compare Pokémon - PrimeDex",
    description: "Compare stats, types, abilities, and more between any two Pokémon side by side.",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
