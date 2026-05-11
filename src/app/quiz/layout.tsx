import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pokémon Quiz - PrimeDex",
  description: "Test your Pokémon knowledge with interactive quizzes. Identify Pokémon by silhouette, type, and more.",
  alternates: {
    canonical: "/quiz",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Pokémon Quiz - PrimeDex",
    description: "Test your Pokémon knowledge with interactive quizzes.",
    url: "/quiz",
  },
  twitter: {
    title: "Pokémon Quiz - PrimeDex",
    description: "Test your Pokémon knowledge with interactive quizzes.",
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
