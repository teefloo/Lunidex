# Lunidex — amélioration visuelle de l’accueil avec ReactBits

**Statut :** design approuvé en conversation ; spécification à relire avant le plan d’implémentation.

## 1. Objectif et périmètre

Donner davantage de dynamisme et de personnalité à l’accueil existant sans modifier sa promesse, son contenu, ses destinations, sa logique de collection ou sa structure fonctionnelle.

La direction retenue est **Living TCG cards** : une interface chaleureuse et tactile, inspirée d’une collection de cartes posée sur une table, avec des accents de console pixel maîtrisés.

Le contenu actuel reste en place : hero collection-first, aperçu de cartes, outils Pokédex/Équipe, parcours en trois étapes, réassurance et FAQ.

### Hors périmètre

- Ajouter des données, des statistiques, des témoignages ou de nouveaux CTA.
- Modifier les traductions, les routes, les métadonnées, le JSON-LD ou les destinations existantes.
- Ajouter un fond WebGL permanent, un curseur animé, un carrousel ou une animation qui tourne en continu.
- Ajouter une dépendance ReactBits au `package.json`.
- Modifier les pages secondaires ou les identifiants techniques historiques.

## 2. Direction visuelle

### Hero et aperçu collection

Le hero conserve sa composition en deux colonnes sur desktop et une colonne sur mobile. Le texte server-rendered reste prioritaire et ne dépend d’aucune animation pour être lisible.

- Conserver l’inclinaison interactive actuelle des cartes TCG.
- Affiner leur glow existant avec un reflet court et discret au survol, sans rendre les cartes décoratives focusables.
- Ajouter une trame pixel quasi transparente derrière l’aperçu, dans les couleurs existantes `primary`, `border` et `card`.
- Garder l’aperçu décoratif `aria-hidden` et son comportement local-first inchangé.

### Outils de jeu

Les deux cartes Pokédex et Équipe deviennent les surfaces ReactBits les plus visibles : une apparition de pixels légère souligne leur bord au survol et lors du focus d’un lien enfant. Les cartes restent entièrement cliquables, lisibles et empilées sur mobile.

### Sections suivantes

Les sections Étapes, Réassurance et FAQ reçoivent uniquement une apparition progressive et courte lorsqu’elles entrent dans la fenêtre. Elles ne changent ni de hauteur ni de disposition. La FAQ reste visuellement calme pour préserver la lisibilité.

## 3. Composants et architecture

Les composants ReactBits sont récupérés via le MCP puis portés localement afin de suivre les conventions TypeScript, le thème Lunidex et les contraintes d’accessibilité du projet.

### `src/components/reactbits/PixelCard.tsx`

Adaptation locale de ReactBits `PixelCard` pour l’effet de pixels au bord des cartes d’outils.

- Props limitées à l’effet utile : `children`, `className`, couleurs, espacement et vitesse.
- Le wrapper ne crée pas de nouvelle cible clavier ; le lien enfant reste la cible interactive.
- Les couleurs par défaut utilisent la palette Lunidex et non les couleurs de démonstration ReactBits.
- Canvas et `ResizeObserver` sont initialisés uniquement côté client.
- En cas d’absence du canvas, de `ResizeObserver` ou d’erreur d’initialisation, les enfants restent rendus avec leur surface CSS normale.
- `prefers-reduced-motion: reduce` désactive l’animation et conserve seulement l’état statique.

### `src/components/reactbits/AnimatedContent.tsx`

Adaptation locale de ReactBits `AnimatedContent` pour les apparitions au scroll.

- Utilise GSAP/ScrollTrigger déjà présents dans le projet ; aucune nouvelle dépendance.
- Le rendu initial reste visible côté serveur ; l’animation est une amélioration après hydratation.
- Les paramètres sont volontairement bornés : déplacement court, opacité douce, une seule lecture par élément, aucun retrait automatique.
- L’effet est désactivé en mode réduction de mouvement.
- Si ScrollTrigger ne peut pas s’initialiser, le contenu reste visible sans erreur utilisateur.

### Composants d’accueil

- `HomeGameTools` reste responsable des traductions, des icônes et des destinations, puis délègue le rendu de chaque tuile à un leaf client dédié pouvant utiliser `PixelCard`.
- `src/components/home/HomeMotionSection.tsx` est le wrapper client qui utilise `AnimatedContent` autour des sections statiques sans déplacer leur logique serveur.
- `HomeCardPreview` conserve son état et ses événements de pointeur actuels ; seule sa couche visuelle de glow est ajustée.
- Les `HomeCollectionEntry`, le store Zustand, l’hydratation et le résolveur de reprise ne changent pas.

## 4. Flux de données et comportement

Le flux fonctionnel reste identique.

1. Les Server Components résolvent la langue, les traductions et les liens comme aujourd’hui.
2. Les leaves clients reçoivent uniquement des primitives déjà calculées : titre, texte, icône, destination et classes.
3. `PixelCard` et `AnimatedContent` ne lisent ni API distante, ni store, ni données TCG.
4. `HomeCollectionPreview` continue de lire uniquement l’état local déjà existant après hydratation.
5. Aucun événement analytics supplémentaire n’est ajouté.

Le contenu, les destinations localisées, le compte facultatif et le fonctionnement sans compte restent inchangés.

## 5. Accessibilité, performance et responsive

- Un seul `h1` et la hiérarchie de titres existante sont conservés.
- Le focus clavier reste visible sur les CTA et les cartes d’outils.
- Aucun effet critique ne dépend du survol ; le contenu et les liens restent utilisables au clavier et au tactile.
- Les effets de pixels et les apparitions respectent `prefers-reduced-motion`.
- Les animations utilisent uniquement `transform` et `opacity` lorsque possible.
- Les canvas ne s’animent qu’en réponse à une interaction ; aucun render loop décoratif permanent n’est ajouté.
- Les dimensions existantes sont conservées pour éviter un CLS supplémentaire.
- Vérification manuelle à 375 px et 1440 px, en thème clair et sombre, avec débordement horizontal absent.

## 6. Gestion des dégradations

Les effets visuels sont non critiques. Toute incapacité d’initialiser un canvas, un `ResizeObserver`, GSAP ou un media query doit produire la surface CSS statique existante, jamais une section vide, un spinner ou une erreur de route.

Le hero et les CTA restent rendus même si le navigateur bloque les animations ou si le stockage local n’est pas accessible. Aucun changement de destination n’est induit par la couche visuelle.

## 7. Vérification

Ajouter ou mettre à jour les tests utiles pour vérifier :

- la présence des deux liens d’outils avec leurs destinations localisées ;
- le rendu des enfants et le fallback statique de `PixelCard` lorsque le canvas n’est pas disponible ;
- le rendu visible initial et le respect de la réduction de mouvement pour `AnimatedContent` ;
- la conservation du comportement et des tests existants de `HomeCollectionPreview`.

Avant de considérer le travail terminé, exécuter depuis la racine :

```bash
npm run lint
npm run typecheck
npm run test -- --run
```

Un contrôle visuel local de l’accueil complètera ces vérifications sur desktop, mobile, clavier et réduction de mouvement.
