# Plan d’implémentation — accueil Lunidex collection-first

**Dépendance :** `docs/superpowers/specs/2026-07-30-lunidex-homepage-design.md` (commit `9cfbe1d`).

## Garde-fous avant toute modification

- Ne pas modifier, ajouter au staging ni inclure dans les commits les changements TCG préexistants :
  - `src/components/tcg/TCGActiveSetInsights.tsx`
  - `src/components/tcg/TCGAlbumPage.tsx`
  - `src/components/tcg/TCGCollectionOverview.tsx`
  - `src/components/tcg/TCGFilters.tsx`
  - `src/lib/api/tcg.ts`
  - `src/lib/tcg-images.test.ts`
  - `src/lib/tcg-images.ts`
  - `src/components/tcg/TCGImageWithFallback.tsx`
- Vérifier `git status --short` avant chaque `git add`. Utiliser `git add -- <fichiers explicites>` ; ne jamais employer `git add .` ni `git commit -a`.
- Ne pas renommer les clés IndexedDB/localStorage, les stores, packages, identifiants Supabase ou clés d'authentification historiques PrimeDex.
- Cette tâche de documentation ne modifie aucun fichier applicatif et n'inclut ni push ni déploiement ; les étapes ci-dessous sont l'ordre d'exécution de la future implémentation.

## Étape 1 — Sécuriser l’extraction du Pokédex

**But :** faire de `/{locale}/pokedex` la page Pokédex complète, puis libérer `/{locale}` sans perte fonctionnelle.

1. Créer `src/app/pokedex/page.tsx` en y déplaçant la composition actuelle de `src/app/page.tsx` consacrée au Pokédex : `Header`, `PokemonOfTheDay`, `PokemonList`, `ClientRecentlyViewed`, les préchargements TanStack Query et l'`ItemList` JSON-LD.
2. Utiliser `src/app/pokedex/page.tsx` avec `generateMetadata` pour les métadonnées propres à la route : canonique auto-référente, huit variantes `hreflang`, `x-default`, Open Graph et `WebPage` propres au Pokédex.
3. Créer un composant Pokédex dédié qui contient son `h1` et `HeroControls`, puis y composer `PokemonOfTheDay`, les filtres et la grille. Ne pas déplacer l'ancien `HeroSection`, car il contient désormais le CTA collection et l'ancien contenu d'accueil. Placer `ClientRecentlyViewed` sous la grille principale ou dans sa zone secondaire ; il reste client-only.
4. Modifier `src/components/layout/nav-items.ts` afin que l'entrée Pokédex soit `/pokedex`, puis vérifier desktop et menu mobile.
5. Mettre à jour les appels de `localeHref('/')`, les retours vers le Pokédex, les liens Home/Pokédex et les tests qui représentent le Pokédex plutôt que l'accueil.
6. Créer ou mettre à jour des tests ciblés, par exemple `src/app/pokedex/page.test.tsx` et `src/components/layout/nav-items.test.ts`, afin de vérifier l'existence de la route, la navigation, la présence de la recherche, des filtres, du Pokémon du jour, de la grille et de l'historique récent.

**Contrôles :** ouvrir `/{locale}/pokedex`, effectuer une recherche et un filtre, vérifier la grille, le Pokémon du jour et l'historique récent ; vérifier que `/{locale}` ne précharge plus les requêtes Pokémon.

## Étape 2 — Centraliser le CTA de reprise locale

**But :** une seule règle, sans réseau et sans interprétation de `tcgActiveSets`.

1. Créer un helper pur, par exemple `src/lib/tcg-collection-entry.ts`, indépendant de Next.js et de l'i18n. Il reçoit uniquement `hasHydrated` et `ownedCount` et retourne `type CollectionEntry = { mode: 'start' | 'resume'; path: '/tcg/start?source=home_cta' | '/tcg/collection' }`.
2. Ajouter `src/lib/tcg-collection-entry.test.ts` avant ou avec le helper :
   - avant hydratation → `/tcg/start?source=home_cta`, démarrage ;
   - aucune carte → même destination, démarrage ;
   - au moins une carte → `/tcg/collection`, reprise ;
   - stockage inaccessible traité comme le chemin public sûr.
3. Modifier `src/components/tcg/TCGCollectionStartLink.tsx` pour utiliser ce helper et retirer toute dépendance de destination à `tcgActiveSets[0]`.
4. Réutiliser ce helper dans les CTA client de l'accueil : hero, aperçu collection et parcours en trois étapes.

**Contrôles :** tests du helper ; test de `TCGCollectionStartLink` mis à jour ; inspection du DOM avant et après hydratation pour confirmer la même règle sur les quatre CTA.

## Étape 3 — Construire l’accueil Lunidex sans dépendance critique distante

**But :** remplacer la racine par le parcours collection-first stable côté serveur.

1. Remplacer la composition de `src/app/page.tsx` par l'accueil public : hero avec aperçu intégré, Outils de jeu, étapes collection, réassurance et FAQ. Retirer tous préchargements Pokémon de cette route.
2. Créer les composants focalisés sous `src/components/home/` :
   - `HomeHero.tsx` : structure serveur, H1, promesse, CTA secondaire Pokédex ;
   - `HomeCollectionEntry.tsx` : feuille client qui consomme le résolveur partagé et réserve les dimensions du CTA et de l'aperçu ;
   - `HomeCollectionPreview.tsx` : aperçu décoratif `aria-hidden` sans collection, aperçu factuel avec compteur local après hydratation ;
   - `HomeGameTools.tsx` : cartes Pokédex et Équipe ;
   - `HomeCollectionSteps.tsx` : trois étapes et CTA résolu ;
   - `HomeTrustSection.tsx` : message local, synchronisation conditionnelle et non-affiliation.
3. Réécrire `src/components/layout/HomeFaqSection.tsx` avec les quatre questions/réponses validées, sans contenu FAQ Pokédex supplémentaire.
4. Remplacer ou supprimer `src/components/layout/HeroSection.tsx` seulement après avoir retiré ses consommateurs ; ne pas conserver deux hero concurrents.
5. Adapter `src/components/layout/HeaderLogo.tsx`, les libellés visibles du header et `src/components/layout/SiteFooter.tsx` pour que l'accueil rende Lunidex. Retirer le lien GitHub globalement du footer, sans logique conditionnelle de route et sans renommer ni modifier le dépôt. Vérifier que son lien Accueil reste `/{locale}` et ajouter un lien Pokédex explicite vers `/{locale}/pokedex`.
6. Ajouter des tests de composants, par exemple `src/components/home/HomeCollectionEntry.test.tsx`, `src/components/home/HomeCollectionPreview.test.tsx`, `src/components/home/HomeGameTools.test.tsx` et mettre à jour `src/components/ui/FaqSection.test.tsx` ou ajouter le test ciblé de la FAQ.

**Contrôles :** le H1 et la promesse sont server-rendered et identiques avant/après hydratation ; aucune requête TCG ou Pokémon ne bloque le hero ; aucune animation de chargement ni faux `progressbar` ; l'accueil ne devient pas un tableau de bord.

## Étape 4 — Traductions et routes localisées

**But :** préserver les huit langues et les liens internes localisés.

1. Ajouter les clés de l'accueil, du compteur avec pluralisation, des métadonnées, des réponses FAQ et des libellés Pokédex dans `src/lib/i18n/en.ts`, `fr.ts`, `es.ts`, `de.ts`, `it.ts`, `ja.ts`, `ko.ts` et `zh.ts`.
2. Garder les références française et anglaise de la spécification ; traduire les six autres locales sans longueur codée ni interpolation non localisée.
3. Mettre à jour les textes qui pointaient vers l'ancien accueil Pokédex et les tests de traduction concernés.
4. Vérifier que les liens internes utilisent `useLocaleHref`, `localeHref` ou l'équivalent serveur et produisent `/en`, `/fr`, `/es`, `/de`, `/it`, `/ja`, `/ko`, `/zh` pour l'accueil et `/pokedex`.

**Contrôles :** tests i18n existants et tests de liens localisés ; validation manuelle des variantes française, anglaise et d'une langue à écriture non latine.

## Étape 5 — SEO, sitemap et JSON-LD factuels

**But :** séparer définitivement SEO accueil/Pokédex et supprimer les déclarations publiques non vérifiées.

1. Modifier `src/app/layout.tsx` pour ne conserver que les JSON-LD globaux factuels `WebSite` et `WebApplication`; supprimer `Organization`, ses références `author`/`publisher`, `legalName`, `foundingDate`, `ContactPoint`, `sameAs`, `Offer`, disponibilité, captures, `SearchAction` et toute déclaration non vérifiée.
2. Adapter `src/lib/site.ts` : supprimer les constantes sociales publiques PrimeDex inutilisées et auditer `FEATURE_LIST` pour n'y conserver que les capacités publiques et vérifiables. Ne toucher à aucune clé de persistance historique.
3. Modifier `src/lib/seo.ts` pour que `buildWebPageJsonLd` ne référence pas l'organisation supprimée et génère des URLs localisées correctes.
4. Émettre un `WebPage` route-spécifique dans `src/app/page.tsx` pour l'accueil et dans `src/app/pokedex/page.tsx` ou son layout pour le Pokédex ; l'`ItemList` appartient seulement à `/pokedex`.
5. Conserver le `FAQPage` de l'accueil, construit depuis la même source de données que la FAQ visible. Ajouter un test de correspondance exact entre questions/réponses rendues et JSON-LD.
6. Mettre à jour `src/app/sitemap.ts`, `src/app/sitemap.test.ts`, les alternates metadata et les éventuels tests SEO pour les huit URLs accueil et Pokédex.
7. Auditer le `HowTo` actuel : le supprimer de l'accueil et ne pas le déplacer vers `/team` dans cette implémentation.

**Contrôles :** rendre et inspecter les JSON-LD de `/{locale}` et `/{locale}/pokedex` ; vérifier canonique auto-référente, huit `hreflang`, `x-default` et parité sitemap/metadata/JSON-LD.

## Étape 6 — Image Open Graph et liens publics

**But :** remplacer l'asset public PrimeDex sans utiliser d'identité Pokémon protégée.

1. Créer `public/og/lunidex-og.jpg`, image statique 1200 × 630 : nom Lunidex, composition abstraite de collection et d'univers connecté, silhouettes de cartes et éléments d'interface neutres.
2. Ne pas utiliser logo, personnage ou artwork Pokémon, chiffre, fausse donnée ou texte dépendant de la langue.
3. Mettre à jour `src/lib/seo.ts`, `src/lib/og/default-image.ts`, les métadonnées de l'accueil, `src/lib/seo.test.ts` et les tests OG concernés pour utiliser `/og/lunidex-og.jpg` avec texte alternatif localisé.
4. Supprimer `public/og/primedex-og.jpg` seulement après remplacement de toutes ses références. Auditer séparément `src/lib/og/assets/primedex-og.jpg` et ne le supprimer que s'il est réellement inutilisé.
5. Retirer les liens et métadonnées Twitter/Discord PrimeDex. Le dépôt GitHub n'est ni renommé ni modifié et son lien n'est rendu ni sur l'accueil, ni dans le footer, ni dans les données structurées.

**Contrôles :** vérification des dimensions de l'image, des métadonnées sociales de chaque locale et recherche de références publiques PrimeDex dans le rendu accueil, les assets, les textes alternatifs et les JSON-LD concernés.

## Étape 7 — Consentement, performance et nettoyage des dépendances globales

**But :** conserver l'instrumentation autorisée et réduire le chemin critique de l'accueil.

1. Vérifier d'abord `src/components/analytics/VercelInsights.tsx` et son test : ils montent déjà Vercel Analytics et Speed Insights uniquement après consentement audience/performance. Ne modifier ces fichiers ou `src/app/providers.tsx` qu'en présence d'un écart démontré.
2. Conserver uniquement les événements produit existants de `src/lib/product-measurement.ts`; les CTA collection continuent à fournir `source=home_cta`, sans événement de clic, vue, hydratation ou état local supplémentaire.
3. Auditer `src/app/layout.tsx` et déplacer ou retirer les `dns-prefetch` PokéAPI globaux ; ils ne doivent pas être ajoutés au chemin critique de l'accueil. Les attacher à la route qui les consomme seulement si leur utilité est démontrée.
4. Vérifier les imports dynamiques et dépendances client de l'accueil pour éviter le chargement de grilles, filtres, images de cartes ou listes Pokémon.

**Contrôles :** tests de consentement Analytics/Speed Insights ; inspection réseau de l'accueil sans consentement ; contrôle que `tcg_start_opened` garde `home_cta` seulement après hydratation et consentement dans `/tcg/start`.

## Étape 8 — Validation intégrée et fin de branche

1. Validation navigateur à **375 × 812** et **1440 × 900** : hiérarchie, aperçu intégré au hero, absence de débordement horizontal, CTA, footer sans GitHub et route `/pokedex` complète.
2. Validation clavier : ordre de tabulation, focus visible, menu mobile, CTA et FAQ ; mesurer ou vérifier les cibles tactiles d'au moins 44 px.
3. Contrôle laboratoire : LCP ≤ 2,5 s et CLS ≤ 0,1 ; inspecter les longues tâches et interactions. Après trafic consenti suffisant, vérifier dans Speed Insights LCP ≤ 2,5 s, CLS ≤ 0,1 et INP ≤ 200 ms au 75e percentile.
4. Exécuter les vérifications de dépôt :
   - `npm run lint`
   - `npm run typecheck`
   - `npx tsc --project packages/core/tsconfig.json --noEmit`
   - `npm run typecheck --workspace=@primedex/mobile`
   - `npm run test -- --run`
   - `npm run build`
   - `git diff --check`
5. Avant chaque commit applicatif, recontrôler les fichiers stagés par `git diff --cached --name-only`; les changements TCG préexistants doivent rester hors staging.

Ce plan n'inclut ni push ni déploiement.
