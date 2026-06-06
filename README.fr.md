<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logo PrimeDex" align="center" width="80" />

# PrimeDex

**Le Pokédex en ligne le plus complet, conçu pour les dresseurs qui tiennent à la vitesse, à la donnée et au design.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

Un tableau de bord Next.js 16 + React 19 haute performance pour le Pokédex National complet : statistiques, types, évolutions, construction d'équipe, cartes TCG et quiz, le tout en 9 langues.

[Aperçu](#apercu) · [Fonctionnalités](#fonctionnalites) · [Démarrage rapide](#demarrage-rapide) · [Routes](#routes) · [Architecture](#architecture) · [Sources de données](#sources-de-donnees) · [Déploiement](#deploiement)

![PrimeDex — aperçu bureau](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

[English](./README.md) · **Français** · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Aperçu

PrimeDex est un tableau de bord Pokédex open source pour les joueurs compétitifs, les collectionneurs de TCG et les fans curieux. Il couvre les **1 025 Pokémon** des 9 générations, avec des noms localisés en 9 langues, des comparaisons de statistiques côte à côte, un constructeur d'équipe basé sur la couverture des types et un catalogue TCG de plus de 25 000 cartes.

L'application repose sur les API officielles [PokéAPI](https://pokeapi.co) (REST + GraphQL) et [TCGdex](https://www.tcgdex.net), avec TanStack Query pour la mise en cache, Zustand pour l'état persistant de l'interface (IndexedDB), et le App Router de Next.js pour les composants serveur et la génération statique par route.

> [!NOTE]
> Ceci est un projet de fan non commercial. Les données, noms et images Pokémon sont © Nintendo, Game Freak et The Pokémon Company.

## Fonctionnalités

- **Pokédex National complet** — Les 1 025 Pokémon, toutes les formes, toutes les générations, avec noms localisés et textes descriptifs.
- **Constructeur d'équipe** — Construis une équipe de 6, obtiens l'analyse de couverture des types en direct, la détection des faiblesses partagées et un score de synergie.
- **Moteur de comparaison** — Analyse côte à côte de jusqu'à 3 Pokémon avec des diagrammes radar interactifs et un détail des statistiques de base.
- **Tableau des types** — Couverture interactive des 18 types avec forces, faiblesses, résistances et immunités.
- **Base de données des capacités** — Liste filtrable par puissance, précision, PP, type, catégorie et description détaillée des effets.
- **Catalogue TCG** — Plus de 25 000 cartes recherchables par set, rareté, type, stade et PV, avec suivi de collection et de liste de souhaits.
- **Quiz** — 6 modes de jeu dont Classique, Silhouette, Statistiques, Contre la montre, Survie et Marathon.
- **Suivi du Living Dex** — Gestion persistante des captures, entièrement hors ligne, stockée localement dans ton navigateur.
- **9 langues** — Anglais, français, allemand, espagnol, italien, japonais, coréen, chinois simplifié, portugais brésilien.
- **Recherche avancée** — Filtrage multidimensionnel par génération, type, BST, groupes d'œufs et statut spécial.
- **Prêt pour le SEO & l'AEO** — JSON-LD (`WebApplication`, `ItemList`, `FAQPage`, `HowTo`), alternatives `hreflang`, découverte `llms.txt` / `ai.txt`, et sitemap généré.

## Démarrage rapide

### Pré-requis

- [Node.js](https://nodejs.org) 20+
- npm 10+ (fourni avec Node.js)
- Un shell compatible POSIX (les scripts fournis utilisent une invocation de style `bash`)

### Lancer en local

```bash
# 1. Clone le dépôt
git clone https://github.com/teefloo/Poke.git
cd Poke

# 2. Installe les dépendances
npm install

# 3. Démarre le serveur de dev (webpack, pas Turbopack)
npm run dev
```

L'application tourne maintenant sur <http://localhost:3000>. Le middleware redirigera `/` vers ta locale préférée en fonction du cookie `primedex-lang` ou de l'en-tête `Accept-Language` de ton navigateur.

> [!IMPORTANT]
> `npm run dev` est épinglé sur `next dev --webpack` pour un HMR stable avec le App Router et les frontières `next/dynamic`. Ne passe pas à Turbopack en local — la déclaration de `turbopack.root` dans `next.config.ts` est intentionnelle et doit rester.

### Outil dev Agentation (optionnel)

PrimeDex embarque [Agentation](https://github.com/tldraw/agentation) pour la revue d'UI assistée par IA. Pour l'activer, ajoute la ligne suivante à `.env.local` :

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

La barre d'outils sera servie sur <http://localhost:4747> (le CSP et `allowedDevOrigins` sont préconfigurés).

## Stack technique

| Couche           | Outils                                                                          |
| ---------------- | ------------------------------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev)   |
| Langage          | [TypeScript 5](https://www.typescriptlang.org) (strict, 100 % typé)             |
| Style            | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| Primitives UI    | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (preset `base-nova`)       |
| Animation        | [Framer Motion](https://www.framer.com/motion/)                                |
| Récupération de données | [TanStack Query v5](https://tanstack.com/query)                          |
| État client      | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| Graphiques       | [Recharts](https://recharts.org)                                                |
| i18n             | [i18next](https://www.i18next.com/) + `react-i18next`                            |
| HTTP             | [Axios](https://axios-http.com) + `axios-retry` (backoff exponentiel)           |
| Outillage        | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (QA visuelle)       |

## Routes

Toutes les routes sont préfixées par la locale (`/en`, `/fr`, `/ja`…). Le middleware gère les redirections 308 et les réécritures de manière transparente.

| Chemin                  | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| `/`                     | Accueil avec hero, Pokémon à la une et la grille complète du Pokédex.        |
| `/pokemon/[name]`       | Page de détail avec stats, types, évolutions, talents, capacités et builds. |
| `/team`                 | Constructeur d'équipe de 6 avec couverture des types en direct et score de synergie. |
| `/compare`              | Comparaison côte à côte de jusqu'à 3 Pokémon.                                |
| `/favorites`            | Liste personnelle des Pokémon favoris.                                       |
| `/quiz`                 | « Quel est ce Pokémon ? » avec 6 modes de jeu.                               |
| `/types`                | Tableau des types interactif pour les 18 types.                              |
| `/moves`                | Base de données des capacités, recherchable.                                 |
| `/tcg`                  | Catalogue TCG Pokémon avec filtres par set, rareté, type et PV.              |
| `/tcg/cards/[id]`       | Détail d'une carte TCG individuelle.                                         |
| `/tcg/collection`       | Suivi de ta collection de cartes.                                            |
| `/tcg/wishlist`         | Liste de souhaits TCG.                                                       |
| `/about`                | Mission, sources de données et contact.                                      |
| `/faq`                  | Questions fréquentes.                                                        |
| `/cookies` `/legal` `/privacy` `/terms` | Pages légales.                                              |

La page dynamique `/pokemon/[name]` utilise `generateStaticParams` pour les 151 premiers Pokémon et `revalidate = 3600` pour la régénération statique incrémentale.

## Architecture

### Flux de données

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Sélecteurs Zustand (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- Tous les appels HTTP passent par le barrel `@/lib/api` ; les composants n'utilisent jamais `fetch` ou `axios` directement.
- Les clés de requête sont centralisées dans `@/lib/api/keys` pour une invalidation stable.
- Le store Zustand ne contient que des ID et des primitives (favoris, équipe, capturés, filtres, historique, paramètres) et est persisté en IndexedDB. L'état local **n'est pas** conservé dans `localStorage`.
- Les composants lourds (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) sont chargés via `next/dynamic` pour garder un premier affichage léger.

### Internationalisation

- Locales prises en charge : `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- Le code client utilise `@/lib/i18n` avec des bundles de langue chargés à la demande ; l'anglais est le bundle initial.
- Le code serveur utilise `@/lib/server-i18n` avec tous les bundles intégrés pour le SSG/SSR.
- Chaque page déclare des alternatives `hreflang` et un `x-default` pointant vers `/en`.
- Le cookie `primedex-lang` mémorise la préférence de l'utilisateur pendant 1 an.

### Performance

- Server Components par défaut ; `"use client"` est réservé aux feuilles qui ont besoin d'interactivité.
- `next/image` pour toutes les images (AVIF + WebP), avec une `remotePatterns` stricte.
- Génération statique pour `/pokemon/[name]` (151 premiers) + ISR toutes les heures.
- Cache immuable pour `/_next/static`, cache d'1 jour pour les images, cache d'1 heure pour `sitemap.xml` et `llms.txt`.
- Valeurs par défaut de TanStack Query : `staleTime` 10 min, `gcTime` 60 min, `retry` 1, pas de `refetchOnWindowFocus`.

### Sécurité

- En-têtes durcis sur chaque route : `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS avec `preload`, `Referrer-Policy` strict, `Permissions-Policy` verrouillé.
- Une Content-Security-Policy stricte est appliquée. Source : voir `next.config.ts`.
- Les retries d'Axios gèrent les erreurs réseau transitoires et le HTTP 429 avec un backoff exponentiel.

## Sources de données

| Source                                                                | Utilisé pour                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------- |
| [PokéAPI](https://pokeapi.co) (REST)                                  | Pokémon, capacités, talents, types, rencontres        |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql)                    | Noms d'espèces localisés et textes descriptifs        |
| [TCGdex](https://www.tcgdex.net)                                      | Cartes, sets et raretés du TCG Pokémon                |
| [Sprites PokeAPI](https://github.com/PokeAPI/sprites)                 | Illustrations officielles et sprites animés            |

Toutes les données sont récupérées côté serveur et revalidées toutes les 3 600 secondes. L'attribution des sources est affichée sur chaque page Pokémon.

## Configuration

L'application lit un petit nombre de variables d'environnement. Aucune n'est requise pour le développement local.

| Variable                          | Défaut                     | Rôle                                          |
| --------------------------------- | -------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | `https://primedex.vercel.app` | URL canonique du site                       |
| `NEXT_PUBLIC_ENABLE_AGENTATION`  | _(non définie)_            | Active la barre d'outils dev Agentation       |

## Scripts

| Commande                            | Description                                              |
| ----------------------------------- | -------------------------------------------------------- |
| `npm run dev`                       | Démarre le serveur de dev avec webpack sur `:3000`.     |
| `npm run build`                     | Build de production.                                     |
| `npm run start`                     | Lance le build de production.                            |
| `npm run lint`                      | ESLint v9 avec la flat config du projet.                 |
| `npm run typecheck`                 | `tsc --noEmit` sur tout le projet.                       |
| `npm run test`                      | Vitest (jsdom) — voir `vitest.config.ts`.                |
| `npx vitest path/to/file.test.ts`   | Lance un seul fichier de test.                           |
| `npx vitest --ui`                   | Ouvre l'UI de Vitest.                                    |

> [!NOTE]
> Avant d'ajouter des tests, assure-toi que `src/test/setup.ts` existe. La config Vitest pointe déjà dessus ; le fichier est actuellement un stub. Sans lui, `npm run test` ne démarrera pas.

## Structure du projet

```
src/
├── app/                # Next.js App Router — les routes vivent ici
│   ├── api/            # Route handlers (TCG)
│   ├── [locale]        # Routes préfixées par la locale
│   ├── layout.tsx      # Layout racine (RSC)
│   ├── providers.tsx   # TanStack Query, theme, providers i18n
│   └── ...
├── components/         # UI réutilisable (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # Helpers TS purs + barrel API
│   ├── api/            # Clients REST + GraphQL + TCG
│   ├── i18n/           # Bundles de langue (lazy côté client)
│   ├── server-i18n.ts  # Traductions côté serveur
│   └── ...
├── store/primedex.ts   # Store Zustand (ID et primitives uniquement)
├── types/pokemon.ts    # Source de vérité unique pour les types du domaine
├── hooks/              # Hooks React personnalisés
└── middleware.ts       # Redirections et réécritures 308 par locale

public/                 # Assets statiques (icônes, captures d'écran, sprites de secours)
```

## Déploiement

PrimeDex est une application Next.js 16 standard et se déploie sur toute plateforme supportant la sortie standalone de Next.js.

### Vercel (recommandé)

Le dépôt inclut un `vercel.json` minimal (`{"name": "poke-app"}`). Importe le projet sur Vercel, accepte les défauts du framework, et le build de production fonctionnera out of the box. Le réglage `revalidate = 3600` sur `/pokemon/[name]` est honoré automatiquement.

### Autres plateformes

```bash
npm run build
npm run start  # serveur de production sur :3000
```

Assure-toi que l'hôte supporte l'API d'optimisation d'images de Next.js (ou pré-rends les images vers un CDN).

## Contribuer

Issues, demandes de fonctionnalités et pull requests sont les bienvenus. Ouvre d'abord une issue pour tout changement non trivial afin qu'on en discute l'approche.

Quand tu soumets une pull request :

- Lance `npm run lint` et `npm run typecheck` en local.
- Ajoute ou mets à jour les tests quand le comportement change.
- Suis les conventions de [`AGENTS.md`](./AGENTS.md) et des fichiers `AGENT.md` par sous-dossier.

## Remerciements

- [PokéAPI](https://pokeapi.co) — la source de données ouverte de référence pour la franchise.
- [TCGdex](https://www.tcgdex.net) — le catalogue TCG ouvert utilisé dans le navigateur de cartes.
- [Vercel](https://vercel.com) — hébergement et réseau edge.
- [shadcn/ui](https://ui.shadcn.com) — le preset `base-nova` qui ancre le design system.

## Contact

- Issues : <https://github.com/teefloo/Poke/issues>
- Divulgation de sécurité : voir [`.well-known/security.txt`](./public/.well-known/security.txt)
- Auteur : Esteban Deloge (<contact@primedex.app>)

## Marques

Pokémon, les noms de personnages Pokémon et les propriétés associées sont des marques déposées de Nintendo, Game Freak et The Pokémon Company. PrimeDex est un projet de fan non officiel à but éducatif et ludique uniquement, et n'est affilié, approuvé ni sponsorisé par aucune de ces entités.
