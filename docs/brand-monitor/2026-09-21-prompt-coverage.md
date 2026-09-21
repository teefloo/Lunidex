# Couverture des 28 intentions BrandMonitor

Date de revue : 2026-09-21. Cette matrice distingue les sujets contrôlables dans le site des preuves qui dépendent d’acteurs externes. « Couvert » signifie que Lunidex possède une page, une réponse ou une limite explicitement documentée ; cela ne signifie pas qu’un moteur de recherche ou un agent doit reprendre la formulation.

| # | Intention / prompt | URL cible | Problème initial | Modification | Validation | Statut final |
|---:|---|---|---|---|---|---|
| 1 | free Pokémon card collection tracker | `/guides/pokemon-card-collection-tracker` | Gratuité et périmètre peu explicites | Renforcement de la page pilier et faits vérifiables | H1, FAQ, facts cards, JSON-LD | Couvert |
| 2 | Pokémon card collection app | `/guides/pokemon-card-collection-tracker` | Page pilier à mieux différencier d’une marketplace | Réponse directe sur le workspace et ses limites | Guide EN/FR + fallback `noindex` | Couvert |
| 3 | track cards without a spreadsheet | `/guides/pokemon-card-collection-tracker` | Démarrage et absence de tableur non formulés | Ajout du workflow de démarrage et du fact card associé | Contenu pilier dans les 8 langues | Couvert |
| 4 | Pokémon card scanner | — | Capacité absente, risque de créer une page mince ou trompeuse | Aucune page dédiée ; absence documentée dans FAQ et matrices | Contrôle SEO des allégations | Dépendance produit externe |
| 5 | Pokémon card collection value | `/guides/pokemon-card-collection-value` | Prix et estimation mélangés à une promesse de valorisation | Nouveau guide sur les estimations conditionnelles et leurs limites | Sources, evidence rows, FAQ, route 200 à crawler | Couvert |
| 6 | sealed Pokémon products, profit and ROI | `/guides/pokemon-card-collection-value` + `/tcg/sealed` | Portfolio scellé difficile à distinguer d’une page publique | Distinction entre guide public et portfolio privé lié au compte | Liens internes et limite d’accès | Couvert |
| 7 | Pokémon card price history from Cardmarket | `/guides/pokemon-card-collection-value` | Fraîcheur et provenance des prix insuffisamment visibles | Source, horodatage, snapshots conditionnels et limites | Sources Cardmarket officielles dans le registre | Couvert |
| 8 | Pokémon card value appraisal | `/guides/pokemon-card-collection-value` | Risque d’allégation d’expertise | Encadré explicite : estimation, pas authentification ni expertise | FAQ et evidence row `marketLimits` | Couvert |
| 9 | best Pokémon collection app recommendations | — | Une recommandation communautaire ne peut pas être fabriquée sur le site | Aucun faux avis ni schéma AggregateRating | Plan hors site uniquement | Dépendance d’autorité externe |
| 10 | Lunidex vs Cardmarket | `/compare/lunidex-vs-cardmarket` | Comparaison absente | Nouvelle comparaison marketplace vs workspace | Sources officielles Cardmarket + matrice complète | Couvert |
| 11 | Lunidex vs PokéCardex | `/compare/lunidex-vs-pokecardex-zebradex` | Matrice TCG incomplète | Ajout wishlist, Pokédex, équipe, open source et limites | EN/FR et contrôle des 12 lignes | Couvert |
| 12 | Lunidex vs ZebraDex | `/compare/lunidex-vs-pokecardex-zebradex` | Dimensions comparées trop limitées | Matrice commune et distinction de périmètre | Test `COMPARISON_ROW_KEYS` | Couvert |
| 13 | Lunidex vs Collectr | `/compare/lunidex-vs-collectr` | Comparaison non homogène | Extension de la même matrice TCG | EN/FR et validation des 12 lignes | Couvert |
| 14 | Lunidex vs Pokellector | `/compare/lunidex-vs-pokellector` | Comparaison non homogène | Extension de la même matrice TCG | EN/FR et validation des 12 lignes | Couvert |
| 15 | Lunidex vs Cardzia | `/compare/lunidex-vs-cardzia` | Comparaison non homogène | Extension de la même matrice TCG | EN/FR et validation des 12 lignes | Couvert |
| 16 | free online Pokémon Pokédex | `/guides/pokemon-reference` | Guide trop générique par rapport à l’intention | Repositionnement vers Pokédex Pokémon gratuit en ligne | Titre, H1 et meta EN/FR | Couvert |
| 17 | Pokémon team builder | `/guides/team-builder-guide` | Intention générique partagée avec un guide secondaire | Réservation de l’intention au guide détaillé | Titre, intro et liens internes | Couvert |
| 18 | Pokémon team preparation workflow | `/guides/team-tools` | Guide secondaire trop proche du team builder | Repositionnement vers préparation, arbitrage et vérification | Titre, meta et intro EN/FR | Couvert |
| 19 | Pokémon type coverage and shared weaknesses | `/team` + `/guides/team-builder-guide` | Explication dispersée | Maillage vers le guide détaillé et distinction outil/guide | Routes et liens connexes | Couvert |
| 20 | Pokémon TCG card database and catalog | `/tcg` | Catalogue et collection insuffisamment séparés | Périmètre TCG, source TCGdex et conditions publiques précisés | FAQ, About et guide pilier | Couvert |
| 21 | Pokémon card wishlist | `/tcg/wishlist` | Wishlist peu reliée aux guides | Liens depuis le guide valeur et FAQ | Navigation interne | Couvert |
| 22 | Pokémon TCG deck builder | `/tcg/deck-builder` | Fonction mentionnée sans contexte de compte | Liens et conditions de workspace clarifiés | FAQ et routes TCG | Couvert |
| 23 | offline Pokémon collection tracker | `/offline` + `/guides/pokemon-card-collection-tracker` | Offline confondu avec base complète hors connexion | Limite du cache et des nouvelles données explicitée | FAQ, guide pilier et PWA copy | Couvert |
| 24 | sync Pokémon collection across devices | `/guides/account-and-sync` | Synchronisation présentée sans condition réelle | Neon/session/configuration et compte requis explicités | Guide compte + FAQ | Couvert |
| 25 | install Lunidex as a PWA | `/faq` + `/about` | PWA noyée dans des messages génériques | Réponses directes et limites stores documentées | FAQ/About dans 8 langues | Couvert |
| 26 | Lunidex open source GitHub | `/about` + `/llms.txt` | Entité créateur et source peu reliées | Person, Organization, GitHub vérifié et liens visibles | JSON-LD + About + agents files | Couvert |
| 27 | Lunidex mobile app on App Store or Google Play | — | Le dépôt mobile pourrait être interprété comme une publication | Aucune revendication de disponibilité ; limite FAQ/About | Contrôle des fichiers agents et SEO | Dépendance produit externe |
| 28 | Pokémon card reviews and community recommendations | — | Aucun corpus d’avis tiers vérifiable dans le site | Aucun faux témoignage, note ou profil externe ajouté | Plan d’autorité sans publication automatique | Dépendance d’autorité externe |

Les quatre dépendances externes restantes sont intentionnelles : scanner, présence dans les stores, avis et recommandations communautaires. Elles ne sont pas converties en pages dédiées tant qu’une capacité ou une preuve vérifiable n’existe pas.
