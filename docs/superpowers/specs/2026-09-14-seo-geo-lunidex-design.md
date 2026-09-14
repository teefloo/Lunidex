# Lunidex SEO classique et GEO/AI SEO — Design

## Statut

Design validé en conversation le 14 septembre 2026. Ce document décrit le chantier d’implémentation ; il ne modifie pas le comportement produit à lui seul.

## Contexte et problème

Le rapport BrandMonitor du 14 septembre 2026 montre une forte asymétrie entre les requêtes de marque et les requêtes génériques : visibilité de 64/100 et citation de 33 % sur le segment nommé, contre 11/100 et 0 % sur le segment générique. Les thèmes les plus faibles sont les produits, le marché, la recommandation et la découverte. Les fan-out queries récurrentes portent sur les applications de collection Pokémon TCG, le suivi gratuit/en ligne, la synchronisation, la valorisation, les scanners, les team builders et les alternatives à Collectr, PokéCardex, Pokéllector et Cardzia.

L’audit du dépôt et de la production montre que les fondations techniques sont déjà en place : pages publiques rendues côté serveur, titres, descriptions, canonical, hreflang, sitemap, robots pour les crawlers IA, FAQ et données structurées. Le déficit prioritaire est donc l’autorité éditoriale extractible sur les intentions génériques et la couverture factuelle des comparaisons, pas une génération massive de pages ou un changement de produit.

## Objectifs

1. Faire comprendre immédiatement à un moteur de recherche ou à un assistant IA ce qu’est Lunidex, pour quel public, et quelles fonctions sont réellement disponibles.
2. Positionner les contenus existants sur les intentions génériques collection tracker/app, Pokédex gratuit et team builder.
3. Augmenter les occasions de citation avec des réponses autonomes, des tableaux de critères, des sources et des dates de vérification.
4. Ajouter des comparatifs utiles et neutres pour Pokéllector et Cardzia, puis actualiser les comparatifs Collectr, PokéCardex et ZebraDex.
5. Maintenir une cohérence stricte entre contenu visible, métadonnées, JSON-LD, sitemap, fichiers AI et traductions.
6. Corriger les problèmes techniques réellement mesurés, notamment le contraste du guide Team Builder et la chaîne de rendu qui contribue au LCP mobile élevé.

## Non-objectifs

- Ne pas inventer de scanner, d’historique de prix garanti, de valorisation de portefeuille, de marketplace, de classement utilisateur ou d’application publiée dans un store.
- Ne pas présenter Lunidex comme officiel, affilié à The Pokémon Company, Nintendo, Creatures ou Game Freak.
- Ne pas promettre une première position Google, une citation IA ou une présence dans AI Overview.
- Ne pas créer une page quasi identique par mot-clé ni multiplier les variantes locales minces.
- Ne pas modifier les routes historiques, les identifiants `primedex` ou les chemins privés/personnels indexables.
- Ne pas déployer, publier, soumettre une demande externe ou modifier la Search Console.

## Faits produit autorisés

Les contenus peuvent dire que Lunidex est un outil indépendant, open source sous licence MIT et gratuit à utiliser pour la consultation publique. Le catalogue Pokémon TCG s’appuie sur TCGdex et les références Pokémon sur PokéAPI. Les fonctionnalités actuellement documentées comprennent la recherche de cartes et de séries, les fiches publiques, le suivi possédé/manquant et la progression de collection, la wishlist, la préparation de decks, le Pokédex, le Team Builder, la comparaison de Pokémon, le tableau des types et huit langues.

La distinction d’accès doit rester explicite : la consultation publique ne nécessite pas de compte ; les données personnelles de collection, progression, équipes et synchronisation passent par le parcours lié au compte et au service configuré. Une indisponibilité du service ne signifie pas que la collection personnelle est vide.

Les prix éventuels sont des champs dépendant de TCGdex et ne constituent ni une cotation garantie, ni un historique de marché, ni une recommandation d’achat. L’absence de scanner est une limite à dire clairement. L’exécutable web est une expérience web/PWA ; aucune disponibilité App Store ou Google Play ne doit être affirmée sans source officielle vérifiée.

## Architecture éditoriale et contenu

### 1. Guide principal collection/app

Le guide fixe `/guides/pokemon-card-collection-tracker` devient la page d’autorité pour les intentions suivantes : collection tracker, collection app, gratuit, organisation en ligne, suivi des cartes possédées/manquantes, débutant et synchronisation.

Le contenu visible doit commencer par une réponse directe en une ou deux phrases, puis fournir :

- un tableau de critères : catalogue, possédé/manquant, progression par série, wishlist, variantes/quantités, langues, accès public, compte/synchronisation, scanner, prix et marketplace ;
- un parcours débutant en étapes ;
- une section dédiée à la différence entre catalogue public et espace personnel ;
- une section explicite sur ce que Lunidex ne fait pas ;
- des liens vers le catalogue TCG, les fiches de cartes, la collection, la wishlist, le guide TCG et les comparatifs ;
- des sources, une date de mise à jour et une FAQ limitée aux questions réellement visibles dans le contenu.

Le guide conserve son URL stable et ses traductions existantes dans les huit langues supportées. Les formulations locales doivent rester naturelles ; les mots-clés ne sont pas traduits mécaniquement.

### 2. Guides Pokédex, équipe et espace TCG

Les guides existants `pokemon-reference-guide`, `team-tools-guide` et `tcg-workspace-guide` reçoivent des réponses d’entrée plus explicites pour les requêtes génériques : Pokédex en ligne gratuit, team builder/balancing et application/espace de collection TCG. Les liens entre ces guides et les surfaces produit seront ajoutés uniquement lorsqu’ils aident le parcours.

Les affirmations déjà documentées dans les traductions sont conservées : Team Builder jusqu’à six Pokémon, Compare jusqu’à trois, import de texte Showdown et export d’image d’équipe. Les limites de couverture et de légalité compétitive restent visibles.

### 3. Comparatifs factuels

Le système éditorial existant est étendu avec deux entrées :

- `/compare/lunidex-vs-pokellector` ;
- `/compare/lunidex-vs-cardzia`.

Les pages Collectr, PokéCardex et ZebraDex sont actualisées en parallèle. Chaque page doit inclure une réponse courte, une matrice de critères, le profil de l’outil auquel elle est comparée, les différences avec Lunidex, le public auquel chaque solution convient, des liens de sources officielles et une date de vérification. Les états de matrice doivent distinguer `oui`, `non`, `conditionnel` et `non documenté` afin de ne pas déduire une absence à partir d’une simple omission de source.

Les nouvelles pages éditoriales suivent la politique actuelle : contenu indexable en anglais et en français uniquement tant que les autres traductions ne sont pas complètes. Elles ne doivent pas produire de fausses variantes indexables dans les six autres langues.

Les sources initiales sont les sites officiels de [Pokéllector](https://www.pokellector.com/), [Cardzia](https://cardzia.fr/), [Collectr](https://www.getcollectr.com/), [PokéCardex](https://www.pokecardex.com/en/) et [ZebraDex](https://zebradex.fr/index.php). Les prix, plans et fonctionnalités volatils ne sont inclus que lorsqu’ils sont explicitement sourcés et datés.

## SEO technique et données structurées

Les helpers existants de `src/lib/seo.ts` restent la source des breadcrumbs, articles, pages et FAQ. Les pages doivent respecter les invariants suivants :

- un seul `main` et un seul H1 visible ;
- titre et description descriptifs, sans bourrage de mots-clés ;
- canonical absolu correspondant à la langue affichée ;
- hreflang cohérent avec la politique de traduction ;
- JSON-LD limité aux types représentés dans le HTML visible : Article, WebPage, BreadcrumbList, FAQPage et ItemList lorsque la liste existe réellement ;
- aucune donnée `Product`, `Review`, `AggregateRating` ou prix inventé ;
- dates `datePublished` et `dateModified` centralisées dans `src/lib/editorial.ts` ;
- liens externes marqués et ouverts selon les conventions existantes.

Les comparatifs et guides seront ajoutés aux inventaires éditoriaux existants afin d’entrer automatiquement dans les sitemaps autorisés. Les routes personnelles, d’authentification et d’API restent exclues.

## GEO, fichiers AI et distribution sémantique

`public/llms.txt`, `public/llms-full.txt` et `public/ai.txt` sont mis à jour avec :

- une définition courte et stable de Lunidex ;
- les cas d’usage génériques couverts et les routes canoniques correspondantes ;
- les limites scanner, valorisation, marketplace et compte/synchronisation ;
- les sources de données et les comparatifs disponibles ;
- la date de revue du 14 septembre 2026.

Le fichier `robots.txt` est conservé s’il passe les contrôles existants : accès aux pages publiques et aux assets OG, interdiction de `/api/`, présence du sitemap. Les améliorations GEO proviennent du contenu citables et de la cohérence des sources, pas d’une autorisation artificielle de routes privées.

## Performance et accessibilité

Les snapshots PageSpeed mobiles du 14 septembre 2026 montrent un SEO Lighthouse à 100, mais un LCP de 6,0 à 6,4 secondes, des économies potentielles sur le rendu bloquant et le JavaScript inutilisé, ainsi qu’un contraste insuffisant sur le guide Team Builder. L’implémentation corrigera d’abord le contraste identifié et inspectera les scripts/widgets non essentiels du chemin initial. Aucune refonte visuelle ni suppression de contenu ne sera faite uniquement pour améliorer un score laboratoire.

## Fichiers concernés

- `src/app/guides/pokemon-card-collection-tracker/page.tsx`
- `src/app/guides/team-builder-guide/page.tsx`
- `src/lib/i18n/en.ts`, `fr.ts`, `es.ts`, `de.ts`, `it.ts`, `ja.ts`, `ko.ts`, `zh.ts`
- `src/lib/editorial.ts`
- `src/components/editorial/EditorialGuidePage.tsx`
- `src/components/editorial/EditorialArticlePage.tsx`
- `src/lib/seo.ts` uniquement si un helper manque réellement
- `public/llms.txt`, `public/llms-full.txt`, `public/ai.txt`
- `scripts/seo-check.mjs` et les tests SEO concernés
- styles ou composants du Team Builder uniquement pour le contraste et le rendu mesuré

## Validation et critères d’acceptation

Avant modification, les tests de référence sont : lint réussi, 201 tests Vitest réussis, `seo:check` réussi et typecheck à régénérer après traitement de l’artefact `.next` obsolète.

Après modification, l’acceptation exige :

1. Les guides collection, TCG, Pokédex et équipe contiennent une réponse directe visible, des liens internes cohérents et aucune affirmation interdite.
2. Les deux nouveaux comparatifs et les trois comparatifs actualisés ont des sources, dates, matrice lisible et JSON-LD correspondant au contenu.
3. Les huit traductions des guides fixes restent compilables et indexables avec leur canonical local ; les pages éditoriales nouvelles restent limitées à `en`/`fr` conformément à la politique existante.
4. Les sitemaps, robots, canonical, hreflang, titres, descriptions, H1, `main` et JSON-LD sont validés sur les pages clés en local et en production en lecture seule.
5. `npm run lint`, `npm run typecheck`, le check TypeScript core, `npm run test`, `npm run seo:check` et le build passent selon les contraintes du dépôt.
6. PageSpeed est relancé sur l’accueil, le guide collection et le guide Team Builder ; les résultats sont documentés sans promettre un score fixe.
7. Aucun déploiement, push, migration ou action Search Console n’est réalisé sans demande séparée.
