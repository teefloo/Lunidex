# Audit des investissements en cartes Pokémon

Audit du 20 octobre 2026, réalisé sur le dépôt Lunidex au commit `b606d9209ce995325b82fed2b3a6fa776b7c1a83`.


Les constats ci-dessous décrivent l’état avant correction. Voir le [bilan des corrections](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/CORRECTIONS.md>) pour les changements et leur validation.

## Diagnostic

Le portefeuille fonctionne comme un registre d'achats avec estimation manuelle. L'ajout, la correction, les achats multiples et les calculs fonctionnent dans les conditions testées. Le parcours demande cependant de retrouver une carte déjà consultée, choisit systématiquement une édition spéciale par défaut et dépend du détail TCGdex pour enregistrer un nouvel achat. Ces choix expliquent une partie des blocages et l'impression de prix absents.

Il n'y a pas une panne générale des prix. Pour Dracaufeu `base1-4`, TCGdex renvoie bien une référence exploitable de 123,63 €. Le formulaire la masque initialement parce que la finition sélectionnée est « Autre ». Choisir « Holo » la fait apparaître. Certaines cartes n'ont effectivement aucune cotation. Les reverse, premières éditions et cartes avec précisions d'édition sont soumises à des exclusions supplémentaires dans le registre d'investissements.

Un défaut technique distinct concerne l'historique affichable dans les fiches du catalogue. Sur les mêmes données de Dracaufeu, son extracteur prépare une cotation de 0,02 € alors que la fiche et le formulaire résolvent 123,63 €. Ce défaut a été reproduit en exécutant la fonction pure existante, sans appeler la route qui écrit les points d'historique.

Aucun P0 généralisé n'a été observé avec les services disponibles. Cinq problèmes sont classés P1, dont un blocage conditionnel de l'ajout lors d'une panne du détail TCGdex. Les autres constats concernent la compréhension, la récupération après erreur et l'effort de saisie.

## Méthode et isolation

- Application locale déjà accessible sur `http://localhost:3000`, avec un build de production présent. La connexion réelle avec le compte de test fourni et la lecture initiale du compte ont réussi. Le portefeuille distant ne contenait pas d'achat affiché.
- Les écritures `/api/user-state` ont d'abord été bloquées, puis les lectures et écritures ont été remplacées par un état de test en mémoire dans Playwright. Les ajouts, corrections et suppressions décrits ici ne valident donc pas une écriture Neon réelle.
- Les prix et recherches ont été testés avec le vrai TCGdex. Les pannes de catalogue, de détail et de compte, ainsi que les refus HTTP 413, ont été injectés explicitement. Les captures de cartes « Audit Detail » utilisent des données simulées.
- Les cinq tests navigateur existants ont aussi été exécutés avec leur compte et catalogue simulés sur le serveur local isolé du port 3001.
- L'endpoint d'historique peut écrire un snapshot en base pendant un GET. Il a été intercepté avant tout chargement de graphique observé. Aucun appel réel à cet endpoint n'apparaissait dans le journal réseau au moment de la mise en place de cette protection.
- Aucun code applicatif, dépendance ou secret n'a été modifié. Pas de push, déploiement, migration ou publication. Les modifications automatiques de `next-env.d.ts`, `tsconfig.json` et du marqueur de requête Graphify ont été remises exactement à leur état initial. Le serveur initial du port 3000 a été conservé.

Outils effectivement utilisés : terminal Node.js 22.22.3, Vitest, Playwright, captures, arbre d'accessibilité, journal réseau, console et requêtes publiques TCGdex. Le graphe Graphify existant a servi à orienter la recherche, puis les fichiers actuels ont été lus directement. Next DevTools n'a pas trouvé d'endpoint MCP sur le port 3000 ; les diagnostics ont donc utilisé le navigateur et les sources.

Les identifiants du compte ne figurent pas dans les livrables.

## Vérifications exécutées

| Vérification | Résultat de cette session | Preuve |
| --- | --- | --- |
| `npm test` | 725 tests réussis, 139 fichiers, 36,05 s | [vitest.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/vitest.log>) |
| `E2E_INVESTMENTS=1 ./node_modules/.bin/playwright test e2e/tcg-investments.spec.ts` | 5 scénarios réussis, 3 min avec démarrage du serveur | [e2e.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/e2e.log>) |
| `npm run lint` | Code de sortie 0 | [lint.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/lint.log>) |
| `npm run typecheck` | Code de sortie 0 | [typecheck.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/typecheck.log>) |
| `npx --no-install tsc --project packages/core/tsconfig.json --noEmit` | Code de sortie 0 | [core-typecheck.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/core-typecheck.log>) |
| `npm run seo:check` | Contrôle des sources réussi ; sitemap déployé non interrogé | [seo.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/seo.log>) |
| Sonde des résolveurs sur les réponses publiques capturées | 10 réponses HTTP 200 traitées, écarts documentés ci-dessous | [price-resolution-results.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/price-resolution-results.json>) |

Une première exécution dans le sandbox a échoué sur les quatre tests qui ouvrent un serveur HTTP local, avec `listen EPERM`. L'exécution autorisant ces serveurs locaux a ensuite réussi intégralement. Le premier lancement E2E a rencontré la même restriction sur le port 3001, puis a réussi dans cet environnement autorisé. Ces échecs d'environnement ne sont pas classés comme bugs Lunidex.

Un build neuf n'a pas été exécuté : aucun code n'a changé, et l'application déjà servie a été parcourue réellement. Il ne faut donc pas déduire des résultats ci-dessus qu'un nouveau build de production a été validé.

## Parcours réellement testés

| Parcours | Ce qui a été observé | Nature de la preuve |
| --- | --- | --- |
| Accès anonyme | Panneau de connexion, sans portefeuille accessible | Interface locale avant connexion |
| Connexion du compte fourni | Connexion réussie, GET compte HTTP 200, état vide affiché | Authentification réelle, lecture réelle |
| Navigation Collection / Investissements / catalogue | Routes localisées accessibles ; onglet Investissements dans l'espace Collection | Interface réelle |
| Recherche par nom | « Dracaufeu » donne 12 choix et « Charger plus » | Vrai TCGdex |
| Recherche par identifiant | `base1-4` et `swsh3-136` sélectionnables | Vrai TCGdex |
| Choix de finition et prix | Holo affiche 123,63 € pour Dracaufeu ; normal affiche 0,05 € pour Fouinar ; reverse sans référence dans l'investissement | Vrai TCGdex et interface |
| Ajout avec virgule décimale | 20,25 € × 2 + 5 € donne 45,50 € investis ; estimation 35 € × 2 donne 70 € | UI, écriture interceptée |
| Correction d'un achat | Quantité 2 puis 3, coût et performance recalculés | UI, écriture interceptée |
| Deuxième achat de la même carte | Deux lots indépendants, sans fusion ni augmentation de l'inventaire | UI manuelle et E2E |
| Valeur inconnue | Tiret, achat exclu des rendements, capital exclu explicitement indiqué | UI et tests de domaine |
| Estimation explicite à zéro | 0 € de valeur, -40 € et -100 % pour le lot acheté 40 € | UI et tests de domaine |
| Modification / retrait de l'estimation | Réestimation possible ; retrait couvert par les E2E | UI et E2E |
| Confirmation d'une estimation | Sauvegarde refusée si la confirmation manque | UI réelle sur état intercepté |
| Montant invalide | `1,234` refusé, mais erreur trop générale | UI réelle sur état intercepté |
| Recherche dans le portefeuille | Recherche positive et résultat vide ; totaux globaux conservés | UI et E2E |
| Filtre non valorisés | Uniquement le lot sans estimation | UI et E2E |
| Tri par plus-value | Exécuté dans les E2E | E2E avec catalogue simulé |
| Rechargement | Les lots reviennent depuis le service de compte simulé | UI et E2E, pas une preuve d'écriture Neon |
| Suppression | Confirmation, un seul lot supprimé, inventaire conservé | E2E isolé |
| Refus HTTP 413 | Retour à l'état accepté ; notification temporaire ; formulaire fermé | UI et E2E |
| Panne catalogue HTTP 503 | Erreur et action de reprise, aucun achat créé | E2E ; essai complémentaire avec résumé partiel |
| Panne détail HTTP 503 | Carte déjà choisie, nouveau lot impossible à enregistrer | UI avec panne injectée |
| Reprise du détail | L'alerte disparaît après rétablissement et « Réessayer » | UI avec réponse de reprise injectée |
| Panne du compte HTTP 503 | Portefeuille remplacé par le panneau d'indisponibilité ; reprise réussie | UI avec panne injectée |
| Détail depuis un investissement | Ouverture de la fiche en modale, même prix de référence, Échap revient au portefeuille | UI réelle, historique intercepté |
| Catalogue et fiche publique | Prix visibles dans le catalogue, actions Collection / Souhaits / Organisation, aucune action d'achat | UI réelle |
| Mobile 390 × 844 | Parcours d'achat E2E réussi, pas de débordement horizontal, formulaire long | E2E et mesures DOM |
| Ordinateur | Parcours manuels à 1200 × 792 puis 1440 × 1000 ; E2E à 1440 × 1000 | UI, E2E et captures |

Les E2E ne vérifient pas toutes les options de tri ni les 1 000 achats dans le navigateur. Le tri par coût, la pagination à plus de 20 lots et l'ordre entre dates identiques ont été lus dans les sources, sans scénario UI dédié.

## Prix : origine et traitement

### Chaîne observée

Le navigateur utilise le client centralisé [src/lib/api/tcg.ts](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/tcg.ts>) vers `https://api.tcgdex.net/v2`. Les listes de cartes sont enrichies par des appels de détail, notamment pour leurs métadonnées visuelles. Les prix sont résolus à partir de `pricing` et, lorsqu'elles en disposent, des entrées de `variants_detailed`.

Cardmarket fournit les références EUR ; TCGplayer fournit les références USD. Le formulaire d'investissement demande exclusivement une référence EUR. Il ne convertit pas les dollars et n'injecte aucune référence dans la valorisation du lot. Le portefeuille ne récupère pas automatiquement un prix de marché à l'affichage : il calcule uniquement les estimations saisies et confirmées par l'utilisateur.

Le client API courant a un délai de 10 s et une nouvelle tentative, ce qui diffère de l'exemple ancien à 30 s / trois tentatives dans [docs/pokemon-tcg-data-sources.md](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/pokemon-tcg-data-sources.md>). La documentation de la fonctionnalité [docs/tcg-investments.md](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/tcg-investments.md>) décrit en revanche correctement les estimations manuelles et l'exclusion des références des totaux.

### Échantillon réel du fournisseur

Douze requêtes publiques ont été exécutées. Dix ont donné HTTP 200 et deux ont donné HTTP 404. Les durées de ces appels directs étaient de 62 à 73 ms, sur la connexion de cette session ; elles ne mesurent pas une expérience à cache froid ni un réseau mobile.

| Carte et langue | Donnée publique observée | Résolution de l'investissement |
| --- | --- | --- |
| `base1-4`, FR et EN | Cardmarket `trend=0.02`, `trend-holo=123.63` | Holo : 123,63 € ; « Autre » : rien |
| `swsh3-136`, FR et EN | `trend=0.05`, `trend-holo=0.24`, pas de champ `trend-reverse-holo` ; USD reverse aussi disponible sur la réponse FR capturée | Normal : 0,05 € ; reverse : aucune référence EUR stricte |
| `sv03.5-151`, FR et EN | Carte uniquement holo, `trend=7.15`, `trend-holo=0` | Holo : 7,15 €, repli sur le prix positif de cette carte holo uniquement |
| `swsh10.5-010`, FR | `trend=2.65`, `trend-holo=3.62`, holo et reverse déclarées | Holo : 3,62 € ; reverse : aucune référence EUR stricte |
| `bw10-99`, FR | `cardmarket=null`, `tcgplayer=null` | Aucune référence : absence réelle chez le fournisseur |
| `30th-c-001`, FR | Référence Cardmarket 174,16 €, variante détaillée avec tampon anniversaire | Référence générique holo : 174,16 € ; une précision libre masque la référence |
| `xy12-11`, FR | `trend=73.75`, `trend-holo=96.22` ; normal déclaré dans la réponse capturée | Normal : 73,75 €, selon les métadonnées du fournisseur |
| `base1-4`, JA et zh-cn | HTTP 404 | Carte absente dans cette langue sur cet identifiant ; aucune cotation à inventer |

Le tableau décrit les réponses capturées et le comportement du code. Il ne certifie ni le bon produit Cardmarket, ni le prix d'un exemplaire physique de la langue choisie. Les réponses FR et EN de certaines cartes partagent les références de marché.

La [FAQ officielle TCGdex](https://tcgdex.dev/fr/faq) indique que certaines cartes n'ont pas de cotation et reconnaît des erreurs de correspondance entre éditions. Cette limite justifie une confirmation de l'utilisateur ; elle ne justifie pas de présenter tous les motifs d'absence avec le même message.

Preuves : [réponses publiques](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/live-price-sample.json>), [réponse complète Dracaufeu FR](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/live-base1-4-fr.json>), [résultats des résolveurs](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/price-resolution-results.json>). La sonde [price-probe.mjs](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/price-probe.mjs>) se relance depuis la racine avec `node docs/audits/2026-10-20-card-investments/price-probe.mjs`. Elle traite les données déjà capturées, sans accès réseau ou base de données.

### Quatre états à rendre distincts

1. **Prix non récupéré** : chargement du détail encore en cours ou détail inaccessible. L'absence de résultat ne dit rien sur la cotation du fournisseur.
2. **Prix indisponible à la source** : détail HTTP 200, deux fournisseurs vides, comme `bw10-99`.
3. **Référence écartée par la règle du produit** : reverse sans champ EUR strict, première édition, ou précision libre. Une donnée peut exister mais être jugée insuffisante pour cet exemplaire.
4. **Achat non valorisé** : aucune estimation manuelle, même si une référence de marché existe. L'achat ne doit jamais devenir une carte à 0 € par défaut.

Le quatrième état est correctement traité dans les calculs. Les trois premiers sont insuffisamment distingués dans le formulaire.

## Anomalies et frictions priorisées

Les priorités décrivent l'impact dans le périmètre testé. « Confirmé » signifie reproduit dans l'interface ou dans l'exécution du code précisée ; « recommandation » désigne un choix de produit proposé.

| ID | Priorité | Constat | Statut |
| --- | --- | --- | --- |
| F01 | P1 | « Autre » présélectionné, référence masquée et précision obligatoire | Confirmé, vrai catalogue |
| F02 | P1 | Aucun accès à l'enregistrement d'achat depuis une carte déjà ouverte | Friction confirmée ; ajout d'action recommandé |
| F03 | P1 | Panne du détail TCGdex bloque un nouvel achat | Confirmé avec panne injectée |
| F04 | P1 | L'extracteur d'historique choisit un prix incohérent avec la fiche | Confirmé par exécution isolée du code |
| F05 | P1 | Échec de sauvegarde après fermeture du formulaire, message de succès persistant | Confirmé avec HTTP 413 injecté |
| F06 | P2 | Aucun prix dans le sélecteur d'investissement malgré les détails récupérés | Confirmé |
| F07 | P2 | « Actualiser » réutilise le cache sans requête fournisseur | Confirmé |
| F08 | P2 | Validation générale sans repérage du champ fautif | Confirmé |
| F09 | P2 | Échap abandonne silencieusement une saisie modifiée | Confirmé |
| F10 | P2 | `tcgLang` de l'URL ignoré pour la langue initiale du formulaire | Confirmé |
| F11 | P2 | Identifiants de variantes et date ISO bruts, sous-éditions peu compréhensibles | Confirmé |
| F12 | P2 | Formulaire mobile long, sauvegarde en bas du contenu défilant | Mesure confirmée ; simplification recommandée |
| F13 | P3 | Messages empruntés aux classeurs, pluriel incorrect | Confirmé |

### F01. Le choix initial « Autre » provoque un faux départ

Écran : Investissements, nouvel achat. Reproduction : ouvrir « Enregistrer un achat », rechercher `base1-4`, sélectionner Dracaufeu, saisir un prix et enregistrer sans toucher à la finition. Le choix initial est « Autre édition », le prix de référence est absent et le navigateur exige une précision d'édition. Choisir « Holo » fait apparaître 123,63 € et supprime cette obligation.

Cause établie : `chooseCard` impose `setVariant('other')`, même pour une carte dont une seule finition standard est disponible. Le résolveur refuse toute variante hors normal/holo/reverse et tout texte de précision. Attendu : proposer la finition standard unique lorsqu'elle est connue ; si plusieurs existent, demander un choix explicite et compréhensible. Une édition particulière reste un choix volontaire.

Impact : l'utilisateur croit que le prix manque et doit remplir un champ dont il n'a pas besoin. Correction : initialiser le choix selon les finitions connues, expliquer le cas ambigu et réserver les précisions obligatoires aux éditions spéciales ou certifiées.

Sources : [src/components/tcg/TCGInvestmentForm.tsx:58](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:58>), `:91`, [src/lib/tcg-investments.ts:13](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/tcg-investments.ts:13>). Preuves : [choix initial](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/01-live-default-other.png>), [prix après choix Holo](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/02-live-holo-price.png>), [validation native](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/manual-functional-results.json>).

### F02. Une carte consultée doit être recherchée une deuxième fois

Écrans : catalogue, fiche de carte et investissements. Reproduction : rechercher une carte dans le catalogue et ouvrir sa fiche. Les actions portent sur la comparaison, la collection, les souhaits, le partage et les classeurs. Aucune ne crée un achat. Rejoindre les investissements ouvre ensuite un sélecteur vide, sans reprendre la carte.

Cause établie : la fiche n'intègre pas le formulaire d'investissement et celui-ci ne reçoit pas de carte initiale. Attendu pour le besoin exprimé : une action « Enregistrer un achat » depuis la fiche et l'inventaire, avec carte, langue et finition déjà connues. L'enregistrement dans la collection et l'achat doivent rester deux décisions distinctes.

Impact : nouvelle recherche et nouvelle sélection d'une carte déjà identifiée. Correction recommandée : réutiliser le même formulaire avec un contexte de carte, puis offrir un retour au portefeuille. Depuis la fiche, viser deux actions principales : ouvrir l'achat et enregistrer, en plus de la saisie requise.

Sources : [src/components/tcg/TCGCardDetailContent.tsx:430](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGCardDetailContent.tsx:430>), [src/components/tcg/TCGInvestmentForm.tsx:19](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:19>). Preuves : [actions de fiche](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/catalog-card-actions.yml>), [capture de fiche](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/07-catalog-card-no-purchase-action.png>).

### F03. Le détail distant est indispensable même pour un registre manuel

Écran : nouvel achat. Reproduction isolée : laisser une recherche renvoyer une carte avec ses métadonnées, puis répondre HTTP 503 à son détail. Sélectionner la carte. Une alerte avec « Réessayer » apparaît et « Enregistrer » reste désactivé. Un résumé incomplet peut aussi faire échouer la recherche pendant l'enrichissement visuel.

Cause établie : le formulaire exige `card` issu du détail pour un nouveau lot et ne conserve que ce détail pour autoriser la soumission ; le sélecteur passe par l'enrichissement des résultats du catalogue. Attendu : conserver le choix et les données déjà saisies ; permettre une reprise ciblée. Si le produit autorise un achat manuel depuis un identifiant vérifié, l'absence de cotation devrait être indépendante de l'enregistrement de cet achat.

Impact : ajout impossible durant une panne amont, alors que le prix d'achat et l'estimation sont manuels. Correction : séparer validation d'identité, métadonnées d'édition et cotation. Un mode différé éventuel doit marquer les données à vérifier, sans inventer une finition ou un prix. La reprise du détail a été testée et supprime bien l'alerte après rétablissement.

Sources : [src/components/tcg/TCGInvestmentForm.tsx:35](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:35>), `:48`, `:114`, [src/lib/api/tcg.ts:910](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/tcg.ts:910>). Preuves : [état de panne](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/detail-outage.json>), [capture](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/08-detail-outage-blocks-save.png>), [console](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/browser-console.log>). Ce scénario ne démontre pas une panne réelle persistante du fournisseur.

### F04. L'historique et le prix courant n'utilisent pas la même série

Écran lié : graphique des fiches de cartes, accessible depuis le portefeuille. Reproduction technique : exécuter la sonde fournie sur la réponse publique de `base1-4`. Le résolveur de la fiche et de l'investissement renvoie 123,63 € pour Holo. `extractPriceSnapshot` renvoie `cardmarket_trend=0.02`. Autre cas : `swsh10.5-010`, 3,62 € dans la fiche contre 2,65 € dans l'extracteur.

Cause établie : l'extracteur lit directement `pricing.cardmarket.trend`, ne résout pas la finition, et ne conserve ni langue ni identifiant de variante dans la série. Les zéros sont acceptés comme nombres finis. Attendu : série et prix courant identifiables et comparables pour une même variante, une même source et une même devise.

Impact : un historique ou une tendance peut raconter une évolution sans rapport avec le prix affiché. Correction : définir la clé de cotation et partager le résolveur adapté avec l'historique ; distinguer explicitement les anciennes séries ambiguës. Vérifier les snapshots historiques avant toute réutilisation financière. Ne pas corriger une ancienne donnée par un prix supposé.

Source : [src/app/api/tcg/price-history/[cardId]/route.ts:44](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/app/api/tcg/price-history/[cardId]/route.ts:44>), `:92`, `:98`. Preuve : [résultats de la sonde](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/price-resolution-results.json>). La présence de points erronés en base et leur rendu dans un vrai graphique Neon restent non vérifiés. Les totaux du registre manuel ne consomment pas cet historique et ne sont pas affectés directement par cet extracteur.

### F05. Une sauvegarde refusée perd son formulaire et conserve un message positif

Écran : création ou modification d'achat. Reproduction : répondre HTTP 413 au PUT de compte, enregistrer un lot ou une modification. Le formulaire se ferme, puis le portefeuille revient à la dernière version acceptée. Une notification temporaire précise que la limite de 2 Mo est dépassée. Le message persistant « Achat enregistré dans cette session. Le compte synchronise les modifications automatiquement. » reste affiché après l'annulation de la modification.

Cause établie : l'action du store renvoie un UUID après la modification optimiste, le formulaire appelle immédiatement `onSaved`, puis la synchronisation annule séparément la modification. La notification d'erreur ne remet pas à jour le message local ni le brouillon du formulaire.

Attendu : distinguer enregistrement en attente, confirmation et échec ; garder le brouillon réessayable en cas de refus. Impact : une nouvelle saisie disparaît et le retour visuel durable laisse croire à un succès. Correction : lier le statut affiché au résultat de la synchronisation, conserver les données saisies et proposer une reprise après résolution de l'erreur. Le retour à l'état accepté est correct et doit être préservé.

Sources : [src/store/primedex.ts:558](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/store/primedex.ts:558>), [src/components/tcg/TCGInvestmentForm.tsx:50](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:50>), [src/components/tcg/TCGInvestmentsPage.tsx:110](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentsPage.tsx:110>), [src/lib/supabase/useSupabaseSync.ts:220](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/supabase/useSupabaseSync.ts:220>). Preuves : [résultat après rejet](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/rejected-save-results.json>), [capture après expiration du toast](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/05-rejected-save.png>), test E2E « rejected writes roll back ». Le toast de limite a aussi été observé lors d'un second essai à une seconde après soumission.

### F06. Le sélecteur masque les informations de prix disponibles

Écran : sélection d'une carte dans un achat. Reproduction : rechercher « Dracaufeu ». Les résultats montrent image, nom, identifiant et extension, sans prix. Le catalogue général montre une information de marché pour ces mêmes cartes.

Cause établie : le rendu du sélecteur n'inclut aucun composant de prix. Attendu : présenter une référence indicative lorsqu'elle est disponible, avec sa source et les limites de variante, ou un motif d'absence. Impact : ouvrir plusieurs cartes pour trouver la bonne et comprendre leur ordre de grandeur. Correction : réutiliser la présentation de marché existante, avec un libellé qui ne confond pas ce prix avec l'estimation de l'exemplaire.

Source : [src/components/tcg/TCGInvestmentCardPicker.tsx:43](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentCardPicker.tsx:43>). Preuves : [texte des résultats](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/picker-no-prices.json>), [capture](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/06-picker-no-prices.png>), [prix du catalogue](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/catalog-sample.txt>).

### F07. « Actualiser la référence » ne garantit pas une récupération réseau

Écran : formulaire, carte Holo avec référence. Reproduction : afficher Dracaufeu, observer les requêtes puis cliquer « Actualiser la référence ». Aucun nouvel appel TCGdex n'a été émis pendant la fenêtre observée de 1,2 s ; la référence et sa date sont restées identiques.

Cause établie : `detail.refetch()` appelle un client qui accepte son cache mémoire de 10 minutes et son cache persistant de sept jours lorsqu'un prix existe. Ce n'est donc pas seulement le cache React Query ou la cadence du fournisseur. Attendu : une actualisation explicite déclenche au moins une vérification auprès du fournisseur, ou le libellé explique qu'elle relit une référence en cache.

Impact : l'utilisateur pense demander une cotation récente sans que l'application la demande. Correction : ajouter un mode explicite de revalidation qui traverse les caches applicatifs de prix, respecter les limites du fournisseur et afficher séparément date de récupération et date de cotation. La réponse fournisseur peut naturellement rester inchangée.

Sources : [src/components/tcg/TCGInvestmentForm.tsx:105](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:105>), [src/lib/api/tcg.ts:735](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/tcg.ts:735>), `:741`, [src/lib/api/cache.ts:5](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/cache.ts:5>). Preuve : [mesures réseau](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/live-network-summary.json>).

### F08. L'erreur de saisie ne localise pas le problème

Écran : formulaire. Reproduction : saisir `1,234` dans le prix d'achat, avec les autres champs valides, puis enregistrer. Le message demande de vérifier la carte, les montants, la quantité, les dates et la confirmation. Le focus reste sur « Enregistrer » et aucun champ n'a `aria-invalid=true`. La même erreur générale apparaît sans confirmation d'estimation.

Cause : validation groupée dans une condition unique. Attendu : message près du champ, format attendu, champ signalé et focus sur la première erreur. Impact : plusieurs champs à inspecter pour une seule faute, effort accru au clavier ou avec lecteur d'écran. Correction : erreurs par champ, association `aria-describedby`, résumé accessible si nécessaire et focus ciblé. La précision à deux décimales est correctement imposée et ne doit pas être arrondie silencieusement.

Source : [src/components/tcg/TCGInvestmentForm.tsx:45](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:45>). Preuve : [tests de validation](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/manual-validation-results.json>).

### F09. Fermeture silencieuse d'un formulaire modifié

Écran : modification d'achat. Reproduction : changer 40 € en 99 €, appuyer sur Échap, rouvrir. Le champ revient à 40 €. Aucun avertissement ou brouillon récupérable n'a été proposé.

Cause : fermeture directe du Sheet, état limité au composant. Attendu : confirmation d'abandon lorsque la saisie est modifiée, ou brouillon de session récupérable. Impact : perte de saisie, surtout sur le formulaire mobile long. Correction : détecter les changements, gérer Échap, fermeture et changement de route avec le même mécanisme. Ne pas enregistrer le lot sans validation explicite.

Source : [src/components/tcg/TCGInvestmentForm.tsx:62](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:62>). Preuve : [tests de validation](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/manual-validation-results.json>).

### F10. La langue explicite de navigation n'initialise pas l'achat

Écran : investissements. Reproduction : avec la préférence de consultation FR, ouvrir `/fr/tcg/investments?tcgLang=en`, puis un nouvel achat. Le formulaire reste en FR.

Cause : `InvestmentPortfolio` prend uniquement `tcgBrowseLanguage` du store ; la barre de navigation, elle, lit bien le paramètre d'URL. Attendu : appliquer la langue explicite avant la préférence persistée. Impact : recherche dans la mauvaise langue et correction manuelle. Correction : réutiliser le résolveur existant de langue demandée, sans confondre langue d'interface et langue des cartes.

Source : [src/components/tcg/TCGInvestmentsPage.tsx:31](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentsPage.tsx:31>). Preuve : [URL et valeur observée](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/query-language-ignored.json>).

### F11. Variantes et date fournisseur exposent des données techniques

Écran : formulaire Dracaufeu. Reproduction : sélectionner `base1-4`. La liste affiche des valeurs telles que `4ffrmhcfiaejakhepqdkx7o`, sans choix associé, et la date de référence est `2026-10-19T13:13:24.137Z` sous le libellé « Date de valorisation (facultative) ».

Cause : affichage direct de `variantId` et `updatedAt`. Le type de variante utilisé par l'UI ne représente pas `subtype`, pourtant présent dans la réponse publique pour « illimité », « sans ombre » ou « Copyright 1999-2000 ». Attendu : noms d'éditions lisibles et date de cotation localisée, distincte de la date de l'estimation saisie.

Impact : identifier la bonne édition reste difficile, particulièrement quand son prix diffère. Correction : présenter le sous-type, le tampon et la finition dans des choix compréhensibles ; garder les identifiants techniques dans les diagnostics. Ne pas attribuer une référence d'une sous-édition à une autre en cas d'ambiguïté.

Sources : [src/components/tcg/TCGInvestmentForm.tsx:92](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:92>), `:103`, [src/types/tcg.ts:124](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/types/tcg.ts:124>). Preuves : [réponse complète](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/live-base1-4-fr.json>), [capture](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/02-live-holo-price.png>).

### F12. Le formulaire mobile expose trop d'informations d'emblée

Écran : formulaire à 390 × 844. La zone de dialogue mesure 844 px de haut pour un contenu mesuré à 1 724 px. Aucun débordement horizontal n'a été trouvé. Les champs de précision, frais, dates, référence et estimation sont tous développés ; les actions sont au bas du contenu.

Cause : un seul long formulaire, sans détail facultatif repliable ni barre d'action persistante. Attendu pour un achat courant : carte/finition, quantité et prix immédiatement accessibles ; frais, dates et particularités disponibles à la demande. Impact : défilements et relecture pour un cas simple. Correction recommandée : regroupement des détails facultatifs, référence compacte, estimation clairement optionnelle et action d'enregistrement accessible sans retour au bas du formulaire. Conserver les zones tactiles existantes et la gestion du défilement de la modale.

Sources : [src/components/tcg/TCGInvestmentForm.tsx:63](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentForm.tsx:63>), `:79`, `:113`. Preuves : [mesures DOM](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/manual-validation-results.json>), [formulaire mobile](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/04-mobile-form.png>), [portefeuille mobile](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/03-mobile-portfolio.png>). Cette mesure ne simule pas le clavier virtuel d'un téléphone.

### F13. Messages de contexte et pluriels

Écrans : recherche d'achat et sélection de carte. Reproduction : chercher un nom inexistant ; le texte dit « Aucun classeur ou carte correspondant. » Un seul achat non valorisé donne « 1 cartes non valorisées ».

Cause : réutilisation d'une traduction des classeurs et interpolation sans pluriel adapté. Attendu : « Aucun achat correspondant » dans le portefeuille, « Aucune carte correspondante » dans le sélecteur, et accord au singulier. Impact secondaire, mais le texte n'aide pas à comprendre le contexte. Correction : clés de traduction propres au parcours et règles de pluriel, dans les huit langues d'interface.

Sources : [src/components/tcg/TCGInvestmentsPage.tsx:76](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentsPage.tsx:76>), [src/components/tcg/TCGInvestmentCardPicker.tsx:41](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGInvestmentCardPicker.tsx:41>), [src/lib/i18n/tcg-investments.ts:24](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/i18n/tcg-investments.ts:24>). Preuve : [résultats fonctionnels](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-20-card-investments/manual-functional-results.json>).

## Calculs financiers et cohérence

Les exemples vérifiés donnent les résultats attendus :

| Situation | Investi | Valeur connue | Gain | Rendement |
| --- | --- | --- | --- | --- |
| 2 cartes à 20,25 €, 5 € de frais, estimation 35 € par carte | 45,50 € | 70 € | +24,50 € | +53,85 % |
| Même lot corrigé à 3 cartes | 65,75 € | 105 € | +39,25 € | +59,70 % |
| Ajout d'un achat à 40 €, estimation inconnue | 105,75 € au total | 105 € | +39,25 € sur les seuls achats valorisés | +59,70 % sur 65,75 € ; 40 € exclus |
| Lot de 40 € avec estimation explicite 0 € | 40 € | 0 € | -40 € | -100 % |

Les montants sont stockés en centimes entiers. Les frais concernent le lot ; prix et estimation sont unitaires. Les achats multiples restent indépendants. Le filtre de liste ne modifie pas les totaux de portefeuille, conformément au comportement documenté. L'investissement initial nul donne un rendement indéfini dans les tests de domaine. Aucune conversion EUR/USD ni estimation fictive n'a été observée dans les totaux.

La « valeur connue » est une somme d'estimations manuelles, pas une valeur de marché automatiquement actualisée. C'est une limite de produit majeure par rapport à l'objectif de suivre la valeur des cartes, et non un calcul erroné. La fraîcheur d'une estimation doit être visible. Une référence pourrait être proposée comme base de saisie après vérification de l'exemplaire, sans remplacer silencieusement l'estimation confirmée.

## Parcours proposé et ordre des corrections

### Étape 1 : éviter les faux blocages et les confirmations trompeuses

Traiter F01, F03 et F05 en premier. L'utilisateur doit pouvoir choisir une finition compréhensible, savoir ce qui manque quand un service est indisponible et récupérer sa saisie si la sauvegarde échoue. Critères de validation : un Holo standard ne demande pas une description spéciale ; une erreur de détail ne détruit pas le contexte ; une réponse 413 conserve un brouillon et retire tout message de succès devenu faux.

Traiter F04 avant d'utiliser une tendance de marché pour une décision de portefeuille. Valider la correspondance entre la série enregistrée et la référence courante avec les réponses capturées, y compris holo, reverse, zéro fournisseur et sous-éditions. Les anciens points ambigus doivent être identifiés explicitement.

### Étape 2 : réduire la saisie et les recherches répétées

Traiter F02, F06 et F12 ensemble. Depuis le catalogue ou l'inventaire, ouvrir « Enregistrer un achat » avec le contexte de carte. Proposer quantité 1 et frais 0, demander le prix d'achat, rendre les détails supplémentaires accessibles à la demande. L'estimation peut rester inconnue ; une référence indicative doit être visible sans devenir une obligation de valorisation.

Le parcours standard observé depuis le portefeuille comporte six opérations logiques : ouvrir le formulaire, saisir une recherche, sélectionner la carte, corriger la finition, saisir le prix et enregistrer. Ce comptage exclut les frappes clavier, les clics internes du sélecteur natif et les défilements. Ajouter une estimation demande encore sa saisie et une confirmation. Depuis une fiche déjà ouverte, le parcours proposé ramène ce travail à l'ouverture de l'achat, la saisie du prix et l'enregistrement pour une finition standard unique. Il s'agit d'une cible de conception, pas d'un parcours déjà implémenté.

Depuis le portefeuille, conserver la recherche générale, mais proposer aussi les cartes récemment consultées ou de l'inventaire. Ne pas faire de cette suggestion une nouvelle dépendance bloquante.

### Étape 3 : rendre prix et erreurs explicables

Traiter F07, F08, F09, F10 et F11. Ajouter des motifs distincts d'absence de référence, une actualisation réelle et datée, des erreurs par champ, une protection des brouillons et la reprise de la langue explicite. Une éventuelle référence USD doit rester séparée, sans conversion implicite ni mélange avec les totaux EUR.

### Étape 4 : renforcer les tests qui manquent au filet actuel

Les cinq E2E passent sans détecter F01 car leur aide de test choisit systématiquement la finition normale après sélection. Leur refus 413 vérifie le retour à l'état accepté, mais pas la conservation du brouillon ni le message de succès résiduel.

Ajouter lors des corrections des scénarios couvrant le parcours courant sans intervention préalable sur la finition, l'action d'achat depuis une fiche, l'échec puis la reprise d'une sauvegarde, la date d'une référence en cache, le paramètre de langue, les sous-éditions et l'identité d'une série historique. Tester ensuite pagination, tris complets et portefeuille volumineux. F13 peut être corrigé dans la même passe de textes.

## Performances et accessibilité

La première recherche manuelle « Dracaufeu » a généré une requête de liste, douze appels de détail et quatre appels d'extension avant sélection. La requête de liste mesurait environ 1 365 ms dans les entrées de performance du navigateur ; les appels de détail individuels mesuraient alors 30 à 126 ms. Le sélecteur attend en outre 300 ms après saisie. Ces coûts fournissent une piste d'optimisation, pas une preuve que toute recherche est lente.

Le sélecteur ne montre pas les prix alors qu'il paie déjà une partie du coût d'enrichissement. Séparer les informations indispensables à la sélection des effets visuels, tolérer une carte partiellement enrichie et afficher une référence disponible réduirait le coût sans rendre la cotation obligatoire.

Les contrôles de formulaire testés ont des noms accessibles, les modales possèdent un titre et Échap fonctionne. Le portefeuille mobile n'a pas de débordement horizontal aux dimensions testées. Les défauts principaux d'accessibilité observés sont le guidage après validation et la longueur du formulaire. L'audit n'inclut pas de mesure exhaustive de contrastes, de lecteur d'écran réel, de zoom à 200 %, de clavier virtuel ou de conformité WCAG complète. La revue a utilisé les [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) comme grille complémentaire, sans audit automatique ajouté.

La console ne montrait pas d'exception JavaScript spontanée dans le parcours initial. Les avertissements répétés de préchargement CSS sont distincts des erreurs HTTP 413/503 injectées et des HTTP 404 attendus pour les identifiants indisponibles. Certains essais d'images ont aussi produit `ERR_BLOCKED_BY_ORB`, notamment pour `sm7.5-3` ; cela ne prouve pas une absence de prix.

## Limites et points non vérifiés

- Aucune création, correction ou suppression d'investissement n'a été envoyée au compte distant. Les PUT ont été bloqués ou servis par les fixtures. La synchronisation multiappareil, les conflits réels Neon et la persistance distante après une vraie écriture restent à valider dans un environnement de test autorisé.
- Les contrôles de propriété et de validation serveur ont été lus, et les tests existants ont été exécutés. Il ne s'agit pas d'un test d'intrusion ni d'une preuve d'isolation entre deux comptes sur une base réelle.
- L'historique Neon n'a pas été consulté par sa route applicative, car son GET peut créer un point. L'écart d'extraction est confirmé ; l'état des lignes existantes et le graphique final restent non vérifiés.
- Les appels publics capturés ne certifient pas les correspondances Cardmarket ou TCGplayer, l'état physique, la langue de l'exemplaire ou une certification. Aucun prix n'a été inventé pour compléter les réponses absentes.
- La langue des cartes FR a été utilisée pour les essais manuels principaux. Les réponses EN, JA et zh-cn ont été sondées pour les cas indiqués ; toutes les langues, éditions, certifications et cartes du catalogue n'ont pas été parcourues.
- Les dates futures, les plafonds de 1 000 achats / 10 000 exemplaires dans un navigateur, la limite réelle de document à 2 Mo, la pagination sur grand portefeuille et tous les tris n'ont pas été exercés manuellement. Les cas de normalisation et de limites présents dans la suite ont passé leurs tests.
- Les parcours hors connexion complet, PWA installée, fermeture réelle du navigateur, changement de compte réel, Safari, Firefox et appareil tactile physique restent non testés.
- L'audit des scellés n'entre pas dans ce rapport. Seules les dépendances du portefeuille de cartes et du catalogue associé ont été examinées.

## Index des preuves

Le dossier contient les huit captures numérotées, les réponses publiques de prix, les résultats des essais manuels, la sonde reproductible et les journaux des vérifications. Les captures de portefeuille utilisent uniquement l'état isolé. Les journaux navigateur contiennent des erreurs volontairement injectées : ils ne doivent pas être interprétés comme un relevé de panne naturelle de tous les services.

Les constats renvoient aux sources du commit indiqué. Les fichiers déterminants sont le formulaire et le sélecteur d'achat, la page de portefeuille, les résolveurs de prix, la synchronisation et l'extracteur d'historique. Aucun correctif applicatif n'est inclus dans cet audit.
