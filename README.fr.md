<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Logo Lunidex" width="80" />

# Lunidex

**Un espace Pokémon dédié aux joueurs, dresseurs et collectionneurs TCG.**

[![En ligne](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Application en ligne](https://lunidex.app) · [Dépôt](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[Vue d’ensemble](#vue-densemble) · [Fonctionnalités](#fonctionnalités) · [Démarrage rapide](#démarrage-rapide) · [Configuration](#configuration) · [Architecture](#architecture) · [Déploiement](#déploiement)

<img src="./public/screenshot-desktop.png" alt="Tableau de bord Pokédex et collection Lunidex sur ordinateur" width="840" />

</div>

<!-- README-I18N:START -->

[English](./README.md) · **Français** · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Vue d’ensemble

Lunidex est un monorepo npm-workspaces open source et indépendant centré sur le suivi de collection Pokémon TCG, avec un Pokédex, des outils de création d’équipes et un espace personnel lié à un compte.

L’application web couvre **1 025 Pokémon répartis sur neuf générations** et prend en charge huit langues d’interface : anglais, français, espagnol, allemand, italien, japonais, coréen et chinois simplifié. Le portugais est disponible comme traduction du README, mais ne fait pas partie des langues de l’interface web.

Les pages de référence publiques sont accessibles sans compte. L’espace personnel — favoris, Pokémon capturés, équipes, progression du quiz, collections TCG, listes de souhaits, recherches enregistrées, notes, decks et fonctions associées — utilise Neon Auth et Neon PostgreSQL lorsqu’ils sont configurés et synchronisés. Les préférences d’affichage web utilisent IndexedDB ; l’application Expo utilise AsyncStorage.

> [!NOTE]
> Lunidex est un projet de fans indépendant et non officiel. Les noms de personnages Pokémon, marques, illustrations, images et propriété intellectuelle associée appartiennent à leurs détenteurs respectifs. Lunidex n’est ni affilié à Nintendo, Creatures Inc., GAME FREAK inc. ou The Pokémon Company, ni approuvé, sponsorisé ou officiellement lié à ces sociétés.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Vue mobile du Pokédex Lunidex" width="280" />
</div>

## Fonctionnalités

| Domaine | Ce que vous pouvez faire |
| --- | --- |
| **Pokédex et référence** | Parcourir et filtrer les 1 025 Pokémon ; consulter statistiques, types, capacités, attaques, évolutions, formes, rencontres, sprites et données d’espèce localisées. Rechercher des attaques, capacités et objets. |
| **Laboratoire d’équipes et de combats** | Créer des équipes de six Pokémon maximum, analyser la couverture des types et des attaques, examiner la synergie et les rôles, comparer jusqu’à trois Pokémon, utiliser le tableau des 18 types, planifier les EV/IV, calculer la reproduction et lancer un simulateur de combats de génération 9. |
| **Progression et jeu** | Suivre les favoris, les Pokémon capturés, la Living Dex, l’activité, les badges et les statistiques du quiz. Jouer avec trois défis et trois modes de quiz, dont des parties quotidiennes, et suivre une partie Nuzlocke. |
| **Partage et fonctions sociales** | Importer et exporter des équipes Showdown, partager des liens d’équipe en lecture seule, créer un profil public, gérer ses amis, consulter les classements du quiz et utiliser les salons de combat liés au compte. |
| **Espace Pokémon TCG** | Parcourir cartes et extensions, filtrer le catalogue, comparer des cartes, suivre les cartes possédées et recherchées, consulter la progression par extension, enregistrer recherches et notes, construire des decks et afficher les champs de prix lorsque TCGdex les fournit. |
| **PWA et persistance** | Installer l’application web comme PWA. Le service worker met en cache le shell de l’application et certaines ressources amont pour faciliter les visites répétées, tandis que les données de compte restent derrière l’API serveur. |
| **Compagnon mobile** | Utiliser l’application Expo sur iOS, Android ou le web avec les clients API, types, état Zustand, contrats de persistance, traductions et helpers Neon partagés de `@primedex/core`. |

## Explorer l’application

Remplacez `en` par une langue prise en charge : `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` ou `zh`.

| Surface | Route |
| --- | --- |
| Accueil | [`/en`](https://lunidex.app/en) |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Fiche Pokémon | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| Créateur d’équipe | [`/en/team`](https://lunidex.app/en/team) |
| Tableau des types | [`/en/types`](https://lunidex.app/en/types) |
| Quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| Simulateur de combat | [`/en/battle`](https://lunidex.app/en/battle) |
| Catalogue TCG | [`/en/tcg`](https://lunidex.app/en/tcg) |
| Collection TCG | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Tableau de bord | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

Les surfaces de collection, de tableau de bord, sociales et autres espaces personnels peuvent nécessiter une session de synchronisation authentifiée.

## Démarrage rapide

### Prérequis

- [Node.js](https://nodejs.org/) 22
- npm et le fichier `package-lock.json` versionné
- [Git](https://git-scm.com/)

Clonez le dépôt, installez les workspaces et démarrez l’application web :

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000). Le proxy de localisation redirige une URL sans préfixe vers une langue prise en charge comme `/fr`, en utilisant le cookie `primedex-lang` ou la langue du navigateur lorsqu’elle est disponible.

> [!IMPORTANT]
> Les builds de développement et de production utilisent volontairement webpack : `npm run dev` exécute `next dev --webpack` et `npm run build` exécute `next build --webpack`. Conservez cette option même si la configuration Next.js déclare aussi une racine Turbopack.

## Application mobile

Le compagnon Expo se trouve dans [`apps/mobile`](./apps/mobile). Il comprend actuellement la liste et la recherche du Pokédex, les fiches détaillées, les favoris, les équipes, le compte, le thème et les réglages de langue. Il n’offre pas encore toute la parité fonctionnelle du web ; les autres outils restent disponibles dans l’application Next.js.

Démarrez-le depuis la racine du dépôt :

```bash
npm run start --workspace=@primedex/mobile
```

Le menu Expo permet d’ouvrir iOS, Android ou un aperçu web. Le package expose également les scripts `android`, `ios` et `web` :

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

Consultez le [README mobile](./apps/mobile/README.md) pour les variables d’environnement et les détails d’architecture propres à Expo.

## Configuration

Aucune variable d’environnement n’est nécessaire pour consulter les pages de référence publiques. Copiez le modèle pour activer les intégrations facultatives de compte, serveur, contact, notifications ou développement :

```bash
cp .env.example .env.local
```

Pour l’application Expo, utilisez `apps/mobile/.env.example` comme modèle :

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable(s) | Portée | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / public | URL canonique du site et base API. Par défaut : `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / public | Endpoint Neon Auth utilisé par le client navigateur. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Serveur uniquement | Endpoints du proxy Neon Auth et de vérification JWT. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | Serveur uniquement | Protection du cookie d’authentification et contraintes de validation JWT. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Serveur uniquement | Connexion PostgreSQL Neon. Vercel fournit `DATABASE_URL` via son intégration Neon ; utilisez `NEON_DATABASE_URL` en local. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | Mobile / public | Endpoints Neon Auth et application déployée utilisés par Expo. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / public | Valeur facultative de validation Google Search Console. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Développement | Active l’overlay de revue UI Agentation lorsque la valeur est `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / public | Clé facultative d’abonnement aux notifications push du navigateur. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Serveur uniquement | Configuration facultative de livraison des notifications push côté serveur. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Serveur uniquement | Envoi facultatif du formulaire de contact via Resend. |
| `SUPABASE_DB_URL` | Migration uniquement | Connexion de l’ancienne source utilisée par les scripts d’export Supabase vers Neon ; jamais une variable runtime web ou mobile. |

> [!WARNING]
> N’exposez jamais les chaînes de connexion, paramètres JWKS, secrets de cookie, clés privées VAPID, clés Resend ou URL de migration via `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, des fichiers source, des logs ou des commits.

<details>
<summary><strong>Activer Agentation en développement</strong></summary>

Ajoutez cette valeur dans `.env.local`, puis redémarrez le serveur de développement :

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

L’outil utilise `http://localhost:4747` ; son origine de développement et son support CSP sont déjà configurés.

</details>

## Scripts

Exécutez les commandes racine depuis la racine du dépôt :

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le serveur de développement Next.js. |
| `npm run build` | Crée un build de production. |
| `npm run start` | Sert le build de production. |
| `npm run lint` | Analyse les sources web, core et mobile. |
| `npm run typecheck` | Vérifie le workspace web. |
| `npm run test -- --run` | Exécute la suite Vitest une fois. |
| `npx vitest run path/to/file.test.ts` | Exécute un fichier de test ciblé. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Vérifie `@primedex/core`. |
| `npm run typecheck --workspace=@primedex/mobile` | Vérifie l’application Expo. |
| `npm run lint --workspace=@primedex/mobile` | Analyse l’application Expo. |
| `npm run db:neon:export` | Exporte les données de la source conservée pour migration. |
| `npm run db:neon:import` | Applique le schéma Neon et importe un export préparé. |
| `npm run db:neon:verify` | Compare la source et le résultat de la migration Neon. |

> [!WARNING]
> Les commandes d’import et de vérification Neon accèdent à des bases externes. Lisez [`neon/AGENTS.md`](./neon/AGENTS.md) et [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md) et utilisez une cible de test ou de staging approuvée.

Le workflow CI dans [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) installe les dépendances, lance le lint, les vérifications de types web/core, les tests, le build de production et la vérification de types mobile.

## Architecture

```text
.
├── src/                 Application web Next.js 16 / React 19
├── packages/core/       @primedex/core : API, types, store, i18n et helpers partagés
├── apps/mobile/         Compagnon Expo Router @primedex/mobile
├── neon/migrations/     Schéma applicatif PostgreSQL Neon actif
├── supabase/            Migrations source conservées et compatibilité
├── scripts/neon/        Scripts contrôlés d’export, import et vérification
├── public/              Icônes PWA, captures, ressources cartes et fichiers statiques
└── docs/                Notes produit, design, migration, audit et implémentation
```

```text
Web (Next.js App Router)
  ├── Composants de routes serveur et client
  ├── TanStack Query ──▶ clients API partagés ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ préférences d’affichage IndexedDB
  └── Route Handlers ──▶ Neon Auth + espace utilisateur PostgreSQL Neon

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + Neon Auth/API lorsqu’ils sont configurés
```

Principales frontières :

- **Web :** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query et couche PWA.
- **Core partagé :** types métier indépendants de l’interface, clients API, store Zustand, bundles i18n, helpers Neon et utilitaires purs partagés entre web et mobile.
- **Accès aux données :** les requêtes distantes passent par la façade API centralisée de `src/lib/api` et `packages/core/src/api` ; les composants de présentation n’ajoutent pas de clients API ad hoc.
- **Persistance :** les préférences d’affichage web utilisent IndexedDB avec un fallback navigateur ; la persistance native utilise AsyncStorage. L’espace authentifié est synchronisé par l’API Neon et stocké dans `user_state`.
- **Couche plateforme :** les adaptateurs `*.ts` et `*.native.ts` séparent le stockage et la configuration navigateur/React Native sans dupliquer la logique métier.
- **Localisation :** les routes préfixées et les bundles de traduction prennent en charge `en`, `fr`, `es`, `de`, `it`, `ja`, `ko` et `zh`.

> [!IMPORTANT]
> Lunidex est le nom visible du produit, mais `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, les clés de stockage, les slugs de routes, les schémas Expo et les identifiants de bundle sont des identifiants historiques sensibles à la compatibilité. Ne les modifiez que dans le cadre d’une migration délibérée.

## Sources de données et attribution

| Source | Utilisation |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST et GraphQL | Pokémon, textes d’espèce, statistiques, types, attaques, capacités, évolutions, rencontres et noms localisés. |
| [Sprites PokéAPI](https://github.com/PokeAPI/sprites) | Sprites de Pokémon et d’objets et ressources d’illustration associées. |
| [TCGdex](https://www.tcgdex.net/) | Cartes Pokémon TCG, extensions, raretés, images, champs de catalogue et champs de prix lorsqu’ils sont fournis. |
| [Neon](https://neon.com/) | Authentification facultative, état utilisateur PostgreSQL, profils, amis, classements, salons de combat et fonctions d’espace personnel côté serveur. |

La disponibilité des données amont, des traductions, des images et des prix peut évoluer. Lunidex n’est pas une marketplace de cartes et ne garantit ni valorisation de marché ni couverture d’historique des prix.

Le code source est distribué sous licence MIT dans [`LICENSE`](./LICENSE). La propriété intellectuelle Pokémon et les données tierces restent soumises à leurs détenteurs et conditions respectifs.

## Déploiement

Lunidex est configuré pour [Vercel](https://vercel.com/) et peut aussi fonctionner sur un hébergeur prenant en charge le runtime serveur Next.js et l’optimisation d’images.

```bash
npm run build
npm run start
```

Sur Vercel :

1. Importez `teefloo/Lunidex` dans un projet Vercel.
2. Configurez les variables Neon Auth et la connexion de base de données serveur dans Preview et Production.
3. Utilisez les réglages de build Next.js standards. Le [`vercel.json`](./vercel.json) versionné reste volontairement minimal.

Le runtime web actif utilise Neon. Les migrations Supabase conservées et les scripts de migration contrôlés servent à la comparaison, aux sauvegardes et aux opérations de migration ; ils ne constituent pas le runtime d’authentification ou de base de données de l’application web.

Consultez le [runbook de migration Neon](./docs/neon-migration.md) pour le schéma, les frontières d’environnement et la procédure de validation.

## Documentation associée

- [Configuration et parité mobile](./apps/mobile/README.md)
- [Contexte produit](./PRODUCT.md)
- [Système de design](./DESIGN.md)
- [Runbook de migration Neon](./docs/neon-migration.md)
- [Issues GitHub](https://github.com/teefloo/Lunidex/issues)
