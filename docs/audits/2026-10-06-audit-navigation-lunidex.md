# Audit de navigation Lunidex — production

Date d’observation : 6 octobre 2026. Cible : https://lunidex.app. Environnement local de validation : Node.js 22.22.3, npm 10.9.8 et Next.js 16.3.3. L’empreinte de déploiement relevée dans une URL d’asset est dpl_AK9AFfwKcg6xExjNn16KhZemuUQM ; elle identifie le déploiement observé, pas un commit source.

Les essais ont été réalisés dans des contextes Chromium anonymes isolés, sans compte, avec interface française. Les profils principaux étaient 390 × 844 px avec émulation mobile et tactile, et 1440 × 900 px sur desktop. Les menus et barres fixes ont aussi été contrôlés aux tailles 320 × 568, 768 × 1024, 1023 × 768, 844 × 390 et 1024 × 768. Il s’agit d’une émulation Chromium, pas d’un essai sur téléphone physique ni de Safari iOS.

L’audit a confirmé deux problèmes de navigation dans la FAQ : une aide d’installation renvoie vers l’écran hors ligne et un lien Cardmarket affiche une clé i18n brute. Aucun défaut P1 n’a été observé. Les comptages ci-dessous dédupliquent les problèmes entre plateformes : un défaut vu sur mobile et desktop compte une fois au total.

| Priorité | Problèmes distincts |
| --- | ---: |
| P1 — bloquant | 0 |
| P2 — majeur | 1 |
| P3 — mineur | 1 |
| Total | 2 |

| Plateforme observée | Problèmes distincts reproduits |
| --- | ---: |
| Desktop | 2 |
| Mobile | 2 |

La matrice détaillée, les résultats de parcours et les preuves sont dans [la matrice CSV](2026-10-06-preuves-navigation/couverture.csv), [le relevé JSON](2026-10-06-preuves-navigation/production-evidence.json) et les captures du même dossier.

## Couverture et résultats

Les 34 destinations principales du registre, des menus et du pied de page ont été ouvertes directement en français sur les deux profils, soit 68 chargements principaux. Les groupes couvrent collection, catalogue JCC, Pokédex, équipe, quiz, types, tableau de bord, FAQ, wishlist, scellés, démarrage de collection, marché scellé, decks, taux de tirage, valeur des boosters, capacités, talents, objets, Nuzlocke, combat, EV/IV, favoris, amis, blog, guide de collection, documentation, anniversaire, à propos, contact, comparatif éditorial et pages légales. Les titres et destinations étaient cohérents, les liens conservaient le préfixe fr, les états actifs correspondaient aux sections visitées et aucune page n’avait de débordement horizontal.

Les cinq guides de référence complémentaires, le comparatif Cardmarket, les pages d’aide et de calendrier des scellés, la documentation API, /compare et un lien d’équipe partagée ont également été ouverts sur les deux profils. Le lien partagé de contrôle, avec codes numériques valides, a redirigé vers l’équipe Bulbizarre/Pikachu en conservant le français. /fr/tcg/collection/fr répond en 200, mais sans extension fournie et sans contenu de collection exploitable dans un contexte anonyme : cette donnée personnelle reste non vérifiée.

Les parcours contextuels du Pokédex vers Bulbizarre et retour ont été contrôlés. Les onglets À propos, Statistiques et Évolution modifient le panneau et le paramètre tab ; retour et avance restaurent la sélection. Capacités, talents et objets ont été ouverts depuis leurs listes, actualisés, puis parcourus avec retour et avance sur les deux profils. Les réponses intermédiaires observées avant hydratation ont été retestées après chargement et ne sont pas retenues comme défauts.

Dans les outils, la sélection de type fonctionne une fois les données chargées, le quiz démarre sur les deux profils, et la recherche d’attaquant/défenseur du simulateur affiche et accepte des suggestions. Les pages élevage et EV/IV sont accessibles directement. Nuzlocke affiche clairement que l’enregistrement utilise l’espace associé au compte ; aucun compte ni enregistrement distant n’a été utilisé. Les états de modification nécessitant une session ou une synchronisation — collection, wishlist, decks, données personnelles des favoris, amis, tableau de bord et rencontres Nuzlocke — ne sont donc pas certifiés.

Le parcours catalogue → extension 30th Celebration → carte Exeggcute a été exercé sur mobile et desktop. La carte s’ouvre dans un dialogue de 44 × 44 px pour son bouton de fermeture. La fermeture retire le dialogue et montre la fiche pleine page à la même URL ; cette fiche contient un lien Retour vers l’extension qui restaure la langue du catalogue. Ce comportement est consigné plus bas comme point d’arbitrage produit, pas comme bug confirmé.

Les menus Plus, la feuille mobile, la recherche globale, le réglage de langue et le dialogue de paramètres ont été parcourus. L’ouverture et la fermeture du menu mobile avec Échap restauraient le focus sur le déclencheur. Le changement de Pokédex vers Types a conservé la langue dans les huit langues prises en charge (en, fr, es, de, it, ja, ko, zh), sur desktop et mobile. Le premier essai coréen mobile s’était arrêté avant l’hydratation ; un nouvel essai avec attente du menu prêt a atteint /ko/types, actualisé la page et conservé ko.

Aux sept dimensions listées plus haut, le type de navigation mobile était affiché jusqu’à 1023 px et la navigation desktop à partir de 1024 px. Le document, le tiroir mobile et les menus testés ne débordaient pas horizontalement. Les cibles du menu mobile mesuraient au moins 44 × 44 px.

## Problèmes confirmés

### NAV-01 — Le lien d’installation ouvre l’écran hors ligne

- Priorité : P2. Catégorie : mauvaise destination / parcours d’installation. Plateformes : mobile et desktop.
- Reproduction : ouvrir /fr/faq, déplier « Puis-je installer Lunidex sur un téléphone ? », puis activer le lien de réponse.
- Observé en production : libellé « Lunidex est momentanément hors ligne », URL /fr/offline et titre de page générique. La page explique qu’une connexion est requise pour charger du contenu.
- Attendu : le guide existant /fr/guides/progress-account-guide, avec le libellé traduit d’installation « Installer Lunidex ». Ce guide explique les étapes mobiles et l’ajout à l’écran d’accueil.
- Impact : l’utilisateur qui cherche à installer l’application est envoyé vers une page d’indisponibilité, sans instructions d’installation.
- Preuve : faq-install-desktop.png et faq-install-mobile.png ; les URL, titres et résultats sont également inscrits dans production-evidence.json.
- Recommandation : ajouter une destination FAQ dédiée vers le guide de progression et employer la clé existante pwa.install_title. Conserver le lien /offline utilisé par la question distincte sur l’usage hors ligne.
- Statut : reproduit sur production le 6 octobre ; corrigé et vérifié en local sur desktop et mobile. Le lien atteint le guide français attendu et conserve son titre, son H1 et sa langue après actualisation. La question hors ligne distincte pointe toujours vers /fr/offline.

### NAV-02 — Le lien du comparatif Cardmarket affiche une clé i18n brute

- Priorité : P3. Catégorie : libellé de navigation non traduit. Plateformes : mobile et desktop.
- Reproduction : dans /fr/faq, déplier « La valeur affichée par Lunidex est-elle une expertise ? » et lire le lien du comparatif Cardmarket.
- Observé en production : le href est bien /fr/compare/lunidex-vs-cardmarket, mais le libellé affiché est EDITORIAL.COMPETITORS.LUNIDEX_VS_CARDMARKET.NAV_LABEL.
- Attendu : « Lunidex face à Cardmarket », via la clé française existante editorial.competitors.cardmarket.nav_label.
- Impact : la destination fonctionne, mais l’intitulé expose un identifiant technique et devient difficile à comprendre avec un lecteur d’écran.
- Preuve : faq-cardmarket-desktop.png et faq-cardmarket-mobile.png ; les valeurs DOM exactes sont consignées dans production-evidence.json.
- Recommandation : remplacer uniquement la clé incorrecte par la clé existante.
- Statut : reproduit sur production le 6 octobre ; corrigé et vérifié en local sur desktop et mobile. Le libellé français est maintenant « Lunidex face à Cardmarket » et le href reste /fr/compare/lunidex-vs-cardmarket.

## Arbitrage produit à conserver

### PROD-01 — Fermeture de la carte JCC après navigation depuis une extension

Sur les deux profils, l’ouverture de la première carte de 30th Celebration affiche un dialogue. Le lien de la liste de l’extension est rendu comme une ancre HTML ; la navigation charge aussi la route complète de la carte. Fermer le dialogue révèle donc la fiche pleine page à la même URL, au lieu de revenir automatiquement à l’extension. La fiche conserve le lien Retour vers /fr/tcg/sets/30th?tcgLang=en, qui restitue le contexte quand il est activé.

Ce comportement peut être un repli intentionnel pour les ouvertures directes, mais le contrôle de fermeture d’un dialogue après un clic interne peut aussi être attendu comme un retour à la liste. Il n’est pas modifié arbitrairement : décider si la fermeture doit toujours revenir à l’origine, ou si la fiche pleine page révélée est le comportement visé. Captures : tcg-modal-desktop-open.png, tcg-modal-desktop-closed.png, tcg-modal-mobile-open.png et tcg-modal-mobile-closed.png.

## Erreurs, limites et points non vérifiés

Aucune erreur JavaScript de page n’a été constatée dans les parcours reproduits. Les demandes RSC préchargées interrompues pendant des changements de route rapides ont renvoyé net::ERR_ABORTED ; elles correspondent à des préchargements annulés et n’ont pas été comptées comme erreurs de page. Les essais FAQ, liens de langue et pages complémentaires n’ont pas produit d’échec de requête associé.

Un premier sélecteur coréen correspondait à trois liens ayant le même href, et un contrôle de type a été cliqué avant que son contenu soit hydraté. Ces erreurs de pilotage ont été corrigées par un sélecteur limité au menu ouvert et une attente de disponibilité ; les retests ont réussi. Elles ne sont pas des problèmes du site.

Deux balayages larges automatisés — 81 destinations sur deux profils, puis une boucle élargie sur les liens des menus — ont expiré sans résultats exploitables. Ils ne sont pas comptés comme couverture. Les vérifications ont été reprises par groupes bornés et par parcours prioritaires ; cette matrice reste une couverture étendue des surfaces de navigation, pas une preuve exhaustive de chaque route dynamique, chaque état de compte ou chaque entrée de données. Les essais authentifiés, les opérations de synchronisation, les mutations de collection à distance et les parcours sur appareils physiques restent non vérifiés.

## Corrections locales et validation

Le rapport et les preuves ont été créés avant toute correction de code. NAV-01 et NAV-02 sont corrigés localement dans le registre de destinations FAQ ; la question distincte sur l’usage hors ligne conserve /offline. PROD-01 reste un arbitrage produit et n’a pas été modifié.

Les deux parcours FAQ ont été rejoués sur desktop et mobile dans le build local : l’installation ouvre le guide localisé, le comparatif affiche un libellé français, le lien hors ligne reste inchangé, l’actualisation conserve le titre et la langue, et aucune erreur JavaScript n’apparaît.

Les validations locales passent : 112 fichiers de test et 547 tests, lint, typecheck, contrôle SEO et typecheck du core. Le build webpack a été réalisé dans /private/tmp/lunidex-navigation-audit-2026-10-06, sans fichiers d’environnement, et a généré ses 308 pages statiques ainsi que BUILD_ID. Aucune correction, mutation ou déploiement de production n’a été effectué.
