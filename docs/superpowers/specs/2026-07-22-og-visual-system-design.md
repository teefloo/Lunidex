# PrimeDex OG visual system

## Status

Approved direction: Soft Pixel premium.

## Goal

Refonte de toutes les images Open Graph de PrimeDex avec une identité visuelle cohérente, reconnaissable et adaptée à chaque contenu partagé. Les images doivent rester lisibles dans les aperçus sociaux, préserver les données et URLs actuelles, et fonctionner dans toutes les langues déjà supportées par le site.

## Scope

Les générateurs suivants sont concernés :

- `src/app/opengraph-image.tsx` pour l’image par défaut du site ;
- `src/app/pokemon/[name]/opengraph-image.tsx` pour l’image conventionnelle d’un Pokémon ;
- `src/app/api/og/pokemon/route.tsx` ;
- `src/app/api/og/team/route.tsx` ;
- `src/app/api/og/profile/route.tsx` ;
- `src/app/api/og/quiz-result/route.tsx` ;
- `src/app/api/og/tcg-card/route.tsx`.

Les métadonnées et les URLs de partage restent inchangées. Aucun nouveau fournisseur de données ni aucune nouvelle dépendance ne sont nécessaires.

## Direction visuelle

La direction Soft Pixel premium s’appuie sur la palette et les polices déjà présentes dans `src/lib/og/` :

- fond brun nuit et surfaces brun chaud ;
- terracotta comme accent de marque ;
- bleu doux pour les données secondaires et les progressions ;
- couleurs officielles des types Pokémon lorsqu’un contenu Pokémon est présent ;
- Pixelify Sans pour la marque, les numéros et les scores ;
- Nunito pour les libellés et les informations secondaires ;
- angles nets, bordures épaisses et ombres offset pour une profondeur pixel art ;
- décor discret composé de grilles, points et panneaux, sans surcharge derrière les informations.

Le contraste entre texte et surface doit rester lisible dans une miniature. Les informations essentielles sont hiérarchisées par taille, espacement et contraste, et non par un effet décoratif seul.

## Architecture proposée

Le rendu sera organisé autour de primitives partagées dans `src/lib/og/` afin que chaque route ne réimplémente pas le cadre de marque :

- un cadre OG 1200×630 avec fond, panneau, bordure et watermark ;
- un en-tête de marque PrimeDex ;
- des badges et pastilles cohérents ;
- des cellules de statistiques et barres de progression ;
- des éléments décoratifs Soft Pixel réutilisables ;
- des helpers de texte court, de clamp et de couleur.

Les composants devront rester compatibles avec `next/og`/Satori : styles inline, layout Flexbox, images raw `<img>`, pas de dépendance navigateur, et polices chargées via le mécanisme existant. Les routes Node.js continuent d’utiliser les polices TTF vendorisées et le fallback CJK best-effort. Les routes conventionnelles qui sont encore Edge seront alignées sur le runtime et le chargement de polices nécessaires au nouveau rendu.

## Compositions par famille

### Image par défaut

Composition de présentation de PrimeDex : bloc de marque très lisible, promesse du produit, quatre capacités principales et décor de Pokédex pixelisé. L’image doit être immédiatement compréhensible sans connaître le site.

### Pokémon

Panneau partagé avec artwork dans une carte encadrée, numéro Pokédex, nom principal, badges de type et BST. La couleur du type principal pilote un halo et un accent de bordure mesuré. En cas d’échec de données ou d’artwork absent, un fallback de marque conserve la même structure.

### Équipe

En-tête de partage suivi d’une grille de six emplacements. Chaque emplacement affiche l’artwork et le nom lorsqu’il existe, sinon un slot vide clairement identifiable. La synergie est présentée comme indicateur principal dans le bas du panneau, avec les valeurs secondaires limitées aux informations utiles.

### Profil

Carte de dresseur avec nom, niveau, badges, meilleur score de quiz et progression du Pokédex. La progression utilise une barre lisible et un pourcentage explicite. Les valeurs absentes ou invalides retombent sur les valeurs par défaut existantes.

### Résultat de quiz

Score dominant au centre, mode et type de défi sous forme de badges, puis série et badges gagnés en pied de carte. La couleur du défi est utilisée comme accent contrôlé, sans remplacer la palette de marque.

### Carte TCG

Artwork de la carte dans un cadre vertical à gauche, nom et extension à droite, rareté mise en avant comme élément collector. L’absence d’image ou de métadonnées garde le cadre et affiche un fallback stable.

## Données, localisation et compatibilité

- Les paramètres existants (`name`, `code`, `id`, `score`, `total`, `mode`, `challenge`, `streak`, `badges`, `trainer`, `level`, `caught`, `quiz`, `lang`) sont conservés.
- Les labels déjà fournis par `getServerTForLanguage` restent la source des textes localisés.
- `loadOgFonts` reste le point d’entrée unique pour les polices et le fallback CJK.
- Les textes longs sont bornés ou dimensionnés pour éviter les débordements Satori, notamment pour les noms de cartes, les noms de dresseurs et les langues CJK.
- Les images distantes gardent les fallbacks existants afin qu’une réponse API partielle ne rende pas une image invalide.
- `OG_SIZE`, le thème partagé et les URLs exposées à `buildShareMeta` restent les références canoniques.

## Vérification

La refonte sera validée par :

1. inspection des changements pour confirmer que chaque route utilise la même base visuelle ;
2. `npm run lint` ;
3. `npm run typecheck` ;
4. `npm run test -- --run` ;
5. `npm run build` pour vérifier le bundling des polices, des routes Node.js et des images OG ;
6. inspection locale des rendus générés pour l’image par défaut et au moins un exemple Pokémon, équipe, quiz, profil et TCG.

La réussite signifie que les OG sont visuellement unifiées, lisibles en miniature, localisées comme avant et qu’aucune URL de partage existante ne change.
