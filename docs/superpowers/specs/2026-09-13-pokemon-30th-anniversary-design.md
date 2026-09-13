# Refonte de la page Pokémon TCG: 30th Celebration

Date de conception : 13 septembre 2026

Snapshot éditorial demandé : 12 septembre 2026

Route conservée : `/[locale]/30e-anniversaire`

Locales indexables : `fr`, `en`

## Objectif

Transformer la page éditoriale actuelle en une page de référence Lunidex qui combine :

- une réponse éditoriale courte et factuelle ;
- une checklist SSR des cartes réellement connues ;
- un tracker des 30 Pikachu ;
- la collection TCG Lunidex existante, sans deuxième état de possession ;
- les produits officiels et leurs fenêtres de disponibilité ;
- des liens vers les fiches de cartes Lunidex quand leur identifiant est confirmé ;
- un SEO FR/EN propre et une expérience mobile rapide.

La page reste un outil d’information et de collection. Elle ne devient ni une page de prix, ni une page de précommande.

## Constat et recherche

### Sources officielles

Les sources suivantes sont la base de vérité pour le contenu éditorial et les visuels :

| Sujet | Source | Faits exploitables |
| --- | --- | --- |
| Présentation de l’extension | [Pokémon — Get Ready for Pokémon TCG: 30th Celebration](https://www.pokemon.com/us/news/get-ready-for-pokemon-tcg-30th-celebration) | sortie mondiale le 16 septembre 2026, cartes foil, Basic Energy foil, un Pikachu parmi 30 par booster, Classic Collection et nouvelle rareté Futuristic Rare |
| Pikachu et cartes révélées | [Pokémon — Get Ready for a Pikachu Parade](https://www.pokemon.com/uk/news/get-ready-for-a-pikachu-parade-in-pokemon-tcg-30th-celebration) | Pikachu ex jour/nuit, illustrateur kantaro et scènes jour/nuit |
| Lugia et Ho-Oh | [Pokémon — Lugia and Ho-Oh](https://www.pokemon.com/us/news/get-a-sneak-peek-at-lugia-and-ho-oh-from-pokemon-tcg-30th-celebration) | cartes et illustrateurs officiellement présentés |
| Galerie de cartes | [Pokémon TCG — 30th Celebration card gallery](https://tcg.pokemon.com/en-us/galleries/30th-celebration/) | catégories officielles, images des cartes principales, 30 Pikachu et 30 visuels Classic Collection |
| Produits | [Pokémon — 30th Celebration Product Showcase](https://www.pokemon.com/uk/news/pokemon-tcg-30th-celebration-product-showcase) | contenus, visuels et fenêtres septembre/octobre/novembre 2026 |

La galerie officielle utilise notamment les identifiants d’image `2M6P_EN_<n>.png` et `2M6P_Classic_EN_<n>.png`. Ces chemins sont encapsulés dans le manifeste et ne sont pas dispersés dans les composants.

### Sources secondaires de recoupement

Le manifeste peut utiliser, avec un statut explicite, les recoupements de [TCGScreener](https://tcgscreener.com/guide/30th-celebration-card-list), de [Bill’s Archive](https://billsarchive.com/30th-celebration.html) et de [PokéBeach pour la Classic Collection](https://www.pokebeach.com/2026/06/all-30-classic-collection-cards-from-30th-celebration-likely-revealed). Elles ne remplacent pas Pokémon.com : elles servent à compléter les noms, illustrateurs ou associations quand l’image officielle existe mais que la page officielle ne fournit pas de liste textuelle exploitable.

### État de TCGdex

L’audit du 12–13 septembre ne permet pas de considérer TCGdex comme une source complète pour cette page. Les données observées sont partielles et les sources publiques de suivi signalent encore un set incomplet. L’implémentation utilisera donc un complément temporaire et typé, séparé du catalogue générique, tout en laissant l’adaptateur prêt à être supprimé dès que TCGdex fournit la totalité du set.

Conséquences :

1. aucune URL de fiche Lunidex n’est construite à partir d’un identifiant non validé ;
2. un lien interne est affiché seulement si le card ID est confirmé par le catalogue/API Lunidex ou par le manifeste compatible ;
3. les cartes sans fiche interne conservent leur lien de source officielle, sans lien Lunidex cassé ;
4. les quatre secrètes sans visuel anglais officiel restent listées comme données connues mais portent un statut de disponibilité d’image non publié, jamais une image inventée.

## Choix d’architecture

### Options étudiées

1. **TCGdex seul.** Simple et cohérent avec le catalogue, mais incorrect tant que la réponse est partielle : la page serait incomplète ou afficherait un total trompeur.
2. **Nouveau catalogue permanent dans la page.** Permettrait une page complète immédiatement, mais créerait une deuxième source de vérité difficile à retirer et risquerait de diverger de TCGdex.
3. **Adaptateur hybride temporaire — choix retenu.** Le catalogue TCGdex reste prioritaire ; un manifeste `30th Celebration` versionné complète seulement les éléments manquants, avec provenance et statut par entrée. Les fonctions de fusion se basent sur le collector number et dédupliquent avant rendu.

Le troisième choix respecte l’existant, permet d’afficher les 30 Pikachu immédiatement et rend la suppression du complément mécanique lorsque TCGdex devient complet.

### Frontière serveur/client

- `src/app/30e-anniversaire/page.tsx` reste un Server Component.
- Le serveur récupère en parallèle les données TCGdex disponibles et le manifeste complémentaire, puis prépare un modèle sérialisable unique.
- Le contenu principal — titre, faits, sections, lignes de checklist, noms, numéros, raretés et produits — est présent dans le HTML initial.
- Un petit composant client gère le countdown, les filtres, l’état de possession et le partage.
- Aucun composant de présentation ne fait de `fetch` ad hoc ; les appels passent par `src/lib/api` et `src/lib/api/server-cache.ts`.

## Modèle de données

### Provenance

Le modèle commun ajoute un statut strict :

```ts
type Anniversary30SourceStatus =
  | 'official'
  | 'verified-database'
  | 'reported'
  | 'unknown';
```

Chaque entrée de carte ou de produit contient une provenance, une date de vérification et au moins une URL. Une entrée `official` doit pointer vers Pokémon.com ou la galerie officielle. Une entrée `reported` est rendue visible seulement avec une indication éditoriale claire.

### Périmètres séparés

Le modèle expose des collections indépendantes afin d’éviter un master count trompeur :

- `numberedMain`: 001–128 ; les 30 Pikachu occupent 023–052 dans ce périmètre ;
- `secretRares`: les entrées connues 129–158, avec les quatre images anglaises non publiées marquées ;
- `pikachu`: exactement 30 cartes, mapping spécial 01/30–30/30 vers 023/128–052/128 ;
- `classicCollection`: 30 reprints séparés, visuels officiels et noms recoupés, statut `reported` tant que Pokémon n’a pas publié une liste textuelle exhaustive ;
- `basicEnergy`: périmètre séparé, sans l’additionner automatiquement au total des cartes numérotées ;
- `promos`: promos produits/MEP hors checklist principale ;
- `products`: produits scellés, jamais mélangés aux cartes.

La vue d’ensemble affiche donc plusieurs compteurs libellés, par exemple « 128 cartes numérotées », « 30 secrètes connues », « 30 Pikachu » et « 30 Classic Collection rapportées », au lieu d’un seul nombre présenté comme définitif.

### Identité des cartes

Le manifeste conserve le collector number et un identifiant local stable. L’identifiant TCGdex/Lunidex n’est attribué qu’après validation du set ID et du format de l’API. Le mapping des Pikachu est déterministe :

```text
01/30 -> 30th main 023/128
02/30 -> 30th main 024/128
...
30/30 -> 30th main 052/128
```

Les noms affichés peuvent rester « Pikachu (01/30) » lorsque la source ne distingue pas d’autre nom officiel. L’illustrateur et le collector number sont affichés séparément.

### Produits

Le modèle produit devient structuré : nom, image, statut, fenêtre, variantes, contenu confirmé, nombre de boosters lorsqu’il est connu et URL source. Les produits officiels du showcase sont rendus séparément, sans prix américain présenté comme prix français.

Les fenêtres affichées sont :

- septembre 2026 : 2-Pack Blister, Knock Out Collection, Binder Collection, Poster Collection, Pokémon ex Box, Elite Trainer Box et Pokémon Center Elite Trainer Box ;
- octobre 2026 : Booster Bundle, Mini Tins et Battle Decks ;
- novembre 2026 : Tech Sticker Collection, Ditto Premium Collection, Ultra-Premium Collection Day & Night et Figure Collection Mew & Mewtwo.

Le détail de contenu respecte la source officielle : 3 boosters pour Tech Sticker, 2 pour le blister, 5 pour le binder, 3 pour le poster, 4 pour chaque ex Box, 9 ou 11 pour les ETB standard/Pokémon Center, 6 pour le Booster Bundle, 2 par Mini Tin, aucun booster déclaré pour le Battle Deck, 8 pour Ditto, 29 boosters plus un booster Classic de 3 cartes pour l’Ultra-Premium Collection, et 5 pour la Figure Collection. Les variantes sont indiquées quand la source en fournit plusieurs.

## Page et composants

### Ordre du contenu

1. Hero premium jour/nuit, titre, promesse de checklist, date de sortie et état dynamique.
2. Réponse rapide SEO avec 4–6 faits confirmés.
3. Checklist « 30th Celebration » avec périmètres visibles et compteurs distincts.
4. Tracker « Les 30 Pikachu » avec progression et filtres.
5. Cartes remarquables : Pikachu ex, Mew/Mewtwo, Lugia/Ho-Oh, IR/SIR/Futuristic Rare.
6. Classic Collection, explicitement séparée et marquée selon sa provenance.
7. Produits et timeline septembre/octobre/novembre.
8. FAQ utile et liens internes vers le catalogue TCG, les fiches disponibles et le guide collection.
9. Matrice de sources et date de dernière vérification.

### Interaction de collection

Le tracker utilise `encodeTCGCollectionKey` et les actions `usePrimeDexStore` existantes. Il ne crée pas de clé de stockage de possession parallèle.

- L’état `owned` est lu depuis la collection TCG du set et inversement.
- Les boutons réutilisent la protection `hasSyncAccess()` et `requestSyncAccess()` déjà appliquée aux actions synchronisables.
- Le clic est optimiste dans l’interface lorsque l’action est autorisée ; l’état rendu est ensuite recalculé depuis le store.
- Une wishlist est proposée seulement si elle peut utiliser le modèle existant sans confondre wishlist et possession.
- L’absence d’accès de synchronisation affiche le CTA d’authentification existant, sans écrire silencieusement une deuxième collection locale.

### Migration v1

La clé historique `primedex-anniversary-30-tracker-v1` est lue par une fonction pure. Elle est conservée comme sauvegarde et n’est jamais supprimée.

La migration :

1. valide et déduplique le snapshot v1 ;
2. mappe uniquement les slots 01–30 vers 023–052, car cette correspondance est établie ;
3. attend un accès de synchronisation avant d’écrire dans la collection TCG ;
4. fusionne avec les cartes déjà possédées sans les retirer ;
5. écrit un marqueur v2 avec les IDs migrés afin d’être one-shot et idempotente ;
6. garde le snapshot v1 et les entrées non converties si l’ID de collection ne peut pas encore être validé.

Un échec d’authentification, d’API ou de stockage ne peut donc pas transformer une ancienne coche en perte silencieuse.

## Filtres, accessibilité et responsive

La checklist propose `Toutes`, `Possédées`, `Manquantes`, `Pikachu`, `Pokémon ex`, `Illustration Rare`, `Special Illustration Rare`, `Futuristic Rare` et `Classic Collection` uniquement quand le périmètre existe dans les données chargées. Les boutons utilisent `aria-pressed`, un focus visible et une zone tactile minimale de 44 px.

La grille est mobile-first, sans tableau horizontal obligatoire. Les cartes utilisent `next/image` ou le composant TCG existant avec `sizes`, lazy loading et une priorité limitée au hero. Les images hors écran peuvent conserver `content-visibility: auto`. Le rendu cible 320, 375, 390, 430, 768, 1024 et 1440 px, avec vérification de l’absence d’overflow.

Le hero réutilise la palette cobalt/lavande Lunidex, les polices existantes et une distinction jour/nuit discrète. Aucun nouveau grand gradient, décor animé persistant, emoji décoratif ou empilement de cartes UI n’est ajouté. Toute animation respecte `prefers-reduced-motion`.

## Countdown et états

Le compte à rebours utilise la date ISO `2026-09-16` et le temps réel du navigateur, jamais un nombre de jours codé en dur. Il affiche :

- avant la sortie : jours, heures, minutes, secondes ;
- à partir de la date de sortie : « disponible depuis le 16 septembre 2026 » ;
- en cas d’horloge indisponible : la date de sortie statique.

Le texte serveur reste crawlable et stable ; le composant client améliore l’état après hydratation sans provoquer de mismatch.

## SEO, i18n et analytics

- Le canonical reste localisé sur `/fr/30e-anniversaire` ou `/en/30e-anniversaire`.
- Les alternates restent limitées aux deux variantes indexables actuelles, avec `x-default` selon le helper existant.
- Les autres locales sont vérifiées et continuent de rediriger vers l’anglais ; elles ne doivent afficher ni clé brute ni mélange de langue.
- Les données JSON-LD comprennent `Article` ou `CollectionPage`, `BreadcrumbList`, `ItemList` pour les cartes effectivement rendues et `FAQPage`. Les nombres incomplets ne sont pas annoncés comme définitifs.
- Les titres et descriptions FR/EN intègrent « checklist », « 30 Pikachu » et « 30th Celebration » sans sur-optimisation.
- Les événements PostHog restent sans PII : vue de page, changement de filtre, coche/décoche, migration réussie/maintenue en attente et partage de progression. Les appels passent par `capturePostHogEvent` et restent opt-in.
- Les erreurs de migration ou de complément de données sont signalées à Sentry sans contenu de collection ni secret.

## Tests et vérification

Les tests unitaires couvriront :

- exactement 30 Pikachu, IDs distincts, collector numbers 023–052 distincts, progression 01–30 sans trou ;
- absence de `placeholder` dans les données Pikachu rendues ;
- unicité des collector numbers et des IDs de cartes connues ;
- séparation des périmètres numérotés, secrètes, Classic, énergies et promos ;
- masquage fail-closed des filtres absents et des liens Lunidex non validés ;
- filtres Toutes/Possédées/Manquantes/Pikachu/raretés ;
- parsing robuste, migration v1→v2, idempotence et conservation des entrées non converties ;
- countdown avant, à et après le 16 septembre ;
- présence des canoniques, alternates et JSON-LD attendus.

La validation finale exécutera les checks du dépôt concernés par la modification, au minimum `npm run test`, `npm run lint`, `npm run typecheck`, le check TypeScript core, le type-check mobile, `npm run build` et `npm run seo:check`. Une vérification visuelle manuelle sera faite sur les sept largeurs cibles et en mode réduit.

## Limites explicites

- Les prix, stocks, précommandes et dates françaises précises ne sont pas ajoutés sans source officielle correspondante.
- Les cartes secrètes sans image anglaise officielle restent textuelles avec un statut visible ; aucune scan non officielle ou image piratée n’est utilisée.
- La Classic Collection est rendue comme un périmètre séparé : ses 30 visuels sont présents dans la galerie officielle, mais sa liste textuelle est signalée comme recoupée/rapportée tant qu’une liste officielle exhaustive n’est pas publiée.
- Aucun déploiement, push, merge ou migration de production ne fait partie de cette étape sans confirmation explicite.
