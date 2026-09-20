# Gestion des échanges de produits scellés

## Contexte

L’onglet Scellé de Lunidex est un portefeuille privé piloté par Neon. Les
transactions sont la source de vérité : le ledger partagé les rejoue dans
l’ordre chronologique pour reconstruire les lots, les positions, les coûts,
les ventes et les valorisations. Un achat crée un lot financé en espèces ; une
vente consomme un ou plusieurs lots selon FIFO ou une allocation manuelle.

Le besoin est d’ajouter un troisième type de transaction, « échange », qui
reste une opération unique et traçable. Exemple : donner une ETB ME04 et
recevoir une ETB ME03 doit diminuer la position ME04, créer ou augmenter la
position ME03, transférer le coût d’acquisition et ne créer aucun mouvement de
trésorerie.

## Décision d’architecture

Une transaction d’échange sera stockée comme une seule ligne dans
`tcg_sealed_transactions`, avec :

- la jambe reçue réutilisant les champs communs `cardmarket_product_id`,
  `language` et `quantity` ;
- une jambe donnée explicite dans des colonnes `exchange_give_*` ;
- `selections` et `allocation_method` représentant les lots consommés du
  produit donné ;
- tous les champs monétaires à zéro.

Le type partagé devient `buy | sell | exchange`. La jambe donnée sera exposée
dans TypeScript sous la forme d’un objet `exchangeGive`, afin que l’API et l’UI
ne manipulent pas des colonnes SQL directement.

Cette forme conserve la compatibilité des achats et ventes existants, évite de
présenter un échange comme deux opérations artificielles et permet de réutiliser
le mécanisme de replay, de révision, d’audit et d’annulation déjà en place.

Les autres options ne sont pas retenues : deux transactions liées
achat/vente fausseraient les métriques espèces, tandis qu’une table d’échanges
distincte imposerait un second flux de replay et une refonte plus large sans
bénéfice nécessaire pour cette première version.

## Règles métier et comptables

### Validation

- `exchangeGive` est obligatoire pour `exchange` et interdit pour `buy` et
  `sell`.
- Les deux produits, les deux langues et les deux quantités sont validés.
- Les quantités sont des entiers strictement positifs et bornés par la limite
  existante.
- Le produit donné doit exister dans le catalogue et être possédé à la date de
  l’échange, après replay des événements antérieurs.
- Une quantité donnée supérieure au stock disponible est rejetée.
- FIFO est le mode par défaut ; l’allocation manuelle doit totaliser exactement
  la quantité donnée et ne peut sélectionner que des lots compatibles.
- Les champs `unitPriceCents`, `feesCents`, `shippingCents`, `discountCents`,
  `paymentFeesCents` et `otherCostsCents` valent zéro pour un échange.
- Les dates futures, les identifiants invalides et les valeurs nulles ou
  négatives restent refusés.

### Replay du ledger

Pour un échange actif et non annulé :

1. le ledger consomme les lots du produit donné avec la même logique FIFO ou
   manuelle qu’une vente ;
2. il calcule le coût total des unités données à partir du coût historique des
   lots, jamais à partir du prix de marché courant ;
3. il diminue la quantité et le coût de la position donnée ;
4. il crée un lot de réception avec la quantité reçue et le coût total transféré
   (ou augmente la position correspondante si elle existe déjà) ;
5. il enregistre l’opération comme échange, sans vente, encaissement, achat,
   dépense, frais ni plus-value réalisée.

Ainsi, donner deux unités coûtant 20 € pour recevoir une unité transfère 20 € à
la nouvelle unité ; recevoir deux unités transfère 10 € à chacune via le coût
total du lot. La valeur de marché de la réception continue d’être calculée par
les snapshots Cardmarket normaux.

Les compteurs spécifiques d’entrées/sorties par échange seront conservés dans
les positions et totaux pour rendre le mouvement observable, mais les compteurs
existants `bought`, `sold`, `spentCents`, `grossSalesCents`, `netSalesCents` et
`realizedCents` ne seront pas modifiés par un échange. Le cashflow ignorera un
échange au lieu de le classer implicitement comme une vente.

### Modification et annulation

Une modification remplace la version de la même ligne puis rejoue tout le
ledger. Une annulation conserve l’événement d’audit mais le marque `voided`,
ce qui retire ses deux jambes du replay. Les allocations dérivées sont
recalculées dans la même transaction SQL que la mise à jour de révision ; une
erreur de validation ou de replay intervient avant toute écriture métier.

## Persistance et API

Une migration additive `0006_tcg_sealed_exchanges.sql` :

- étendra la contrainte `kind` à `exchange` ;
- ajoutera `exchange_give_product_id`, `exchange_give_language` et
  `exchange_give_quantity` avec leurs contraintes et références catalogue ;
- interdira les champs d’échange sur les achats/ventes et imposera les champs
  monétaires nuls sur les échanges ;
- ajoutera l’index produit donné nécessaire aux recherches par produit.

Aucune migration destructive ni exécution contre une base de production ne sera
effectuée.

Les mappings serveur, la normalisation des drafts, les insertions/mises à jour,
les recherches par produit, le chargement du portefeuille et l’export CSV/JSON
seront étendus. Le chargement d’un détail produit inclura aussi les produits de
la jambe donnée afin que son historique reste lisible même si ce produit n’est
plus en stock.

Le tableau d’allocations existant restera la projection dérivée des événements
sortants. Pour les échanges, l’identifiant d’échange sera utilisé dans sa clé
`sale_id` historique, sans modifier les données sources ni supprimer les
allocations de ventes existantes.

## Interface

Le formulaire actuel conservera son style et son fonctionnement pour Achat et
Vente, et ajoutera Échange dans le sélecteur de type.

Pour un échange :

- « Je donne » proposera uniquement les produits réellement possédés, avec une
  langue et une quantité disponibles ;
- « Je reçois » proposera le catalogue scellé existant ;
- les quantités et langues seront séparées pour chaque jambe ;
- les champs monétaires seront remplacés par un résumé explicite et une note
  indiquant que le coût historique est transféré sans flux d’argent ;
- un résumé avant validation affichera la forme `quantité × produit → quantité
  × produit`.

L’édition et l’annulation utiliseront les mutations existantes et invalideront
les mêmes queries. Le journal, le détail produit et les exports afficheront les
deux côtés de l’échange. Les libellés seront ajoutés aux huit locales supportées
(`en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`).

Les composants resteront SSR-safe, utiliseront les sélecteurs et helpers
existants, éviteront les fetches ad hoc et ne créeront pas de nouveau cache
client. Les listes de produits nécessaires au formulaire seront chargées en
parallèle quand elles sont indépendantes.

## Tests et vérification

Le cycle TDD commencera par des tests rouges du ledger et des helpers purs,
puis l’implémentation minimale et le refactoring sous tests verts.

La couverture minimale sera :

1. échange simple 1 contre 1 ;
2. quantités données et reçues différentes ;
3. produit reçu déjà possédé ;
4. produit reçu absent ;
5. stock donné insuffisant ;
6. achats et ventes inchangés ;
7. coût, valorisation, cashflow et statistiques financières cohérents ;
8. libellé d’historique des deux jambes ;
9. modification et annulation ;
10. absence d’état partiellement appliqué après erreur.

Les vérifications finales seront celles disponibles dans le dépôt : tests
Vitest ciblés puis suite complète, lint, typecheck web, typecheck core,
typecheck mobile et build. Si l’environnement Neon permet de lancer
l’application, le parcours sera aussi vérifié dans le navigateur : ouverture de
Scellé, création d’un échange, possessions avant/après, historique, métriques,
achat/vente et erreurs console/réseau. L’absence de configuration Neon sera
rapportée comme limite d’intégration plutôt que masquée.

## Limites volontairement conservées

- aucune gestion de soulte ou de paiement complémentaire ;
- aucun changement rétroactif du coût en fonction d’un prix de marché futur ;
- aucun renommage des identifiants historiques `primedex` ou des clés de
  compatibilité ;
- aucun changement général de design ou de navigation hors du formulaire et de
  l’historique nécessaires.
