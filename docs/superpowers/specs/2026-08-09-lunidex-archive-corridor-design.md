# Lunidex Archive Corridor

## Direction

La landing devient un voyage continu dans **The Lunidex Index**. Un renderer Three.js persistant accompagne le scroll natif à travers quatre chapitres, tandis que le contenu produit reste dans le DOM pour l’accessibilité, le SEO et le fallback.

Le monde utilise une palette graphite, une lumière froide de profondeur et l’accent corail existant de Lunidex. Les cartes, les artworks Pokémon et les previews de produit restent des éléments réels du projet. Le canvas ajoute la spatialité, les cadres d’archive, les lignes d’index et les transitions de lumière, sans devenir une illustration décorative autonome.

## Chapitres

| Chapitre | Compréhension | Landmark Three.js | Contenu DOM |
| --- | --- | --- | --- |
| Threshold | Lunidex réunit cartes, Pokémon et équipes | Index core, cadres flottants | H1, promesse, CTA collection et Pokédex |
| Collection | Chaque carte trouve sa place | Card vault, rail de progression | Preview TCG réelle et progression locale |
| Pokédex | Toute l’information Pokémon est au même endroit | Scan aperture, constellation de données | Pokémon, types, statistiques et évolutions |
| Team Builder | Une équipe se construit par équilibre | Six-node team constellation | Six slots, types, faiblesses et couverture |
| Departure | Le parcours commence avec l’utilisateur | Core qui se disperse dans le brouillard | CTA final et FAQ accessible |

Les chapitres sont déclarés dans une ledger unique. Les valeurs exactes et l’état lissé sont partagés par la caméra, la lumière et les attributs DOM. Le scroll reste réversible et n’est jamais remplacé par un scroll hijack.

## Architecture

```text
Home page
  HomeHeader
  HomeExperience
    semantic chapter sections
    LunidexWorldCanvas (dynamic client leaf)
    chapter-specific product previews
  existing SiteFooter
```

Le renderer crée un seul `THREE.Scene`, une seule caméra et un seul `WebGLRenderer`. Les groupes `environment`, `landmarks`, `chapterSets`, `interactives` et `atmosphere` restent stables pendant le trajet. Les objets sont peu nombreux, géométriques et frustum-culled.

Three.js est chargé côté client et rendu uniquement quand le canvas est visible. Le DPR est plafonné, les particules sont très limitées et le renderer est suspendu hors écran, dans un onglet caché, en cas de contexte WebGL perdu ou sous `prefers-reduced-motion`.

## Motion

- Intro : fade et translation courte du DOM, sans bloquer le H1 ou les CTA.
- Scroll : `ScrollTrigger` écrit une progression cible dans un ref partagé ; le renderer applique une interpolation exponentielle.
- Camera : position et cible sont interpolées par chapitres, avec des endpoints mobiles dédiés.
- World : lumière, fog, opacité des groupes et échelle des landmarks suivent la même progression.
- Headings : reveals mot par mot, une fois par chapitre, avec fallback SSR visible.
- Pointer : parallax très faible sur la caméra et glow local sur les cards, uniquement pointeur fin.
- Réduction de mouvement : rendu statique sur l’endpoint du chapitre, aucun loop ambiant et aucun blur/stagger.

## Asset and product rules

- Réutiliser les composants de collection et le résolveur local existants.
- Ne pas précharger la grille Pokédex ni le catalogue TCG complet depuis la landing.
- Utiliser des IDs et valeurs réellement disponibles dans le store ou des exemples explicitement présentés comme tels.
- Les liens restent localisés avec les helpers existants.
- Les textes, métadonnées et FAQ restent synchronisés dans les huit langues.

## Validation

La vérification couvrira le build, le lint, le typecheck, les tests, les routes localisées, le clavier, le fallback WebGL, `prefers-reduced-motion`, les vues 1440×900, 768×1024 et 390×844, le scroll avant/arrière, le contexte d’onglet caché et l’absence de fuite de renderer, listeners ou RAF.
