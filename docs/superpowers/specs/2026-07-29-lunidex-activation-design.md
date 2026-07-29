# Lunidex — parcours d’activation collection TCG

**Statut :** validé pour spécification ; aucune implémentation dans ce document.

## 1. Cadre produit

Lunidex est présenté comme un compagnon de collection TCG avec des outils de jeu intégrés.

- Slogan : « Collectionnez vos cartes. Jouez vos Pokémon. »
- Promesse : « Votre collection TCG et vos équipes Pokémon, enfin réunies dans un espace simple et personnel. »
- Le compte est facultatif.
- Les données de collection sont utilisables localement sans compte.
- La synchronisation basique, lorsqu’elle est configurée, est une fonction standard et non Premium.

L’activation doit d’abord faire comprendre la valeur collection : enregistrer une carte et voir la progression exacte de son extension. Les outils Pokédex et Équipe enrichissent ensuite le produit ; ils ne doivent pas détourner la première session.

## 2. Objectif et périmètre

### Objectif

Sur mobile comme sur desktop, un nouveau visiteur doit pouvoir, en moins de cinq minutes :

1. choisir une extension ;
2. ouvrir directement son album ;
3. ajouter une première carte ;
4. voir le compteur exact de cette extension ;
5. poursuivre avec une deuxième carte ou une carte en wishlist.

### Hors périmètre

- Modification de la page d’accueil ou implémentation de ce parcours.
- Recommandations d’extensions personnalisées.
- Création de compte obligatoire.
- Fonctionnalité Premium liée à la synchronisation basique.
- Implémentation d’un outil analytics, choix de fournisseur ou gestion du consentement.
- Mise en avant de la salle PvP, des alertes automatiques ou de l’application native.

## 3. Définitions de succès comportemental

### Première valeur

La première valeur est atteinte uniquement lorsque les deux conditions suivantes sont réunies dans la même session :

1. au moins une carte est ajoutée à la collection ;
2. le compteur exact de son extension est affiché après cet ajout, au format `possédées / total`.

Exemple : `Carte ajoutée · 1 / 182 cartes dans cette extension`.

Choisir une extension, ouvrir un album ou consulter une fiche carte ne constitue pas une première valeur.

### Activation

Un utilisateur est activé lorsqu’il a atteint la première valeur puis accomplit une action intentionnelle de poursuite dans la même session :

- il ajoute une deuxième carte à sa collection ; **ou**
- il ajoute une carte manquante à sa wishlist.

L’ouverture de l’album ne compte pas comme une action d’activation : l’album est déjà ouvert dans le parcours principal.

### Engagement

L’engagement est constaté lorsqu’un utilisateur activé revient dans une session distincte et effectue une action collection volontaire, par exemple :

- ajouter ou retirer une carte ;
- ouvrir un album d’extension ;
- ajouter ou consulter une wishlist ;
- poursuivre une extension active.

Le passage carte → Pokémon est un enrichissement mesuré séparément ; il n’est ni requis pour l’activation ni un indicateur d’engagement principal.

## 4. Segmentation à l’entrée

### Nouveau collectionneur

Un utilisateur est considéré nouveau pour ce parcours si, après hydratation du stockage local, `tcgOwnedCards` est vide.

- Le CTA public est `Commencer ma collection`.
- Il mène à la route dédiée `/tcg/start`.
- Le parcours décrit dans les sections suivantes est affiché.

### Utilisateur avec données locales

Un utilisateur est considéré existant si `tcgOwnedCards` contient au moins une carte après hydratation.

- Le libellé d’entrée devient `Reprendre ma collection`.
- Le parcours débutant `/tcg/start` ne doit pas être affiché automatiquement ni en interstitiel.
- Si une extension active existe, la destination est son album. En cas de plusieurs extensions actives, utiliser celle activée le plus récemment lorsque cette information sera disponible ; à défaut, utiliser la première extension active selon l’ordre de stockage.
- Sans extension active, la destination est la page Collection, filtrée ou ordonnée de façon à rendre visibles les extensions possédant au moins une carte.
- Aucun ajout déjà enregistré ne doit être modifié par cette redirection.

Cette distinction ne doit être décidée qu’après hydratation asynchrone du stockage afin d’éviter un faux parcours débutant ou un clignotement de l’interface.

## 5. Flux principal

```text
CTA « Commencer ma collection »
  → /tcg/start
  → choisir une extension factuelle
  → album de l’extension en mode activation
  → « J’ai cette carte »
  → confirmation : « Carte ajoutée · 1 / X cartes dans cette extension »
  → « Continuer à ajouter »
  → deuxième carte possédée OU carte manquante en wishlist
  → activation atteinte
  → invitation non bloquante à créer un compte (si la synchronisation est disponible)
```

Le parcours n’impose ni création de compte ni ajout de plus d’une carte pour délivrer la première valeur.

## 6. Route `/tcg/start` : choix d’extension

### Intention

Permettre de démarrer une collection avec un contexte utile : une extension identifiée. Cette étape remplace l’arrivée actuelle, plus générique, dans le catalogue TCG.

### Contenu

Titre :

> Quelle extension souhaitez-vous suivre ?

Texte :

> Choisissez une extension, ajoutez les cartes que vous possédez et voyez votre progression immédiatement. Aucun compte n’est nécessaire.

Éléments, dans cet ordre sur mobile :

1. un champ `Rechercher une extension` ;
2. une section `Dernières extensions` ;
3. une liste factuelle triée par date de sortie décroissante ;
4. un lien secondaire `Je préfère rechercher une carte` menant au catalogue TCG avec recherche libre, sans marquer l’utilisateur comme activé.

Chaque ligne d’extension affiche uniquement des éléments factuels disponibles : visuel ou logo, nom, date de sortie lorsqu’elle est connue, et nombre total de cartes lorsqu’il est connu.

CTA de ligne :

> Choisir cette extension

### Règles de données et de tri

- La liste ne contient pas de recommandation personnalisée, de score de popularité ou de contenu éditorial implicite.
- Les extensions sont triées par date de sortie décroissante.
- Les extensions sans date sont affichées après les extensions datées, sans prétendre à un ordre chronologique exact entre elles.
- Une recherche retourne les extensions correspondant au nom saisi ; aucun résultat ne doit être inféré à partir des cartes.

### États

| État | Contenu | Action |
| --- | --- | --- |
| Chargement | Liste factuelle en squelette | Aucune action bloquante |
| Recherche sans résultat | « Aucune extension ne correspond à cette recherche. » | `Voir les dernières extensions` |
| Catalogue indisponible | « Impossible de charger les extensions pour le moment. » | `Réessayer` et lien `Explorer le catalogue` |

## 7. Album d’extension en mode activation

### Entrée et contexte

Après `Choisir cette extension`, ouvrir directement l’album de cette extension, sans détour par le catalogue global ou le tableau de collection.

L’album utilise un état simplifié et orienté activation :

Titre :

> Ajoutez votre première carte

Texte avant le premier ajout :

> Touchez « J’ai cette carte » pour commencer votre progression dans cette extension.

Le compteur d’extension est visible au-dessus de la grille dès le chargement, au format `0 / X`, avec barre de progression. Il devient le repère principal de la session ; la progression globale de toute la collection est masquée dans ce contexte.

### Actions par carte

Chaque carte a deux actions distinctes, accessibles sans ambiguïté :

| Action | Libellé | Effet |
| --- | --- | --- |
| Possession | `J’ai cette carte` | Ajoute la carte à la collection, puis devient `Retirer de ma collection` après confirmation explicite ou dans un état secondaire non accidentel. |
| Détail | `Voir la carte` | Ouvre la fiche ou modale de la carte sans modifier la collection. |

Règles obligatoires :

- Le clic sur l’image ou sur la tuile ouvre `Voir la carte` ou reste non mutatif ; il ne retire jamais une carte possédée.
- Une carte possédée ne peut pas être retirée par un tap accidentel sur son visuel.
- Le contrôle de possession doit avoir un libellé accessible et une zone tactile mobile d’au moins 44 px.
- Les filtres avancés, comparaison, partage, prix et autres outils restent accessibles hors de la couche initiale d’activation, mais ne rivalisent pas visuellement avec l’action de possession.

### Recherche dans l’album

Champ :

> Rechercher une carte dans cette extension

Une recherche sans résultat affiche :

> Cette carte n’est pas dans cette extension.

CTA : `Effacer la recherche`.

Un filtre léger peut proposer `Afficher les cartes manquantes` après la première valeur. Les filtres avancés ne sont pas nécessaires pour démarrer.

## 8. Confirmation et poursuite

### Après le premier ajout

Afficher dans l’album une confirmation non bloquante, sans modal ni changement de page :

> Carte ajoutée · 1 / X cartes dans cette extension

Le nombre réel remplace `1` et `X` selon l’état de l’album. La barre et le compteur d’extension sont mis à jour dans la même interaction.

CTA principal :

> Continuer à ajouter

Ce CTA :

- conserve l’utilisateur dans l’album ;
- referme éventuellement un détail de carte ;
- replace le focus visuel sur la grille ou sur la recherche ;
- ne modifie pas les filtres ni les cartes déjà ajoutées.

Il n’y a pas de CTA `Voir mon album`, puisque l’utilisateur se trouve déjà dans l’album.

### Après la première valeur

Sous le compteur ou dans une aide discrète :

> Votre album est commencé. Ajoutez une autre carte ou repérez celles qu’il vous manque.

### Wishlist

La wishlist est proposée seulement après la première valeur, dans l’un des deux cas :

1. l’utilisateur consulte une carte non possédée dans la fiche carte ;
2. il utilise le filtre des cartes manquantes dans l’album.

CTA :

> Ajouter à ma wishlist

Après l’ajout :

> Carte ajoutée à votre wishlist

Cette action peut constituer l’action intentionnelle qui complète l’activation. La wishlist ne doit pas être imposée, ni affichée comme étape obligatoire après la première carte.

### Après activation

Lorsque l’utilisateur a ajouté une seconde carte ou une carte à la wishlist après la première valeur :

- conserver l’album et ses contrôles ;
- afficher éventuellement un message bref de continuité, sans célébration bloquante ;
- proposer la création de compte comme bannière facultative uniquement si la synchronisation est disponible.

Texte de bannière :

> Votre collection est enregistrée sur cet appareil. Créez un compte pour la retrouver sur vos autres appareils.

CTA : `Créer un compte`.

Alternative : `Continuer sans compte` ou fermeture explicite.

La proposition ne doit pas apparaître avant l’activation, ne doit pas bloquer l’album et ne doit pas suggérer que les données locales seront perdues sans compte.

Si la synchronisation n’est pas configurée, ne pas afficher cette bannière ni un appel à créer un compte associé à la sauvegarde.

## 9. Navigation, retour et changement d’extension

### Retour arrière

- Depuis l’album lancé depuis `/tcg/start`, le retour navigateur revient à `/tcg/start` avec la recherche et le contexte de sélection encore disponibles pendant la session.
- Les ajouts de cartes sont enregistrés localement dès leur action ; revenir en arrière ne les annule jamais.
- Depuis une fiche carte ouverte dans l’album, le retour ou la fermeture revient à l’album avec son extension, sa recherche et ses filtres inchangés.

### Changement d’extension

- Un contrôle `Changer d’extension` est disponible dans l’album en mode activation, sans être plus visible que l’action de possession.
- Il renvoie vers `/tcg/start`.
- Le changement d’extension ne remet pas à zéro la collection, la wishlist ou la progression des extensions déjà enrichies.
- L’extension nouvellement choisie ouvre son propre album à `0 / X` ou à son compteur réel si des cartes y ont déjà été ajoutées.

## 10. Pont vers les outils jeu

Sur les fiches de cartes de catégorie Pokémon, proposer comme action secondaire :

> Voir [nom du Pokémon] dans le Pokédex

Cette action ne modifie ni collection ni wishlist. Elle est disponible après la consultation volontaire de la fiche carte, pas dans la confirmation du premier ajout.

Depuis le Pokédex, les fonctions d’équipe peuvent rester accessibles selon le produit existant. Le parcours d’activation collection ne pousse pas automatiquement l’utilisateur vers une équipe.

## 11. Exigences mobile et accessibilité

- Sur mobile, la recherche d’extension, le titre et les premières extensions sont accessibles sans interaction complexe ni panneau latéral.
- Les actions de chaque carte sont explicites, séparées et atteignables au pouce.
- Les confirmations sont annoncées via une région `aria-live` appropriée sans déplacer le focus de manière intrusive.
- Les libellés ne dépendent pas uniquement de la couleur, de l’icône ou de l’état visuel de la carte.
- Les mises à jour de compteur restent lisibles avec zoom navigateur et lecteur d’écran.
- Le parcours doit respecter la préférence de réduction des animations.

## 12. Instrumentation prévue, mais différée

L’implémentation de ces événements attend le choix de l’outil analytics et la validation des règles de consentement. La présente liste définit seulement le contrat de mesure futur ; elle ne justifie aucune collecte avant ces décisions.

| Événement | Déclencheur | Propriétés minimales |
| --- | --- | --- |
| `activation_started` | Ouverture de `/tcg/start` | `source` (`home_cta`, `catalog`, `direct`, `seo`) |
| `activation_set_search_used` | Saisie effective dans la recherche d’extension | longueur de requête, sans requête brute |
| `activation_set_selected` | Choix d’une extension | `set_id`, méthode (`search`, `latest_list`) |
| `activation_album_opened` | Album ouvert après sélection | `set_id`, `entry_point` |
| `activation_card_detail_opened` | `Voir la carte` depuis l’album | `card_id`, `set_id` |
| `collection_card_added` | Carte ajoutée | `card_id`, `set_id`, compteur de l’extension après ajout |
| `set_progress_displayed` | Compteur post-ajout rendu visible | `set_id`, `owned_count`, `total_count` |
| `activation_first_value_reached` | Première carte ajoutée et compteur affiché | `set_id`, `owned_count`, `total_count` |
| `collection_wishlist_added` | Carte manquante ajoutée à la wishlist | `card_id`, `set_id`, contexte (`album`, `detail`) |
| `activation_completed` | Deuxième carte ajoutée ou wishlist ajoutée après première valeur | méthode (`second_owned_card`, `wishlist`) |
| `account_sync_prompt_shown` | Bannière de compte affichée après activation | synchronisation disponible : vrai |
| `account_sync_prompt_actioned` | Action sur la bannière | `create_account`, `continue_local`, `dismiss` |
| `card_to_pokemon_opened` | Ouverture du Pokédex depuis une carte | `card_id`, `pokemon_id`, `set_id` |
| `collection_returned` | Nouvelle session avec action collection | délai depuis première valeur, sans identifiant personnel |

Les événements ne doivent inclure ni adresse e-mail, ni nom de compte, ni texte de recherche brut, ni donnée personnelle inutile.

### Indicateurs futurs

- conversion `activation_started → activation_first_value_reached` ;
- conversion `activation_first_value_reached → activation_completed` ;
- répartition entre seconde carte et wishlist ;
- retour en session distincte après activation ;
- exposition et acceptation de la proposition de synchronisation après activation ;
- utilisation du pont carte → Pokémon.

Il n’existe pas encore de trafic ni de résultat à interpréter : ces mesures servent à établir une référence après mise en ligne, pas à justifier une performance supposée.

## 13. Critères d’acceptation pour l’implémentation future

1. Le CTA `Commencer ma collection` ouvre `/tcg/start` pour un utilisateur sans carte locale.
2. `/tcg/start` permet de rechercher une extension et affiche les dernières extensions par date, sans personnalisation.
3. Le choix d’une extension ouvre directement son album en état d’activation.
4. L’album affiche un compteur exact `possédées / total` avant et après tout ajout.
5. Chaque carte expose `J’ai cette carte` et `Voir la carte` comme actions distinctes.
6. Ni l’image ni la tuile d’une carte ne retirent accidentellement une carte possédée.
7. Après le premier ajout, l’album affiche la confirmation non bloquante `Carte ajoutée · 1 / X cartes dans cette extension` avec les valeurs réelles et le CTA `Continuer à ajouter`.
8. La wishlist est proposée uniquement après la première valeur, depuis une carte manquante ou la vue des cartes manquantes.
9. La création de compte est proposée seulement après activation, de façon facultative, et seulement lorsque la synchronisation est disponible.
10. Un utilisateur avec des cartes locales voit `Reprendre ma collection` et n’est jamais forcé dans le parcours débutant.
11. Retour arrière et changement d’extension préservent tous les ajouts déjà effectués.
12. Aucun événement analytics n’est implémenté avant la décision sur l’outil et le consentement ; le contrat d’événements ci-dessus est conservé pour cette étape.

## 14. Auto-relecture

- Aucun compte n’est requis avant, pendant ou après la première valeur.
- La première valeur et l’activation sont distinctes : une carte + compteur, puis seconde carte ou wishlist.
- L’album est la destination directe après le choix de l’extension ; aucun CTA redondant ne renvoie vers l’album.
- La liste d’extensions est explicitement factuelle et chronologique, sans recommandation inférée.
- La suppression accidentelle par clic sur une tuile est explicitement interdite.
- Les ajouts persistent localement et survivront aux retours arrière et aux changements d’extension.
- La synchronisation et les analytics sont séparés : la première est standard lorsqu’elle est disponible ; les seconds restent non implémentés jusqu’aux décisions de consentement et d’outil.
