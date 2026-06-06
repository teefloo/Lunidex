import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PrimeDex — The Ultimate Online Pokédex',
    short_name: 'PrimeDex',
    description: 'The most complete Pokédex online. Browse all 1025 Pokémon with stats, evolutions, team builder, competitive builds, type matchups, and interactive quiz.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#1a1612',
    theme_color: '#e94560',
    lang: 'en',
    categories: ['games', 'entertainment', 'education'],
    shortcuts: [
      {
        name: 'Team Builder',
        short_name: 'Team',
        url: '/team',
        description: 'Build and analyze your Pokémon team',
      },
      {
        name: 'Compare',
        short_name: 'Compare',
        url: '/compare',
        description: 'Compare Pokémon side by side',
      },
      {
        name: 'Type Chart',
        short_name: 'Types',
        url: '/types',
        description: 'Master all type matchups',
      },
      {
        name: 'Quiz',
        short_name: 'Quiz',
        url: '/quiz',
        description: "Who's that Pokémon?",
      },
    ],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: `${SITE_URL}/screenshot-mobile.png`,
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'PrimeDex mobile Pokédex',
      },
      {
        src: `${SITE_URL}/screenshot-desktop.png`,
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'PrimeDex desktop dashboard',
      },
    ],
  };
}
