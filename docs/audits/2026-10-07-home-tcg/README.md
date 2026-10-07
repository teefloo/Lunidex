# Homepage : priorité au suivi TCG

## Analyse et changements UX

La composition active se trouve dans `HomeArchiveExperience`, et non dans les anciens textes `lunidex_archive`. Elle présentait surtout la découverte de cartes rares : « Explorez les cartes Pokémon », un paragraphe d’accès assez long et un CTA catalogue prioritaire. Le suivi de collection était secondaire. Le Pokédex et l’outil Équipe avaient déjà leurs propres sections.

L’amélioration conserve le fond cobalt, les thèmes, les typographies, les boutons, les cartes et les illustrations Pokémon. Le hero présente maintenant le suivi des cartes, les manquantes et la progression. Son sous-titre tient en une courte phrase. Le CTA principal ouvre `/[locale]/tcg/start?source=home_cta`, où la démo anonyme existante permet de choisir une extension. Le catalogue reste le CTA secondaire, puis viennent les liens Pokédex, Équipe et Open source.

Le nouvel aperçu est une illustration statique clairement étiquetée : trois cartes de l’extension 151, deux possédées, une manquante et 67 % de progression sur cet exemple. Il ne représente pas une collection personnelle ou le taux de complétion réel de l’extension entière. La galerie de cartes rares reste disponible après les étapes du suivi, avec ses interactions existantes. Le CTA final reprend la priorité donnée au suivi.

Le hero précise que la démo est temporaire et que la sauvegarde nécessite une connexion. Aucun scanner, marketplace ou prix garanti n’est annoncé. Les huit langues utilisent le namespace i18n existant. Les noms anglais des cartes restent ceux des illustrations du catalogue anglais déjà présent.

## Tracking et accès

L’attribution existante `source=home_cta` est conservée : le parcours utilise toujours les événements centralisés de `product-measurement` et PostHog, notamment `tcg_start_opened` et les événements de démo. Aucun nouvel événement, SDK ou appel analytique n’est ajouté. Les vérifications navigateur ont refusé la mesure produit ; elles ne constituent pas une validation d’ingestion dans PostHog.

L’option `allowDemo` permet au CTA principal d’ouvrir la démo pour un visiteur sans compte lorsque les services de compte ne sont pas configurés. Elle ne modifie pas les autorisations de la collection sauvegardée. Les autres usages du composant conservent leur comportement par défaut. Deux tests couvrent ce cas et le maintien de l’explication d’accès pour un compte connecté sans synchronisation.

## Vérifications

Validation du build de production local avec Chrome :

| Langue | Largeurs | Thèmes | Débordement horizontal | CLS observé |
| --- | --- | --- | --- | --- |
| Français | 1440, 768, 375 px | Clair et sombre | Aucun | 0 |
| Anglais | 1440, 768, 375 px | Clair et sombre | Aucun | 0 |

Les 12 relevés sont enregistrés dans [browser-checks.json](browser-checks.json). L’observateur de layout est installé avant le chargement du document ; les relevés attendent les polices et le décodage des trois images du hero. Il s’agit de mesures locales, pas de Core Web Vitals terrain. Les captures mobiles de la matrice utilisent une hauteur de 1100 px pour montrer l’ensemble du hero ; une vue 375 × 812 px a également été inspectée en développement.

Les images chargent dans les douze variantes. Les CTA principaux et secondaires mesurent 48 px de haut. Les clics réels en français et anglais ouvrent la démo, son avertissement de progression temporaire, son champ de recherche et ses douze liens d’extensions. Le clic secondaire français ouvre le catalogue JCC localisé. Aucun écran de connexion ne bloque la démo ; aucune erreur console n’a été relevée sur son ouverture anglaise. Les scénarios connectés sont couverts par les tests unitaires du résolveur, sans création de compte de test.

Commandes réussies :

- `npm run lint`
- `npm run typecheck`
- `npm test` : 122 fichiers, 610 tests réussis. Le premier passage sandboxé a bloqué le serveur HTTP de quatre tests ; le passage avec accès local autorisé réussit entièrement.
- `npm run seo:check`
- `npx tsc --project packages/core/tsconfig.json --noEmit`
- `npm run build` : compilation et génération de 308 pages réussies. Avertissements existants sur la dépréciation Edge Runtime et l’enregistrement explicite du service worker PWA.
- `git diff --check`

## Captures

| Format | Avant | Après |
| --- | --- | --- |
| Desktop français sombre | [Avant](before-fr-desktop.png) | [Après](after-fr-1440-dark.jpg) |
| Mobile français sombre | [Avant, 375 × 812](before-fr-mobile.jpg) | [Après, 375 × 1100](after-fr-375-dark.jpg) |

La capture desktop initiale inclut la bannière de consentement existante. Les captures suivantes françaises sombres et anglaises ont été faites après refus de la mesure. Les fichiers `after-{fr,en}-{1440,768,375}-{light,dark}.jpg` couvrent la matrice complète.

## Fichiers de code modifiés

- `src/components/home/HomeArchiveExperience.tsx`
- `src/components/home/HomeCollectionEntry.tsx`
- `src/components/home/HomeCollectionPreview.tsx` (nouveau composant serveur)
- `src/app/globals.css`
- `src/lib/tcg-collection-entry.ts`
- `src/lib/tcg-collection-entry.test.ts`
- `src/lib/i18n/en.ts`, `fr.ts`, `es.ts`, `de.ts`, `it.ts`, `ja.ts`, `ko.ts`, `zh.ts`

Les captures et ce rapport sont ajoutés dans `docs/audits/2026-10-07-home-tcg/`. Aucune dépendance ajoutée, aucun push ni déploiement.
