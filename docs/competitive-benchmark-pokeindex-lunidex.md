# Benchmark concurrentiel : Pokéindex et Lunidex

**Observation réalisée le 24 septembre 2026.** Ce rapport distingue les éléments visibles dans les parcours publics, les affirmations de Pokéindex sur ses propres données, et les caractéristiques vérifiées dans le code de Lunidex. Les chiffres de prix sont des instantanés d’écran, pas des cotations actuelles.

## Synthèse

Pokéindex sert mieux une décision d’achat immédiate : on part d’un produit ou d’une carte et l’on voit rapidement les prix repérés sur plusieurs marketplaces, une fourchette, une évolution et parfois un écart au prix de lancement. Son observatoire, son calendrier et ses taux de drop élargissent aussi le parcours au-delà du suivi de collection.

Lunidex est plus fort comme espace de collection et de travail TCG : catalogue de cartes localisé en huit langues, avancement par série, suivi des variantes, construction de decks et registre des produits scellés avec achats, ventes, frais et calcul FIFO. Cette profondeur est cependant répartie entre plusieurs écrans. Les prix TCGdex ne sont pas des offres de vente vérifiées et leur provenance ou leur fraîcheur n’étaient pas assez visibles.

La meilleure adaptation est de rapprocher la donnée de prix de la décision qu’elle sert : afficher source, devise, horodatage et méthode, donner une estimation partielle des cartes manquantes, puis présenter le marché scellé public comme un guide de prix Cardmarket clairement distinct d’offres disponibles à l’achat. C’est ce qui est en cours dans le code. Le calendrier fiable, les alertes et l’EV de boosters restent bloqués par des dépendances de données et de livraison, et ne doivent pas être simulés avec des données TCGdex qui ne les contiennent pas.

## Méthode et périmètre

- Inspection du dépôt, des routes, des consignes locales et des modèles de collection/prix de Lunidex.
- Navigation interactive directe sur les pages publiques de Pokéindex : accueil, recherche, marché de produits, fiche produit, calendrier, taux de drop, méthodologie, observatoire et collection.
- Parcours équivalent dans Lunidex : catalogue TCG, fiche carte, vues et routes de collection, portefeuille scellé et nouveau marché scellé public.
- Aucun compte créé, aucune donnée personnelle saisie et aucun achat effectué. La collection Pokéindex étant derrière une connexion, son fonctionnement après authentification n’a pas été évalué.
- Le catalogue de cartes Lunidex a été observé avec le filtre de langue TCG française. Le marché scellé local a fini par afficher ses produits et prix après la compilation froide de sa route API. La recherche, la pagination, l’état vide et l’erreur API ont aussi été vérifiés dans le navigateur.

## Parcours Pokéindex réellement testés

| Parcours | Observation directe | Ce que cela permet de décider |
|---|---|---|
| Accueil et navigation | La navigation sépare Dashboard, collection, marché, produits, cartes, sorties, taux de drop, guides, tarifs, recherche et méthodologie. L’accueil met en avant des prix comparés, des offres, les prochaines sorties et les taux. | On voit vite que l’outil couvre à la fois achat, suivi et recherche d’information. La navigation nomme les intentions plutôt que les seules entités. |
| Recherche « Pikachu » | La recherche interroge cartes et produits. La page annonçait 25 244 cartes et 333 produits ; la requête montrait plus de 300 cartes et 2 produits. Les résultats associent nom, série, numéro et rareté. | Une seule recherche sert de point d’entrée transversal, même si une requête populaire produit beaucoup de résultats. |
| Marché de produits et fiche ETB « 30 ans » | Le catalogue présente séries, filtres de période et courbes. Sur la fiche consultée, les prix visibles étaient notamment Vinted 150 €, Cardmarket 159,90 €, eBay 182,70 € et Leboncoin 190 €. La page présentait aussi un plus bas quotidien de 150 €, un prix retail de 55,99 € et une évolution depuis la sortie. L’accès aux annonces d’origine était soumis à connexion. | La comparaison rend immédiatement visible l’écart entre plateformes et la différence entre prix retail et prix observé. Le meilleur prix affiché n’est pas, à lui seul, une recommandation d’achat : frais, état et disponibilité doivent être contrôlés. |
| Calendrier | La page indiquait 59 produits sur 11 mois, une mise à jour au 24 septembre 2026, la source Pokécardex et une mise à jour manuelle. Certains produits futurs étaient explicitement « À confirmer » ; une section listait aussi des sorties françaises potentielles. | La date, la région et l’incertitude sont exposées. Cela rend le calendrier utile malgré des dates provisoires. |
| Taux de drop | La page regroupait 39 extensions, 51 raretés et 3 blocs. Elle indiquait des tailles d’échantillon comme 4 063 boosters pour 30th Celebration et 8 500 pour Chaos Ascendant, avec des intervalles de confiance pour certaines estimations. J’ai aussi vu des blocs avec un badge générique « Fiable » mais « Échantillon N.C. ». L’EV affichée pour Évolutions à Paldea était 2,20 € contre 5,99 € le booster, évaluée avec Cardmarket France au moment du calcul. | Les ratios et l’échantillon rendent la donnée plus interprétable que le seul pourcentage. Les cas sans taille d’échantillon montrent qu’un badge de confiance global ne suffit pas à qualifier chaque résultat. |
| Méthodologie | Pokéindex déclare scanner quotidiennement Cardmarket, eBay, Vinted et Leboncoin, valider manuellement les annonces et conserver environ 65 % des résultats. La page précise que les doublons/anomalies sont filtrés, que l’état exact ne peut pas être inspecté, que les ventes privées sont absentes et que les frais annexes ne sont pas tous couverts. | Les limites importantes sont accessibles et attachées au calcul. Ces informations restent les déclarations du site, pas un audit indépendant du pipeline. |
| Collection et observatoire de cartes | La collection renvoie à la connexion. L’observatoire présente navigation par série et onglets de synthèse : valeur totale, top cartes, distribution et meilleur prix français. Les boutons d’onglets testés n’ont pas modifié visiblement le contenu pendant ce parcours ; leur fonctionnement complet n’est donc pas confirmé. | La valeur totale et la distribution promettent une lecture portefeuille utile, mais le parcours connecté et une partie de l’interaction n’ont pas pu être validés. |

Les pages publiques consultées : [accueil](https://www.pokeindex.fr/), [recherche](https://www.pokeindex.fr/recherche), [marché des produits](https://www.pokeindex.fr/analyse/produits), [fiche ETB 30 ans](https://www.pokeindex.fr/produit/etb-30-ans), [calendrier](https://www.pokeindex.fr/calendrier-sorties), [taux de drop](https://www.pokeindex.fr/taux-de-drop), [méthodologie](https://www.pokeindex.fr/methodologie), [observatoire cartes](https://www.pokeindex.fr/cartes), [collection](https://www.pokeindex.fr/ma-collection).

## Comparatif des parcours

| Besoin | Pokéindex | Lunidex observé / dans le code | Évaluation |
|---|---|---|---|
| Trouver une carte | Recherche transversale cartes + produits et grand volume de résultats par requête. | Catalogue de cartes avec recherche, tri, choix de série et filtres ; les fiches sont accessibles. Le parcours observé était centré cartes. | Pokéindex est plus transversal ; Lunidex garde une bonne navigation catalogue et relie mieux les résultats au suivi de collection. Un point de recherche commun produits/cartes serait utile si la pertinence reste lisible. |
| Comparer des prix de produits scellés | Quatre marketplaces déclarées, prix plancher, historique et écart au retail ; les annonces détaillées sont parfois premium ou derrière connexion. | Le portefeuille existant suit produits, inventaire, achats/ventes, frais, cashflow et valorisation Cardmarket. Une route de marché public Cardmarket a été ajoutée, mais son catalogue n’a pas pu être validé visuellement dans cette session. | Pokéindex mène mieux de la question « où acheter / à quel prix ? ». Lunidex est plus complet pour « qu’est-ce que je possède et combien m’a coûté mon stock ? ». Le guide de prix Lunidex doit signaler qu’il ne fournit pas des annonces actives multi-marchés. |
| Comprendre un prix de carte | L’offre est contextualisée dans un ensemble marché et méthode, avec limites de normalisation annoncées. | La fiche Lunidex fournit une valeur résolue à partir de TCGdex. Avant les changements en cours, la provenance et l’horodatage de la cotation n’étaient pas visibles près du montant. TCGdex expose des prix par fournisseur ; le champ `updated` de la carte n’est pas l’horodatage de prix. | Pokéindex explique mieux la nature de sa donnée de marché. Lunidex peut dépasser son niveau de transparence en montrant le fournisseur et l’horodatage effectif de la cotation, sans les remplacer par la date de mise à jour de la carte. |
| Compléter une série | La collection commercialise valorisation et ROI de cartes et produits scellés, mais le détail connecté n’a pas été testé. | Le suivi Lunidex calcule les cartes possédées et manquantes par série. L’estimation existante était centrée sur les valeurs possédées ; le code en cours ajoute une estimation partielle des cartes manquantes et son taux de couverture. | L’estimation d’un panier manquant est une extension directe du checklist et aide à planifier. Elle doit rester un repère, jamais un prix final de panier : une copie par identifiant, condition et livraison non prises en compte, devises séparées. |
| Explorer les séries et sorties | Calendrier éditorial, indicateurs de marché, taux d’ouverture et observatoire par série, avec incertitudes parfois visibles. | Le catalogue Lunidex utilise TCGdex et enrichit les extensions avec leurs dates de sortie. `getAllSets` filtre les ensembles sans cartes retournées et n’est pas un flux de produits futurs. Lunidex dispose aussi de pages éditoriales autour des sorties. | Pokéindex est meilleur pour planifier les produits à venir et comparer des signaux de marché. Les extensions TCGdex seules ne permettent pas de reproduire un calendrier de produits scellés fiable. |
| Gérer du scellé | L’outil met l’accent sur la découverte d’offres, le suivi marché et la valeur de collection. | Le registre Lunidex est plus opérationnel : transactions, quantités, prix d’entrée/sortie, frais et expéditions, méthodes d’allocation et analyses de portefeuille. | Lunidex est plus fort sur la comptabilité personnelle du stock. Une vue commune cartes + scellé peut résumer les deux patrimoines, mais ne doit pas laisser croire qu’un booster complète une carte manquante. |
| Langues | Le produit observé est principalement orienté marché français. | Lunidex propose les langues d’interface EN, FR, ES, DE, IT, JA, KO et ZH, et sépare langue d’interface et langue de carte. | Lunidex est mieux adapté aux collections multilingues et aux utilisateurs internationaux. |

## Où Pokéindex est objectivement meilleur

1. **Décision d’achat plus directe.** Dans une fiche produit, prix de plusieurs plateformes, plus bas observé, prix retail, historique et bouton vers les sources sont réunis. Lunidex suit bien une position déjà acquise, mais son portefeuille n’équivaut pas à un comparateur d’annonces.
2. **Meilleure qualification de certaines données.** La méthodologie décrit les sources, le filtrage, la cadence déclarée et des exclusions concrètes. Pour les taux, un nombre de boosters et une plage de confiance donnent du contexte absent d’un ratio seul.
3. **Meilleure couverture des questions pré-achat et à venir.** Calendrier de produits, dates provisoires, alertes mentionnées, guide de taux et calcul d’EV forment des raisons de revenir avant une sortie ou une ouverture.
4. **Entrée de recherche plus large.** La recherche unifiée évite de choisir d’abord entre cartes et produits. Son volume élevé implique toutefois de bons filtres et un affichage des catégories clair.

Ces avantages reposent en partie sur un corpus propriétaire et des annonces de méthode. Les prix de marketplaces sont instantanés, les annonces sources ne sont pas toujours ouvertes sans compte, et le pipeline n’a pas été audité indépendamment.

## Où Lunidex est déjà meilleur ou plus complet

- **Localisation et langue de carte** : huit langues d’interface et distinction du langage de carte, plutôt qu’une expérience principalement centrée sur le marché français.
- **Collection actionnable** : catalogue relié au suivi d’avancement et aux cartes manquantes ; le modèle de collection est local-first. L’accès personnel connecté de Pokéindex n’a pas été vérifié.
- **Comptabilité du scellé** : le code du portefeuille traite transactions, coûts et frais, ventes, cashflow et valorisation au niveau des positions. La page marché de Pokéindex aide à acheter, mais le parcours public observé ne remplaçait pas ce registre.
- **Séparation des catégories et des sources** : Lunidex peut afficher séparément Cardmarket EUR et TCGplayer USD, au lieu de mélanger des montants convertis à partir d’hypothèses cachées.
- **Parcours produit intégré** : la collection, les séries, les fiches, le deck builder et le scellé vivent dans un même espace TCG. Le potentiel est de relier les objectifs sans confondre leurs unités.

## Roadmap recommandée

Les éléments marqués **en cours dans le dépôt** sont déjà présents dans le working tree au moment de la rédaction. Ils nécessitent encore les contrôles de fin de tour et, pour le marché scellé, une validation avec un catalogue backend disponible.

### P0 — Clarté et confiance sur les prix

**Problème.** Une valeur seule ne permet pas de savoir qui l’a fournie, quand, ni si elle correspond à une offre achetable.

**Preuve.** Pokéindex juxtapose plateformes et explique sa méthode. Sur Lunidex, la valeur de carte résolue à partir de TCGdex était affichée sans provenance ni date source.

**Proposition.** Afficher fournisseur, horodatage fournisseur et devise sur chaque valeur ; expliciter le choix de prix utilisé et la différence entre cotation de guide, instantané stocké et offre active. Montrer la date réelle du dernier point d’historique.

**État.** **En cours dans le dépôt** : `TCGCardValue` conserve fournisseur et `updated` de la source ; les fiches exposent le timestamp si fourni et une méthode/limites dépliables ; l’historique indique le dernier snapshot enregistré et explique qu’il est capturé à la demande, sans promettre la cadence du fournisseur. Les textes sont localisés dans les huit langues.

**Bénéfice attendu.** Éviter les fausses impressions de fraîcheur et permettre de comparer des montants dont la source et la devise sont compréhensibles.

**Effort.** Moyen. **Dépendances / risques.** Certaines sources n’ont pas de timestamp ; dans ce cas l’interface doit le dire. Ne pas substituer `card.updated` à l’horodatage de prix.

### P0 — Donner un budget de complétion honnête

**Problème.** Le progrès de collection indique ce qui manque, mais ne répond pas directement à « quel ordre de grandeur pour finir cette série ? ».

**Preuve.** Pokéindex met en avant valeur et ROI de la collection ; le checklist Lunidex possède déjà les identifiants des cartes manquantes et peut calculer une estimation sans nouvel écran de marché.

**Proposition.** Calculer une copie par carte manquante, afficher combien ont une valeur, présenter un total partiel par fournisseur/devise et indiquer que condition, frais, livraison et taxes ne sont pas inclus.

**État.** **En cours dans le dépôt** : estimation partielle par série, couverture chiffrée, exclusions visibles et devises non converties automatiquement.

**Bénéfice attendu.** Transformer un indicateur de progression en aide à la planification sans présenter le total comme un devis.

**Effort.** Faible à moyen. **Dépendances / risques.** Couverture de prix parfois basse ; les cartes absentes du catalogue de prix doivent rester exclues du total et être comptées séparément.

### P1 — Marché scellé public, avec limites clairement énoncées

**Problème.** Le registre scellé est conçu pour suivre son propre stock ; il manque un point d’entrée public pour consulter la valeur guide d’un produit avant de l’ajouter.

**Preuve.** Sur Pokéindex, une fiche ETB reliait valeur, historique, retail et plateformes. Lunidex avait déjà un catalogue scellé privé/authentifié et une valorisation Cardmarket du stock.

**Proposition.** Ajouter une recherche publique et paginée de produits scellés avec dernières valeurs Cardmarket disponibles, date de synchronisation et accès à la fiche/portefeuille. Nommer cela « guide de prix » et non « offres » tant qu’il n’y a pas de liens d’annonces actives.

**État.** **Présent et vérifié dans le dépôt** : route publique de catalogue, recherche, pagination, métadonnées et traductions. Le chargement initial affiche 24 produits et prix ; la recherche `151` produit trois pages, la page suivante fonctionne et une recherche sans résultat affiche l’état vide localisé.

**Bénéfice attendu.** Rapprocher découverte et suivi, sans réclamer une connexion pour lire un catalogue public.

**Effort.** Moyen. **Dépendances / risques.** Endpoint Neon et catalogue/instantanés de prix synchronisés ; état indisponible et délais doivent être testés avec la base configurée avant de considérer la fonctionnalité livrée.

### P1 — Réunir les objectifs cartes et scellé sans les confondre

**Problème.** Les actifs et objectifs cartes/scellé sont dans des parcours distincts, alors qu’un collectionneur peut suivre les deux.

**Preuve.** Pokéindex dit couvrir cartes et produits dans sa collection ; Lunidex a un checklist de cartes et un ledger scellé séparé.

**Proposition.** Créer une synthèse commune avec deux sections, « cartes » et « scellé », chacune avec son avancement, sa couverture de prix, sa devise et sa source. Permettre de relier un produit à une série comme raccourci d’exploration, sans compter le contenu probabiliste d’un booster comme une carte possédée.

**Bénéfice attendu.** Donner une vue portefeuille et objectifs cohérente tout en gardant des calculs compréhensibles.

**Effort.** Moyen à élevé. **Dépendances / risques.** Définir une notion de valeur comparable, traiter variantes et lots, et ne pas additionner EUR et USD sans conversion explicite.

### P1 — Calendrier de sorties seulement avec provenance maintenue

**Problème.** Lunidex ne dispose pas d’un flux unique de produits scellés futurs avec marchés et régions.

**Preuve.** Pokéindex affichait 59 produits sur 11 mois, source Pokécardex, mise à jour manuelle et dates « À confirmer ». TCGdex décrit surtout les cartes et séries publiées, pas un calendrier exhaustif de produits futurs. Les annonces officielles Pokémon sont distribuées par actualités et pages produit.

**Proposition.** Avant de développer un calendrier, choisir une source publique maintenable et autorisée, un responsable éditorial, les régions couvertes et une politique d’incertitude. N’afficher que les sorties avec source et date de vérification ; conserver « à confirmer » comme état séparé.

**Bénéfice attendu.** Aider à planifier les achats sans fabriquer une complétude ou une précision inexistantes.

**Effort.** Élevé. **Dépendances / risques.** Source et droits de réutilisation, actualisation régulière, produits/régions et fiabilité des dates. **Pas implémenté** faute de flux fiable établi.

### P1 — Alertes de prix avec cadence réellement assurée

**Problème.** Une alerte n’a de valeur que si les prix sont réévalués et la notification est livrée.

**Preuve.** Pokéindex propose un parcours d’alertes/calendrier ; dans Lunidex, l’API d’alertes prix est désactivée (`PRICE_ALERTS_ENABLED = false`) car le sender planifié n’utilise pas encore le chiffrement Web Push requis. L’historique carte ne capture un point qu’à la demande.

**Proposition.** D’abord garantir une tâche de rafraîchissement/polling observée et des horodatages ; ensuite activer des seuils opt-in, fréquence et canal explicites, contrôle de consentement, retrait simple et gestion d’échecs. Ne pas annoncer d’alertes en temps réel si les prix ne sont pas rafraîchis à ce rythme.

**Bénéfice attendu.** Une notification exploitable, sans fausse promesse de fraîcheur ni envoi non sollicité.

**Effort.** Élevé. **Dépendances / risques.** Scheduler, chiffrement Web Push conforme, abonnement/révocation, cadence des fournisseurs, consentement. **Pas implémenté** et ne pas réactiver l’endpoint actuel avant ces prérequis.

### P2 — Odds et EV de boosters, uniquement avec échantillons documentés

**Problème.** Une valeur attendue de booster attire l’attention mais devient trompeuse sans distribution, taille d’échantillon et prix de marché.

**Preuve.** Pokéindex affichait des tailles d’échantillons et intervalles pour certaines raretés, mais certains blocs n’avaient pas d’échantillon précisé. L’EV affichée était datée et basée sur le Cardmarket France au calcul. TCGdex fournit associations cartes/boosters, pas les probabilités d’ouverture.

**Proposition.** Ne faire le calcul que pour les extensions disposant d’un jeu de données documenté (nombre d’ouvertures, version/date, règles de comptage, rareté/slots, prix par devise et intervalle). Si la donnée manque, afficher « non disponible » plutôt qu’une estimation calculée à partir des seules cartes associées à un booster.

**Bénéfice attendu.** Informer sur l’incertitude et réduire les décisions basées sur une moyenne fragile.

**Effort.** Élevé. **Dépendances / risques.** Source/licence, collecte et validation des échantillons, variation par langue, région, composition et prix. **Pas implémenté** : aucune probabilité exploitable n’a été trouvée dans la couche TCGdex de Lunidex.

### P2 — Recherche transversale et découverte

**Problème.** Les parcours cartes et produits scellés sont séparés.

**Preuve.** La recherche Pokéindex retournait simultanément cartes et produits. Le catalogue Lunidex rend les cartes faciles à filtrer par série, mais la recherche scellée relève d’un autre écran et de sa propre source.

**Proposition.** Ajouter un sélecteur de type de résultat ou une recherche globale segmentée en « Cartes » et « Produits scellés », avec filtres propres à chaque type et résultats sans mélange de prix/devises.

**Bénéfice attendu.** Trouver rapidement un article quand l’utilisateur ne sait pas encore dans quel catalogue il se trouve.

**Effort.** Moyen. **Dépendances / risques.** Indexer les deux sources, maintenir la latence et séparer les attributs spécifiques plutôt que d’aplatir la carte et le produit.

## Propositions ambitieuses pour dépasser la comparaison de prix

1. **Plan de complétion sous budget.** Partir des cartes manquantes, choisir une enveloppe et trier les achats par couverture de série, disponibilité de prix et coût estimé. Le moteur peut suggérer une liste de cartes prioritaires, tout en gardant les produits scellés dans une voie « ouverture aléatoire » distincte.
2. **Tableau de bord à confiance explicite.** Pour chaque position : valeur guide, source, date, devise, couverture et intervalle si disponible. L’utilisateur peut alors séparer « valeur connue », « estimation ancienne » et « non valorisé » au lieu de recevoir un total opaque.
3. **Comparaison de décisions, pas seulement de prix.** Une vue côte à côte « acheter les cartes manquantes » / « acheter un produit scellé » ne devrait apparaître que quand les probabilités, frais et prix ont des sources suffisantes ; sinon elle montre les données manquantes et laisse le choix à l’utilisateur.
4. **Alertes opt-in par objectif de collection.** Une alerte peut porter sur une carte manquante ou un produit suivi, avec le seuil, la devise, la source et la date du dernier contrôle affichés dans la notification. Cela relie le retour régulier à un objectif utilisateur, plutôt qu’à un flux de deals générique.

## Changements d’implémentation présents dans le working tree

- Ajout du fournisseur et de la date de prix source aux valeurs de carte lorsque le fournisseur transmet cette date ; ajout sur les fiches de carte de la source, de son horodatage et d’une explication de la méthode/limites.
- Correction de la formulation sur l’historique : la capture Lunidex est à la demande et limitée côté enregistrement ; ce n’est pas une promesse que TCGPlayer ou Cardmarket actualisent leurs prix toutes les six heures.
- Ajout à la page d’une série d’une estimation partielle du coût des cartes manquantes, d’un compteur de couverture et d’un total distinct par source et devise, avec limites visibles.
- Ajout d’une route et d’une page de catalogue public de produits scellés adossées aux données Neon/Cardmarket, avec recherche, pagination, métadonnées, navigation et traductions dans les huit langues.
- Ajout des informations de couverture et de devise aux valorisations de collection.

Le contrôle du marché local a montré que la route API renvoie bien les données : le premier appel de recherche a répondu en HTTP 200 après 4,1 minutes, dont 4 minutes de compilation Next.js et 4,6 secondes de traitement API. Après chauffe, le catalogue, la recherche et la pagination s’affichent. Un 503 simulé dans l’onglet de test affiche le message d’erreur localisé et le bouton « Réessayer ». Chrome n’a relevé aucune erreur JavaScript ; l’avertissement d’hydratation observé cite l’attribut `ap-style` injecté par une extension. L’exception `next/image` du navigateur intégré n’a pas été reproduite dans Chrome et n’a pas motivé de patch applicatif.

Vérifications : `npm run lint` et `npm run typecheck` terminent avec le code 0 ; `git diff --check` est propre. Le lint global est resté silencieux pendant environ une minute avant de terminer normalement ; l’interruption précédente était manuelle, sans diagnostic d’échec.

## Limites de l’analyse

- Un seul jour d’observation ; les prix, dates, annonces et compteurs Pokéindex évoluent.
- Les méthodologies et chiffres de Pokéindex sont des déclarations du site. L’échantillon d’annonces et la qualité réelle de chaque offre n’ont pas fait l’objet d’un audit externe.
- La collection connectée, les alertes après création, les destinations premium et l’expérience authentifiée n’ont pas été parcourues.
- Le catalogue de cartes Lunidex a été exploré ; l’état personnel de collection et les données privées n’ont pas été manipulés.
- Le temps de compilation froide du serveur de développement peut retarder l’affichage du marché de plusieurs minutes ; cette mesure concerne le mode développement local. L’erreur 503 a été simulée pour vérifier l’interface, pas provoquée par une panne réelle de Neon.
- Aucun test mobile dédié n’a été réalisé.
- L’explorateur de cartes Pokéindex a chargé, mais le changement d’onglets n’a pas produit de transition visible pendant l’essai.
- Les pages officielles Pokémon sont des annonces produit au fil de l’actualité, et TCGdex est une API de cartes/extensions. Leur consultation ne met pas en évidence un flux officiel exhaustif des prochaines sorties scellées françaises.

## Sources de référence

- Pokéindex : [Méthodologie](https://www.pokeindex.fr/methodologie), [Taux de drop](https://www.pokeindex.fr/taux-de-drop), [Calendrier](https://www.pokeindex.fr/calendrier-sorties).
- TCGdex : [Référence de carte](https://tcgdex.dev/es/reference/card), [API des séries](https://tcgdex.dev/rest/sets).
- Pokémon officiel : [Pokémon TCG : annonces du 30e anniversaire](https://www.pokemon.com/us/news/the-pokemon-tcg-is-celebrating-30-years-with-special-worldwide-releases), [actualités Pokémon](https://www.pokemon.com/us/pokemon-news).
