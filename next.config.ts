import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";
import withPWAInit from "@ducanh2912/next-pwa";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    skipWaiting: true,
    importScripts: ["/push-worker.js"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/pokeapi\.co\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "pokeapi-data",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 86400,
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/api\.tcgdex\.net\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tcgdex-data",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 86400,
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/.*$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "pokeapi-sprites",
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 604800,
          },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: /^https:\/\/assets\.tcgdex\.net\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tcgdex-images-v2",
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 604800,
          },
          cacheableResponse: { statuses: [200] },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: /^https:\/\/images\.tcgdex\.net\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "tcgdex-images-v2",
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 604800,
          },
          cacheableResponse: { statuses: [200] },
          networkTimeoutSeconds: 10,
        },
      },
      {
        urlPattern: ({ sameOrigin, url }: { sameOrigin: boolean; url: URL }) =>
          sameOrigin && /\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(url.pathname),
        handler: "CacheFirst",
        options: {
          cacheName: "static-images-v2",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 604800,
          },
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        urlPattern: /\/_next\/static.+\.js$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-js",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 31536000,
          },
        },
      },
      {
        urlPattern: /\/_next\/static.+\.css$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static-css",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 31536000,
          },
        },
      },
      {
        urlPattern: ({ url }: { url: URL }) => {
          const isSameOrigin = self.location.origin === url.origin;
          if (!isSameOrigin) return false;
          const pathname = url.pathname;
          if (pathname.startsWith("/api/")) return false;
          if (pathname.startsWith("/offline")) return false;
          return pathname.startsWith("/");
        },
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 86400,
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

// Dev-only connect-src additions (localhost dev server / Agentation).
// Excluded from production to avoid leaking infra details and to enforce
// strict-origin connections.
const devConnectSrc =
  process.env.NODE_ENV === 'development'
    ? ' http://localhost:4747 http://127.0.0.1:4747'
    : '';

// unsafe-eval is required by Webpack HMR in dev; strip it in production.
const scriptSrc =
  process.env.NODE_ENV === 'development'
    ? "'self' 'unsafe-inline' 'unsafe-eval' blob: https://va.vercel-scripts.com"
    : "'self' 'unsafe-inline' blob: https://va.vercel-scripts.com";

const csp = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://raw.githubusercontent.com https://pokeapi.co https://images.scrydex.com https://images.pokemontcg.io https://assets.tcgdex.net https://images.tcgdex.net https://tcg.pokemon.com https://*.supabase.co https://*.googleusercontent.com https://avatars.githubusercontent.com data: blob: https://api.tcgdex.net",
  "font-src 'self' data:",
  "media-src 'self' https://raw.githubusercontent.com",
  `connect-src 'self'${devConnectSrc} https://va.vercel-scripts.com https://vitals.vercel-insights.com https://pokeapi.co https://beta.pokeapi.co https://api.tcgdex.net https://raw.githubusercontent.com https://*.supabase.co wss://*.supabase.co`,
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: csp },
];

const nextConfig: NextConfig = {
  compress: true,
  // Shared business logic now lives in the @primedex/core workspace package,
  // consumed by both this web app and the Expo mobile app.
  transpilePackages: ['@primedex/core'],
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: ['192.168.2.203:3000', 'localhost:3000', 'localhost:4747', '127.0.0.1:4747'],
  experimental: {
    optimizePackageImports: ['framer-motion', '@tanstack/react-query', 'lucide-react', 'recharts', 'sonner', 'cmdk', 'i18next', 'react-i18next'],
    optimizeCss: true,
  },
  images: {
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/**',
      },
      {
        protocol: 'https',
        hostname: 'pokeapi.co',
        pathname: '/media/upload/**',
      },
      {
        protocol: 'https',
        hostname: 'images.scrydex.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.tcgdex.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.tcgdex.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tcg.pokemon.com',
        pathname: '/**',
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
      {
        source: '/pokemon',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pt/:path*',
        destination: '/en/:path*',
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
        // Next.js immutable hashed chunks (JS/CSS) — safe to cache aggressively
        source: '/_next/static/:path*',
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
        // Cache sitemap, robots, and AI discovery files
        source: '/(sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt|ai\\.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Cache font files
        source: '/(.*\\.(?:woff|woff2|ttf|otf))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
