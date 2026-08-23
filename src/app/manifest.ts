import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lunidex — Pokémon Companion for Players and Collectors',
    short_name: 'Lunidex',
    description: 'Explore the Pokédex, build teams, track your Pokémon TCG collection, and complete sets.',
    start_url: '/en',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#07144F',
    theme_color: '#5243B5',
    lang: 'en',
    categories: ['games', 'entertainment', 'education'],
    shortcuts: [
      {
        name: 'Team Builder',
        short_name: 'Team',
        url: '/en/team',
        description: 'Build and analyze your Pokémon team',
      },
      {
        name: 'TCG Collection',
        short_name: 'Collection',
        url: '/en/tcg/collection',
        description: 'Track cards and set completion',
      },
      {
        name: 'TCG Catalog',
        short_name: 'TCG',
        url: '/en/tcg',
        description: 'Browse Pokémon cards and add them to your collection',
      },
      {
        name: 'Quiz',
        short_name: 'Quiz',
        url: '/en/quiz',
        description: "Who's that Pokémon?",
      },
    ],
    icons: [
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
        src: '/icon-512-maskable.png',
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
        label: 'Lunidex mobile Pokédex',
      },
      {
        src: `${SITE_URL}/screenshot-desktop.png`,
        sizes: '1920x1080',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Lunidex desktop dashboard',
      },
    ],
  };
}
