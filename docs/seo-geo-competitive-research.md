# Recherche concurrentielle SEO/GEO de Lunidex

Date de recherche : 22 août 2026

Cette note sert de source de travail pour les articles intégrés dans le blog
Lunidex. Elle ne prétend pas fournir un volume de recherche ou une difficulté
de mot-clé : aucun accès à Search Console, Analytics, Ahrefs ou Semrush n’a été
fourni. Les intentions ci-dessous sont donc déduites des catégories de produits,
des pages officielles consultées et des formulations visibles dans les résultats.

## Positionnement vérifié de Lunidex

Le dépôt et les pages publiques décrivent Lunidex comme un espace Pokémon
localisé qui réunit :

- un Pokédex et des références Pokémon alimentés par PokéAPI ;
- un Team Builder de six Pokémon, une comparaison jusqu’à trois Pokémon et des
  outils de types, EV/IV, reproduction et combat ;
- un quiz et un suivi Nuzlocke ;
- un catalogue Pokémon TCG alimenté par TCGdex, avec collection, wishlist,
  vues de séries et constructeur de deck ;
- une progression personnelle et des fonctions de compte qui restent séparées
  des pages publiques.

Les pages éditoriales ne promettent ni marketplace, ni scanner de cartes, ni
valorisation de marché garantie. Les prix et les données de catalogue restent
conditionnels à la disponibilité de TCGdex.

## Concurrents retenus

Chaque concurrent retenu possède une page autonome, avec une intention différente
et un lien vers sa source officielle. Les faits concernant Lunidex sont vérifiés
dans le dépôt ; les faits concernant le concurrent sont formulés à partir de la
page liée et peuvent évoluer.

| Concurrent | Catégorie | Intention prioritaire | Source vérifiée |
| --- | --- | --- | --- |
| Pokémon Database | Référence Pokémon | `Pokémon Database alternative`, `Pokédex stats moves` | [Pokédex](https://pokemondb.net/pokedex), [About](https://pokemondb.net/about) |
| Bulbapedia | Encyclopédie Pokémon | `Bulbapedia alternative`, `Pokémon encyclopedia` | [About Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Bulbapedia:About) |
| Pokémon Showdown | Équipes et combat compétitif | `Pokémon team builder`, `Showdown team builder alternative` | [Smogon simulator overview](https://www.smogon.com/sim/), [FAQ](https://pokemonshowdown.com/pages/faq) |
| PokéCardex | Collection TCG | `PokéCardex alternative`, `Pokémon card collection tracker` | [Application PokéCardex](https://www.pokecardex.com/app) |
| ZebraDex | Collection TCG française | `ZebraDex alternative`, `application collection cartes Pokémon` | [Site ZebraDex](https://zebradex.fr/index.php) |
| Collectr | Portfolio multi-TCG | `Collectr alternative`, `Pokémon card portfolio tracker` | [Site Collectr](https://www.getcollectr.com/) |

## Alternatives étudiées mais non retenues dans la première vague

- **Serebii** : référence très pertinente, mais l’intention recoupe fortement
  Pokémon Database et Bulbapedia ; il est conservé comme source concurrentielle
  secondaire pour une future page distincte si les données Search Console le
  justifient.
- **Pokéllector** : catalogue TCG pertinent, mais l’angle index/catalogue est
  proche des articles PokéCardex et ZebraDex sans ajouter une intention produit
  suffisamment différente pour cette vague.
- **TCG Collector** : tracker TCG détaillé, mais l’article serait très proche
  de l’angle Collectr/collection spécialisée ; à tester d’abord avec les
  impressions réelles.
- **Pokémon HOME** : alternative officielle pour le stockage et le Pokédex,
  mais ce n’est pas un concurrent éditorial direct d’un espace web TCG et de
  team building. Il mérite plutôt une page « outils officiels et indépendants ».

## Guides fonctionnels retenus

Les routes sont regroupées par parcours lorsque l’objectif et les interactions
sont identiques. Les surfaces personnalisées sont documentées sans données de
compte :

| Guide | Routes couvertes |
| --- | --- |
| Références Pokémon | `/pokedex`, `/pokemon/{name}`, `/types`, `/moves`, `/abilities`, `/items` |
| Outils d’équipe et de combat | `/team`, `/compare`, `/types`, `/ev-iv`, `/breeding`, `/battle` |
| Espace Pokémon TCG | `/tcg`, `/tcg/cards/{id}`, `/tcg/collection`, `/tcg/collection/{setId}`, `/tcg/wishlist`, `/tcg/deck-builder` |
| Progression et compte | `/dashboard`, `/favorites`, `/friends`, `/u/{handle}`, authentification et réinitialisation |

Les quatre guides existants restent complémentaires : collection TCG générique,
Team Builder, quiz et Nuzlocke.

## Principes GEO appliqués

- Réponse courte et autonome en haut de chaque page ;
- distinction visible entre faits vérifiés, comparaison et conseil de choix ;
- sections et questions FAQ directement extractibles ;
- citations de dépôt et de pages officielles concurrentes ;
- limites explicites pour éviter les affirmations de prix, scanner, performance,
  disponibilité mobile ou données privées non vérifiées ;
- données structurées `WebPage`, `BreadcrumbList` et `FAQPage` alignées sur le
  texte visible ;
- indexation limitée à l’anglais et au français tant que les autres versions
  n’ont pas une traduction éditoriale complète.

## Mesure à brancher ensuite

Pour prioriser une seconde vague, relever dans Search Console les requêtes et
pages qui génèrent des impressions sur les familles suivantes :

1. Pokédex / stats / types / évolutions ;
2. team builder / type coverage / EV IV / breeding ;
3. Pokémon TCG collection tracker / wishlist / set completion ;
4. Nuzlocke tracker / Pokémon quiz ;
5. alternatives et comparatifs de chaque concurrent retenu.

Sans ces données, il est préférable d’actualiser les pages existantes avec des
preuves et des liens internes plutôt que de multiplier les pages concurrentes
quasi identiques.
