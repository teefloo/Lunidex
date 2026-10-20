# Audit QA et UX de Lunidex TCG en production

- **Date :** 20 octobre 2026
- **Environnement :** production, [lunidex.app](https://lunidex.app)
- **Périmètre principal :** toutes les routes de l’espace `/tcg` découvertes dans l’application, avec lecture seule de `/friends` pour vérifier le parcours social lié aux decks et collections.

**Résultat :** 20 parcours consignés; 20 ont été ouverts ou exercés au moins partiellement. Sept anomalies P2 et une anomalie P3 confirmées. Aucun P0 ou P1. Une action sociale a été volontairement bloquée pour éviter une notification ou une divulgation à un tiers.

## 1. Résumé exécutif

Les parcours fondamentaux fonctionnent dans les conditions testées : recherche et filtrage de cartes, consultation de fiches, ajout/retrait d’exemplaires, création de classeur et de deck, suivi d’achats, transactions de produits scellés et consultation du marché. Les mutations temporaires ont persisté après actualisation, puis ont été supprimées ou annulées par l’interface.

Les défauts les plus urgents concernent l’accès et la compréhension des commandes : un bouton de suggestion de wishlist annonce une suppression alors qu’il ajoute la carte; le bouton de wishlist d’une fiche ne communique pas son état aux technologies d’assistance; le bouton de comparaison est recouvert par la navigation fixe à 768 px. S’ajoutent des libellés anglais dans des pages françaises, des résultats de deck identiques pour un lecteur d’écran, une navigation TCG coupée sur petits écrans et un état de synchronisation privé qui a persisté longtemps sur plusieurs accès directs.

Le portefeuille scellé est revenu sans position active et avec un solde nul. Trois événements de test annulés demeurent dans le journal d’audit; l’application a confirmé qu’ils sont conservés. Cette trace ne pouvait pas être supprimée depuis l’interface.

### Bilan des défauts

| Priorité | Anomalies confirmées | Portée |
|---|---:|---|
| P0 | 0 | Aucune corruption ou indisponibilité critique observée |
| P1 | 0 | Aucun parcours majeur entièrement inutilisable |
| P2 | 7 | Cohérence, accessibilité et fiabilité perçue |
| P3 | 1 | Indication visuelle de défilement sur téléphone |

## 2. Périmètre, environnement et méthode

- Navigation réelle dans l’application de production avec l’automatisation Playwright disponible dans cette session. Authentification avec le compte de test configuré localement; aucun identifiant ni secret n’a été copié dans ce rapport, une capture ou un fichier de preuve.
- Viewports simulés : desktop 1200 × 792 et 1440 × 900; tablette 768 × 1024; téléphones 390 × 844 et 320 × 568 pixels CSS. Il s’agit d’émulation de navigateur, pas d’appareils physiques. `navigator.maxTouchPoints` indiquait l’absence de matériel tactile.
- Clics, navigation directe, retour navigateur, actualisation, recherche, filtres, tris, formulaires, fermeture au clavier avec Échap, persistance après rechargement et vérification des états finaux ont été exercés selon le parcours. L’automatisation ne reproduit pas fidèlement le toucher, les gestes de balayage ni le changement d’orientation sur appareil réel.
- Les erreurs de console visibles dans les parcours usuels : aucune erreur JavaScript observée. Quelques avertissements ont été présents. Les requêtes applicatives consultées répondaient; les appels 410 provoqués par des sondes directes vers des chemins API non pris en charge ne sont pas attribués à l’application et ne sont pas comptés comme défauts.
- Une mesure Lighthouse/PageSpeed mobile unique a été relevée pour `/fr/tcg`. Les tentatives multi-passes et desktop ont expiré; la requête aux données CrUX a été refusée par l’API. Les résultats laboratoire ne représentent donc pas des données terrain ni une mesure stable.
- Aucun code applicatif n’a été modifié et aucun déploiement, partage, paiement ou contact tiers n’a été déclenché.

## 3. Cartographie des fonctionnalités découvertes

### Routes TCG

| Route | Fonctionnalités relevées |
|---|---|
| `/tcg` | Catalogue, recherche, filtres avancés, tri, sélection de langue, pagination incrémentale, affichage des cartes, comparaison |
| `/tcg/start` | Démarrage d’une collection et recherche d’extensions à ajouter |
| `/tcg/collection` | Vue d’ensemble, collections par extension ou classeurs personnalisés, statistiques, recherche et tri |
| `/tcg/collection/[language]` | Écran de résolution/attribution de la langue d’une collection historique |
| `/tcg/collection/[language]/[setId]` | Album d’extension, progression, exemplaires et variantes, filtres, ajout/retrait |
| `/tcg/collection/custom/[collectionId]` | Détail d’un classeur personnalisé et gestion de ses cartes |
| `/tcg/cards/[id]` | Fiche carte, modal interceptée depuis le catalogue, collection, wishlist, partage, comparaison, organiseur et lien Cardmarket |
| `/tcg/sets/[setId]` | Détail d’une extension et liste de cartes |
| `/tcg/illustrators/[artist]` | Catalogue par illustrateur et pagination |
| `/tcg/wishlist` | Suggestions liées aux extensions en cours, wishlist manuelle, tri et copie de lien |
| `/tcg/investments` | Achats de cartes, quantités, coût, estimation manuelle et statistiques |
| `/tcg/deck-builder` | Création/suppression de decks, recherche et ajout de cartes, limites de deck |
| `/tcg/pull-rates` | Informations de taux de tirage et états de données disponibles/indisponibles |
| `/tcg/booster-value` | Estimation de valeur d’ouverture et disponibilité de l’échantillon |
| `/tcg/sealed` | Tableau de bord du portefeuille de produits scellés |
| `/tcg/sealed/collection` | Stock possédé et valorisation |
| `/tcg/sealed/journal` | Journal des opérations et annulations |
| `/tcg/sealed/sales` | Vue des ventes |
| `/tcg/sealed/cashflow` | Flux de trésorerie |
| `/tcg/sealed/analytics` | Analyses du portefeuille |
| `/tcg/sealed/catalogue` | Catalogue produit du portefeuille |
| `/tcg/sealed/sources` | Sources de données et statut de synchronisation |
| `/tcg/sealed/market` | Marché public, recherche et catégories |
| `/tcg/sealed/market/[id]` | Détail produit public |
| `/tcg/sealed/market/products/[id]` | Alias de détail produit également vérifié |
| `/tcg/sealed/releases` | Sorties et calendrier public |
| `/tcg/sealed/buy-safely` | Conseils d’achat et sources |

Les sous-vues privées du portefeuille sont rendues sous la route catch-all `/tcg/sealed/[[...view]]`. Les routes testées sont `/`, `collection`, `journal`, `sales`, `cashflow`, `analytics`, `catalogue` et `sources` sous `/tcg/sealed`.

### Parcours transversaux et limites de découverte

- Navigation TCG entre catalogue, outils, collection, wishlist, investissements et scellés; menu global « Plus » également utilisé comme voie alternative vers les destinations masquées sur téléphone.
- Filtres conservés dans l’URL, retour du navigateur depuis une fiche modale, fermeture par Échap, partage de fiche par copie dans le presse-papiers et ouverture de données de comparaison.
- `/friends` expose l’ajout d’ami, demandes reçues/envoyées, liste d’amis et réglages de partage. La page a été inspectée sans envoyer de demande ni activer le partage. La soumission de ces commandes est bloquée pour éviter les effets sur des tiers.
- Les menus visibles examinés n’exposaient pas de parcours d’alerte de prix ou de recherche sauvegardée. Leur présence dans des types/API ne permet pas de conclure à une fonctionnalité utilisable dans l’interface; non testées.
- Les liens sortants Cardmarket et les liens de sources n’ont pas été ouverts. Les opérations d’export du portefeuille n’ont pas été exécutées.

## 4. Matrice de couverture des parcours

**Légende :** PASS = action principale exécutée et résultat attendu observé dans le périmètre indiqué; FAIL = anomalie reproduite; PARTIAL = parcours exercé, mais couverture incomplète ou état dégradé; BLOCKED = action non exécutée pour une raison explicite; NOT TESTED = non exécuté. Les anomalies P2 peuvent coexister avec un parcours qui fonctionne par ailleurs.

| # | Parcours / route principale | Desktop | Mobile / tablette | Couverture exercée |
|---:|---|---|---|---|
| 1 | Catalogue `/tcg` | FAIL | PARTIAL | Recherche Pikachu, tri prix, filtre type/extension, chargement de 24 à 30 cartes, changement d’affichage. Le filtre français affiche « Fire » en anglais. Contrôles mobile partiels. |
| 2 | Fiche d’extension `/tcg/sets/[setId]` | PASS | NOT TESTED | Vue d’ensemble et cartes d’une extension; détail de l’extension 30 cartes. |
| 3 | Détail et modal `/tcg/cards/[id]` | PASS | PASS | Fiche complète, modal depuis catalogue, Échap, retour à l’URL filtrée et focus restauré, partage par copie. |
| 4 | Comparaison de cartes | PASS | FAIL | Deux cartes, panneau, détails d’attaques et effacement testés. À 768 × 1024, le déclencheur fixe est recouvert par la navigation basse. |
| 5 | Collection `/tcg/collection` et exemplaires | PARTIAL | PASS | Vue vide, statistiques, ajout d’exemplaires 1→2, rechargement, retrait jusqu’à 0. L’accès direct a aussi montré un long état de synchronisation. |
| 6 | Langue `/tcg/collection/[language]` | NOT TESTED | FAIL | Route française testée à 390 × 844; titre et en-tête anglais dans une page française. |
| 7 | Démarrer `/tcg/start` et ajouter une extension | PARTIAL | NOT TESTED | État de synchronisation persistant sur accès direct; liste et recherche locale disponibles après navigation interne. |
| 8 | Classeurs `/tcg/collection/custom/[collectionId]` | PASS | NOT TESTED | Création, ajout d’une carte non possédée, persistance, fermeture modale par Échap et suppression. |
| 9 | Wishlist `/tcg/wishlist` | FAIL | PARTIAL | Ajout/retrait, actualisation, tri et état vide; commande de suggestion inversée et état accessible de la commande wishlist manquant. Les onglets sont partiellement visibles; le défilement existe sans indicateur visible. |
| 10 | Investissements `/tcg/investments` | PASS | PARTIAL | Achat fictif, quantité, coût, estimation manuelle, persistance et statistiques; suppression vérifiée. Vue éditée principalement sur desktop. |
| 11 | Deck Builder `/tcg/deck-builder` | PASS | FAIL | Création, recherche, ajout 1→4, blocage au-delà de la limite, persistance et suppression. Sur téléphone, les boutons de recherche ont des noms accessibles identiques. |
| 12 | Illustrateurs `/tcg/illustrators/[artist]` | PASS | PARTIAL | Pagination page 1→2 et retour; affichage contrôlé à 768 × 1024. Petit téléphone non couvert. |
| 13 | Portefeuille scellé `/tcg/sealed` | PARTIAL | PARTIAL | Tableau de bord, valeur/solde, achat, validation, édition, vente, échange et annulation; versions privées ont parfois gardé l’état de synchronisation. Formulaire d’échange ouvert puis annulé sur mobile. |
| 14 | Sous-vues privées scellées | PARTIAL | NOT TESTED | Collection, journal, ventes, cashflow, analyses, catalogue et sources visités; cohérence des chiffres vérifiée après opérations. Couverture desktop et états de chargement seulement. |
| 15 | Marché public `/tcg/sealed/market` | PASS | PASS | Recherche produit, catégorie, URL des filtres, résultat et absence de débordement horizontal. |
| 16 | Détail public `/tcg/sealed/market/[id]` et alias `products/[id]` | PASS | PASS | Prix courant et historique 7/30 jours; accès téléphone et alias desktop. Aucun lien sortant ouvert. |
| 17 | Sorties `/tcg/sealed/releases` | NOT TESTED | PASS | État et défilement sur téléphone; lien de source non ouvert. |
| 18 | Conseils `/tcg/sealed/buy-safely` | NOT TESTED | PASS | Lecture et défilement sur téléphone; liens de sources non ouverts. |
| 19 | Taux et valeur `/tcg/pull-rates`, `/tcg/booster-value` | NOT TESTED | PASS | États « données indisponibles / échantillon insuffisant » lisibles, sans débordement mobile. |
| 20 | Social `/friends` (hors `/tcg`) | NOT TESTED | NOT TESTED | Interface et réglages inspectés en lecture à un viewport non consigné. Le sous-parcours de demande d’ami et d’activation de partage est BLOCKED pour éviter notification ou divulgation à un tiers. |

### Navigation, persistance et responsive transversaux

- L’actualisation a confirmé la persistance des cartes de collection, de wishlist, du classeur, du deck et des achats d’investissement pendant leurs essais respectifs; ces éléments ont ensuite été retirés.
- Depuis une fiche modale, Échap a fermé la fiche, restauré le focus sur la carte et conservé les filtres de catalogue. La pagination illustrateur a conservé l’URL de page et le retour navigateur a restauré la première page.
- Aucun débordement de la page entière n’a été mesuré dans les vues mobile du catalogue, wishlist, pages scellées et illustrateur. Les onglets TCG débordent du conteneur à faible largeur, mais le défilement horizontal est activé; son indicateur visuel était masqué.
- Le parcours tactile au doigt, les balayages, l’orientation, le clavier matériel mobile et le zoom système n’ont pas pu être évalués sur appareil réel.

## 5. Anomalies fonctionnelles et d’accessibilité

### F-01 — Le bouton des suggestions de wishlist annonce une suppression, mais ajoute la carte

- **Priorité / statut :** P2, bug d’étiquetage avéré.
- **Route :** `/fr/tcg/wishlist`; zone de suggestions d’extensions en cours.
- **Précondition :** une extension en cours contenant des suggestions et une carte qui n’est pas déjà dans la wishlist.
- **Reproduction :** ouvrir la wishlist; sur une carte suggérée, repérer le bouton corbeille annoncé « Supprimer la carte »; l’activer; observer le compteur et la liste.
- **Attendu :** commande nommée « Ajouter [nom] à la wishlist »; le contrôle indique clairement qu’il ajoute la carte.
- **Observé :** le compteur de wishlist augmente et la carte est ajoutée, alors que l’icône/nom accessible annoncent une suppression. Reproduit avec une carte suggérée, le compteur est passé de 1 à 2.
- **Preuve :** [capture wishlist](evidence/wishlist-one-card-desktop.png); le résultat du clic a été constaté dans l’interface. Le fichier `src/components/tcg/TCGWishlistContent.tsx` montre le même `toggleTCGWishlist` dans la zone suggestion, avec la clé d’accessibilité `tcg.compare_remove_card`.
- **Cause probable :** le bouton d’action des suggestions réutilise le libellé de retrait malgré une action d’ajout; hypothèse directement étayée par le composant et l’interaction.
- **Correction :** utiliser une icône d’ajout et un libellé distinct traduisible, incluant le nom de la carte. Réserver le libellé de suppression aux cartes déjà dans la liste.
- **Acceptation :** sur une carte suggérée absente, le lecteur d’écran annonce « Ajouter [nom] à la liste de souhaits » et le clic l’ajoute; le contrôle de suppression annonce « Retirer [nom] » et le clic la retire.

### F-02 — Le contrôle de wishlist ne communique pas l’état actif

- **Priorité / statut :** P2, défaut d’accessibilité et de feedback avéré.
- **Route :** `/fr/tcg/cards/[id]` dans le détail de carte.
- **Précondition :** carte absente puis ajoutée à la wishlist.
- **Reproduction :** ajouter une carte à la wishlist depuis sa fiche; observer à nouveau le contrôle et inspecter son nom/état accessible.
- **Attendu :** libellé ou état pressé mis à jour (« Dans la wishlist » / « Retirer de la wishlist » et `aria-pressed=true`) avec un feedback perceptible.
- **Observé :** état visuel rose activé, mais texte inchangé; le bouton ne porte pas `aria-pressed` ni de nom accessible indiquant la carte ou l’état. Le retrait est donc difficile à identifier, notamment au lecteur d’écran.
- **Preuve :** [capture état wishlist](evidence/wishlist-active-card-desktop.png). Le rendu `ActionPill` dans `src/components/tcg/TCGCardDetailContent.tsx` reçoit `active={wishlisted}`, sans `ariaPressed` pour cette action.
- **Cause probable :** l’état visuel est branché à la wishlist, mais les propriétés sémantiques/texte dynamique ne le sont pas.
- **Correction :** exposer l’état avec `aria-pressed`, nommer le contrôle avec le nom de carte et faire évoluer le libellé selon l’état; annoncer l’ajout/retrait avec un feedback non intrusif.
- **Acceptation :** clavier et lecteur d’écran distinguent les deux états; le nom comprend la carte; après activation le nom et l’état accessible changent immédiatement et après actualisation.

### F-03 — Bouton de comparaison inaccessible à 768 px

- **Priorité / statut :** P2, défaut responsive avéré.
- **Route :** catalogue TCG avec au moins une carte comparée; barre fixe de comparaison.
- **Viewport :** 768 × 1024.
- **Reproduction :** comparer une carte; cliquer le bouton flottant en bas à droite.
- **Attendu :** le bouton reste visible, au-dessus des éléments fixes, et ouvre le panneau.
- **Observé :** la navigation fixe du bas recouvre la zone du bouton et intercepte le clic; le panneau ne s’ouvre pas. À desktop 1440 × 900, le bouton et panneau fonctionnent.
- **Preuve :** [capture comparaison à 768 px](evidence/compare-button-tablet-overlap.png); l’interception par `nav.primary-bottom-nav` a été observée pendant le clic. Composants/styles à examiner : `src/components/tcg/TCGCompareTrigger.tsx` et `.primary-bottom-nav` dans `src/app/globals.css`.
- **Cause probable :** position basse fixe du déclencheur non compensée par la hauteur de navigation, avec une interaction de contexte d’empilement; cause exacte du stacking à confirmer lors du correctif.
- **Correction :** décaler le déclencheur au-dessus de `--app-bottom-nav-height` aux largeurs concernées et vérifier la hiérarchie des calques.
- **Acceptation :** à 768 × 1024 et 390 × 844, le bouton est entièrement visible et le clic l’ouvre; la navigation basse reste utilisable; aucun chevauchement avec bannière de consentement.

### F-04 — Les résultats de recherche du deck ont des noms accessibles identiques

- **Priorité / statut :** P2, défaut d’accessibilité avéré.
- **Route :** `/fr/tcg/deck-builder`.
- **Viewport :** 390 × 844.
- **Précondition :** deck temporaire sélectionné; recherche « Pikachu » chargée.
- **Reproduction :** ouvrir la recherche; parcourir les boutons résultats avec la navigation au clavier/lecteur d’écran.
- **Attendu :** chaque bouton distingue le nom, l’extension, le numéro de carte et l’action d’ajout.
- **Observé :** les 24 résultats sont annoncés sous le même nom « Pikachu Pikachu »; le set et l’identifiant de carte ne figurent pas dans le nom du bouton. Cela empêche de choisir de façon fiable entre les impressions homonymes.
- **Preuve :** inspection de l’arbre d’accessibilité à 390 × 844; rendu des résultats dans `src/app/tcg/deck-builder/DeckBuilderClient.tsx` expose l’image avec alt `card.name` et le même nom comme texte, sans set ni numéro accessible.
- **Correction :** fournir un nom accessible combiné « Ajouter Pikachu, [extension], numéro [x] au deck »; afficher visuellement extension/numéro ou une vue de détails au focus.
- **Acceptation :** résultats homonymes différenciables uniquement au clavier et au lecteur d’écran; l’action annoncée est explicite; aucun nom dupliqué pour les impressions distinctes.

### F-05 — Le défilement des onglets TCG manque d’indicateur sur petits écrans

- **Priorité / statut :** P3, friction de découvrabilité avérée.
- **Route :** navigation locale TCG, particulièrement `/fr/tcg/wishlist`.
- **Viewports :** 390 × 844 et 320 × 568.
- **Reproduction :** ouvrir la navigation personnelle TCG; examiner/faire défiler la rangée d’onglets.
- **Attendu :** destinations accessibles avec une indication évidente quand la rangée déborde.
- **Observé :** à 390 px, environ 2,9 onglets sur quatre sont visibles; « Scellés » est hors écran. À 320 px, environ deux onglets sont visibles. Une vérification DOM complémentaire à 390 px confirme le défilement horizontal (`scrollWidth` 476 px, `clientWidth` 350 px, `overflow-x:auto`); les liens masqués peuvent donc être atteints en faisant défiler la rangée. La barre de défilement était cachée par les styles globaux, ce qui ne rend pas l’affordance claire. Le balayage tactile n’a pas été vérifié sur appareil réel.
- **Preuves :** [navigation à 390 px](evidence/wishlist-nav-390x844.png) et [navigation à 320 px](evidence/wishlist-nav-320x568.png). Navigation dans `src/components/tcg/TCGPageTabs.tsx`.
- **Cause probable :** l’indicateur de défilement est désactivé (`scrollbar-width:none` et barre WebKit masquée) alors que le conteneur déborde; la cause est confirmée dans `src/app/globals.css`.
- **Correction :** conserver le défilement existant et afficher une barre discrète aux largeurs téléphone; garder les liens dans l’ordre du DOM pour le clavier.
- **Acceptation :** à 320 et 390 px la barre de défilement est visible, chaque destination s’atteint par balayage et clavier; l’onglet actif reste identifiable; la page ne crée pas de scroll horizontal global.

### F-06 — Libellés de type en anglais dans le catalogue français

- **Priorité / statut :** P2, incohérence de localisation avérée.
- **Route :** `/fr/tcg`, filtres de type.
- **Reproduction :** choisir le type Feu, afficher les filtres actifs et le chip correspondant.
- **Attendu :** libellé français cohérent entre filtre et chip (« Feu »).
- **Observé :** chip « Fire » alors que l’interface est en français. Le filtre fonctionne néanmoins et l’URL encode `types=Fire`.
- **Preuve :** [capture du filtre français](evidence/catalog-filter-locale-mismatch-desktop.png). La fonction de libellé est dans `src/components/tcg/TCGFilters.tsx` (type `Fire` → clé de traduction `tcg.pokemon_type_fire`); le manque de traduction effective ou son fallback est à vérifier.
- **Correction :** compléter/aligner la clé pour toutes les locales supportées et réutiliser le même libellé localisé dans les options et filtres actifs.
- **Acceptation :** pour les huit locales supportées, valeur, chip et retrait du filtre affichent la même traduction; l’identifiant technique transmis à l’URL reste stable.

### F-07 — Écran de choix de langue partiellement non traduit

- **Priorité / statut :** P2, défaut de localisation avéré.
- **Route :** `/fr/tcg/collection/fr`.
- **Viewport :** 390 × 844.
- **Reproduction :** ouvrir directement la route française sans résoudre la langue historique.
- **Attendu :** titre de page et H1 explicites en français.
- **Observé :** titre navigateur « fr — Ma Collection » et H1 anglais « Choose a collection language »; le texte secondaire et le CTA sont français. Cette alternance est déroutante et le slug `fr` n’est pas un titre de page significatif.
- **Preuve :** [capture de la page de langue](evidence/collection-language-page-locale-mismatch-390x844.png). Valeur par défaut anglaise visible dans `src/components/tcg/TCGLegacySetAlbumResolver.tsx`; titre à vérifier dans le segment de route.
- **Correction :** fournir une traduction française explicite et construire le titre metadata à partir du nom localisé de la page/langue, jamais du slug seul.
- **Acceptation :** titre d’onglet et contenu entièrement français sur cette route; contrôle des sept autres locales et des états « attribution historique » et « choix de collection ».

### F-08 — État de synchronisation privé prolongé après navigation directe

- **Priorité / statut :** P2, fiabilité perçue / état de chargement avéré, cause non déterminée.
- **Routes :** `/tcg/start`, `/tcg/collection` et certaines pages privées `/tcg/sealed/*`.
- **Reproduction observée :** charger directement une route privée; laisser la page ouverte. Répéter en arrivant depuis une page TCG déjà ouverte.
- **Attendu :** état de chargement bref avec progression ou issue explicite (réessayer, actualiser l’état), puis contenu ou erreur récupérable.
- **Observé :** message « Votre collection est encore en cours de synchronisation. Réessayez dans un instant. » visible pendant environ 6–16 secondes ou davantage dans les observations directes. `/tcg/start` affichait encore le placeholder après environ 16 s; la navigation interne a fini par afficher la liste après une attente supplémentaire d’environ 11 s. Un accès chaud par navigation interne a parfois affiché le contenu sans attente comparable. Aucune erreur JavaScript n’a été relevée et les endpoints consultés répondaient 200; cela ne prouve pas la cause.
- **Preuve :** [capture de synchronisation](evidence/sealed-sync-stalled-desktop.png); observation chronométrée du parcours start. État intermittent reproduit sur plusieurs accès, mais pas sur chaque navigation.
- **Cause probable :** résolution/hydratation de l’état client ou condition de synchronisation qui attend un événement; hypothèse seulement, non prouvée. À instrumenter avant de conclure.
- **Correction :** différencier une synchronisation en cours d’une attente bloquée, borner l’attente, fournir une relance accessible et conserver une voie locale quand la donnée est disponible.
- **Acceptation :** accès direct et navigation interne depuis session froide/chaude; contenu ou erreur récupérable dans un délai défini; aucun placeholder indéfini; mesures réseau et console identifient clairement une éventuelle attente backend.

## 6. Problèmes responsive et visuels

Les défauts responsive confirmés sont F-03 (commande de comparaison couverte à 768 px) et F-05 (débordement des onglets sans indicateur visible à 390/320 px). Aucun débordement horizontal de page entière n’a été observé dans les pages mobile effectivement visitées. Les pages de détail carte, marché scellé, produit, taux et valeur restaient lisibles et défilables aux largeurs testées.

La modal de fiche carte occupe la hauteur disponible à 390 × 844, garde sa commande de fermeture visible et autorise le défilement interne. À desktop, le retour à la liste restaure les filtres et le focus. Les overlays et panneaux testés se fermaient par Échap lorsque prévu.

Captures complémentaires : [fiche carte mobile](evidence/card-detail-mobile.png), [modal mobile](evidence/card-detail-modal-mobile-390x844.png), [collection vide desktop](evidence/collection-empty-desktop.png), [détail d’extension desktop](evidence/set-detail-30th-desktop.png), [édition d’investissement](evidence/investments-edit-manual-price-desktop.png), [wishlist mobile](evidence/wishlist-390x844.png).

## 7. Analyse UX et parcours

- **Découverte :** les outils secondaires du catalogue sont regroupés dans le menu « Plus »; ce menu est fonctionnel au clavier et se ferme sur Échap/clic extérieur, mais ajoute un niveau de navigation. Les onglets personnels nécessitent un défilement horizontal, sans barre indicatrice visible sur téléphone (F-05).
- **Clarté des commandes :** le mismatch d’action dans les suggestions wishlist (F-01) est le cas le plus trompeur. La wishlist active n’a pas de confirmation textuelle ou sémantique cohérente (F-02).
- **Efficacité :** catalogue, filtre, tri, pagination et recherche localisée se sont comportés comme attendu. Une recherche par nom localisé (« Anniversaire ») retourne les extensions pertinentes; chercher leur nom anglais ne les retourne pas nécessairement dans l’interface française. Prévoir un retour vide clair lorsque le terme ne correspond pas.
- **Retour/récupération :** fermeture de modal, retour navigateur, suppression de cartes et retrait de wishlist ont été récupérables. La confirmation d’annulation des transactions scellées prévient que l’événement reste dans l’historique, ce qui est important puisque les lignes annulées ne peuvent pas être effacées depuis l’UI.
- **Feedback :** le portefeuille de cartes, le deck et les valeurs d’investissement ont reflété les modifications après action et actualisation. Les états de synchronisation prolongés (F-08) rendent l’attente ambiguë malgré le texte de réessai.
- **Accessibilité :** plusieurs cibles testées ont une zone tactile nominale d’au moins 44 px; le principal échec est la répétition des noms de boutons dans le deck (F-04), ainsi que l’état non exposé de wishlist (F-02) et l’action mal nommée (F-01). L’audit n’est pas une certification WCAG.
- **À conserver :** contraintes de 60 cartes et 4 exemplaires testées; le cinquième ajout est désactivé. La fermeture de modal par Échap restaure le focus. Les données de prix indisponibles indiquent clairement l’insuffisance de l’échantillon.

## 8. Recommandations détaillées

1. Corriger d’abord les commandes qui annoncent une autre action que celle réellement effectuée (F-01) et exposer l’état actif de wishlist (F-02). L’utilisateur doit pouvoir agir sans deviner et sans connaître le rendu visuel.
2. Relever le déclencheur de comparaison au-dessus de la navigation basse au breakpoint compact (F-03). Refaire le test de clic au point 768 px exact, puis aux deux largeurs smartphone.
3. Ajouter extension et numéro à l’identité accessible des cartes du Deck Builder (F-04); garder un nom concis visuellement si l’espace est limité.
4. Rendre visible l’indicateur de défilement horizontal des onglets TCG à petite largeur (F-05), sans ajouter de scroll horizontal à la page.
5. Harmoniser les libellés TCG avec les bundles de traduction existants (F-06, F-07), sans changer les identifiants techniques des filtres ni les chemins historiques.
6. Instrumenter le temps entre chargement, hydratation locale et fin de synchronisation avant de changer la logique (F-08). Ajouter une limite et un bouton « Réessayer » si l’attente est réellement sans issue.
7. Garder un état de succès explicite lorsqu’un événement est annulé et rappeler dans la confirmation que le journal conserve une entrée. Le comportement actuel est cohérent avec un journal immuable; c’est une amélioration de compréhension, pas un bug constaté.
8. Après les correctifs, répéter les scénarios d’acceptation aux mêmes tailles, avec navigation clavier et lecteur d’écran, puis contrôler les traductions dans les huit locales.

## 9. Diagnostic technique et performance

### Mesure laboratoire

Une seule analyse PageSpeed mobile de `https://lunidex.app/fr/tcg` a rendu :

| Mesure | Valeur relevée |
|---|---:|
| Score Performance | 80 |
| FCP | 2,0 s |
| LCP | 4,5 s |
| CLS | 0,06 |
| Speed Index | 3,6 s |
| TBT | 130 ms |
| FID rapporté par l’outil | 210 ms |

L’audit signalait environ 25 KiB de JavaScript inutilisé potentiel et des vérifications de minification CSS/JS. Ces points sont des pistes automatiques, pas une attribution à un bundle ou une cause démontrée. La valeur FID provient du rapport laboratoire de cette exécution et n’est pas une mesure CrUX terrain. La requête CrUX a échoué avec HTTP 403; les tentatives de plusieurs passages et l’analyse desktop ont expiré. Ne pas comparer ce score isolé comme une baseline stable.

### Console, réseau et données

- Aucune erreur JavaScript de console pendant les parcours normaux réalisés.
- Les requêtes applicatives examinées pendant les états lents étaient réussies; ceci ne permet pas d’exclure une attente d’état client ni de conclure sur tous les endpoints.
- Cohérence vérifiée : compteurs collection et wishlist, quantités d’investissement, contenu du deck, valeurs ventes/cashflow et solde après annulation.
- Les pages de taux et valeur signalaient l’absence de données suffisamment validées au lieu d’afficher une estimation non étayée.
- Les trois événements scellés annulés restent dans le journal d’audit, sans stock actif ni solde restant attribuable au test.

### Références de code utiles au correctif

Ces références localisent les surfaces probables, sans prétendre prouver la cause de F-08 :

- Suggestions wishlist : `src/components/tcg/TCGWishlistContent.tsx`.
- Action et sémantique de wishlist en fiche : `src/components/tcg/TCGCardDetailContent.tsx` (`ActionPill`).
- Bouton de comparaison : `src/components/tcg/TCGCompareTrigger.tsx`; navigation basse : `src/components/layout/PrimaryBottomNav.tsx`; styles fixes : `src/app/globals.css`.
- Résultats de recherche de deck : `src/app/tcg/deck-builder/DeckBuilderClient.tsx`.
- Navigation TCG : `src/components/tcg/TCGPageTabs.tsx`.
- Libellés de filtre : `src/components/tcg/TCGFilters.tsx`.
- H1 de résolution d’ancienne collection : `src/components/tcg/TCGLegacySetAlbumResolver.tsx`; métadonnées à vérifier dans `src/app/tcg/collection/[language]/page.tsx`.

## 10. Backlog unique priorisé

| Ordre | ID | Priorité | Type | Travail recommandé | Bénéfice | Zone probable / dépendances |
|---:|---|---|---|---|---|---|
| 1 | F-01 | P2 | Bug UX/accessibilité | Renommer et différencier les actions d’ajout et de retrait dans les suggestions. | Évite une action trompeuse et une erreur d’usage. | `TCGWishlistContent.tsx`, clés i18n |
| 2 | F-02 | P2 | Bug accessibilité/feedback | Exposer état pressé, nom de carte et libellé dynamique pour wishlist. | Rend l’état et le retrait compréhensibles. | `TCGCardDetailContent.tsx`, traductions |
| 3 | F-03 | P2 | Bug responsive | Placer le bouton de comparaison au-dessus de la navigation basse et corriger l’empilement. | Rétablit l’accès au panneau sur tablette/téléphone. | `TCGCompareTrigger.tsx`, CSS global |
| 4 | F-04 | P2 | Bug accessibilité | Nommer chaque résultat de deck avec carte, extension, numéro et action. | Permet de choisir les impressions homonymes. | `DeckBuilderClient.tsx` |
| 5 | F-06 | P2 | Bug localisation | Utiliser le même libellé français traduit dans les options et les chips de type. | Maintient la cohérence de langue. | `TCGFilters.tsx`, `TCGResearchDesk.tsx`, `tcg-type-labels.ts` |
| 6 | F-07 | P2 | Bug localisation | Traduire le résolveur et créer un titre de page descriptif localisé. | Clarifie l’attribution de langue. | route collection et `TCGLegacySetAlbumResolver.tsx`, metadata |
| 7 | F-08 | P2 | Fiabilité perçue | Donner une relance après une attente prolongée et relancer l’authentification si aucun gestionnaire de synchronisation n’est inscrit. | Offre une récupération explicite lors d’un accès direct bloqué. | `SyncStatusPanel.tsx`, `sync-access.ts` |
| 8 | F-05 | P3 | Amélioration de navigation | Afficher un indicateur de défilement sur les onglets TCG aux largeurs téléphone. | Rend les destinations hors écran plus faciles à découvrir. | `globals.css`, `.tcg-local-navigation-links` |
| 9 | R-01 | P3 | Amélioration facultative | Répéter Lighthouse mobile 3 fois et examiner LCP/ressources avant toute optimisation ciblée. | Établit une baseline reproductible et évite les optimisations spéculatives. | mesure après les corrections; aucun changement demandé par cet audit |
| 10 | R-02 | P3 | Amélioration facultative | Renforcer le texte de confirmation d’annulation du portefeuille scellé et expliquer la conservation dans le journal. | Réduit la surprise liée aux événements persistants. | dialogue de void et documentation UX |

## 11. Scénarios d’acceptation

Les scénarios détaillés d’acceptation propres à F-01 à F-08 sont intégrés dans chaque fiche d’anomalie ci-dessus. Checklist de régression consolidée :

1. **Wishlist suggestions :** créer une extension en cours, vérifier qu’une suggestion absente annonce « Ajouter … », ajouter, constater le compteur, actualiser, puis retirer avec un nom d’action correct.
2. **Wishlist depuis fiche :** ajouter puis retirer à la souris et au clavier; vérifier `aria-pressed`, nom de carte, libellé et annonce du changement.
3. **Comparaison :** ajouter deux cartes; ouvrir le panneau à 1440, 768, 390 et 320 px; vérifier qu’aucune barre fixe n’intercepte le clic; ouvrir les détails et effacer.
4. **Deck Builder :** rechercher Pikachu avec plusieurs impressions; vérifier que clavier/lecteur d’écran distinguent set et numéro; ajouter la bonne impression et confirmer limite 4/60.
5. **Navigation TCG :** vérifier les quatre onglets personnels à 320 et 390 px avec clavier et toucher réel; tous les libellés sont accessibles sans scroll horizontal global.
6. **Localisation :** sélectionner Feu en français et comparer option/chip; ouvrir le résolveur en français et vérifier H1 + titre d’onglet; exécuter ensuite les huit locales.
7. **État privé :** ouvrir chaque route directement et depuis la navigation interne en session froide puis chaude; chronométrer l’attente, vérifier issue, bouton de réessai, console et statut réseau.
8. **Portefeuille :** acheter/vendre/échanger des données fictives isolées, annuler selon dépendances, vérifier solde et stock; confirmer que le dialogue explique la ligne d’audit conservée.

## 12. Limites, scénarios bloqués et état des données de test

- **Action bloquée :** envoi d’invitation ami et activation du partage de collection/decks non exécutés. L’écran permet de soumettre ou de modifier des réglages qui pourraient notifier un tiers ou divulguer des données; ils ont été inspectés en lecture seule.
- **Appareil :** toutes les tailles sont émulées dans le navigateur. Pas d’iPhone/Android physique, pas de vérification réelle du toucher, swipe, rotation, safe area matérielle ou lecteur d’écran vocal.
- **Couverture :** aucune interaction n’a été faite sur les liens sortants Cardmarket/sources; les exports n’ont pas été lancés; la gestion des alertes et recherches sauvegardées n’était pas exposée dans les parcours d’interface observés. Ces scénarios restent non testés.
- **Performance :** une seule passe PageSpeed mobile exploitable; les multi-passes, le desktop et CrUX n’ont pas produit de résultat exploitable. Aucune conclusion terrain ou tendance n’est possible.
- **Données :** collection de cartes, wishlist, classeur, deck et achat d’investissement de test ont été supprimés; les vues de ces fonctions étaient revenues à l’état vide. Les achats/ventes/échange scellés de test ont été annulés en ordre inverse de dépendance. L’application garde trois événements annulés dans le journal; le dashboard affichait le portefeuille vide, sans solde ni stock actif. Les éléments actifs de comparaison ont été effacés.
- **Causalité :** le délai de synchronisation est reproductible, mais l’origine technique n’est pas confirmée. Les propositions de cause sont identifiées comme hypothèses.

## 13. Plan d’implémentation recommandé

### Lot 1 — Sémantique et commandes (F-01, F-02, F-04)

Corriger d’abord les labels et états accessibles dans wishlist et deck builder. Ajouter des tests de composant ciblés lors de l’implémentation, puis valider l’arbre d’accessibilité au clavier et avec un lecteur d’écran.

### Lot 2 — Navigation aux breakpoints compacts (F-03, F-05)

Revoir les calques du déclencheur de comparaison et le comportement de navigation TCG. Valider les tailles 320, 390 et 768 px, avec et sans barre de consentement, puis sur appareils physiques.

### Lot 3 — Localisation (F-06, F-07)

Aligner bundles et metadata sans modifier les identifiants techniques. Vérifier les huit langues prises en charge et les libellés dynamiques/chips.

### Lot 4 — Diagnostic de synchronisation (F-08)

Mesurer l’état du store, l’hydratation, la résolution de données et les requêtes sur une session froide et chaude. Choisir ensuite une correction bornée avec récupération visible; éviter de masquer les erreurs backend sous un changement d’interface.

### Lot 5 — Vérification et opportunités (R-01, R-02)

Exécuter les scénarios consolidés après fusion locale, répéter les mesures de performance et confirmer la compréhension du journal d’annulation. L’audit n’autorise ni déploiement ni action externe.

## 14. Corrections effectuées dans le workspace

Les anomalies F-01 à F-04, F-06 et F-07 ainsi que l’amélioration mobile F-05 ont reçu des corrections dans les sources locales : commandes wishlist nommées et accessibles, résultats de deck identifiés par extension et numéro, bouton de comparaison dégagé de la navigation fixe, indicateur de défilement TCG, libellés de type cohérents et titre de résolution localisé.

Pour F-08, le panneau distingue maintenant une attente de plus de dix secondes, arrête le spinner et propose une relance de la session et de la synchronisation. Cela améliore la récupération; la cause technique du délai observé en production n’est toujours pas démontrée et demande un diagnostic séparé.

R-01 n’a pas entraîné d’optimisation de performance : l’audit ne contient qu’une mesure exploitable et ne permet pas de cibler un changement fiable. R-02 n’a pas nécessité de correction : la confirmation actuelle indique déjà que l’événement annulé restera dans le journal d’audit.

**Vérifications locales :** `npm run lint`, `npm run typecheck`, `npm run seo:check` et `git diff --check` ont réussi. Le contrôle SEO valide les sources et ne vérifie pas le sitemap déployé. Les scénarios navigateur n’ont pas été rejoués après les modifications. Ces changements restent dans le workspace et ne sont pas déployés; les observations de l’audit restent celles de la production au 20 octobre 2026.
