# Lunidex — audit mobile et corrections locales

Campagne du 2 au 3 octobre 2026, Europe/Paris. Ce rapport complète le diagnostic du 2 octobre et décrit les corrections et leur nouvelle vérification. Aucun déploiement, push, migration ou changement de données distantes n’a été effectué.

## Résultat et périmètre réel

Les 59 fichiers de pages ont été cartographiés. La campagne de correction a revisité 81 destinations représentatives, comprenant les pages secondaires, routes dynamiques, documents, outils Pokémon, espaces TCG et états indisponibles. Le contrôle final à **320 × 568** ne relève aucun débordement horizontal global ni erreur JavaScript sur ces 81 destinations. Le profil volontairement inexistant répond 404, comme attendu.

Ces résultats valident le rendu et les scénarios explicitement décrits ci-dessous. Ils ne valident pas le CRUD connecté, tous les Pokémon/cartes/produits possibles, ni toutes les combinaisons de filtres. Les tableaux et rails de types gardent leur défilement interne intentionnel.

Le navigateur utilisé est Chromium avec émulation mobile, tactile et pointeur grossier. Les formats principaux sont 375 × 812 et 320 × 568 ; un passage en paysage à 812 × 375 et un contrôle ordinateur à 1440 × 900 complètent la campagne. Aucun téléphone physique, Safari iOS, clavier natif ou appareil Android réel n’est revendiqué.

## Environnement et méthode

- Dépôt local, Node 22.22.3, Next 16.3.3, React 19 et npm existants ; aucune nouvelle dépendance ou installation n’a été nécessaire.
- Build de production avec `--webpack`, dans une copie isolée sous `/private/tmp/lunidex-mobile-validation-final-20261003`, servi sur `127.0.0.1:3101`. Les fichiers publics sont copiés ; aucun `.env` secret n’est copié.
- Contextes navigateur de test. Les mutations de l’API Lunidex sont bloquées ; les lectures GraphQL PokéAPI restent autorisées. Les cas de panne simulés sont distingués des indisponibilités réelles.
- Les vérifications axe ciblent les règles WCAG 2 A/AA disponibles, après stabilisation des données et animations. Elles ne constituent pas une certification de conformité. Les états dépliés et les modales sont contrôlés séparément.
- Les modifications préexistantes et celles apparues pendant la campagne ont été conservées. Aucun commit n’a été créé.

## Couverture fonctionnelle après correction

| Famille | Scénarios réellement exercés | Limite de la validation |
|---|---|---|
| Navigation et aide | Menu Plus, destinations localisées, fermeture avec Escape ; recherche FAQ « compte » et ouverture d’une réponse ; pages d’accueil, guides, comparatifs, blog, légales et documentation | Les liens externes ne sont pas utilisés pour publier ou envoyer des messages |
| Pokédex | Recherche Pikachu et ses formes ; filtre Feu ; tri ID décroissant ; modale de filtres ; état visiteur d’ajout au comparateur ; cibles de 44 px à 320 px ; paysage | Favoris, captures et équipe personnelle durables nécessitent une session autorisée |
| Fiche Pokémon | Onglets À propos, Statistiques, Évolution, Capacités et Cartes ; données Pikachu, liens et défilement | Le rendu d’une fiche ne valide pas toutes les espèces ou formes |
| Talents, Objets, Capacités | Catalogues complets ; Technicien, Restes et Tonnerre ; consultation des fiches ; retour arrière et reload avec recherche conservée ; aperçu et filtres examinés dans la campagne initiale | Les descriptions et catégories fournies par PokéAPI peuvent rester dans leur langue source |
| Équipe | Lien public 25-6-9 : Pikachu, Dracaufeu, Tortank, synergie ; reload ; sections d’analyse ; import Showdown en aperçu et restriction visiteur | Enregistrement dans un compte, remplacement durable et synchronisation non validés |
| Comparaison | Lien avec doublons : trois membres distincts ; résultats et recommandations ; reload ; lien invalide avec message explicite | État personnel et toutes les combinaisons non validés |
| Types | 324 cellules ; sélection et `aria-pressed` ; flèche droite de Normal/Normal vers Normal/Feu ; défilement interne | Pas de test avec un lecteur d’écran matériel |
| EV/IV | Pikachu niveau 50, EV zéro : IV 30–31 ; statistique impossible explicitement signalée ; planificateur 252 + 252 + 6 = 510 ; reset ; calculs aux niveaux 50/100 | Natures et espèces représentatives seulement |
| Élevage | Pikachu + Métamorph ; changement de parent ; sélection au clavier avec attente ; sprite chargé ; douze curseurs nommés ; Nœud Câlin et Pierre Immobile ; résultat 0,52 %, environ 192 œufs ; retour/nouvelle paire ; explorateur œuf | Les mécanismes du moteur sont aussi couverts par les tests unitaires ; pas d’exhaustivité des formes |
| Combat | Sélection Pikachu/Dracaufeu ; dégâts Tonnerre ; météo Pluie ; duel automatique ; sélection au clavier sans disparition des suggestions | Combat multijoueur et communications entre comptes non testés |
| Quiz | Partie chronométrée complète, une bonne réponse : 10 points et 1/1 correct ; carte de résultat ; noms accessibles des boutons de partage ; autres modes dans le diagnostic initial | Aucune publication Twitter, aucun envoi ni copie d’image distante effectués |
| Paramètres et sauvegarde | Son/sprites après reload ; fichier JSON malformé rejeté ; aperçu valide ; Escape et retour à la modale de paramètres ; validations imbriquées et plafonds testés | Confirmation effective de remplacement non exécutée, voir blocages |
| Tableau de bord | Ouverture des sections Progression, Quiz et Activité ; compteurs/états vides ; contraste des sections ouvertes | Données et progrès d’un compte réel non validés |
| TCG public | Extension 151 ; recherche Charizard ; tri ; langue des cartes indépendante du préfixe français ; état vide ; sélection de grille ; détail de carte et Escape ; fiches carte/extension ; chargement à froid | Couverture représentative des cartes et langues, sans validation de possession durable |
| TCG secondaire et scellés | Routes, liens, formulaires et états accessibles de collection, wishlist, decks, portefeuille, marché, fréquences et valeur des boosters ; tracker anniversaire en lecture | Données privées indisponibles ; certaines données publiques du marché sont indisponibles localement ; aucune valeur de booster inventée |
| Contact et erreurs | Quatre champs obligatoires ; focus sur le premier champ ; validation e-mail ; réponse 503 simulée et saisie conservée dans l’investigation ; profil inexistant et autres états d’erreur | Aucun message de contact réel envoyé |

Les huit langues ont un nouveau contrôle de l’outil EV/IV : attribut `lang`, titre localisé, préfixes des liens et taille des champs de 16 px. Cela s’ajoute aux visites multilingues du diagnostic initial, sans affirmer une validation de tous les textes dans chaque langue.

## Anomalies et corrections

Les identifiants BUG-001 à BUG-015 renvoient au diagnostic initial conservé dans `2026-10-02-audit-fonctionnel-lunidex.md`.

| Gravité | Défaut reproduit | Correction et résultat |
|---|---|---|
| P1 · BUG-001 | Trois catalogues limités à l’aperçu SSR de 48 entrées | Aperçu déclaré ancien dans TanStack Query ; chargement complet : 937 capacités, 307 talents, 800 objets. Les trois recherches de référence trouvent leurs fiches |
| P1 · BUG-002 | Équipe partagée vide au reload pour un visiteur | Aperçu indépendant de l’équipe personnelle et lecture directe du code URL ; trois membres présents après reload, sauvegarde explicite |
| P1 · BUG-003 | Import annoncé réussi malgré absence de persistance | Contrôle d’accès avant application, suppression de la fausse réussite et validation stricte avant aperçu. Application durable non revendiquée |
| P2 · BUG-004 | Showdown annonce des ajouts qui n’ont pas lieu | Contrôle d’accès et comptage des ajouts réellement appliqués ; aperçu conservé sans fausse confirmation |
| P2 · BUG-005 | Préférences son/sprites perdues | Persistance des deux booléens dans l’enveloppe locale existante ; reload vérifié |
| P2 · BUG-006 | Hydratation React divergente sur la fiche TCG | Langue et fuseau déterministes pour les dates ; aucune erreur React observée lors des nouvelles visites |
| P2 · BUG-007 | Clés ou libellés de secours visibles | Traductions additionnelles dans les huit langues pour les outils et états corrigés ; localisation des contrôles, tri et cartes de résultat |
| P2 · BUG-008 | Action favori coupée sur petits écrans | Actions Pokédex en deux colonnes aux petites largeurs, cibles 44 × 44 ; géométrie vérifiée à 320 px |
| P2 · BUG-009 | Contrastes insuffisants | Texte secondaire renforcé, couleurs de types lisibles, boutons et états actifs ajustés, corrections ciblées des sections ouvertes et du thème sombre |
| P2 · BUG-010 | Champs EV/IV sans noms associés | Labels et noms accessibles liés aux statistiques, nature et unités ; contrôle navigateur et axe |
| P2 · BUG-011 | Rôles ARIA incohérents sur les types | Table native avec boutons sélectionnables, noms et navigation directionnelle ; 324 cellules exercées représentativement |
| P2 · BUG-012 | Doublons dans le lien de comparaison | Validation d’IDs entiers positifs sûrs, déduplication avant limite ; 25,25,6,9 devient trois membres |
| P3 · BUG-013 | Lien invalide présenté comme vide normal | Message dédié et reprise ; aucune substitution par l’état personnel |
| P2 · BUG-014 | Borne « 25 m » présentée comme plafond alors qu’elle est ouverte | Contrat existant conservé, borne explicitement « 25 m+ » dans modale et résumé ; fonction et cas limites testés |
| P2 · BUG-015 | Mauvaise extension annoncée pendant chargement | Nom lié à la sélection réelle, sinon ID neutre ; pas de substitution par la dernière extension |
| P2 | 220 détails d’extension téléchargés pour construire les filtres TCG | Catalogue compact déjà disponible dans l’API centralisée ; ordre de sortie conservé. Mesure à froid : 221 requêtes d’extensions avant, 1 après sur dix secondes, avec cartes présentes |
| P2 | Changement de parent sans effet et sprites invalides | Remise à zéro explicite du parent ; URL de sprite numérique ; sélection et image 96 px chargée vérifiées |
| P2 | Suggestions perdues au clavier ou après un appui prolongé | Sélection par clic accessible et fermeture uniquement lorsque le focus quitte le sélecteur ; Tab, attente 550 ms, Enter vérifiés dans élevage et combat |
| P2 | Quiz chronométré affichant 10/1 bonnes réponses | Séparation points/bonnes réponses dans la carte et l’image de résultat ; partie réelle vérifiée à 10 points et 1/1 |
| P2 | Données JSON imbriquées invalides acceptées | Validation des runs, rencontres, decks/cartes, historique quiz, recherches, notes, dictionnaires et limites de comparaison ; sauvegarde complète valide et fichiers malformés testés |
| P2 | Recherche perdue au retour depuis une fiche catalogue | Filtres primitifs conservés dans l’entrée d’historique via l’URL ; trois retours arrière et trois reloads vérifiés |
| P2 | Définition de tableau de bord invalide et contraste des sections ouvertes | Valeurs en `dd`, pourcentage sur fond lisible, labels TCG et couverture d’équipe corrigés ; retest dédié |

Les erreurs de pilotage (sélecteurs de test incorrects, observation avant fin d’animation) restent exclues des réussites. Les erreurs d’images du premier environnement de copie ont été résolues en copiant les fichiers publics ; elles ne sont pas attribuées à l’application.

L’inspection visuelle des captures a aussi montré un libellé Électrik jaune peu lisible sur une carte du Pokédex, alors qu’axe ne le signalait pas. Le texte des badges de type et légendaires utilise désormais la couleur de texte du thème ; fonds et bordures conservent la couleur du type. Ce cas illustre la limite du seul contrôle automatisé.

## Vérifications techniques

| Contrôle final | Résultat |
|---|---|
| `npm run lint` | Réussi |
| `npm run typecheck` | Réussi |
| `npm test` | 103 fichiers, 501 tests réussis |
| `npm run seo:check` | Réussi |
| `npm run build` | Réussi, 307 pages générées, mode webpack conservé |
| TypeScript `packages/core` | Réussi |
| `git diff --check` | Réussi |

Les noms techniques historiques, règles de sécurité, configuration CSP et dépendances n’ont pas été migrés. Les fichiers PWA générés par les builds restent dans la copie isolée.

## Blocages et limites restantes

1. **Compte et données personnelles :** aucun compte Neon de test configuré. Inscription, vérification e-mail, login réel, reset réel, déconnexion, synchronisation et renouvellement de session restent non validés. Même limite pour les favoris/captures, albums et variantes TCG, decks enregistrés, Nuzlocke, amis et portefeuille de scellés. Le rendu de leurs formulaires ou états vides ne constitue pas une réussite métier.
2. **Import effectif :** la validation automatique a rejeté le clic « Importer » parce qu’il peut écraser des données persistées. Aucun contournement n’a été effectué. Le parseur, l’aperçu, le refus de données invalides et la fermeture sont vérifiés ; l’application reste à tester dans un compte et une base jetables autorisés.
3. **Services publics :** le marché des scellés peut afficher une indisponibilité du catalogue dans la copie locale. Le calcul chiffré de valeur de booster reste indisponible sans échantillon validé. Ces interfaces ont été visitées, pas déclarées pleinement fonctionnelles avec de vraies données.
4. **Appareils et PWA :** pas de Safari/WebKit, appareil physique, clavier logiciel natif, installation PWA ou notification réelle. Le comportement tactile Chromium, les tailles de saisie et les changements de viewport sont vérifiés ; ils ne remplacent pas ces tests.
5. **Exhaustivité des données :** les exemples testés sont précisés ; les milliers de références et variantes, toutes les combinaisons et toutes les traductions ne sont pas couvertes exhaustivement.

La prochaine campagne utile nécessite deux comptes de test et une base jetable, puis des essais sur Safari iOS et Chrome Android physiques. Elle doit reprendre en priorité l’import/export durable, les mutations de collection, le Nuzlocke, les decks, les amis et le portefeuille, avec vérification après reload et dans un second onglet. Aucun défaut mobile reproductible encore ouvert dans les scénarios de correction autorisés n’est masqué par ces limites.

## Preuves

- `2026-10-02-mobile-corrections/` : résultats JSON des visites et parcours, mesures avant/après et logs finaux.
- `couverture-final-81.csv` : destinations, statuts, géométrie, erreurs et limites de parcours personnels ; `source-manifest.json` : empreintes des sources comparées à la copie compilée.
- `smallFinal.json` : 81 visites finales à 320 px, statuts HTTP, géométrie et erreurs JavaScript.
- `settledAxe1..4.json` : 80 contrôles après stabilisation ; `keyboardFinal.json` couvre la reprise du tableau des types ; les reprises des états développés sont conservées séparément.
- `catalogueHistoryFinal.json`, `sharedLinksFinal.json`, `quizResultFinal.json`, `evTcgFlows.json`, `pokedexFlows.json`, `backupFlowsFinal.json`, `pokemonTabsFinal.json` : scénarios fonctionnels détaillés.
- `tcgPerformanceAfter.json` et `tcg-performance-before.json` : mesure de requêtes à froid.
- `desktopFinal.json`, `localesFinal.json`, `darkFinal.json`, `darkRetestFinal.json` : régressions ordinateur, langues et thème sombre.
- `expandedStatesAxeFinalPass.json` : sections ouvertes de tableau de bord, équipe et comparaison, en clair et sombre, sans violation détectée ; `heightMissingIdsFinal.json` : borne ouverte de taille et ID absent sans décalage des membres.
- `pokedex-320-final.png` et `team-375-final.png` : captures inspectées ; les preuves du contraste jaune avant/après sont conservées séparément.
- Le diagnostic et sa matrice initiale restent disponibles pour les scénarios inchangés et les blocages détaillés ; leurs nombres historiques ne sont pas fusionnés avec ceux de cette nouvelle campagne.
