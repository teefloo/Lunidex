# Lunidex — optimisation mesurée des performances

Les corrections réduisent le JavaScript reçu sur les huit routes, les transactions du cache et les requêtes inutiles des tris Pokémon. Le chargement du Pokédex et le catalogue mobile chaud progressent dans ce protocole ; la première image TCG mobile froide et les performances cloud/terrain restent des limites.

Version 1, campagne locale des 3–4 octobre 2026. Référence Git : `fc1db3a56dfe4f089ba8e458057f70a80c50ca9e`. Les modifications locales sont identifiées individuellement par SHA-256 dans les manifests ; cette référence Git seule ne représente pas les builds mesurés.

## Périmètre et protocole

L’inventaire couvre 59 pages, 52 Route Handlers, 196 frontières client, les dépendances, le core, les caches, les intégrations et les migrations Neon. Les listes et empreintes sont dans [sources-before.json](2026-10-03-performance-evidence/sources-before.json) et [sources-final.json](2026-10-03-performance-evidence/sources-final.json).

Les huit routes mesurées sont l’accueil `/fr`, le Pokédex, Pikachu, le catalogue TCG, la carte `sv03.5-199`, l’équipe, le quiz et le tableau de bord. Chaque version utilise cinq contextes navigateur neufs par route et profil ; chacun produit une navigation à froid puis un rechargement à chaud. Cela représente 160 échantillons par version. Une première version optimisée, conservée comme checkpoint, a été suivie de la correction du démarrage du quiz, du focus de la modale et du clic de pagination avant hydratation ; le protocole complet est rejoué sur la version finale.

| Paramètre | Ordinateur | Mobile |
| --- | --- | --- |
| Fenêtre | 1440 × 900 | 390 × 844 |
| CPU | ×1 | ×4 |
| Réseau | Sans limitation | 200 000 octets/s descendant, 93 750 montant, latence 150 ms |
| Navigateur | Chromium 149.0.7827.55 headless, même exécutable | Identique, émulation mobile |
| Observation | Au moins 15 secondes | Au moins 15 secondes |
| Délai de disponibilité | Maximum 45 secondes | Identique |

Node 22.22.3, npm 10.9.8, Playwright 1.62.1, Next.js 16.3.3, React 19.2.3, TanStack Query 5.90.21. Installation initiale reproductible avec `npm ci` et le lockfile, builds `next build --webpack` dans des copies isolées, serveurs sur les ports 3105/3106/3107. Aucun `.env` ni identifiant cloud n’a été copié. Aucun schéma, endpoint public, format persistant ou dépendance n’a été ajouté.

Context7 a été consulté pour Next.js, TanStack Query et Sentry. Les décisions concernant les frontières et chargements ont été vérifiées contre `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`, les guides locaux de lazy loading et de cache de Next.js 16.3.3. Le modèle de cache existant reste en place.

**Caches séparés.** À froid, le contexte neuf remet à zéro cache HTTP, IndexedDB, localStorage et cookies. À chaud, tous sont conservés pour le rechargement dans le même contexte. Le cache serveur est préchauffé séparément, sans purge : les chiffres ne décrivent donc pas un serveur froid. Le service worker est bloqué pendant les mesures, puis validé dans une campagne fonctionnelle distincte. Les transports de télémétrie sont bloqués par CDP, ce qui conserve le cache HTTP du navigateur.

**Définition des mesures.** TTFB, LCP et CLS proviennent des API navigateur et de `web-vitals`. Les octets JavaScript, CSS, images et polices viennent des requêtes CDP terminées, avec des totaux supplémentaires limités aux quinze premières secondes. Les requêtes inachevées restent comptées séparément : leurs octets en cours ne sont pas assimilés à zéro coût. Les tâches longues sont normalisées aux quinze premières secondes.

Le délai `readinessMs` est un indicateur DOM/image : texte du contenu principal, et première image chargée sur Pokédex/TCG/fiche carte. Il ne prouve pas à lui seul que chaque contrôle est utilisable. Les parcours mesurent donc séparément les actions jusqu’au résultat demandé, et leurs échecs. La réponse visuelle mesurée par deux callbacks `requestAnimationFrame` est un proxy ; l’INP de `web-vitals` reste cumulatif pour le document courant. Les sélecteurs sont pilotés par `selectOption`, dont les événements peuvent être synthétiques : leur délai DOM/proxy visuel n’est pas présenté comme une interaction INP propre. Les clics et touches du parcours alimentent l’INP cumulatif du document. Aucun INP n’est déduit d’un simple chargement. L’INP concerne le prochain affichage après clic, touche ou tap, et ne mesure pas l’arrivée de tous les résultats réseau ; le défilement est également exclu de sa définition. [Définition officielle de l’INP](https://web.dev/articles/inp).

## Causes confirmées et changements

| Constat | Niveau de preuve | Correction |
| --- | --- | --- |
| Une écriture de cache parcourt les clés et, à saturation, ouvre une transaction par entrée ; les écritures concurrentes répètent l’éviction | Code, benchmark réel IndexedDB, tests de concurrence | File sérialisée par module, lots de 100, `getMany`/`setMany`/`delMany`, une lecture des clés par lot |
| Les tris et filtres taille/poids déclenchent le jeu de données détaillé malgré les mesures présentes dans les résumés | Code, requêtes des parcours, comparaison des résultats | `needsDetailedPokemonData` réserve les détails aux propriétés d’espèce et statistiques qui en dépendent |
| L’ajout tardif d’un wrapper MotionConfig remonte les descendants et peut perdre leur état | Test de montage avant/après, échecs de parcours à froid | Provider public de contexte Framer Motion stable, configuration `reducedMotion: 'user'` héritée et mémorisée |
| Des SDK optionnels sont téléchargés dans le parcours critique ou différé même sans configuration | Bundles effectivement téléchargés sur 15 s, code des imports | Sentry chargé à l’émission d’un rapport ; bridges Neon/Sentry/PostHog conditionnels ; chargements indépendants avec `allSettled` |
| Les styles TCG arrivent après le premier rendu et changent la géométrie de la grille | Captures avant/après, CLS | Imports CSS dans le chunk de route/modal ; conservation des styles, images et replis |
| Le premier clic du quiz peut utiliser un index encore absent et afficher à tort un pool vide | Reproduction navigateur, tests avec promesse différée, échecs des parcours baseline | Boutons de démarrage occupés/désactivés jusqu’à disponibilité ; erreur initiale et relance localisées ; cache utilisable après erreur de rafraîchissement |
| Le bouton de pagination SSR reçoit un clic avant le chargement des handlers, sans requête réseau | Probes après DOMContentLoaded/chargement, tests SSR/client et parcours mobile | Bouton indisponible et occupé jusqu’à hydratation du store ; état de pagination conservé |
| La première ouverture de modale tente le focus avant le montage client | Test rouge puis vert et parcours clavier Chromium | Focus et verrouillage du scroll attendent le montage ; retour au lanceur conservé |

Le cache conserve préfixes, timestamps, TTL, lecture périmée autorisée, limite de 500 entrées et miroir localStorage. Le timeout IndexedDB et les replis sans stockage restent opérationnels. La sérialisation est locale au module/onglet ; elle ne constitue pas un verrou transactionnel entre onglets.

La télémétrie conserve filtrage des données sensibles et déduplication. Le flush serveur attend les captures différées avec un budget total borné, et ne charge pas le SDK sur un succès sans rapport en attente. Une défaillance de bridge optionnel ne supprime plus l’enregistrement PWA ou les autres services.

Les états URL du catalogue et les sous-modales sont synchronisés avant le commit pour éviter un rendu intermédiaire périmé. Les signatures d’annulation existantes sont conservées : tests de partage, annulation immédiate et absence de fallback après annulation. Aucune requête partagée n’est annulée globalement.

## Mesures avant/après

Les distributions ci-dessous utilisent cinq passages par groupe ; les crochets désignent Q1–Q3. Les étendues, TTFB, octets CSS/images/polices, requêtes terminées/inachevées et tâches longues sont disponibles pour les 32 groupes dans [load-summary.json](2026-10-03-performance-evidence/load-summary.json). Les [échantillons avant](2026-10-03-performance-evidence/before-runs.ndjson.gz) et [après](2026-10-03-performance-evidence/after-runs.ndjson.gz) conservent chaque ressource et erreur.

### JavaScript effectivement transféré à froid

Ces octets sont identiques dans les cinq répétitions des deux profils pour chaque route. La dispersion est donc nulle pour ce coût. À chaud, le cache HTTP ramène les octets JavaScript transférés à zéro dans les deux versions.

| Route | Avant, octets | Après, octets | Réduction |
| --- | ---: | ---: | ---: |
| Accueil | 607 310 | 331 627 | 45,4 % |
| Pokédex | 716 421 | 537 552 | 25,0 % |
| Pikachu | 814 375 | 600 930 | 26,2 % |
| Catalogue TCG | 706 036 | 520 905 | 26,2 % |
| Fiche carte | 628 478 | 352 796 | 43,9 % |
| Équipe | 774 111 | 468 668 | 39,5 % |
| Quiz | 783 391 | 477 888 | 39,0 % |
| Tableau de bord | 686 613 | 508 344 | 26,0 % |

La baisse mesurée est de 45,4 % sur l’accueil, 25,0 % sur le Pokédex et 39,0 % sur le quiz. Les styles et polices ne sont pas revendiqués comme un gain global : les 31 octets CSS supplémentaires communs correspondent au travail concurrent préservé.

### Chargement, cinq passages par groupe

Toutes les durées sont en millisecondes. Froid/chaud désignent le contexte navigateur ; le cache serveur reste chaud. « Échecs » compte le proxy de disponibilité dépassant 45 s, avant → après.

| Profil | Route | Cache | LCP avant | LCP après | Disponibilité avant | Disponibilité après | Échecs |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Ordinateur | Accueil | Froid | 424 [232–580] | 224 [224–252] | 567 [257–766] | 298 [265–330] | 0 → 0 |
| Ordinateur | Accueil | Chaud | 376 [300–388] | 192 [188–204] | 415 [297–453] | 181 [153–184] | 0 → 0 |
| Ordinateur | Pokédex | Froid | 1 016 [952–1 144] | 716 [692–716] | 1 041 [1 002–1 045] | 747 [738–775] | 0 → 0 |
| Ordinateur | Pokédex | Chaud | 836 [796–860] | 664 [644–704] | 887 [866–912] | 684 [659–697] | 0 → 0 |
| Ordinateur | Pikachu | Froid | 368 [200–380] | 196 [176–200] | 482 [376–577] | 353 [339–370] | 0 → 0 |
| Ordinateur | Pikachu | Chaud | 260 [168–264] | 136 [128–140] | 430 [242–431] | 189 [181–192] | 0 → 0 |
| Ordinateur | Catalogue TCG | Froid | 1 120 [972–1 376] | 684 [672–724] | 751 [664–917] | 691 [680–699] | 0 → 0 |
| Ordinateur | Catalogue TCG | Chaud | 512 [500–688] | 428 [416–428] | 485 [409–709] | 374 [370–385] | 0 → 0 |
| Ordinateur | Fiche carte | Froid | 316 [308–384] | 224 [224–228] | 349 [317–409] | 204 [204–241] | 0 → 0 |
| Ordinateur | Fiche carte | Chaud | 200 [144–204] | 140 [140–140] | 198 [125–202] | 103 [103–105] | 0 → 0 |
| Ordinateur | Équipe | Froid | 204 [168–212] | 156 [132–164] | 250 [231–321] | 213 [203–220] | 0 → 0 |
| Ordinateur | Équipe | Chaud | 92 [92–152] | 116 [116–120] | 105 [104–105] | 106 [103–106] | 0 → 0 |
| Ordinateur | Quiz | Froid | 488 [252–516] | 220 [200–240] | 292 [257–325] | 293 [212–302] | 0 → 0 |
| Ordinateur | Quiz | Chaud | 256 [244–308] | 156 [152–156] | 166 [132–273] | 149 [147–150] | 0 → 0 |
| Ordinateur | Tableau de bord | Froid | 576 [568–608] | 560 [532–564] | 363 [280–491] | 374 [339–451] | 0 → 0 |
| Ordinateur | Tableau de bord | Chaud | 320 [320–332] | 328 [324–328] | 186 [176–188] | 203 [196–203] | 0 → 0 |
| Mobile | Accueil | Froid | 2 568 [2 464–2 576] | 2 472 [2 472–2 476] | 2 615 [2 496–2 642] | 2 511 [2 509–2 515] | 0 → 0 |
| Mobile | Accueil | Chaud | 624 [588–648] | 432 [428–476] | 950 [847–1 016] | 671 [635–703] | 0 → 0 |
| Mobile | Pokédex | Froid | 3 172 [3 160–3 236] | 2 972 [2 912–2 980] | 3 667 [3 636–3 738] | 3 342 [3 241–3 351] | 0 → 0 |
| Mobile | Pokédex | Chaud | 1 084 [1 068–1 316] | 852 [852–948] | 1 549 [1 411–1 586] | 1 310 [1 163–1 359] | 0 → 0 |
| Mobile | Pikachu | Froid | 2 340 [2 336–2 356] | 2 328 [2 328–2 328] | 2 899 [2 856–2 902] | 2 761 [2 758–2 766] | 0 → 0 |
| Mobile | Pikachu | Chaud | 532 [464–544] | 444 [424–444] | 895 [879–941] | 862 [858–864] | 0 → 0 |
| Mobile | Catalogue TCG | Froid | 5 064 [5 024–5 128] | 4 636 [4 624–4 660] | — | — | 5 → 5 |
| Mobile | Catalogue TCG | Chaud | 1 192 [1 116–1 424] | 1 036 [1 004–1 044] | 34 657 [34 412–34 686] | 4 375 [4 299–4 404] | 0 → 0 |
| Mobile | Fiche carte | Froid | 2 612 [2 588–2 664] | 2 552 [2 536–2 572] | 3 019 [2 860–3 111] | 2 807 [2 785–2 810] | 0 → 0 |
| Mobile | Fiche carte | Chaud | 360 [336–392] | 480 [332–484] | 655 [653–660] | 649 [639–650] | 0 → 0 |
| Mobile | Équipe | Froid | 2 256 [2 252–2 256] | 2 184 [2 172–2 192] | 2 424 [2 418–2 436] | 2 336 [2 326–2 346] | 0 → 0 |
| Mobile | Équipe | Chaud | 332 [328–444] | 328 [324–464] | 655 [647–663] | 641 [641–642] | 0 → 0 |
| Mobile | Quiz | Froid | 4 212 [4 208–4 240] | 4 096 [4 092–4 096] | 2 480 [2 476–2 490] | 2 425 [2 403–2 427] | 0 → 0 |
| Mobile | Quiz | Chaud | 812 [804–812] | 744 [744–748] | 676 [672–676] | 647 [646–647] | 0 → 0 |
| Mobile | Tableau de bord | Froid | 4 416 [4 388–4 524] | 4 280 [4 276–4 292] | 2 585 [2 573–2 639] | 2 539 [2 523–2 551] | 0 → 0 |
| Mobile | Tableau de bord | Chaud | 804 [784–1 136] | 772 [768–776] | 662 [657–871] | 635 [634–639] | 0 → 0 |

Le Pokédex froid passe de 1 041 [1 002–1 045] à 747 [738–775] ms sur ordinateur, et de 3 667 [3 636–3 738] à 3 342 [3 241–3 351] ms sur mobile. Le catalogue mobile chaud passe de 34 657 [34 412–34 686] à 4 375 [4 299–4 404] ms sur le proxy texte/première image, soit 87,4 % de baisse médiane. Ce gain concerne ce contexte de rechargement et de chargement d’image.

Le catalogue mobile froid atteint encore le timeout dans les cinq répétitions des deux versions. Le contenu textuel apparaît et le HTTP répond 200, mais la première image de carte reste en cours de transfert. Cette mesure ne signifie pas que tous les contrôles sont inutilisables pendant 45 s ; les parcours explicites utilisent séparément un set TCGdex fixé. Aucune durée de disponibilité réussie n’est inventée pour ces échecs.

| Coût ciblé | Avant, médiane [Q1–Q3] | Après, médiane [Q1–Q3] |
| --- | ---: | ---: |
| CLS catalogue ordinateur froid | 0,100816 [0,093554–0,102005] | 0,000343 [0,000343–0,000343] |
| CLS catalogue mobile froid | 0,073088 [0,073088–0,073088] | 0,051074 [0,051074–0,051074] |
| Durée des tâches longues accueil mobile, 15 s, ms | 953 [928–958] | 338 [336–338] |
| Durée des tâches longues Pokédex mobile, 15 s, ms | 1 283 [1 237–1 339] | 579 [579–618] |

L’import des styles avant affichage stabilise la grille TCG ; le CLS ordinateur froid passe de 0,100816 à 0,000343. Les écarts de LCP de l’équipe et de la fiche carte à chaud, ainsi que ceux du tableau de bord sur ordinateur, sont petits ou dans des distributions qui se recouvrent. Ils ne constituent pas un gain établi. Aucun échantillon de chargement final ne produit d’erreur de page/console ni de réponse principale différente de 200.

### Cache IndexedDB

Benchmark Chromium réel, cinq couples avant/après, 100 écritures concurrentes. Les crochets désignent Q1–Q3 ; tous les résultats bruts figurent dans [cache-benchmark.json](2026-10-03-performance-evidence/cache-benchmark.json).

| Situation | Avant, médiane [Q1–Q3] | Après, médiane [Q1–Q3] | Transactions avant → après |
| --- | --- | --- | --- |
| Cache vide | 48,4 ms [39,5–70,3] | 31,5 ms [22,7–31,9] | 200 → 2 |
| Cache initial de 500 entrées | 3 440,2 ms [3 417–3 454] | 34,2 ms [23,2–40,9] | 60 100 → 4 |

À saturation, le coût médian diminue de 99,0 %, avec des distributions séparées. Le cache final contient 500 entrées au lieu des 400 observées avant correction ; la sentinelle de données utilisateur est préservée dans les cinq couples. À vide, les distributions temporelles se recouvrent : seul le nombre de transactions établit un gain stable. Ces chiffres concernent cette charge contrôlée, pas chaque visite utilisateur.

### Parcours et interactions

Cinq parcours par profil et version produisent 150 observations, dont dix relevés de résultats de tri poids sans chronométrage. Les 21 échecs baseline concernent la pagination mobile, huit démarrages de quiz et leurs huit réponses devenues impossibles. La version finale ne présente aucun échec ni erreur de page/console dans ces parcours. [Distributions complètes](2026-10-03-performance-evidence/journey-summary.json).

Le délai ci-dessous commence avant l’action Playwright et se termine au résultat attendu. Il inclut attente d’activation, debounce, réseau et rendu. Le changement de langue et de vue se terminent à la mise à jour d’URL ; la vue rendue et conservée est vérifiée séparément. La mesure d’équipe partagée commence après la navigation et attend son contenu. Ces délais ne sont pas des INP. Les échecs sont exclus des durées et comptés séparément.

| Profil | Action | Avant, ms [Q1–Q3] | Après, ms [Q1–Q3] | Échecs avant → après |
| --- | --- | ---: | ---: | ---: |
| Ordinateur | Pagination Pokémon | 478 [370–496] | 282 [276–310] | 0 → 0 |
| Ordinateur | Recherche Pokémon | 1 890 [1 848–2 007] | 1 736 [1 574–1 904] | 0 → 0 |
| Ordinateur | Navigation fiche Pokémon | 233 [192–244] | 166 [165–173] | 0 → 0 |
| Ordinateur | Retour Pokédex | 37 [34–42] | 33 [32–33] | 0 → 0 |
| Ordinateur | Tri taille | 600 [598–621] | 418 [414–436] | 0 → 0 |
| Ordinateur | Ouverture modale TCG | 822 [469–837] | 839 [832–840] | 0 → 0 |
| Ordinateur | Fermeture modale, Échap | 32 [28–43] | 44 [34–45] | 0 → 0 |
| Ordinateur | Recherche TCG | 866 [729–870] | 684 [679–778] | 0 → 0 |
| Ordinateur | Langue TCG, URL | 38 [33–63] | 22 [21–24] | 0 → 0 |
| Ordinateur | Extension TCG | 873 [812–1 377] | 810 [809–813] | 0 → 0 |
| Ordinateur | Vue liste TCG, URL | 194 [128–204] | 85 [85–87] | 0 → 0 |
| Ordinateur | Équipe partagée, contenu | 153 [145–220] | 67 [63–80] | 0 → 0 |
| Ordinateur | Démarrage quiz | 1 014 [994–1 035] | 1 542 [1 541–1 552] | 3 → 0 |
| Ordinateur | Réponse quiz | 608 [554–663] | 413 [404–427] | 3 → 0 |
| Mobile | Pagination Pokémon | — | 4 209 [4 193–4 239] | 5 → 0 |
| Mobile | Recherche Pokémon | 2 878 [2 877–3 030] | 2 893 [2 699–3 037] | 0 → 0 |
| Mobile | Navigation fiche Pokémon | 1 748 [1 729–1 850] | 1 710 [1 680–1 715] | 0 → 0 |
| Mobile | Retour Pokédex | 152 [139–194] | 122 [112–130] | 0 → 0 |
| Mobile | Tri taille | 1 574 [1 535–2 238] | 1 314 [1 302–1 326] | 0 → 0 |
| Mobile | Ouverture modale TCG | 1 493 [1 439–1 514] | 1 440 [1 438–1 443] | 0 → 0 |
| Mobile | Fermeture modale, Échap | 120 [100–125] | 102 [95–106] | 0 → 0 |
| Mobile | Recherche TCG | 1 484 [1 424–1 553] | 1 386 [1 375–1 388] | 0 → 0 |
| Mobile | Langue TCG, URL | 826 [815–899] | 1 070 [869–1 118] | 0 → 0 |
| Mobile | Extension TCG | 2 135 [2 092–2 201] | 2 026 [2 021–2 088] | 0 → 0 |
| Mobile | Vue liste TCG, URL | 1 235 [1 234–1 257] | 1 233 [1 229–1 236] | 0 → 0 |
| Mobile | Équipe partagée, contenu | 1 434 [1 400–1 614] | 1 354 [1 331–1 355] | 0 → 0 |
| Mobile | Démarrage quiz | — | 1 842 [1 808–3 365] | 5 → 0 |
| Mobile | Réponse quiz | — | 476 [459–476] | 5 → 0 |

Le tri taille ne déclenche plus les requêtes détaillées, soit une médiane de huit requêtes et environ 144 ko évités dans chacun des profils. Les vingt comparaisons avant/après des résultats taille/poids sont identiques. Sur ordinateur, la pagination passe de 478 [370–496] à 282 [276–310] ms, et la navigation vers une fiche de 233 [192–244] à 166 [165–173] ms. Sur mobile, le gain de pagination est la fiabilité de cinq actions sur cinq ; aucune accélération ne peut être calculée contre zéro succès baseline. Le démarrage du quiz attend désormais les données et réussit systématiquement, ce qui rend sa durée incomparable aux seuls deux succès baseline.

La mise à jour de vue TCG sur ordinateur passe de 194 [128–204] à 85 [85–87] ms ; l’INP cumulatif de ce document passe de 184 [168–192] à 104 [104–104] ms. Sur mobile, le délai de résultat de vue reste à environ 1 233 ms, malgré une baisse du proxy visuel de 102,1 à 71,5 ms. L’INP cumulatif mobile de 360 [304–376] à 280 [248–320] ms a des quartiles qui se recouvrent. Il ne démontre ni un gain par action ni un gain terrain.

La recherche Pokémon mobile et l’ouverture de modale ne montrent pas d’accélération établie. Le changement de langue mobile vers l’URL française est plus lent en médiane, 826 → 1 070 ms ; ses quartiles et étendues se recouvrent. Cet écart reste à isoler sur une charge contrôlée et ne doit pas être masqué par les gains de bundle. La simulation de réponses inversées ne montre pas de résultat périmé écrasant la langue choisie.

### Défilement

Cinq fenêtres de 15 s par profil et version sur le set fixé `sv03.5`, soit vingt observations supplémentaires, passent sans erreur. Le coût des tâches longues mobile passe de 242 [239–242] à 161 [161–162] ms ; leur nombre médian passe de quatre à trois. Le percentile 95 des intervalles rAF reste à 18,5 ms. Sur ordinateur, aucune tâche longue n’est observée dans ces fenêtres et le percentile 95 reste proche de 18,1–18,2 ms. Aucun gain de fluidité d’écran ou d’INP n’est déduit de ces intervalles. [Distributions du défilement](2026-10-03-performance-evidence/scroll-summary.json).

Les traces CPU Chrome du tri taille avant/après sont conservées avec les résultats bruts. Les requêtes de détails évitées constituent un coût démontré même si un temps d’affichage varie dans la dispersion. Les comparaisons portent sur les vingt premiers résultats nommés de chaque tri ; les liens annexes du contenu principal sont exclus.

## Validation

| Contrôle | Résultat final |
| --- | --- |
| Lint | Réussi, sources web/core et scripts de mesure |
| TypeScript web | Réussi |
| Vitest | 111 fichiers, 535 tests réussis |
| Contrôle SEO | Réussi, huit locales |
| Build de production | Réussi avec Node 22 et webpack ; 307 pages statiques générées |
| TypeScript core | Réussi |
| `git diff --check` | Réussi |
| Parcours avant/après | 150 observations par version ; 21 échecs avant, zéro après |
| HTTP/SEO navigateur | 123 requêtes, huit locales et six simulations réussies |
| Défilement | Vingt observations avant/après, zéro échec |

Les [journaux et codes de sortie](2026-10-03-performance-evidence/checks/results.json) correspondent au workspace actuel et au build de livraison isolé. La campagne de [validation navigateur](2026-10-03-performance-evidence/validation/validation.json) et les chronométrages utilisent le snapshot final gelé. Le build de livraison incorpore aussi les trois fichiers concurrents de cache `/docs/api` ; aucune source runtime des optimisations mesurées ne diffère de ce snapshot. Deux captures supplémentaires de la modale sur le build de livraison confirment la disposition et le focus sur ordinateur/mobile. [Vérification de la modale](2026-10-03-performance-evidence/validation/modal-delivery.json). La première tentative de build de livraison n’a pas pu résoudre `fonts.googleapis.com` dans le sandbox ; le build a ensuite réussi avec l’accès réseau nécessaire aux polices. Les contrôles ne constituent pas une validation exhaustive de conformité WCAG ni des performances Neon réelles.

Les tests ciblés couvrent les besoins de données de dix propriétés d’espèce/statistiques, les tailles/poids et replis, la capacité/expiration/isolation/erreurs du cache, les écritures concurrentes, les captures Sentry différées, le timeout de flush, les bridges indépendants, la conservation des montages, l’hydratation du quiz et du focus, ainsi que l’annulation/déduplication TCG.

Les simulations Neon utilisent exclusivement des mocks : lecture retardée liée au propriétaire, absence de configuration, panne `NeonDbError` et limitation 429 avant SQL. Les tests d’authentification couvrent aussi les réponses temporairement indisponibles et sessions expirées. Les scénarios TCG 429/503 vérifient que l’échec reste relançable et n’enregistre pas un catalogue vide ; un résultat périmé autorisé reste disponible.

La campagne HTTP vérifie toutes les pages restantes avec fixtures, les huit routes critiques dans les huit langues, les réponses indisponibles attendues des API et les sorties SEO publiques. Les profils absents et produits sans base disponible peuvent légitimement répondre 404/503 ; ce n’est pas une validation d’un compte cloud réel. Les contrôles navigateur alternent thèmes, largeurs 320/390/1440 et animations réduites ; ils couvrent aussi clavier/modale, vue conservée, stockage indisponible, langue TCG avec réponses inversées, navigation avant fin des chargements, partie locale terminée et PWA/offline.

## Audit complémentaire et limites

**Serveur.** Les catalogues possèdent déjà caches, déduplication et données SSR. La fiche Pokémon attend en parallèle espèce, localisation, rencontres et forme après son détail critique. Ce coût reste confirmé par le code, mais son impact avec un cache serveur froid n’a pas été isolé ici. Aucun déplacement spéculatif sous Suspense n’est appliqué au contenu indexable. Un prochain essai peut simuler indépendamment ces données secondaires et comparer le contenu utile et le HTML SEO.

**Neon.** Les lectures de `user_state` sont liées au propriétaire et bornées à une ligne ; la réponse est privée et non stockable. Les mutations de snapshots ont une limite de 2 Mo et une vérification de version. La liste de relations amicales ordonne les résultats sans pagination explicite : candidat à mesurer sur une volumétrie simulée réaliste. Aucun EXPLAIN, débit cloud réel, index ou migration n’a été exécuté. Les performances cloud ne sont donc pas établies par cette campagne.

**Images.** Pour la carte TCGdex `sv03.5-199` affichée à 300 px, low (245 × 337) transfère 17 149 octets, high (600 × 825) 57 875 ; une carte officielle distincte du set anniversaire (660 × 920) transfère 1 048 920. La variante low rend le texte moins lisible ; elle n’est pas retenue. La qualité des détails et tous les replis sont conservés. Cette comparaison n’établit pas l’existence d’une variante compressée équivalente de la carte officielle ; ces trois images ne constituent pas une moyenne du catalogue. [Capture comparative](2026-10-03-performance-evidence/image-sample.png).

**Rendus et ressources.** Les abonnements Zustand globaux de la modale, du comparateur et de la wishlist restent des candidats, sans coût profilé suffisant pour un refactoring. Les polices existantes et leurs préchargements n’ont pas été changés. Les ressources réellement téléchargées sont dans les données brutes ; aucune réduction de taille de paquet installé n’est confondue avec le JavaScript reçu par le navigateur.

**Limites de laboratoire.** Cinq répétitions donnent une médiane, quartiles et étendue, sans preuve de significativité générale. Les deux profils de chargement s’exécutent simultanément sur la même machine ; ce n’est pas un appareil mobile physique ni une machine dédiée. Les CDN/API externes peuvent varier, les caches serveur sont chauds, et les intervalles sont séparés dans le temps. Les petits écarts de TTFB/LCP ne sont pas présentés comme des gains. Les échecs à 45 s restent explicites et ne deviennent pas des durées fictives de succès. Les parcours baseline ont croisé la fin de contrôles/builds locaux : ne pas attribuer leurs variations temporelles fines à une seule correction.

La copie mesurée est gelée : les ajouts concurrents ultérieurs de cache public sur `/docs/api` dans `next.config.ts`/`proxy.ts` ne changent aucune des huit routes chronométrées et restent distincts dans le manifest du workspace. Les modifications concurrentes de `globals.css`, du menu mobile, de `next.config.ts`, du proxy, de la fiche objet GraphQL et du fichier généré `next-env.d.ts` sont préservées. Elles ne sont pas revendiquées comme optimisations de cette campagne. Leurs différences entre snapshots sont documentées dans les empreintes et l’archive de restauration baseline. Les réglages PWA générés dans le dépôt n’ont pas été modifiés par les builds de cette campagne.

### Site public, contexte distinct

Un passage PageSpeed public sur `/fr` donne mobile 78 (LCP 5,6 s, CLS 0, TBT 60 ms) et ordinateur 90 (LCP 1,0 s, CLS 0, TBT 230 ms). Ce sont des instantanés du site déployé, pas une comparaison des changements locaux. [Résultat brut](2026-10-03-performance-evidence/pagespeed-public.json).

Le connecteur CrUX renvoie 403 car son projet API n’est pas activé. Il n’est donc pas possible de conclure à un manque de trafic ni de fournir un gain terrain. L’ancien champ FID des résultats PageSpeed ne constitue pas un INP. [Statut CrUX](2026-10-03-performance-evidence/crux-status.json).

## Prochaines optimisations, impact estimé

| Priorité | Candidat | Mesure nécessaire avant changement |
| --- | --- | --- |
| Haute | Images officielles lourdes du catalogue sur mobile froid | Variantes/compression à qualité équivalente, requêtes simultanées et premier affichage ; conserver les replis |
| Haute | Première image du catalogue mobile froid au-delà de 45 s | Profil réseau de chaque fournisseur, stratégie de chargement visible et qualité, essais de débits réalistes |
| Moyenne | Attentes secondaires des fiches sur cache serveur froid | Latences injectées, TTFB/contenu utile/SEO avant et après Suspense ciblé |
| Moyenne | Abonnements Zustand larges et transformations TCG | Profil React avec mutations locales réalistes, identité des sélecteurs et conservation des états |
| Moyenne | Grande liste d’amis et snapshots volumineux | Fixtures volumétriques, coût sérialisation/transfert et pagination avant toute intervention cloud |
| Faible à confirmer | Polices/styles restants et préchargements | Couverture CSS, requêtes effectivement utiles et lisibilité avant réduction |

Ces priorités sont des estimations ; aucun gain chiffré n’est attribué à une optimisation non réalisée.

## Reproduction et preuves

Les scripts `performance-audit.mjs`, `performance-journeys.mjs`, `performance-summary.mjs`, `performance-journey-summary.mjs`, `performance-cache-benchmark.mjs`, `performance-scroll.mjs`, `performance-validation.mjs` et `performance-inventory.mjs` sont dans `scripts/`. Ils ne font pas partie du bundle de l’application et n’ajoutent pas de dépendance.

Créer une copie isolée des sources sans `.env`, `.next`, `node_modules`, `.git`, `tmp` ou sorties PWA générées, utiliser Node 22 et `npm ci`, puis `npm run build` et `npm run start -- --port 3105`. Restaurer les fichiers de [baseline-changed-sources.tar.gz](2026-10-03-performance-evidence/baseline-changed-sources.tar.gz) sur la version finale pour retrouver les sources baseline ; la liste est dans [baseline-restoration.json](2026-10-03-performance-evidence/baseline-restoration.json). Les nouvelles suites ciblent les corrections et ne doivent pas être interprétées comme une suite baseline inchangée.

Avec une installation existante de Playwright et l’exécutable Chromium correspondant, définir `LUNIDEX_PLAYWRIGHT_MODULE` et `LUNIDEX_CHROMIUM_PATH`, puis :

```bash
node scripts/performance-audit.mjs --base http://localhost:3105 --output tmp/perf-before
node scripts/performance-audit.mjs --base http://localhost:3107 --output tmp/perf-after
node scripts/performance-summary.mjs --before tmp/perf-before/runs.ndjson --after tmp/perf-after/runs.ndjson --output tmp/load-summary.json
node scripts/performance-journeys.mjs --base http://localhost:3105 --output tmp/journeys-before
node scripts/performance-journeys.mjs --base http://localhost:3107 --output tmp/journeys-after
node scripts/performance-journey-summary.mjs --before tmp/journeys-before/runs.ndjson --after tmp/journeys-after/runs.ndjson --output tmp/journey-summary.json
node scripts/performance-scroll.mjs --base http://localhost:3105 --output tmp/scroll-before
node scripts/performance-scroll.mjs --base http://localhost:3107 --output tmp/scroll-after
node scripts/performance-validation.mjs --base http://localhost:3107 --output tmp/validation
node scripts/performance-cache-benchmark.mjs --before tmp/sources-before --after . --base http://localhost:3107 --output tmp/cache-benchmark
```

Chaque sortie doit être neuve. Conserver les mêmes paramètres, versions et conditions de cache. Les mesures brutes sont compressées sans perte dans `2026-10-03-performance-evidence/`, accompagnées des paramètres, profils CPU, captures et distributions. `SHA256SUMS` permet de contrôler leur intégrité. Les empreintes de [sources-workspace.json](2026-10-03-performance-evidence/sources-workspace.json) et [sources-delivery-build.json](2026-10-03-performance-evidence/sources-delivery-build.json) identifient les sources de livraison. Les caches ignorés de Graphify sont exclus de ces deux manifests. Les préflights à instrumentation invalide ou sélecteur incorrect et le parcours optimisé interrompu avant correction de la pagination sont exclus des comparaisons finales. Le parcours partiel reste conservé comme preuve de diagnostic. Les copies de sources restent sous `tmp/performance-audit-20261003/` ; les installations et caches webpack de ces copies sont nettoyés après validation pour rendre l’espace disque. Aucun push, déploiement, message, migration, compte réel ou écriture externe n’a été réalisé.
