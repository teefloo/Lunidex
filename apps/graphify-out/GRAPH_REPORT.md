# Graph Report - apps  (2026-09-26)

## Corpus Check
- Corpus is ~6,156 words - fits in a single context window. You may not need a graph.

## Summary
- 209 nodes · 341 edges · 12 communities
- Extraction: 99% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output
- Token usage note: Semantic-agent usage metadata was unavailable; these zero values are placeholders, not measured totals.

## Community Hubs (Navigation)
- Pokémon UI and Models
- Package Metadata and Tooling
- Runtime Dependency Set
- App Layout and Providers
- Mobile Architecture Guidance
- Expo App Configuration
- Pokédex and Team Screens
- Account and Theme
- TypeScript Path Configuration
- Mobile Workspace Scripts
- Metro Workspace Resolution

## God Nodes (most connected - your core abstractions)
1. `usePalette()` - 22 edges
2. `Lunidex Mobile App (@primedex/mobile)` - 15 edges
3. `expo` - 14 edges
4. `react-native` - 14 edges
5. `react-i18next` - 10 edges
6. `PokemonDetailScreen()` - 7 edges
7. `scripts` - 7 edges
8. `react` - 7 edges
9. `formatName()` - 7 edges
10. `PokemonCardBase()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `TabsLayout()` --calls--> `usePalette()`  [EXTRACTED]
  mobile/app/(tabs)/_layout.tsx → mobile/src/theme/ThemeProvider.tsx
- `RootStack()` --calls--> `usePalette()`  [EXTRACTED]
  mobile/app/_layout.tsx → mobile/src/theme/ThemeProvider.tsx
- `Nine-Locale Translation Bundles` --conceptually_related_to--> `Eight Supported Locales`  [AMBIGUOUS]
  mobile/README.md → mobile/AGENTS.md
- `FavoritesScreen()` --calls--> `usePalette()`  [EXTRACTED]
  mobile/app/(tabs)/favorites.tsx → mobile/src/theme/ThemeProvider.tsx
- `TeamScreen()` --calls--> `usePalette()`  [EXTRACTED]
  mobile/app/(tabs)/team.tsx → mobile/src/theme/ThemeProvider.tsx

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "Pokémon UI and Models"
Cohesion: 0.16
Nodes (20): PokemonDetailScreen(), styles, usePokemonDetail(), FavoriteButton(), styles, PokemonCardBase(), styles, StatBar() (+12 more)

### Community 1 - "Package Metadata and Tooling"
Cohesion: 0.07
Nodes (27): devDependencies, @babel/core, babel-plugin-module-resolver, @types/react, typescript, license, main, name (+19 more)

### Community 2 - "Runtime Dependency Set"
Cohesion: 0.08
Nodes (25): dependencies, axios, axios-retry, expo, expo-constants, expo-image, expo-linking, expo-localization (+17 more)

### Community 3 - "App Layout and Providers"
Cohesion: 0.11
Nodes (15): RootStack(), TabsLayout(), Bundle, loaders, loadLanguage(), AppProviders(), LocaleBridge(), ThemeProvider() (+7 more)

### Community 4 - "Mobile Architecture Guidance"
Cohesion: 0.10
Nodes (22): AsyncStorage Persistence, Expo Router, Metro Workspace Resolution, Mobile UI Conventions, Mobile Workspace Guide, Native Compatibility Identifiers, Neon Auth and Cloud Sync, @primedex/core Shared Package (+14 more)

### Community 5 - "Expo App Configuration"
Cohesion: 0.09
Nodes (21): package, tsconfigPaths, typedRoutes, expo, android, assetBundlePatterns, backgroundColor, experiments (+13 more)

### Community 6 - "Pokédex and Team Screens"
Cohesion: 0.18
Nodes (15): FavoritesScreen(), styles, PokedexScreen(), styles, styles, TeamScreen(), usePokemonList(), usePokemonSearchIndex() (+7 more)

### Community 7 - "Account and Theme"
Cohesion: 0.18
Nodes (13): AccountScreen(), cardStyle(), LANGUAGE_LABELS, styles, THEME_OPTIONS, darkPalette, lightPalette, ThemePalette (+5 more)

### Community 8 - "TypeScript Path Configuration"
Cohesion: 0.22
Nodes (8): compilerOptions, paths, strict, exclude, extends, include, @primedex/core, expo/tsconfig.base

### Community 9 - "Mobile Workspace Scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, lint, start, typecheck, web

### Community 10 - "Metro Workspace Resolution"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, workspaceRoot

## Ambiguous Edges - Review These
- `Eight Supported Locales` → `Nine-Locale Translation Bundles`  [AMBIGUOUS]
  mobile/README.md · relation: conceptually_related_to

## Knowledge Gaps
- **111 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+106 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 125 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Eight Supported Locales` and `Nine-Locale Translation Bundles`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Runtime Dependency Set` to `Package Metadata and Tooling`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `react-native` connect `Pokémon UI and Models` to `Package Metadata and Tooling`, `App Layout and Providers`, `Pokédex and Team Screens`, `Account and Theme`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `react-i18next` connect `App Layout and Providers` to `Pokémon UI and Models`, `Package Metadata and Tooling`, `Pokédex and Team Screens`, `Account and Theme`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _111 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Package Metadata and Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependency Set` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._