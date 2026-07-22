<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Logo PrimeDex" width="80" />

# PrimeDex

**Un Pokédex rapide, local-first et un espace Pokémon TCG pour les dresseurs, collectionneurs et fans curieux.**

[![En ligne](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Mobile](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Vue d’ensemble](#vue-densemble) · [Démarrer](#démarrer) · [Fonctionnalités](#fonctionnalités) · [Architecture](#architecture) · [Configuration](#configuration) · [Déploiement](#déploiement)

</div>

<!-- README-I18N:START -->

[English](./README.md) · **Français** · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Vue d’ensemble

PrimeDex est un monorepo open source réunissant une application web Next.js, le package TypeScript partagé `@primedex/core` et un compagnon mobile Expo. Il rassemble le Pokédex national, des outils de préparation compétitive, des outils de collection Pokémon TCG et le suivi de la progression personnelle, sans imposer la création d’un compte.

L’application web couvre les **1 025 Pokémon répartis sur neuf générations**. Son interface est disponible en anglais, français, espagnol, allemand, italien, japonais, coréen et chinois simplifié ; ce dépôt fournit également une traduction portugaise du README.

> [!NOTE]
> PrimeDex est un projet de fans non commercial. Les données, noms et images Pokémon appartiennent à Nintendo, Game Freak, Creatures et The Pokémon Company. PrimeDex n’est ni affilié à ces sociétés ni approuvé par elles.

## Fonctionnalités

| Domaine | Ce que vous pouvez faire |
| --- | --- |
| **Pokédex** | Parcourir et filtrer les 1 025 Pokémon ; consulter statistiques, talents, attaques, évolutions, formes, rencontres, sprites et informations compétitives. |
| **Outils d’entraînement** | Créer une équipe de six, analyser sa couverture, comparer des Pokémon, explorer le tableau des types, planifier EV et IV, calculer l’élevage et simuler des combats de neuvième génération. |
| **Bibliothèque** | Rechercher attaques, talents et objets, puis utiliser les vérifications de couverture et les suggestions de contres. |
| **Progression personnelle** | Conserver favoris, Living Dex, équipes, consultations récentes, statistiques de quiz et préférences dans un stockage local persistant ; exporter ou importer ces données en JSON. |
| **Modes de jeu** | Jouer au quiz à six modes, suivre une partie Nuzlocke et partager une équipe en lecture seule. |
| **Espace TCG** | Découvrir cartes et extensions, gérer collection et liste de souhaits, comparer des cartes, suivre les prix et alertes, et construire des decks de 60 cartes. |
| **Hors ligne et mobile** | Installer la PWA et retrouver les ressources déjà utilisées en cache. L’application Expo propose aujourd’hui le Pokédex, les détails, favoris, équipes, compte, thème et langues. |

## Démarrer

### Prérequis

- [Node.js](https://nodejs.org/) 20 ou une version ultérieure
- npm 10 ou une version ultérieure

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). PrimeDex redirige une URL sans préfixe vers une route localisée telle que `/fr`, selon le cookie `primedex-lang` ou l’en-tête `Accept-Language` du navigateur.

> [!IMPORTANT]
> Le développement utilise volontairement webpack : `npm run dev` exécute `next dev --webpack`. Conservez cette commande même si la configuration Next déclare aussi une racine Turbopack.

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le serveur de développement Next.js sur le port 3000. |
| `npm run build` | Crée le build de production. |
| `npm run start` | Sert le build de production. |
| `npm run lint` | Exécute ESLint 9. |
| `npm run typecheck` | Vérifie TypeScript sans produire de fichiers. |
| `npm run test` | Exécute Vitest dans jsdom. |

### Application mobile

Le compagnon Expo se trouve dans [`apps/mobile`](./apps/mobile) et utilise le package partagé [`@primedex/core`](./packages/core).

```bash
cd apps/mobile
npx expo start
```

Le menu Expo permet d’ouvrir iOS, Android, le web ou Expo Go. Consultez le [README mobile](./apps/mobile/README.md) pour connaître les écrans pris en charge.

## Configuration

Aucune variable d’environnement n’est nécessaire pour parcourir le Pokédex en local. Créez un fichier `.env.local` non versionné uniquement pour activer une intégration facultative.

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Remplace l’URL canonique publique ; la valeur par défaut est `https://primedex.vercel.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Active l’authentification Supabase et la synchronisation cloud facultatives. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique associée à l’URL Supabase. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Active les abonnements push pour les alertes de prix TCG. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Ajoute la métadonnée de validation Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Active la barre d’analyse UI Agentation en développement. |

> [!TIP]
> Sans Supabase, PrimeDex reste pleinement utilisable en mode local-first : favoris, équipes, captures, filtres et progression TCG restent dans le stockage du navigateur. Sur mobile, utilisez `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` dans `apps/mobile/.env`.

<details>
<summary><strong>Activer Agentation en développement</strong></summary>

Ajoutez la valeur suivante dans `.env.local`, puis redémarrez le serveur :

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

L’outil fonctionne sur `http://localhost:4747` ; son origine de développement et sa CSP sont déjà configurées.

</details>

## Architecture

```text
Poke/
├── src/                 Application web Next.js 16 (App Router)
├── packages/core/       @primedex/core : API, état, types, i18n, helpers, Supabase
├── apps/mobile/         Compagnon Expo / React Native
├── supabase/migrations/ Migrations facultatives du schéma Supabase
└── public/              Icônes PWA, captures et ressources statiques
```

```text
Composants React serveur et client
  ├── Hooks TanStack Query (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Sélecteurs Zustand (@/store/primedex) ──▶ IndexedDB web / AsyncStorage mobile
```

- **Interface :** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Base UI et Framer Motion. Les Server Components sont utilisés par défaut.
- **Données :** les clients API centralisés utilisent Axios avec reprise. TanStack Query gère le cache et les clés de requête sont centralisées.
- **État :** Zustand conserve les données personnelles sous forme d’identifiants et primitives, via IndexedDB sur le web et AsyncStorage sur mobile.
- **Localisation et résilience :** i18next charge les bundles client à la demande ; les traductions serveur servent le rendu statique. La PWA met en cache son shell et certaines ressources PokéAPI, TCGdex, images et Next.

## Sources de données

| Source | Utilisation |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST et GraphQL | Pokémon, textes d’espèce, attaques, talents, types, évolutions et rencontres. |
| [TCGdex](https://www.tcgdex.net/) | Cartes Pokémon TCG, extensions, images, raretés et informations de catalogue. |
| [Supabase](https://supabase.com/) | Authentification facultative, synchronisation cloud, profils publics, données de jeu et alertes de prix TCG. |

Les composants n’appellent pas directement ces services : les requêtes passent par la couche API du projet.

## Déploiement

PrimeDex est configuré pour Vercel et peut fonctionner sur toute plateforme qui prend en charge un runtime Next.js et l’optimisation d’images.

```bash
npm run build
npm run start
```

Sur Vercel, importez le dépôt, conservez les réglages Next.js standards et ajoutez les variables publiques facultatives dans le tableau de bord. Le fichier [`vercel.json`](./vercel.json) est volontairement minimal.

## Remerciements

PrimeDex s’appuie sur [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/) et les projets open source utilisés dans l’application.

Pokémon et toutes les propriétés associées sont des marques de leurs détenteurs respectifs. Ce projet de fans est non officiel et non commercial.
