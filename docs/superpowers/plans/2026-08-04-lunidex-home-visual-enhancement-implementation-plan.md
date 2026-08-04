# Plan d’implémentation — accueil Lunidex vivant avec ReactBits

**Dépendance :** `docs/superpowers/specs/2026-08-04-lunidex-home-visual-enhancement-design.md` (commit `0c24a01`).

## Garde-fous

- Ne modifier que l’accueil, les nouveaux composants ReactBits locaux, les tests associés et les styles nécessaires.
- Ne pas toucher aux traductions, aux routes, au SEO, au store, au résolveur de collection ou aux identifiants techniques historiques.
- Ne pas ajouter de package : `framer-motion`, `gsap` et `ogl` sont déjà présents ; cette amélioration n’utilise pas `ogl`.
- Ne pas inclure `.superpowers/` ni les artefacts du compagnon visuel dans un commit.
- Vérifier `git status --short` avant chaque staging et utiliser des chemins explicites.

## Étape 1 — Porter le composant ReactBits `PixelCard`

**Fichiers :** `src/components/reactbits/PixelCard.tsx`, `src/components/reactbits/PixelCard.test.tsx`.

1. Porter la base TypeScript de ReactBits `PixelCard` obtenue via le MCP.
2. Réduire l’API à `children`, `className`, `colors`, `gap`, `speed` et `noFocus`.
3. Utiliser la palette Lunidex par défaut : `primary`, `border`, `card` et un ton de contraste lisible.
4. Initialiser canvas, dimensions et `ResizeObserver` uniquement dans un effet client, avec garde contre les APIs absentes.
5. Ne jamais ajouter une nouvelle cible de tabulation au wrapper ; le lien enfant reste la cible clavier.
6. Couper l’animation en `prefers-reduced-motion` et rendre les enfants avec une surface CSS statique si l’initialisation échoue.
7. Tester le rendu des enfants, les options essentielles et le fallback lorsqu’un canvas n’est pas disponible.

**Contrôle :** le composant ne démarre aucun render loop tant qu’il n’est pas survolé ou qu’un lien enfant n’est pas focusé.

## Étape 2 — Porter le reveal ReactBits sans masquer le SSR

**Fichiers :** `src/components/reactbits/AnimatedContent.tsx`, `src/components/home/HomeMotionSection.tsx`, tests associés si nécessaires.

1. Porter le comportement `AnimatedContent` en s’appuyant sur GSAP/ScrollTrigger déjà utilisé par `SplitText`.
2. Garder un rendu initial visible côté serveur ; n’appliquer une opacité ou une translation initiale qu’après hydratation et uniquement si le mouvement est autorisé.
3. Limiter l’API à `children`, `className`, `delay`, `distance`, `direction` et `threshold`.
4. Utiliser `once: true`, des distances courtes et `will-change` uniquement pendant l’animation.
5. Nettoyer le ScrollTrigger à la désinstallation et rendre le contenu sans animation si l’API n’est pas disponible.
6. Créer `HomeMotionSection` comme boundary client réutilisable autour de sections rendues côté serveur.

**Contrôle :** désactiver JavaScript ou la réduction de mouvement ne doit jamais rendre une section invisible.

## Étape 3 — Donner l’effet pixel aux outils de jeu

**Fichiers :** `src/components/home/HomeToolCard.tsx`, `src/components/home/HomeGameTools.tsx`, `src/components/home/HomeToolCard.test.tsx`.

1. Extraire une carte client focalisée qui reçoit `href`, `icon`, `title` et `body` déjà localisés.
2. Rendre le lien existant à l’intérieur de `PixelCard`, en conservant `localeHref`, les libellés, l’icône accessible et les focus rings.
3. Préserver le rendu en deux colonnes sur desktop et l’empilement sur mobile.
4. Ne pas ajouter de bouton, de texte, de statistique ou d’état interactif supplémentaire.
5. Ajouter les tests des deux destinations et de la présence des textes utiles.

**Contrôle :** le DOM de navigation ne contient que les liens Pokédex et Équipe attendus ; le wrapper décoratif ne reçoit pas le focus.

## Étape 4 — Renforcer le hero sans changer son contenu

**Fichiers :** `src/components/home/HomeHero.tsx`, `src/components/home/HomeCardPreview.tsx`, `src/app/globals.css`.

1. Ajouter un hook de style local au hero pour une trame pixel très basse en contraste, non interactive et masquée aux technologies d’assistance.
2. Conserver le pointer tilt, les images, les rotations et l’attribut `aria-hidden` des aperçus TCG.
3. Ajuster le glow existant pour un reflet court, sans nouvelle boucle d’animation ni interaction clavier sur les cartes décoratives.
4. Vérifier les états clair/sombre et la lisibilité des textes sur la trame.
5. Respecter les dimensions et la géométrie existantes pour éviter tout CLS.

**Contrôle :** le hero reste lisible avant hydratation, sans dépendre d’une carte distante supplémentaire ou d’un effet canvas.

## Étape 5 — Appliquer les reveals aux sections calmes

**Fichiers :** `src/app/page.tsx`, éventuellement `src/components/home/HomeCollectionSteps.tsx`, `src/components/home/HomeTrustSection.tsx` et `src/components/layout/HomeFaqSection.tsx` uniquement pour les wrappers de classe.

1. Envelopper `HomeGameTools`, `HomeCollectionSteps`, `HomeTrustSection` et `HomeFaqSection` avec `HomeMotionSection` depuis `src/app/page.tsx`.
2. Utiliser des délais courts et légèrement décalés, sans animation du hero qui retarderait la lecture du LCP.
3. Ne pas modifier l’ordre, le contenu, les IDs sémantiques ou le JSON-LD de la page.

**Contrôle :** comparer le HTML initial et l’état animé pour confirmer que les titres, liens et FAQ restent présents et stables.

## Étape 6 — Tests et validation qualité

1. Exécuter les tests ciblés des composants ReactBits et des outils d’accueil.
2. Exécuter les contrôles racine :

   ```bash
   npm run lint
   npm run typecheck
   npm run test -- --run
   ```

3. Vérifier visuellement l’accueil à 375 px et 1440 px en clair et sombre.
4. Vérifier le clavier, les focus rings, le tactile et `prefers-reduced-motion`.
5. Vérifier l’absence de débordement horizontal, de déplacement de contenu et de boucle d’animation continue.
6. Inspecter `git diff --check` et `git status --short`, puis ne stager que les fichiers applicatifs liés à cette amélioration.

Ce plan n’inclut ni push ni déploiement.
