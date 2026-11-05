# Audit de navigation et d’UX — section TCG

1er novembre 2026 · Application locale Next.js 16.4.3 (`127.0.0.1:3000`) · Chromium piloté par Playwright · 1440 × 900 et 390 × 844

**Périmètre :** toutes les routes `/tcg/`, leurs layouts, navigations locale et globale, fils d’Ariane, modales de carte, états de chargement, d’erreur et d’accès non authentifié.

**Nature :** audit en lecture seule. Aucun fichier applicatif, aucune donnée distante, aucun commit ni déploiement n’a été modifié. Les seuls ajouts sont ce rapport et ses preuves dans `docs/audits/2026-11-01-tcg-navigation/`.

**Verdict :** la section TCG est fonctionnelle et riche, mais elle expose **trois navigations concurrentes** (en-tête global, navigation locale TCG, barre inférieure mobile) qui ne racontent pas la même histoire. Les défauts les plus coûteux ne sont pas des liens cassés : ce sont des **changements de contexte silencieux** (Collection → marché scellé, catalogue → fiche carte) et des **états actifs contradictoires**. Aucun blocage P0 confirmé.

| Priorité | Problèmes distincts |
| --- | ---: |
| P0 — bloquant | 0 |
| P1 — majeur | 6 |
| P2 — moyen | 5 |
| P3 — mineur | 2 |
| **Total** | **13** |

---

## 1. Méthode, couverture réelle et incident d’environnement

### Ce qui a été exécuté

- **28 motifs de routes** ouverts en direct, plus les URL invalides correspondantes.
- **Parcours réels** en Chromium : catalogue → extension → fiche carte (modale), retour navigateur, avant navigateur, fermeture par bouton et par Échap, recherche + tri + vue liste, portefeuille scellé → marché, pages éditoriales scellées, album de démonstration anonyme, mur d’authentification.
- **Clavier** : lien d’évitement, ordre de tabulation de l’en-tête et de la navigation locale, ouverture/fermeture des divulgations `Tools` et `More` par Entrée, Échap et clic extérieur, piège de focus du panneau mobile, restitution du focus.
- **Responsive** : 1440 × 900 (desktop) et 390 × 844 (mobile), avec émulation tactile pour les mesures mobiles.
- **États** : chargement, vide, erreur de route, accès refusé anonyme, URL profondes, actualisation, retour/avant.

### Ce qui n’a pas été exécuté

- Aucun parcours **authentifié** : pas de compte de test, pas de chemin non destructif autorisé. Les écrans « sign in » ont été observés, jamais franchis.
- Aucune vérification sur **build de production** : tous les résultats viennent du serveur de développement.
- Pas de téléphone physique, pas de Safari iOS, pas de Firefox, pas de lecteur d’écran (NVDA/VoiceOver).
- Pas de test des erreurs réseau forcées (hors ligne, 5xx, timeout) ni des transactions scellées.
- Locales : `en` et `fr` contrôlées ponctuellement ; les six autres locales ne sont pas certifiées.

### Incident d’environnement écarté

En cours de session, le serveur de développement a cessé d’hydrater les composants clients (WebSocket HMR en `ERR_INVALID_HTTP_RESPONSE`, aucun appel `/api/tcg`, boutons inertes, catalogue figé sur « Loading collection… », 404 entièrement blanches). Le serveur a été redémarré ; **tous les constats de ce rapport proviennent de la session saine**. Les artefacts de la session dégradée (404 blanches, menus qui ne s’ouvrent pas) ont été écartés et ne sont pas comptés comme défauts applicatifs.

> Leçon de méthode : une page qui affiche des squelettes et des boutons sans réagir peut être un serveur de développement cassé, pas un défaut produit. Chaque constat ci-dessous a été reproduit après redémarrage.

---

## 2. Inventaire des routes

Toutes les routes sont préfixées par la locale (`/en`, `/fr`, …). Le proxy (`src/proxy.ts`) réécrit les chemins non préfixés.

| Route | Type | État observé | Entrées principales | Sorties principales |
| --- | --- | --- | --- | --- |
| `/tcg` | Catalogue | 200, hydraté | En-tête « Catalog », barre inférieure, carte de set, recherche | Fiche carte (modale), extension, marché scellé |
| `/tcg/sets/[setId]` | Liste de set | 200 | Catalogue, fil d’Ariane, liens de cartes | Modale carte, catalogue |
| `/tcg/cards/[id]` | Fiche carte | 200 | Lien de carte (modale), URL directe (page) | Retour/`Back`, fil d’Ariane, illustrateur |
| `/tcg/illustrators/[artist]` | Galerie illustrateur | 200 (slug valide) | Fiche carte, fil d’Ariane | Retour catalogue, cartes |
| `/tcg/collection` | Collection | 200, mur anonyme + CTA démo | En-tête, barre inférieure | `/tcg/start`, connexion |
| `/tcg/collection/[language]` | Choix de langue | 200, **vide sous le titre** | URL directe | Aucune dans `<main>` |
| `/tcg/collection/[language]/[setId]` | Album de set | 200 | CTA démo, `Change set` | `/tcg/start`, fiche carte |
| `/tcg/collection/custom/[id]` | Collection personnalisée | 200, mur d’auth anonyme | URL directe, onglet Custom | Connexion |
| `/tcg/wishlist` | Wishlist | 200, mur d’auth | En-tête, nav locale | Connexion, catalogue |
| `/tcg/investments` | Investissements | 200, mur d’auth | Nav locale, en-tête | Connexion |
| `/tcg/deck-builder` | Outil deck | 200 | Menu `Tools`, en-tête | Catalogue, outils |
| `/tcg/pull-rates` | Guide | 200 | Menu `Tools` | Catalogue, guides |
| `/tcg/booster-value` | Calculateur | 200 | Menu `Tools` | Catalogue, guides |
| `/tcg/start` | Démarrage démo | 200 | CTA collection, album | Album démo, catalogue |
| `/tcg/sealed` | Portefeuille scellé | 200, tableau de bord | En-tête « Collection », sous-nav scellée | Marché, collection, journal |
| `/tcg/sealed/collection` | Collection scellée | 200, mur d’auth | Sous-nav scellée | Connexion |
| `/tcg/sealed/journal` | Journal | 200 | Sous-nav scellée | Dashboard |
| `/tcg/sealed/sales` | Ventes | 200 | Menu `Reports` | Dashboard |
| `/tcg/sealed/cashflow` | Trésorerie | 200 | Menu `Reports` | Dashboard |
| `/tcg/sealed/analytics` | Analyses | 200 | Menu `Reports` | Dashboard |
| `/tcg/sealed/catalogue` | Catalogue privé | 200 | Menu `Tools` | Dashboard |
| `/tcg/sealed/sources` | Sources | 200 | Menu `Tools` | Dashboard |
| `/tcg/sealed/market` | Marché public | 200, données publiques | En-tête « Catalog », nav locale catalogue | Produit, éditorial |
| `/tcg/sealed/market/[id]` | Produit | 200 | Liste marché | Marché, Cardmarket |
| `/tcg/sealed/market/products/[id]` | Alias produit | 200, canonique vers la forme courte | URL directe | Marché |
| `/tcg/sealed/releases` | Calendrier | 200 | Marché, éditorial | Marché |
| `/tcg/sealed/buy-safely` | Guide d’achat | 200 | Marché, pied de page | Marché, calendrier |
| `/tcg/*` inconnu | 404 | 404, page « Lost Link Maze » | URL erronée | Pokédex, équipe, quiz (pas TCG) |

### Constats structurels de l’inventaire

1. **Deux familles de navigation locale** coexistent : `TCGPageTabs` (catalogue et collection) et `SealedSubnav` (portefeuille scellé). Elles n’ont ni la même hauteur, ni les mêmes libellés, ni la même logique de section.
2. **Le portefeuille scellé appartient à « Collection » dans l’en-tête**, tandis que le marché scellé appartient à « Catalog ». Le même mot « Sealed » désigne donc deux sections globales différentes.
3. **Les routes éditoriales scellées** (`releases`, `buy-safely`) vivent sous le marché public mais sont marquées « Sealed market » via `routeMatches`, sans fil d’Ariane.

---

## 3. Cartographie des relations

```text
En-tête global (toutes pages)
├── Collection ───────────────► /tcg/collection
│   ├── nav locale : Collection · Wishlist · Investments · Sealed
│   ├── /tcg/collection/[lang]/[set]  (album démo)
│   ├── /tcg/collection/custom/[id]   (auth)
│   ├── /tcg/wishlist                 (auth)
│   ├── /tcg/investments              (auth)
│   └── /tcg/sealed ──────────────► sous-nav scellée
│        ├── Dashboard · Collection · Journal
│        ├── Reports ▾  (Sales · Cashflow · Analytics)
│        ├── Tools ▾    (Catalogue · Sources)
│        └── Sealed market ─────► /tcg/sealed/market
│                                  ├── /market/[id]
│                                  ├── /market/products/[id]  (alias)
│                                  ├── /releases
│                                  └── /buy-safely
├── Catalog ──────────────────► /tcg
│   ├── nav locale : Catalog · Sealed market · Tools ▾
│   ├── /tcg/sets/[id] ───────► modale carte
│   ├── /tcg/cards/[id]        (URL directe = page)
│   ├── /tcg/illustrators/[artist]
│   └── /tcg/sealed/market     (même marché, rattaché au catalogue)
├── Pokédex ──────────────────► /pokedex
├── Team Builder ─────────────► /team
└── More ▾ (Desktop) / More (Mobile)
    ├── Collection : Wishlist · Investments · Sealed · Start my collection
    ├── Catalog : Sealed market · Deck Builder · Pull rates · Booster value
    ├── Pokédex : Types · Moves · Abilities · Items
    ├── Play : Quiz · Nuzlocke · Compare · Battle · Breeding · EV/IV
    ├── My space : Favorites · Dashboard · Friends
    └── Resources : Blog · Guides · Docs · Anniversaire · FAQ · About · Contact

Barre inférieure mobile
└── Collection · Catalog · Pokédex · Team Builder
```

### Lecture

- Le **marché scellé est un carrefour orphelin** : on peut y entrer depuis la sous-nav scellée ou depuis la nav locale catalogue, mais aucune des deux surfaces ne propose le chemin inverse vers le portefeuille.
- **L’album de set** n’a pas de fil d’Ariane ; sa seule sortie explicite est `Change set` → `/tcg/start`, pas `/tcg/collection`.
- **La fiche carte** est le seul objet à double nature : modale en navigation interne, page complète en accès direct. C’est cohérent, mais le contexte de la modale n’est pas transporté dans l’URL.

---

## 4. Parcours réellement testés

| # | Parcours | Résultat | Statut |
| --- | --- | --- | --- |
| 1 | Catalogue → extension → carte → fermeture | Modale `role="dialog"`, focus sur `Close`, retour au set, focus restitué à la carte | Exécuté |
| 2 | Catalogue filtré (`q`, `view=list`, tri) → carte → Échap | URL de la modale perd `q`, `set`, `view`, `sortBy` ; le retour perd `view=list` | Exécuté |
| 3 | Carte → retour navigateur → avant navigateur | Retour au set, puis réouverture de la modale ; pas de boucle | Exécuté |
| 4 | URL directe d’une carte | Page complète, fil d’Ariane présent, bouton `Back` vers le set | Exécuté |
| 5 | Portefeuille scellé → marché | Bascule d’en-tête Collection → Catalog ; aucun lien retour portefeuille | Exécuté |
| 6 | Marché → retour navigateur | Retour au portefeuille | Exécuté |
| 7 | Marché → `releases` / `buy-safely` | 200, « Sealed market » actif, aucun fil d’Ariane | Exécuté |
| 8 | Produit `/market/611877` et `/market/products/611877` | 200 tous deux, canonique vers la forme courte | Exécuté |
| 9 | Album démo anonyme | `30TH CLASSIC COLLECTION`, bannière démo, `Change set` → `/tcg/start` | Exécuté |
| 10 | Collection anonyme → CTA démo | `/tcg/start`, puis album réel | Exécuté |
| 11 | Album avec set inexistant | 200, « SET NOT FOUND », **aucun lien dans `<main>`** | Exécuté |
| 12 | Collection personnalisée inexistante / anonyme | Mur d’auth propre, pas de spinner infini | Exécuté |
| 13 | Illustration valide (`mitsuhiro arita`) | Galerie, fil d’Ariane, 50 liens | Exécuté |
| 14 | Illustration inexistante | **HTTP 200** + interface 404 | Exécuté |
| 15 | Lien d’évitement | Premier Tab, cible `#main-content` focusable, focus déplacé | Exécuté |
| 16 | Ordre de tabulation desktop | Skip → logo → 4 destinations → More → recherche → nav locale → guides → recherche carte | Exécuté |
| 17 | `Tools` : Entrée / Échap / clic extérieur | Ouvre, ferme, focus sur `summary` | Exécuté |
| 18 | `More` desktop : Entrée / Échap / clic extérieur | Ouvre, ferme, focus sur `summary` | Exécuté |
| 19 | Panneau `More` mobile | `aria-modal`, piège de focus, Échap, focus rendu au bouton, scroll restauré | Exécuté |
| 20 | Panneau `More` mobile : contenu | 30 liens, mais **aucune** des 4 destinations primaires | Exécuté |
| 21 | Changement de vue liste/grille | `view=list` accepté à l’ouverture, perdu après fermeture de modale | Exécuté |
| 22 | URL invalides `/cards`, `/sets`, `/market` | 404 correct, page « Lost Link Maze », **sans en-tête global** | Exécuté |
| 23 | Connexion / sync | Non testé | Non testé |
| 24 | Achats, journal, ventes scellées | Non testé | Non testé |
| 25 | Erreurs réseau forcées | Non testé | Non testé |
| 26 | Build de production | Non testé | Non testé |

---

## 5. Anomalies détaillées

Chaque anomalie est dédupliquée entre desktop et mobile. La sévérité reflète l’impact utilisateur, pas l’effort de correction.

### P1-1 — Le portefeuille scellé et le marché scellé se comportent comme deux produits distincts

**Routes / parcours :** `/tcg/sealed` → `/tcg/sealed/market` ; `/tcg/sealed/market` → portefeuille ; `/tcg/sealed/collection`.

**Observé :**
- Le portefeuille scellé est marqué **Collection** dans l’en-tête global ; le marché scellé est marqué **Catalog**. La même zone fonctionnelle change de section globale selon la page.
- Sur le marché, les seuls liens visibles sont « Collection », « Start my collection », « See releases », « Tips before buying ». **Aucun lien vers `/tcg/sealed`.**
- Le marché utilise `TCGPageTabs` (Catalog · Sealed market · Tools) ; le portefeuille utilise `SealedSubnav` (Dashboard · Collection · Journal · Reports · Tools · Sealed market).
- Depuis `/tcg/sealed/releases` ou `/tcg/sealed/buy-safely`, « Sealed market » est actif, mais aucun retour au portefeuille ni fil d’Ariane.

**Attendu :** une seule zone « Sealed » avec une navigation locale stable, et un retour explicite au portefeuille depuis le marché et ses pages filles.

**Impact :** l’utilisateur qui consulte un produit ne peut pas revenir à son portefeuille sans passer par l’en-tête « Collection » puis la sous-nav scellée. Le changement de section active lui fait croire qu’il a quitté son espace privé.

**Correctif recommandé :** rattacher le marché public à la sous-nav scellée (ou ajouter « Sealed portfolio » comme premier item de `TCGPageTabs` en contexte scellé) ; ajouter un fil d’Ariane `Collection › Sealed › Market` sur le marché et les pages filles.

**Flux également affectés :** `/tcg/sealed/releases`, `/tcg/sealed/buy-safely`, produits `/market/[id]`, retour navigateur après consultation d’un produit.

**Preuve :** `preuves/tcg-audit-final7.json`, `preuves/audit-collection-missing-set2.png`, inspection de `src/app/tcg/sealed/SealedMarketPage.tsx`, `src/app/tcg/sealed/SealedPortfolioPage.tsx`, `src/lib/tcg-sealed-navigation.ts`.

---

### P1-2 — La navigation locale TCG est mal nommée et change de contenu sans changer de cadre

**Routes / parcours :** `/tcg/collection`, `/tcg/wishlist`, `/tcg/investments`, `/tcg/deck-builder`, `/tcg`.

**Observé :**
- Le `<nav>` local porte `aria-label="Pokémon TCG Catalog"` **sur toutes les pages**, y compris Collection, Wishlist et Investments. Un lecteur d’écran annonce « navigation Pokémon TCG Catalog » pour une liste de liens de collection.
- Les onglets visibles sont `Collection · Wishlist · Investments · Sealed` sur les pages personnelles, et `Catalog · Sealed market · Tools` sur le catalogue. Aucun libellé de contexte ne signale le changement de espace.
- Sur `/tcg/deck-builder`, l’onglet actif est **caché dans le menu `Tools`** (`tcg-local-tool-link`) ; la page affiche pourtant « Deck Builder » en titre.
- Le sélecteur de langue TCG apparaît sur `/tcg`, `/tcg/collection`, `/tcg/wishlist`, `/tcg/deck-builder`, mais **pas** sur `/tcg/investments` ni dans le portefeuille scellé.

**Attendu :** un nom de navigation qui décrit le contexte (« Espace TCG », « Collection », « Catalogue ») ; l’outil courant visible et actif ; le sélecteur de langue au même endroit dans tout l’espace TCG.

**Impact :** désorientation, surtout au clavier et au lecteur d’écran ; impression que Deck Builder n’est pas une page de premier niveau.

**Correctif recommandé :** passer un `context` explicite à `TCGPageTabs` (`catalog` | `collection`) et dériver l’`aria-label` et les onglets de ce contexte ; rendre l’outil courant visible (ou ajouter un onglet « Tools » qui ouvre le menu avec l’outil actif) ; homogénéiser `showLanguageSelector`.

**Flux également affectés :** `/tcg/pull-rates`, `/tcg/booster-value` (même problème d’outil caché), toutes les locales.

**Preuve :** `preuves/tcg-audit-final7.json` (libellés de nav et `aria-current`), `preuves/audit-tcg-mobile-catalog.png`, `src/components/tcg/TCGPageTabs.tsx`.

---

### P1-3 — Le panneau mobile « More » omet les destinations primaires et ses titres ne sont pas cliquables

**Route / parcours :** en-tête mobile, n’importe quelle page `/tcg/*`, bouton `More`.

**Observé :**
- Le panneau contient **30 liens** et les titres de section `Collection`, `Catalog`, `Pokédex`, `Play`, `My space`, `Resources`, `Account` sous forme de textes non interactifs.
- Les quatre destinations primaires (`Collection`, `Catalog`, `Pokédex`, `Team Builder`) **ne sont pas des liens** dans le panneau. Un utilisateur qui ouvre « More » ne peut donc pas aller directement au catalogue ou à sa collection.
- Le panneau est un dialogue plein écran (`aria-modal="true"`, `overflow: hidden`) qui **recouvre la barre inférieure** ; les quatre destinations ne sont donc pas accessibles non plus pendant l’ouverture.
- Le piège de focus, Échap, la restitution du focus et la restauration du scroll fonctionnent correctement.

**Attendu :** chaque titre de section cliquable ou chaque destination primaire présente en tête de section ; le panneau ne doit pas être le seul moyen d’atteindre une destination qu’il masque.

**Impact :** sur mobile, le menu principal est paradoxalement moins complet que la barre inférieure qu’il recouvre. Les utilisateurs qui cherchent « Catalog » dans « More » ne le trouvent pas.

**Correctif recommandé :** dans `SecondaryNavigationLinks`, inclure les destinations `primary` en tête de chaque groupe (ou transformer les titres en liens quand `path` existe) ; ajouter `Team Builder` au groupe `Play` ; conserver les titres non cliquables uniquement pour les groupes sans destination racine.

**Flux également affectés :** toutes les pages accessibles depuis mobile ; en particulier l’arrivée depuis un lien externe vers `/tcg/wishlist` ou `/tcg/sealed`.

**Preuve :** `preuves/audit-mobile-more-sheet2.png`, `preuves/tcg-audit-final3b.json`, `src/components/layout/SecondaryNavigationLinks.tsx`, `src/components/layout/HeaderMobileNav.tsx`.

---

### P1-4 — L’ouverture d’une fiche carte efface le contexte de recherche et de vue

**Routes / parcours :** `/tcg?q=…&set=…&view=list&sortBy=…` → carte → fermeture.

**Observé :**
- Avec `q=charizard&view=list&sortBy=name&sortOrder=asc&tcgLang=en`, un clic sur une carte produit l’URL `/en/tcg/cards/gym2-2?tcgLang=en`. **Tous les autres paramètres sont perdus** (`q`, `view`, `sortBy`, `sortOrder`).
- Après Échap, l’URL revient à `/en/tcg?q=charizard&sortBy=name&sortOrder=asc&tcgLang=en` : **`view=list` a disparu**. La vue liste n’est pas restaurée dans l’URL.
- Depuis `/tcg/sets/30th-c`, la modale fonctionne correctement (URL carte, fermeture vers le set, focus rendu à la carte).
- Le bouton `Back` de la page carte complète pointe toujours vers `/tcg/sets/[set]`, même si l’utilisateur venait d’une recherche.

**Attendu :** l’URL de la modale doit transporter l’état du catalogue (ou un paramètre `from`), et la fermeture doit restaurer exactement la vue précédente, y compris `view=list`.

**Impact :** partage et actualisation d’une fiche carte perdent le filtre et la vue ; le retour arrière ramène à un catalogue différent de celui qu’on a quitté. C’est le défaut le plus visible pour un usage « recherche → comparaison → retour ».

**Correctif recommandé :** dans `TCGResearchDesk`, construire l’URL de la carte avec `searchParams` courants (au minimum `q`, `set`, `view`, `sortBy`, `sortOrder`, `tcgLang`) ; dans `TCGCardDetailRoute` et la modale, dériver le retour de `from` ou des paramètres présents ; ne pas sérialiser un état qui supprime `view`.

**Flux également affectés :** comparaison de cartes, wishlist, partage, actualisation d’une fiche, retour depuis un lien externe.

**Preuve :** `preuves/tcg-audit-final6.json`, `preuves/tcg-audit-final8.json`, `preuves/audit-modal-filter-close.png`, `src/components/tcg/TCGResearchDesk.tsx` (construction de l’URL), `src/components/tcg/TCGCardDetailRoute.tsx` (`returnHref`).

---

### P1-5 — Trois `aria-current="page"` simultanés et des états actifs contradictoires

**Routes / parcours :** toutes les pages TCG, desktop et mobile.

**Observé (comptage DOM) :**
- `/tcg` mobile : 3 × `aria-current="page"` — en-tête « Catalog », nav locale « Catalog », barre inférieure « Catalog ».
- `/tcg/collection` : 3 — en-tête « Collection », nav locale « Collection », barre inférieure « Collection ».
- `/tcg/wishlist` : 4 — en-tête « Collection », **Wishlist dans le menu More masqué**, nav locale « Wishlist », barre inférieure « Collection ».
- `/tcg/sealed` : 4 — en-tête « Collection », **Sealed dans More masqué**, sous-nav « Dashboard », barre inférieure « Collection ».
- `/tcg/deck-builder` : 4 — en-tête « Catalog », **Deck Builder dans More masqué**, lien d’outil caché, barre inférieure « Catalog ».
- `/tcg/sets/[id]` : 3 — en-tête « Catalog », `<span>` du set, barre inférieure « Catalog ».

**Attendu :** un seul élément `aria-current="page"` par page (la feuille courante). Les liens de section peuvent porter `aria-current="true"` ou seulement un état visuel `data-active`.

**Impact :** un lecteur d’écran répète « page actuelle » pour des liens de niveaux différents ; les utilisateurs de lecteurs d’écran ne savent plus quel lien représente la page. Les entrées masquées du menu More ajoutent des doublons non visibles.

**Correctif recommandé :** réserver `aria-current="page"` à la feuille ; utiliser `data-active` ou `aria-current="true"` pour la section ; ne pas poser `aria-current` sur les entrées d’un menu fermé (ou les retirer du DOM quand le menu est fermé).

**Flux également affectés :** `/tcg/investments`, `/tcg/sealed/market`, `/tcg/sealed/releases`, `/tcg/sealed/buy-safely`, `/tcg/start`.

**Preuve :** `preuves/tcg-audit-final7.json`, `src/components/layout/HeaderDesktopNav.tsx`, `src/components/layout/PrimaryBottomNav.tsx`, `src/components/tcg/TCGPageTabs.tsx`, `src/app/tcg/sealed/SealedPortfolioPage.tsx`.

---

### P1-6 — Un set de collection inexistant produit un HTTP 200 et une impasse

**Route / parcours :** `/tcg/collection/en/does-not-exist`.

**Observé :**
- HTTP **200**, en-tête présent, `<h1>` absent, `<main>` contient uniquement « SET NOT FOUND ».
- **Aucun lien dans `<main>`** : ni retour à la collection, ni choix d’un autre set, ni lien vers le catalogue.
- Le titre du document est `does-not-exist — My Collection`, ce qui laisse croire que le set existe.

**Attendu :** soit un vrai 404 (comme `/tcg/cards/...`), soit un état vide actionnable avec « Choisir un autre set » et « Retour à ma collection ».

**Impact :** un lien obsolète (set renommé, album supprimé) mène à une page qui semble cassée ; l’utilisateur doit utiliser l’en-tête global pour sortir.

**Correctif recommandé :** valider `setId` dans `TCGSetAlbumPage` et appeler `notFound()` si le set n’existe pas ; sinon remplacer le panneau par un état vide avec CTA. Ajouter un fil d’Ariane.

**Flux également affectés :** liens partagés d’album démo, favoris, historique, campagnes `activation`.

**Preuve :** `preuves/audit-collection-missing-set2.png`, `preuves/tcg-audit-final9.json`, `src/app/tcg/collection/[language]/TCGSetAlbumPage.tsx` (ligne ~184).

---

### P2-1 — Soft 404 sur les illustrateurs et 404 global sans en-tête ni retour TCG

**Routes / parcours :** `/tcg/illustrators/inexistant`, `/tcg/cards/inexistant`, `/tcg/sets/inexistant`, `/tcg/sealed/market/inexistant`.

**Observé :**
- Un illustrateur inexistant renvoie **HTTP 200** avec l’interface 404 (« Page not found », « The Lost Link Maze »). Un slug valide (`mitsuhiro arita`, avec espace encodé) fonctionne.
- Les 404 de cartes, sets et produits renvoient bien 404, mais la page 404 **n’a aucun `<header>` global**. Elle propose « Browse Pokédex », « Team Builder », « Who’s That Pokémon? » et le pied de page ; **aucun lien direct vers le catalogue TCG** dans la navigation rapide.
- La page 404 résout son URL en `/en/__lunidex-not-found` (réécriture interne de `src/proxy.ts`), alors que `/tcg/sealed/market/does-not-exist` conserve son URL d’origine.

**Attendu :** statut 404 réel pour toute ressource inexistante ; page 404 avec en-tête global ou, au minimum, un lien « TCG Catalog » dans la navigation rapide ; comportement d’URL homogène.

**Impact :** SEO (indexation de pages vides en 200), et récupération incomplète pour un utilisateur perdu dans le TCG.

**Correctif recommandé :** vérifier le statut en production ; ajouter `Header` au `not-found.tsx` ou un lien TCG dans `quick_navigation` ; unifier la stratégie de rewrite du proxy.

**Flux également affectés :** crawlers, liens partagés obsolètes, produits supprimés.

**Preuve :** `preuves/audit-404-page.png`, `preuves/tcg-audit-final6.json`, `src/app/not-found.tsx`, `src/proxy.ts`.

---

### P2-2 — Le fil d’Ariane est absent de la moitié des sous-espaces

**Routes / parcours :** `/tcg/sealed`, `/tcg/sealed/market`, `/tcg/sealed/market/[id]`, `/tcg/sealed/releases`, `/tcg/sealed/buy-safely`, `/tcg/collection/[lang]/[set]`, `/tcg/collection/custom/[id]`, `/tcg/wishlist`, `/tcg/investments`, `/tcg/deck-builder`.

**Observé :** le composant `Breadcrumbs` n’est utilisé que sur les cartes, sets et illustrateurs. Les pages scellées et les albums n’en ont aucun ; le marché produit affiche seulement « ← Back to market ».

**Attendu :** un fil d’Ariane sur toute page de profondeur ≥ 2, avec le même composant et les mêmes libellés.

**Impact :** la localisation dans la hiérarchie repose entièrement sur l’en-tête et la nav locale ; le retour hiérarchique est incohérent d’une page à l’autre.

**Correctif recommandé :** étendre `Breadcrumbs` aux pages scellées, albums, collections personnalisées et outils ; dériver les libellés de `navigation-registry` pour éviter les divergences.

**Preuve :** `preuves/tcg-audit-final7.json` (comptage des `nav[aria-label="Breadcrumb"]`), `src/components/layout/Breadcrumbs.tsx`.

---

### P2-3 — `/tcg/collection/[language]` affiche un mur d’auth au contenu vide

**Route / parcours :** `/tcg/collection/en`, `/tcg/collection/fr`.

**Observé :** HTTP 200, `<h1>` « Sign in or create an account », `<h2>` « Collection », `<main>` vide, aucun lien. Le choix de langue est donc inutilisable en anonyme et n’explique pas ce qui manque.

**Attendu :** soit un choix de langue visible avec les sets disponibles, soit un état vide explicite (« Connectez-vous pour choisir une langue de collection ») avec un CTA.

**Impact :** une route de profondeur 2 ressemble à un bug ; l’utilisateur ne sait pas s’il doit se connecter ou changer de langue.

**Correctif recommandé :** traiter le cas anonyme dans la page de choix de langue, avec un titre unique et un CTA ; sinon rediriger vers `/tcg/collection`.

**Preuve :** `preuves/tcg-audit-final9.json`.

---

### P2-4 — Deux adresses pour un produit scellé et une réécriture 404 incohérente

**Routes / parcours :** `/tcg/sealed/market/611877` vs `/tcg/sealed/market/products/611877` ; 404 de `/tcg/cards/...` vs `/tcg/sealed/market/...`.

**Observé :**
- Les deux URL produit répondent 200 ; la canonique déclarée est la forme courte. C’est correct pour les moteurs, mais deux adresses restent partageables et l’historique peut contenir l’une ou l’autre.
- Les 404 de cartes/sets réécrivent l’URL en `/en/__lunidex-not-found` ; celui du marché conserve `/tcg/sealed/market/does-not-exist`.

**Attendu :** une redirection 308 de l’alias vers la forme canonique ; une politique d’URL 404 unique.

**Impact :** liens partagés divergents, analytics fractionnées, comportement de retour imprévisible.

**Correctif recommandé :** rediriger `/market/products/[id]` vers `/market/[id]` ; documenter la réécriture 404 et l’appliquer de façon homogène.

**Preuve :** `preuves/tcg-audit-final.json`, `preuves/tcg-audit-final6.json`.

---

### P2-5 — Le retour depuis le marché scellé n’est pas explicite (symptôme de P1-1)

**Routes / parcours :** `/tcg/sealed/market` → `/tcg/sealed`.

**Observé :** le bouton retour du navigateur fonctionne, mais aucun lien visible ne mène au portefeuille ; les liens « Collection » et « Start my collection » pointent vers `/tcg/collection`, pas vers `/tcg/sealed`.

**Attendu :** « Sealed portfolio » visible dans la nav locale ou le fil d’Ariane.

**Impact :** dépendance au bouton retour, invisible sur mobile et absent des liens partagés.

**Correctif recommandé :** traiter avec P1-1 ; ne pas ajouter un lien isolé sans unifier la nav.

**Preuve :** `preuves/tcg-audit-final.json`, `preuves/audit-collection-missing-set2.png`.

---

### P3-1 — Le retour de l’album démo est mal libellé par rapport à sa destination

**Route / parcours :** `/tcg/collection/en/30th-c` (anonyme, mode démo).

**Observé :** le bouton de retour de l’album porte `aria-label="Back — My Collection"` (et un libellé visuel équivalent) mais pointe vers `/tcg/start?tcgLang=en`, la page de démarrage de la démo, pas vers `/tcg/collection`. Le lien « Change set » pointe vers la même destination. La bannière indique que la progression n’est pas sauvegardée, mais le CTA de création de compte est présenté séparément.

**Attendu :** soit le retour mène réellement à « Ma collection », soit le libellé décrit la destination réelle (« Choisir un autre set », « Quitter la démo »).

**Impact :** l’utilisateur qui veut revenir à sa collection atterrit sur un écran de démarrage ; il doit repasser par l’en-tête.

**Correctif recommandé :** en mode démo, libeller le retour « Quitter la démo » ou pointer vers `/tcg/collection` ; renommer « Change set » en « Choisir un autre set ».

**Preuve :** `preuves/audit-album-signedout.png`, `preuves/tcg-audit-final8.json`, `src/app/tcg/collection/[language]/TCGSetAlbumPage.tsx` (ligne 116), `src/components/tcg/TCGAlbumPage.tsx` (ligne 188 et 263).

---

### P3-2 — Incohérences de libellés et de typographie entre les surfaces

**Routes / parcours :** collection, wishlist, investments, scellés.

**Observé :** « MY COLLECTION », « WISHLIST », « INVESTMENTS » en majuscules alors que « Dashboard », « Deck Builder », « Sealed product market » sont en casse de phrase ; « Try a checklist » (collection anonyme) vs « Start my collection » (menu) vs « Try a real set checklist » (`/tcg/start`) pour le même parcours.

**Attendu :** une casse et un vocabulaire uniques par concept.

**Impact :** faible, mais renforce l’impression de surfaces assemblées séparément.

**Correctif recommandé :** centraliser les libellés dans les bundles i18n et choisir un terme unique pour le parcours démo.

**Preuve :** `preuves/tcg-audit-final7.json`, `preuves/tcg-audit-final9.json`.

---

## 6. Architecture de navigation unifiée proposée

L’objectif n’est pas d’ajouter un niveau, mais de **faire converger trois navigations vers deux contextes lisibles**.

```text
NIVEAU 0 — En-tête global (inchangé dans sa structure)
Collection · Catalog · Pokédex · Team Builder · More
  → une seule destination porte aria-current="page"
  → « More » contient les mêmes destinations primaires que la barre inférieure

NIVEAU 1 — Contexte TCG (une seule barre locale, deux jeux d’onglets)
┌ Catalog ────────────────────────────────────────────────┐
│ Catalog · Sealed market · Tools ▾                       │
│ (Tools : Deck Builder · Pull rates · Booster value)     │
└─────────────────────────────────────────────────────────┘
┌ Collection ─────────────────────────────────────────────┐
│ Collection · Wishlist · Investments · Sealed portfolio  │
│ (anonyme : + Start my collection)                       │
└─────────────────────────────────────────────────────────┘
  → aria-label du <nav> : « TCG workspace » (ou « Espace TCG »)
  → l’outil courant reste visible, jamais caché dans un menu fermé

NIVEAU 2 — Sous-navigation scellée (uniquement dans /tcg/sealed/*)
Dashboard · Collection · Journal · Reports ▾ · Tools ▾ · Sealed market
  → le marché et ses pages filles gardent ce cadre, ou un fil d’Ariane
    « Collection › Sealed › Market »

NIVEAU 3 — Fil d’Ariane (toute page de profondeur ≥ 2)
Home › TCG › [Set] › [Carte]
Home › TCG › Sealed › Market › [Produit]
Home › TCG › Collection › [Set]
```

### Règles de conception

1. **Un seul `aria-current="page"` par document.** La section porte `data-active` ; la feuille porte `aria-current`.
2. **Le contexte ne change jamais silencieusement.** Si l’en-tête passe de Collection à Catalog, un fil d’Ariane ou un titre de contexte doit l’expliquer.
3. **Le menu mobile ne masque pas ce qu’il omet.** Les quatre destinations primaires doivent être présentes dans le panneau, même si la barre inférieure les affiche déjà.
4. **Pas de troisième barre locale.** `SealedSubnav` est un niveau 2, pas un concurrent de `TCGPageTabs`.
5. **Le retour est explicite.** Chaque page de profondeur ≥ 2 a un lien parent visible, indépendamment du bouton retour du navigateur.
6. **L’URL transporte le contexte.** Une fiche carte ouverte depuis une recherche doit pouvoir être partagée et rechargée sans perdre `q`, `set`, `view` et le tri.

### Ce qu’il ne faut pas faire

- Ne pas appliquer le même en-tête à toutes les pages : le marché public et le portefeuille privé n’ont pas le même besoin de contexte.
- Ne pas ajouter un cinquième onglet local ; le problème est la coexistence de deux systèmes, pas le nombre d’onglets.
- Ne pas renommer les identifiants historiques (`primedex`, `usePrimeDexStore`, etc.) : hors périmètre.

---

## 7. Recommandations précises par composant

| Composant / fichier | Changement recommandé | Anomalies |
| --- | --- | --- |
| `src/components/tcg/TCGPageTabs.tsx` | Introduire un `context: 'catalog' \| 'collection'` ; dériver `aria-label`, onglets et sélecteur de langue ; rendre l’outil actif visible | P1-2, P1-5 |
| `src/app/tcg/sealed/SealedPortfolioPage.tsx` | Extraire `SealedSubnav` en composant partagé ; l’utiliser aussi sur le marché | P1-1, P2-5 |
| `src/app/tcg/sealed/SealedMarketPage.tsx` | Ajouter « Sealed portfolio » et un fil d’Ariane ; aligner l’état actif sur la sous-nav scellée | P1-1, P2-2 |
| `src/components/layout/SecondaryNavigationLinks.tsx` | Inclure les destinations `primary` ; rendre les titres de section cliquables quand un `path` existe ; ajouter Team Builder | P1-3 |
| `src/components/layout/HeaderMobileNav.tsx` | Vérifier que le panneau ne recouvre pas une destination absente du panneau ; conserver le piège de focus | P1-3 |
| `src/components/layout/HeaderDesktopNav.tsx` | Retirer `aria-current="page"` des liens de section ; utiliser `data-active` | P1-5 |
| `src/components/layout/PrimaryBottomNav.tsx` | Même règle : `aria-current="page"` uniquement si la destination est la page exacte | P1-5 |
| `src/components/tcg/TCGResearchDesk.tsx` | Construire l’URL carte avec tous les paramètres courants ; ne pas supprimer `view` | P1-4 |
| `src/components/tcg/TCGCardDetailRoute.tsx` | Dériver `returnHref` de `from`/des paramètres, pas seulement du set | P1-4 |
| `src/app/tcg/collection/[language]/TCGSetAlbumPage.tsx` | `notFound()` si le set est inconnu ; état vide actionnable ; fil d’Ariane | P1-6 |
| `src/app/not-found.tsx` | Ajouter l’en-tête global ou un lien TCG dans la navigation rapide | P2-1 |
| `src/app/tcg/illustrators/[artist]/page.tsx` | Vérifier le statut 404 en production ; conserver le 200 uniquement si la galerie est réellement vide | P2-1 |
| `src/proxy.ts` | Uniformiser la réécriture 404 | P2-1, P2-4 |
| `src/app/tcg/collection/[language]/page.tsx` | Traiter le cas anonyme avec un état explicite | P2-3 |
| `src/app/tcg/sealed/market/products/[id]/page.tsx` | Rediriger vers la forme canonique | P2-4 |
| `src/components/tcg/TCGAlbumPage.tsx` | `aria-label` sur le lien icône ; libellé « Choisir un autre set » | P3-1 |
| Bundles i18n | Unifier « Try a checklist » / « Start my collection » / « Try a real set checklist » | P3-2 |

---

## 8. Plan de remédiation priorisé

### Phase 1 — Cohérence de navigation (P1, à faire en premier)

1. **Unifier la barre locale TCG** (`TCGPageTabs`) avec un contexte explicite et un `aria-label` correct.
2. **Rattacher le marché scellé à la sous-nav scellée** ou ajouter un retour explicite au portefeuille.
3. **Compléter le panneau mobile More** avec les destinations primaires.
4. **Préserver le contexte de recherche** à l’ouverture/fermeture d’une fiche carte.
5. **Réduire à un seul `aria-current="page"`** par page.

**Critère d’acceptation :** sur `/tcg`, `/tcg/collection`, `/tcg/wishlist`, `/tcg/sealed`, `/tcg/sealed/market` et `/tcg/deck-builder`, un seul élément `aria-current="page"`, un retour parent visible, et le même jeu de destinations dans le menu mobile et la barre inférieure.

### Phase 2 — Récupération et profondeur (P2)

6. **Fils d’Ariane** sur les pages scellées, albums et collections personnalisées.
7. **Set inexistant** : 404 ou état vide actionnable.
8. **404 global** : en-tête ou lien TCG ; statut 404 homogène pour les illustrateurs.
9. **Choix de langue de collection** : état anonyme explicite.
10. **Alias produit** : redirection canonique.

### Phase 3 — Finition (P3)

11. **Noms accessibles** des liens icônes et libellés du parcours démo.
12. **Uniformisation typographique et vocabulaire** des titres et CTA.

### Tests de non-régression à ajouter

- `e2e/tcg-navigation.spec.ts` : un seul `aria-current` par page ; lien retour portefeuille depuis le marché ; menu mobile contenant les 4 destinations.
- `e2e/tcg-card-context.spec.ts` : ouverture depuis `?q=&view=list&sortBy=` ; l’URL de la modale contient les paramètres ; la fermeture restaure `view=list`.
- `e2e/tcg-invalid-routes.spec.ts` : 404 réel pour carte, set, illustrateur, produit ; présence d’un lien TCG sur la page 404.
- `e2e/tcg-keyboard.spec.ts` : Échap ferme `Tools` et `More`, focus rendu au déclencheur, piège de focus du panneau mobile.

---

## 9. Limites de couverture restantes

1. **Aucun parcours authentifié** : collection cloud, sync, wishlist persistée, investissements, journal et ventes scellées ne sont pas certifiés. Les murs d’auth ont été observés, pas franchis.
2. **Serveur de développement uniquement** : le comportement de production (statuts 404, streaming, interception de modale) peut différer. Les soft 404 et la réécriture d’URL doivent être revérifiés sur un build de production.
3. **Pas de lecteur d’écran réel** : les constats `aria-current`, noms accessibles et pièges de focus sont issus du DOM et de la navigation clavier, pas d’une annonce NVDA/VoiceOver.
4. **Pas de téléphone physique ni Safari iOS** : les mesures mobiles sont des émulations Chromium à 390 × 844.
5. **Pas de test des erreurs réseau** : offline, 5xx, timeout et rate-limit ne sont pas couverts.
6. **Locales** : `en` et `fr` contrôlées ; les six autres locales ne sont pas certifiées, même si les composants sont partagés.
7. **Données dynamiques** : les parcours utilisent les sets et produits réellement affichés (30th Classic Collection, Charizard, produit 611877). Aucune donnée personnelle n’a été inventée.
8. **Un incident d’environnement** a invalidé une première passe ; seuls les résultats de la session saine sont retenus.

---

## 10. Annexe — Preuves

Dossier : `docs/audits/2026-11-01-tcg-navigation/preuves/`

| Fichier | Contenu |
| --- | --- |
| `audit-404-page.png` | Page 404 « Lost Link Maze », sans en-tête global |
| `audit-album-signedout.png` | Album démo anonyme, `Change set`, bannière de progression |
| `audit-catalog-card-open.png` | Modale de carte ouverte depuis le catalogue filtré |
| `audit-modal-filter-close.png` | Catalogue après fermeture de modale, `view=list` perdu |
| `audit-mobile-more-sheet2.png` | Panneau More mobile : sections non cliquables, destinations primaires absentes |
| `audit-collection-missing-set2.png` | « SET NOT FOUND », impasse dans `<main>` |
| `audit-sealed-collection.png` | Mur d’auth du portefeuille scellé |
| `audit-tcg-mobile-catalog.png` | Catalogue mobile, nav locale et barre inférieure |
| `audit-tcg-mobile-more.png` | Panneau More mobile (passe initiale) |
| `tcg-audit-final3b.json` | Modale, clavier, panneau mobile |
| `tcg-audit-final6.json` | Modale détaillée, retour/avant, statuts de routes |
| `tcg-audit-final7.json` | `aria-current`, navigations visibles, skip link, album |
| `tcg-audit-final8.json` | Contexte de carte, album, 404, set inexistant |
| `tcg-audit-final9.json` | États anonymes, choix de langue, illustration |
| `tcg-audit-final10.json` | Illustration valide, portefeuille scellé après attente |

**Fichiers source inspectés (lecture seule) :** `src/app/tcg/**`, `src/app/not-found.tsx`, `src/proxy.ts`, `src/components/tcg/{TCGPageTabs,TCGResearchDesk,TCGCardDetailRoute,TCGCardDetailModalRoute,TCGAlbumPage}.tsx`, `src/app/tcg/sealed/{SealedPortfolioPage,SealedMarketPage}.tsx`, `src/components/layout/{Header,HeaderDesktopNav,HeaderMobileNav,SecondaryNavigationLinks,PrimaryBottomNav,Breadcrumbs}.tsx`, `src/lib/{navigation-registry,tcg-sealed-navigation}.ts`.

**Aucun fichier applicatif n’a été modifié.**
