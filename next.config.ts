import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://raw.githubusercontent.com https://pokeapi.co https://images.scrydex.com https://images.pokemontcg.io https://assets.tcgdex.net https://tcg.pokemon.com data: blob:; font-src 'self' data:; media-src 'self' https://raw.githubusercontent.com; connect-src 'self' http://localhost:4747 https://pokeapi.co https://beta.pokeapi.co https://api.tcgdex.net https://raw.githubusercontent.com;" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ['192.168.2.203:3000', 'localhost:3000'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/**',
      },
      {
        protocol: 'https',
        hostname: 'pokeapi.co',
      },
      {
        protocol: 'https',
        hostname: 'images.scrydex.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'assets.tcgdex.net',
      },
      {
        protocol: 'https',
        hostname: 'tcg.pokemon.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/pokedex',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        // Immutable caching for static assets (JS, CSS, fonts)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache SVG and image assets
        source: '/(.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // Cache sitemap and robots
        source: '/(sitemap\\.xml|robots\\.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
