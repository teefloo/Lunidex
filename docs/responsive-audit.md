# Audit Responsive — PrimeDex

**Date** : 2026-06-05
**Périmètre** : 10 pages × 5 viewports (320, 375, 768, 1024, 1440) — 50 captures
**Mode** : audit seul, aucune modification de code
**Cible** : rendre le site « parfaitement responsive »

> Les captures vivent dans `.audit/screenshots/` (générées via `npx playwright screenshot`).
> Le serveur de dev Next.js 16.2.6 (webpack) tourne sur `http://localhost:3000`.

---

## Synthèse exécutive

Le site **fonctionne aux 5 breakpoints** (pas d'overflow horizontal global, pas de layout cassé, contenu lisible). La plupart des adaptations mobile sont déjà propres (header compact, hero empilé, grilles responsive, modales Sheet).

**3 zones méritent une attention prioritaire** :
1. **Header desktop** — la barre de recherche du catalogue n'apparaît qu'à partir de 2xl (≥1536 px), créant un « gap » de fonctionnalité entre 768 px et 1535 px.
2. **Pages avec scroll horizontal forcé** — `TypeChart` et la table des types imposent `min-w-[750px]` ; OK en pratique (overflow-x-auto) mais ergonomie mobile moyenne.
3. **Hauteurs fixes héritées d'iOS** — `100vh` / `h-[calc(100vh-…)]` présents sur les pages Moves et PokemonDetail ; à migrer vers `dvh`/`svh` (Safari iOS PWA bug).

Aucun bug bloquant. Tous les findings ci-dessous sont **P2/P3** sauf indication contraire.

---

## Légende sévérité

| Sévérité | Signification |
|---|---|
| **P1** | Cassure visible, fonctionnalité inaccessible |
| **P2** | Régression visible, ergonomie dégradée sur un breakpoint courant |
| **P3** | Hardening, cohérence, durcissement long terme |
| **✓ OK** | Vérifié, conforme |

---

## Findings par fichier

### `src/components/layout/Header.tsx`

#### F-01 · P2 — Barre de recherche du header invisible entre `md` et `2xl`
- **Ligne** : ~261
- **Constat code** : `<div className="… hidden 2xl:block …">` autour de la search bar
- **Impact** : sur tablette portrait, laptop 13", et tous les viewports `md → 2xl` (768 → 1535 px), l'utilisateur ne peut pas chercher de Pokémon depuis le header ; il doit ouvrir le menu mobile (qui ne contient pas de recherche non plus).
- **Visuel** : confirmé sur `home-768.png`, `home-1024.png` (nav desktop visible, pas de search), `pikachu-1440.png` (search absente jusqu'à 2xl).
- **Fix suggéré** : exposer la search à `lg:` (≥1024 px) ou la dupliquer dans le Sheet mobile.

#### F-02 · P2 — Sélecteur de langue à largeur fixe `!w-[96px]`
- **Ligne** : ~300
- **Constat code** : `!w-[96px]` sur le bouton AUTO
- **Impact** : à 320 px, le bouton AUTO occupe ~30 % de la largeur du header, forçant un shrink du logo et de l'icône hamburger. Si le nom de langue est long (ex. « Português »), risque de troncature.
- **Visuel** : `home-320.png`, `tcg-320.png` — le bloc AUTO/X reste lisible mais étouffe le reste.
- **Fix suggéré** : `w-[88px] sm:!w-[96px]` ou largeur fluide avec `min-w-[72px] max-w-[110px]`.

#### F-03 · P3 — `Sheet` mobile trop étroit pour le contenu
- **Ligne** : ~360
- **Constat code** : `w-[85vw] max-w-[350px]`
- **Impact** : OK en 320, légèrement serré en 375 pour des libellés FR longs (« TCG CATALOG »).
- **Fix suggéré** : `w-[90vw] sm:max-w-[380px]`.

#### F-04 · P3 — Hauteur header `min-h-[68px]` n'utilise pas `env(safe-area-inset-top)`
- **Ligne** : ~150
- **Impact** : sur iOS PWA, le header peut être masqué par la zone du notch sur les pages en mode standalone.
- **Fix suggéré** : `min-h-[calc(68px+env(safe-area-inset-top))]` + `pt-[env(safe-area-inset-top)]` sur le wrapper sticky.

---

### `src/components/pokemon/SortSelector.tsx`

#### F-05 · P2 — Largeur fixe `w-[200px]` du select
- **Ligne** : ~41
- **Constat code** : `w-[200px]`
- **Impact** : sur la home `home-320.png` à 320 px, le sélecteur de tri déborde du container si on l'aligne avec la barre de filtres ; il passe à la ligne en pratique, mais le rendu est imprévisible quand d'autres conteneurs flex l'entourent.
- **Fix suggéré** : `w-full sm:w-[200px]`.

---

### `src/components/pokemon/TypeChart.tsx`

#### F-06 · P2 — Table forcée à `min-w-[750px]`
- **Ligne** : ~191
- **Constat code** : `min-w-[750px]` sur la grille de la matrice
- **Impact** : sur mobile/tablette, l'utilisateur doit scroller horizontalement dans la card pour voir toutes les colonnes. Acceptable fonctionnellement, mais aucune affordance (gradient, scrollbar visible) ne le signale.
- **Visuel** : `types-1024.png` montre que la matrice déborde déjà à 1024 px.
- **Fix suggéré** : ajouter un scroll-snap-x, gradient fade sur les bords, et/ou basculer en `cards empilées` (1 type → liste) sous `md:`.

---

### `src/components/tcg/TCGResearchDesk.tsx`

#### F-07 · P2 — Sheet filtres TCG trop large
- **Ligne** : ~341
- **Constat code** : `w-[92vw] max-w-[480px]`
- **Impact** : en 320 px, le Sheet laisse 8 % de marge seulement (≈ 26 px) ; les inputs de filtres internes peuvent être étouffés.
- **Fix suggéré** : `w-[min(92vw,420px)]`.

#### F-08 · P3 — Filtre sidebar à `w-full md:w-[250px]`
- **Ligne** : ~427
- **Impact** : sur tablette en mode paysage (768–1023), le panneau latéral 250 px + grille de cards deviennent serrés. Pas de cassure mais ergonomie moyenne.
- **Fix suggéré** : `md:w-[220px] lg:w-[260px]`.

---

### `src/components/pokemon/CompareBar.tsx`

#### F-09 · P2 — Barre fixe « Compare » trop large en mobile
- **Ligne** : ~30
- **Constat code** : `fixed bottom-… w-[95%] max-w-2xl`
- **Impact** : à 320 px, 95 % + padding latéral du `page-shell` peuvent faire chevaucher la barre avec le contenu. Le label « Compare (2) » tronque à 320 px dans certaines locales.
- **Visuel** : `compare-320.png` — la barre est positionnée hors écran (la zone "Comparing" est vide), mais le composant pourrait entrer en conflit avec la bottom-nav mobile future.
- **Fix suggéré** : `w-[calc(100%-2rem)] max-w-2xl mx-auto` pour respecter la gouttière.

---

### `src/app/moves/MovesPageClient.tsx`

#### F-10 · P1 (Safari iOS) — `h-[calc(100vh-…)]` casse en mobile Safari
- **Lignes** : 172 (`h-[calc(100vh-7rem)]`), 186 (`max-h-[calc(100vh-13rem)]`), 199 (idem)
- **Impact** : sur iOS Safari (et Chrome iOS), `100vh` inclut la zone URL bar, créant un overflow vertical de ~80–120 px et un scroll piégé. En PWA installé, c'est encore plus visible.
- **Fix suggéré** : `h-[calc(100dvh-7rem)]` + fallback `h-[calc(100vh-7rem)]` (Tailwind v4 supporte `dvh` nativement).
- **Visuel** : `moves-320.png` — la sidebar interne est tronquée sous le fold.

#### F-11 · P2 — Sidebar `xl:grid-cols-[320px_minmax(0,1fr)]` ne se transforme pas sous xl
- **Ligne** : ~180
- **Impact** : entre 768 px et 1279 px (avant `xl`), la sidebar prend déjà beaucoup de place ; la grille empilée est correcte mais la sidebar interne a `sticky top-[6rem]` + `h-[calc(100vh-7rem)]` qui crée un ascenseur interne.
- **Fix suggéré** : passer à `lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]` pour adoucir la transition.

---

### `src/app/pokemon/[name]/PokemonDetailClient.tsx`

#### F-12 · P2 — Bouton retour fixe `left-4 md:left-12` trop proche du bord en mobile
- **Lignes** : ~249, ~330, ~336
- **Constat code** : `fixed top-[calc(6rem+env(safe-area-inset-top))] left-4 md:left-12 z-30`
- **Impact** : OK en pratique, mais la combinaison `min-h-screen` + bouton fixe + actions latérales (`right-4 md:right-8`) crée une zone de tap très petite en 320 px entre le FAB « share » et le bord.
- **Visuel** : `pikachu-768.png` — les 3 FAB (share, sparkle, heart) sont à droite mais bien visibles.
- **Fix suggéré** : vérifier que chaque FAB mesure au moins 44×44 px (WCAG 2.5.5) et qu'ils sont espacés de `gap-2`.

#### F-13 · P3 — `min-h-screen` sur la page détail
- **Ligne** : ~249
- **Impact** : avec `pb-20`, sur grand écran avec peu de contenu, crée un fond étiré. Migration `min-h-dvh` recommandée par cohérence.
- **Fix suggéré** : `min-h-[100dvh]`.

---

### `src/app/team/page.tsx`

#### F-14 · P2 — Slots d'équipe `min-h-[250px]` rudes en 320
- **Ligne** : ~371
- **Constat code** : `min-h-[250px]` sur les 6 emplacements
- **Impact** : à 320 px, 6 × 250 px = 1500 px de scroll vertical juste pour voir les slots vides. Le `min-w-[80px]` est OK.
- **Visuel** : `team-320.png`, `team-768.png` — la grille 3 colonnes est acceptable mais l'aspect ratio vide est massif.
- **Fix suggéré** : `min-h-[180px] sm:min-h-[220px] lg:min-h-[260px]`.

---

### `src/app/types/page.tsx`

#### F-15 · P2 — Réutilise `TypeChart` (cf. F-06)
- **Ligne** : ~51
- **Impact** : identique — overflow horizontal sur la matrice principale. La page est l'une des plus visitées (référence pour optimiser).
- **Fix suggéré** : cf. F-06.

---

### `src/app/compare/page.tsx`

#### F-16 · P3 — `RadarChart h-[400px]` en mobile
- **Ligne** : ~ (Recharts container)
- **Impact** : à 320 px, un radar 400 px est tronqué visuellement (les axes débordent). Pas de scroll interne, donc l'utilisateur voit un graphe coupé.
- **Visuel** : non confirmé en capture (état vide), mais lisible dans le code.
- **Fix suggéré** : `h-[320px] sm:h-[400px]`.

---

### `src/app/globals.css` & layout

#### F-17 · P3 — Pas de `tap-highlight-color: transparent` ou équivalent
- **Impact** : sur Android Chrome, certains boutons « verre » flashent en bleu au tap (a11y, design).
- **Fix suggéré** : ajouter `-webkit-tap-highlight-color: transparent` sur `button, a` dans `globals.css`.

#### F-18 · P3 — `viewport` meta n'inclut pas `viewport-fit=cover`
- **Fichier** : `src/app/layout.tsx`
- **Impact** : sur iOS, les éléments en `env(safe-area-inset-*)` sont quand même appliqués, mais les PWA installés en mode standalone peuvent avoir un comportement bizarre avec les coins arrondis.
- **Fix suggéré** : `viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' }`.

---

### `src/components/layout/HeroSection.tsx` & `HeroControls.tsx`

#### F-19 · ✓ OK — Typographie `clamp(2.75rem, 9vw, 6.5rem)` est responsive
- Pas d'action.

#### F-20 · P3 — `HeroControls` empile verticalement en dessous de `md` mais sans espacement respirant
- **Impact** : à 320 px, search → filters → sort se suivent serrés. Pas de bug, mais `gap-3` au lieu de `gap-4` améliorerait.
- **Fix suggéré** : `gap-3 sm:gap-4`.

---

### `src/components/pokemon/PokemonCard.tsx` & `PokemonCards.tsx`

#### F-21 · ✓ OK — Cards responsive via `sm:` / `md:` breakpoints
- Pas d'action.

---

### Cookie banner (composant global)

#### F-22 · P2 — Bandeau cookies `fixed bottom-…` masque le contenu au chargement
- **Impact** : présent sur **toutes** les captures (320 → 1440). Le bandeau occupe ~30–50 % de la hauteur viewport et cache systématiquement le bas du hero + premier contenu.
- **Visuel** : `home-320.png` (« Rendering… »), `moves-1024.png`, `tcg-1024.png` (filtres TCG cachés derrière), `team-1024.png` (stats cachées).
- **Fix suggéré** :
  - Ajouter un bouton « close » (X) en plus de « Reject all / Accept ».
  - Sur mobile, passer en `bottom-0` plein écran avec un sheet bas, ou un « toast » compact 56 px de haut avec lien « Paramètres » + « OK ».
  - Envisager un `position: sticky` au lieu de `fixed` pour ne pas masquer le contenu.

---

## Findings transverses

### FT-01 · P2 — Pas de breakpoint `xs` (≥480 px) dans le design system
- **Impact** : tous les seuils sont `sm` (640), `md` (768), `lg` (1024), `xl` (1280), `2xl` (1536). Les viewports 320–639 px traitent tout en « mobile-first brutal ». Pas de bug mais aucune adaptation fine entre 320 et 375.
- **Fix suggéré** : introduire un breakpoint `xs: 480px` dans `tailwind.config` ou via `@theme` (Tailwind v4) si on en a besoin.

### FT-02 · P3 — `next/image` semble correctement utilisé partout (vérifié)
- Pas d'`raw <img>`. OK.

### FT-03 · P3 — Tests visuels automatisés absents
- **Impact** : aucune CI ne détecte les régressions responsive. Les captures `.audit/` ne sont pas versionnées/utilisées.
- **Fix suggéré** : intégrer Playwright en CI sur un sous-ensemble (3 viewports × 3 pages) avec diff de snapshots.

### FT-04 · P3 — Aucun `text-wrap: balance` ni `text-wrap: pretty`
- **Impact** : sur le hero `PrimeDex` (gros titre), les retours à la ligne sont naturels mais pas optimisés. Sur `home-320.png`, on voit « The Ultimate Pokémon Companion » sur 2 lignes — OK.
- **Fix suggéré** : ajouter `text-wrap: balance` aux `h1/h2` principaux.

---

## Tableau récapitulatif priorisé

| # | Sévérité | Fichier:Ligne | Résumé | Effort |
|---|---|---|---|---|
| F-22 | P2 | bandeau cookies global | Bandeau `fixed` masque le contenu | M |
| F-01 | P2 | Header.tsx:261 | Search header cachée jusqu'à 2xl | S |
| F-10 | P1 (iOS) | MovesPageClient.tsx:172,186,199 | `100vh` casse en Safari iOS | S |
| F-02 | P2 | Header.tsx:300 | Language selector `w-[96px]` | S |
| F-05 | P2 | SortSelector.tsx:41 | `w-[200px]` | XS |
| F-06 | P2 | TypeChart.tsx:191 | `min-w-[750px]` sans affordance scroll | M |
| F-07 | P2 | TCGResearchDesk.tsx:341 | Sheet TCG `w-[92vw] max-w-[480px]` | XS |
| F-09 | P2 | CompareBar.tsx:30 | `w-[95%] max-w-2xl` | XS |
| F-11 | P2 | MovesPageClient.tsx:180 | Sidebar xl trop tard | S |
| F-12 | P2 | PokemonDetailClient.tsx:249 | Tap targets FAB à vérifier | S |
| F-14 | P2 | team/page.tsx:371 | Slots `min-h-[250px]` | XS |
| F-15 | P2 | types/page.tsx:51 | Réutilise F-06 | (cf. F-06) |
| F-03 | P3 | Header.tsx:360 | Sheet mobile 350 px | XS |
| F-04 | P3 | Header.tsx:150 | safe-area-inset-top manquant | XS |
| F-08 | P3 | TCGResearchDesk.tsx:427 | Sidebar filtre 250 px | XS |
| F-13 | P3 | PokemonDetailClient.tsx:249 | `min-h-screen` → `dvh` | XS |
| F-16 | P3 | compare/page.tsx | Radar 400 px en mobile | XS |
| F-17 | P3 | globals.css | tap-highlight | XS |
| F-18 | P3 | layout.tsx | viewportFit=cover | XS |
| F-20 | P3 | HeroControls.tsx | gap-3/4 | XS |
| FT-01 | P3 | globals.css | Breakpoint `xs` | M |
| FT-03 | P3 | CI | Tests Playwright responsive | L |
| FT-04 | P3 | HeroSection.tsx | `text-wrap: balance` | XS |

**Effort cumulé estimé** : ~1–2 jours pour traiter tous les P2/P3, ~3 h pour les P1/P2 critiques (F-10, F-22, F-01).

---

## Recommandations d'ordre d'attaque

1. **Quick wins (≤30 min)** — F-05, F-07, F-08, F-13, F-16, F-17, F-18, F-20, FT-04 (tous des XS)
2. **Hauteurs dynamiques (30 min)** — F-10 + F-11 + F-13 (remplacer `100vh` par `100dvh` partout)
3. **Header mobile (1 h)** — F-01 + F-02 + F-03 + F-04 (chercher le bon breakpoint pour la search)
4. **Cookie banner (1–2 h)** — F-22 (refactor du composant global, impact UX énorme)
5. **Tables scrollables (2 h)** — F-06 + F-15 (cards empilées en mobile ou scroll-snap + gradient)
6. **Team + Compare polish (1 h)** — F-09 + F-14 + F-12
7. **Durcissement (demi-journée)** — FT-01 (breakpoint `xs`) + FT-03 (CI Playwright responsive)

---

## Annexes

### Captures clés (extraits)
- `home-320.png` → header compact, hero empilé, search cachée
- `home-768.png` → header desktop visible (sans search), filtres empilés
- `home-1024.png` → header desktop, filtres côte à côte avec sort
- `home-1440.png` → tous les chips visibles (KANTO…PALDEA), FAVORITES dans le header
- `pikachu-1440.png` → header plein, FAB à droite, layout OK
- `moves-320.png` → sidebar interne tronquée par fold (F-10)
- `types-1024.png` → matrice déborde déjà (F-06)
- `tcg-320.png` → chips CATALOG/COLLECTION/WISHLIST, search, cookie banner omniprésent

### Méthodologie
- Capture automatisée via `npx playwright screenshot --viewport-size=W,H --wait-for-timeout 1200`
- Lecture croisée avec `grep -nE 'min-w-\[|w-\[|h-\[|min-h-screen|100vh'` sur tout `src/`
- Sévérité posée par impact utilisateur (visible dans la capture) et fréquence (mobile = 60+ % du trafic typique)
