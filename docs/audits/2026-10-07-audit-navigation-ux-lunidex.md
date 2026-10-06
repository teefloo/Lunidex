# Audit de navigation et UX de Lunidex

7 octobre 2026 · Production inspectée : https://lunidex.app · Référence locale initiale : `95e615cc`.

**Sept problèmes dédupliqués sont corrigés et vérifiés localement.** Les résultats décrivent la production au moment de l’inspection ; la mise en production des corrections n’a pas été vérifiée. Ce rapport complète celui du 6 octobre sans le remplacer.

| Priorité | Confirmés | Corrigés localement |
| --- | ---: | ---: |
| critique | 0 | 0 |
| élevée | 1 | 1 |
| moyenne | 4 | 4 |
| faible | 2 | 2 |
| Total | 7 | 7 |

## Méthode et couverture réelle

Audit Chromium, en contextes anonymes distincts, à **1440 × 900** et **390 × 844 avec tactile émulé**. Les parcours approfondis sont réalisés en français. Les menus et éléments fixes sont aussi contrôlés à 320 × 568, 768 × 1024, 1023 × 768, 1024 × 768 et 844 × 390 en paysage. Aucun téléphone physique ni Safari iOS n’a été utilisé.

L’inventaire croise les routes `src/app`, les 37 destinations du registre de navigation, les menus de l’accueil et des pages internes, le footer, les liens contextuels et le blog. Le balayage comporte **73 destinations/scénarios directs par format, soit 146 chargements** : 71 destinations existantes ou redirections et deux pages inexistantes. Les 10 guides et 11 comparatifs accessibles depuis le blog sont inclus. Les données dynamiques proviennent de liens réellement affichés : Bulbizarre, Pikachu, Bélier, Absorbe-Eau, Anti-Brûle, 30th Celebration, Exeggcute, Dracaufeu-ex et le produit scellé 611877.

La [matrice complète](2026-10-07-preuves-navigation/matrice-destinations.csv) distingue chaque chargement direct des interactions effectivement exercées. **Un HTTP 200 ou une lecture d’écran ne vaut pas validation de tous les contrôles de la page.** Les familles personnelles sans données ni session autorisée y restent explicitement non vérifiées. Les [compteurs recalculés](2026-10-07-preuves-navigation/couverture.json) proviennent des preuves de cette session ; l’audit historique n’est pas ajouté à leur couverture.

| Famille | Accès directs sur les deux formats | Interactions réellement exercées en production |
| --- | --- | --- |
| Navigation partagée | accueil, 37 routes du registre, footer et ressources | deux menus, Tab, Échap, restitution du focus ; paramètres ouverts/lus/fermés ; recherche globale vers Types |
| Pokédex et Pokémon | Pokédex, Bulbizarre ; Pikachu dans le parcours | recherche Pikachu, statistiques/évolution, actualisation, retour à la recherche, avance vers le dernier onglet |
| Types | page Types | sélection Eau ; menu Pokédex → Types et actualisation dans les huit locales |
| Capacités | liste et Bélier | recherche, aperçu, Échap, filtres Eau + Spécial, tri Puissance, reset, détail et historique |
| Talents | liste et Absorbe-Eau | recherche, tri ID, reset, détail, actualisation, retour/avance |
| Objets | liste et Anti-Brûle | recherche, tri Prix, catégorie Healing, reset, détail et historique |
| JCC | catalogue, extension, cartes, outils et écrans personnels | recherche Exeggcute, tri Z-A, effacement, chargement 24 → 48, aperçu/checklist → carte → fermer ; partage et breadcrumbs |
| Scellés | portefeuille et marché, calendrier, aide, produit 611877 et son alias `/products/611877` | liste → produit, actualisation, retour/avance ; aucun achat ni journal personnel modifié |
| Quiz et combat | quiz et outils | quiz classique démarré jusqu’aux quatre réponses chargées ; suggestion d’attaquant Pikachu ; aucune réponse de quiz soumise |
| Guides, comparatifs, aides | 10 guides, 11 comparatifs, documentation, FAQ, pages légales, contact, hors ligne | accordéons FAQ installation/expertise, activation du lien d’installation ; lien Cardmarket contrôlé |
| Redirections et erreurs | `/`, `/pokemon`, `/team/share` sans code, reset sans jeton, deux URL inexistantes | locale de destination et écrans d’erreur contrôlés ; aucun formulaire envoyé |

Les parcours métier non cités dans la dernière colonne ont fait l’objet d’un contrôle d’écran, pas d’une certification fonctionnelle complète. L’outil équipe vide et son partage sans code affichent une erreur explicite. Les identifiants de profils ou d’amis n’ont pas été inventés pour simuler des données personnelles.

Le contrôle d’accessibilité utilise les [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) : nom accessible, navigation clavier, focus, cibles tactiles, scroll et superposition des panneaux. Les menus mesurés ne présentent aucune cible visible inférieure à 44 px. Le contrôle ne constitue pas un audit WCAG exhaustif.

Les requêtes d’écriture sont bloquées pendant les essais. Les lectures GraphQL PokéAPI sont autorisées après inspection de leur opération ; les préchargements sont bloqués pendant le balayage puis autorisés dans des essais réseau dédiés. Le partage utilise un presse-papiers capturé dans le contexte de test. Aucun consentement analytique, compte, message, formulaire, mutation distante ou déploiement n’est soumis.

## Problèmes confirmés et corrections

### NAV-01 — Fermer une carte ne revient pas à la liste

- **Priorité : élevée. Plateformes : desktop et mobile.**
- **Reproduction :** ouvrir `/fr/tcg/sets/30th?tcgLang=en`, choisir Exeggcute depuis l’aperçu ou la checklist, puis fermer. Charger aussi directement sa fiche.
- **Observé :** le fond contient déjà une seconde fiche ; fermer conserve `/fr/tcg/cards/30th-001?tcgLang=en` et laisse le focus sur `BODY`. Un accès direct ouvre automatiquement le dialogue.
- **Attendu :** fermer revient à la liste d’origine avec langue, filtres, vue, scroll et focus ; retour navigateur ferme, avance rouvre ; accès direct, nouvel onglet et actualisation affichent la fiche autonome complète.
- **Impact :** perte du contexte de consultation et interruption du parcours clavier.
- **Preuve initiale :** [interactions-07](2026-10-07-preuves-navigation/interactions-07.json), captures [desktop](2026-10-07-preuves-navigation/card-desktop-preview-closed.png) et [mobile](2026-10-07-preuves-navigation/card-mobile-checklist-closed.png).
- **Cause :** la réécriture locale arrivait après l’interception Next.js ; la checklist comportait des ancres HTML brutes ; la page autonome initialisait une seconde modale. Après activation de l’interception, l’effet de synchronisation du catalogue risquait aussi de remplacer l’URL de la carte et de réinitialiser sa vue.
- **Correction :** réécritures localisées dans `beforeFiles`, liens Next pour aperçu/checklist, contenu interactif partagé entre page et modale, suppression de l’ouverture automatique, navigation du catalogue par le slot existant. La synchronisation du catalogue est suspendue pendant l’interception.
- **Vérification :** [aperçu et checklist](2026-10-07-preuves-navigation/build-final-card-flow.json), [catalogue/historique/reload/nouvel onglet](2026-10-07-preuves-navigation/build-final-catalog-history.json), [bouclage Tab et Échap](2026-10-07-preuves-navigation/build-final-language-keyboard.json). Le focus revient au lien d’extension ou au bouton de catalogue ; scroll de checklist restauré à 2443 px desktop et 5829 px mobile. La recherche, le tri et la vue tableau restent identiques.
- **Statut : corrigé localement**, sur les deux formats. Les écritures personnelles restent non certifiées sans session autorisée.

### NAV-02 — Préchargements répétés dans le parcours d’extension

- **Priorité : moyenne. Plateforme mesurée : desktop.**
- **Reproduction :** contexte neuf, préchargements autorisés, extension 30th puis Exeggcute ; fenêtre d’observation d’environ deux secondes.
- **Observé :** 160 GET, dont 62 préchargements et 40 requêtes vers `/fr`.
- **Attendu :** charger la fiche consultée sans précharger toutes les cartes ni répéter l’accueil.
- **Impact :** trafic et travail serveur inutiles ; les annulations de préchargement ne prouvent pas seules une erreur utilisateur.
- **Preuve initiale :** [mesure de production](2026-10-07-preuves-navigation/network-prefetch.json).
- **Cause :** préchargements des nombreux liens Next, dont les breadcrumbs, combinés au parcours d’interception incorrect.
- **Correction :** `prefetch={false}` sur aperçus, checklist, titres et extensions du catalogue et breadcrumbs partagés ; ordre des réécritures corrigé.
- **Vérification :** [build local, contexte neuf](2026-10-07-preuves-navigation/build-network-prefetch.json) : 92 GET, 7 préchargements, zéro requête vers l’accueil et zéro erreur de page. Le nombre total inclut les ressources des bundles différents : cette comparaison ne mesure pas un gain de performance en pourcentage et ne prédit pas les temps de production.
- **Statut : corrigé localement.**

### NAV-03 — Un décor bloque le breadcrumb de la fiche

- **Priorité : moyenne. Plateformes : desktop et mobile.**
- **Reproduction :** ouvrir `/fr/tcg/cards/sv03-228?tcgLang=fr`, fermer la modale automatique, cliquer sur Flammes Obsidiennes dans le breadcrumb.
- **Observé :** le décor `fixed inset-0` intercepte le clic/toucher ; le lien fonctionne au clavier.
- **Attendu :** retour contextuel utilisable au pointeur comme au clavier.
- **Impact :** lien de retour inaccessible à la souris et au toucher.
- **Preuves initiales :** [desktop](2026-10-07-preuves-navigation/card-language-context.json), [mobile](2026-10-07-preuves-navigation/card-language-context-mobile.json), captures `card-breadcrumb-*`.
- **Cause :** couche décorative fixe de la fiche dupliquée.
- **Correction :** suppression de cette fiche dupliquée ; les décors du contenu partagé conservent `pointer-events-none`.
- **Vérification :** [test final de pointeur et clic réel](2026-10-07-preuves-navigation/build-final-standalone-actions.json), sur les deux formats : le lien reçoit le pointeur et ouvre l’extension française.
- **Statut : corrigé localement.**

### NAV-04 — Les liens contextuels perdent la langue

- **Priorité : moyenne. Plateformes : desktop et mobile.**
- **Reproduction :** sur Dracaufeu-ex en français, partager ou suivre le breadcrumb d’extension ; depuis l’extension française, suivre le breadcrumb du catalogue.
- **Observé :** le partage omet `/fr` ; le retour d’une carte à l’extension omet `tcgLang=fr` et affiche Obsidian Flames ; le retour d’une extension au catalogue sélectionne `en`.
- **Attendu :** conserver séparément la langue d’interface et celle des cartes.
- **Impact :** changement inattendu de langue dans les retours et partages.
- **Preuves initiales :** [carte desktop](2026-10-07-preuves-navigation/card-language-context.json), [carte mobile](2026-10-07-preuves-navigation/card-language-context-mobile.json), [extension → catalogue](2026-10-07-preuves-navigation/set-language-context.json).
- **Cause :** partage construit sans helper localisé et breadcrumbs sans paramètre de langue JCC.
- **Correction :** `localeHref` pour le partage ; `tcgLang` transmis par les breadcrumbs carte → extension/catalogue et extension → catalogue.
- **Vérification :** [partage et extension](2026-10-07-preuves-navigation/build-final-standalone-actions.json), [catalogue](2026-10-07-preuves-navigation/build-final-language-keyboard.json). L’URL partagée contient `/fr/...?...tcgLang=fr`, l’extension affiche Flammes Obsidiennes et le sélecteur du catalogue reste `fr`.
- **Statut : corrigé localement.**

### NAV-05 — La recherche globale n’a pas de nom accessible

- **Priorité : faible. Plateformes : desktop et mobile.**
- **Reproduction :** ouvrir la recherche globale et inspecter son champ combobox dans l’arbre d’accessibilité.
- **Observé :** nom vide ; `aria-labelledby` référence le label vide de cmdk. Le titre du dialogue ne nomme pas son champ.
- **Attendu :** nom traduit « Rechercher dans Lunidex » pour le champ.
- **Impact :** repérage moins clair au lecteur d’écran.
- **Preuve initiale :** [arbre et navigation](2026-10-07-preuves-navigation/command-palette-name-red.json).
- **Cause :** propriété `label` absente du composant Command.
- **Correction :** réutilisation de la traduction du titre pour cette propriété.
- **Vérification :** [combobox nommée, Échap/focus, recherche Types](2026-10-07-preuves-navigation/build-final-command-palette.json), sur les deux formats.
- **Statut : corrigé localement.**

### NAV-06 — Le lien de capacité annonce un libellé anglais

- **Priorité : faible. Plateformes : desktop et mobile.**
- **Reproduction :** rechercher Bélier sur `/fr/moves` et inspecter le lien de détail.
- **Observé :** nom accessible « View details for Bélier », malgré le texte visible français.
- **Attendu :** libellé dans la langue d’interface avec le nom de la capacité.
- **Impact :** incohérence pour les lecteurs d’écran et la commande vocale.
- **Preuve initiale :** [recherche et aperçu en production](2026-10-07-preuves-navigation/interactions-13.json).
- **Cause :** chaîne anglaise codée en dur dans `aria-label`.
- **Correction :** réutilisation de `moves_page.detail_title` avec le nom localisé ; aucune nouvelle chaîne ni clé de traduction.
- **Vérification :** [build local](2026-10-07-preuves-navigation/build-final-moves.json) : « Détails de la capacité: Bélier » ; recherche, aperçu, filtres, tri et reset passent sur les deux formats.
- **Statut : corrigé localement.**

### NAV-07 — Le menu interne déborde à gauche à 1024 px

- **Priorité : moyenne. Plateforme : desktop à la frontière 1024 px.**
- **Reproduction :** afficher `/fr/pokedex` à 1024 × 768 et ouvrir Plus.
- **Observé :** panneau de 688 px, bord gauche à −143 px ; une partie des catégories et liens est hors écran. Le document ne déborde pas, ce qui rendait insuffisante la première mesure du wrapper.
- **Attendu :** panneau et liens entièrement contenus dans la fenêtre.
- **Impact :** plusieurs destinations sont masquées au seuil d’activation du menu desktop.
- **Preuves initiales :** [géométrie du panneau](2026-10-07-preuves-navigation/interactions-15-responsive.json), [capture](2026-10-07-preuves-navigation/menu-1024-clipped.png).
- **Cause :** panneau large aligné à droite du petit élément details, lui-même placé vers le milieu du header.
- **Correction :** ancrage du panneau sur la zone de navigation, avec largeur bornée à cette zone ; règles limitées au header interne.
- **Vérification :** [14 contrôles des deux menus](2026-10-07-preuves-navigation/build-final-responsive.json) à 320, 390, 768, 1023, 1024, 844 paysage et 1440 px. À 1024 px, panneau interne de x=169 à x=857 ; aucune cible visible sous 44 px, Échap ferme après transition et restaure le focus. [Capture corrigée](2026-10-07-preuves-navigation/validation-build/menu-1024-corrected.png).
- **Statut : corrigé localement.**

## Constats réseau, retests et limites

Les 146 chargements directs enregistrés ne présentent aucune erreur JavaScript de page ; les quatre HTTP 404 correspondent aux deux URL inexistantes testées sur les deux formats. Les états de lecture, contenus vides ou accès nécessitant un compte sont conservés dans les preuves. Cela ne garantit pas l’absence d’erreur serveur hors des fenêtres observées.

Les erreurs TCGdex préparatoires ne sont pas reproduites durablement. Le [retest dans deux contextes neufs](2026-10-07-preuves-navigation/network-tcgdex-fresh.json) obtient HTTP 200 pour l’image et `api.tcgdex.net/v2/fr/cards/sv03-228`, sans erreur de page. L’unique échec mobile est un préchargement Next annulé (`ERR_ABORTED`), identifié comme tel. Les essais déjà en cache de [network-tcgdex-retest](2026-10-07-preuves-navigation/network-tcgdex-retest.json) n’émettent pas de nouvelle lecture API et ne prouvent donc pas sa disponibilité. Aucune correction de données ou de fallback TCGdex n’a été fondée sur ces seuls essais.

Les deux corrections FAQ historiques sont présentes en production et ont été vérifiées à nouveau, sans être recomptées comme problèmes de ce rapport. Les onglets Pokémon utilisent `router.replace` : retour revient au Pokédex filtré, avance restaure le dernier onglet, plutôt que chaque changement d’onglet.

Des probes intermédiaires sont conservées mais exclues des validations :

- `interactions-04/05` : retour/avance lancé avant hydratation ; une course avec l’initialisation du routeur a été observée. Les retests hydratés `interactions-06` passent. Le comportement avant hydratation reste non certifié.
- `interactions-08/09` : le premier filtre réseau bloquait aussi les lectures GraphQL PokéAPI. Recherche/quiz ont été rejoués avec ces lectures autorisées dans `interactions-11`. La sélection de type a été réellement vérifiée dans `interactions-13`.
- `local-catalog-view-red` : paramètre non pris en charge `view=list`. Les essais utiles utilisent `view=table`, avec une vraie régression d’URL/vue reproduite puis corrigée et rejouée.
- `build-standalone` : le hit-test mobile initial portait sur un lien hors écran après auto-scroll du partage. Le clic réel réussissait ; le retest visible `build-breadcrumb-retest`, puis le contrôle final, passent.
- `interactions-15-responsive` : les mesures du panneau sont valides ; les drapeaux de fermeture de l’accueil ont été lus pendant sa transition de sortie. Le contrôle final attend la disparition effective.
- `diagnostics/team-share-before-settling` : géométrie transitoire avant stabilisation ; le chargement final `production-batch-11` confirme 390 px sans débordement.

Les collections, wishlists, comparaisons enregistrées, decks, amis, profils et synchronisation restent **non vérifiables sans session autorisée**. Les boutons de carte ont été activés en mode anonyme sur le build sans cloud : ils conservent leur demande de connexion et aucun enregistrement n’est effectué. Les variantes de possession liées à un compte ne sont pas certifiées. Les ressources distantes PokéAPI/TCGdex demeurent nécessaires aux parcours de lecture.

Les essais hors ligne/PWA portent sur l’écran et les liens. Installation réelle, coupure réseau complète, Safari iOS, appareils physiques et technologie d’assistance réelle ne sont pas certifiés. Les noms/catégories issus des sources peuvent rester dans leur langue d’origine ; la vérification des huit locales porte sur le routage, la langue du document et les contrôles examinés, pas sur une relecture de toutes les traductions.

## Implémentation, contrôles et livraison

Les changements concernent `next.config.ts`, les pages cartes/extensions, le contenu de carte partagé, le catalogue JCC, les breadcrumbs, la recherche globale, le lien accessible des capacités et le positionnement du menu interne. Le wrapper de modale conserve ses propriétés pour les autres consommateurs. Les informations, prix, attaques, talents, liens externes et actions existantes sont réutilisés dans la fiche autonome. Le premier rendu évite de dépendre de préférences persistées déjà hydratées.

Aucun endpoint, format de stockage, route publique, secret, configuration de sécurité ou clé de traduction n’a été ajouté. Les métadonnées canoniques et JSON-LD restent distinctes des paramètres de navigation ; les règles SEO existantes sont conservées.

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Tests Vitest | 113 fichiers, **549 tests réussis** | [tests](2026-10-07-preuves-navigation/checks/vitest.txt) |
| Lint | réussi | [lint](2026-10-07-preuves-navigation/checks/lint.txt) |
| TypeScript web | réussi | [typecheck](2026-10-07-preuves-navigation/checks/typecheck.txt) |
| `npm run seo:check` | contrôle des sources réussi ; pas une certification complète du sitemap déployé | [SEO](2026-10-07-preuves-navigation/checks/seo.txt) |
| Build `npm run build` / webpack | réussi, 308 pages statiques générées | [build](2026-10-07-preuves-navigation/checks/build.txt) |
| TypeScript core | réussi, code de sortie 0, sans diagnostic | [core](2026-10-07-preuves-navigation/checks/core.txt) |
| Huit locales, navigation + reload | 16 parcours réussis en production et 16 sur le build | [production](2026-10-07-preuves-navigation/interactions-02.json), [local](2026-10-07-preuves-navigation/build-final-locales.json) |
| Routes après réécriture globale | 24 chargements locaux : accueil, dynamiques, aides, accès, redirections, 404 | [routes](2026-10-07-preuves-navigation/build-routes.json) |
| Diff complet et `git diff --check` | relus ; aucun problème de whitespace | revue locale |

Deux régressions utiles sont ajoutées : ordre des réécritures avant interception et premier rendu autonome indépendant d’une comparaison déjà hydratée. Le test existant du landmark est renforcé avec un vrai QueryClientProvider, le h1, l’absence de dialogue et les actions de carte. Les comportements visuels et l’historique sont vérifiés dans Chromium, sans tests qui recopient simplement les classes CSS.

Le build s’exécute dans une copie temporaire sans fichiers `.env` et sans variables cloud actives ; les fichiers PWA générés restent dans cette copie. Les avertissements existants de dépréciation Edge Runtime et `module.register()` ne bloquent pas le build. Les preuves utiles sont conservées dans [le dossier associé](2026-10-07-preuves-navigation/README.md).

La vérification de cet audit s’est terminée sans commit, push, merge, déploiement ni écriture distante. L’utilisateur a ensuite autorisé le commit et le push des corrections et des preuves.
