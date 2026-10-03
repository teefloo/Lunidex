# Audit fonctionnel de Lunidex
Date : 2 octobre 2026, fuseau Europe/Paris. Certaines preuves portent la date du 1 octobre en UTC.

Livrable de diagnostic. Aucun correctif, déploiement, changement de configuration externe ou écriture distante de données personnelles n’a été effectué.

## A. Synthèse générale

### Conclusion

L’audit identifie **15 anomalies reproduites : 3 P1, 11 P2 et 1 P3**. Aucun P0 n’a été observé dans le périmètre exécuté. Cela ne constitue pas une validation des parcours connectés ou de la sécurité complète.

Les problèmes prioritaires sont les catalogues de capacités, talents et objets limités à 48 entrées, les équipes partagées qui deviennent vides pour un visiteur et l’import local qui annonce une réussite sans conserver les favoris après rechargement. Les autres constats concernent les confirmations Showdown, les préférences, l’hydratation React, les traductions, l’accessibilité, les liens de comparaison et deux incohérences de filtres.

La lecture publique des références Pokémon, les calculs testés, les parcours de quiz hors défi quotidien, les recherches TCG, le marché public des scellés et les documents système ont été exercés réellement. Les fonctionnalités personnelles restent largement à tester sous une identité autorisée.

La campagne comprend 998 lignes de couverture, dont 6 contrôles de code séparés. Elle comporte 860 réussites, 28 échecs, 109 blocages et 1 ligne non exécutée consacrée aux variantes combinatoires. Plusieurs échecs peuvent renvoyer à la même anomalie.

### Livrables et traçabilité

- [Matrice complète lisible](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-matrice-couverture.md>).
- [Matrice CSV avec préconditions, environnement, version, langue, format et autorisations](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-matrice-couverture.csv>).
- [Inventaire des pages et handlers](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-inventaire-routes.md>).
- [Inventaire machine des routes, méthodes API, tests et événements interactifs](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/inventaire-projet.json>).
- [Mode de lecture des preuves](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/README.md>) et [Manifeste daté avec empreintes SHA-256](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/manifest-preuves.json>).

Le code sert à cartographier le produit et, lorsqu’une observation le permet, à établir sa cause. Une lecture de code n’est jamais comptée comme une réussite fonctionnelle. Les fichiers de preuve contenant une erreur de pilotage du navigateur restent conservés comme traces d’investigation, mais ne fondent aucune réussite.

### Environnements et outils réellement vérifiés

| Environnement | Version et accès | Utilisation et limites |
|---|---|---|
| Production | lunidex.app ; commit `575af4390efbe9b658d1b3d9b47f2a9932b1fc03` ; déploiement `dpl_55uPXcXdnhC3DbPYG36ocpV6tzon` | Contexte Chromium dédié, anonyme. Aucune session personnelle réutilisée. Lectures publiques et préférences locales uniquement. |
| Copie locale isolée | Même commit ; copie par git archive dans /private/tmp/lunidex-audit-CgB65u ; build servi sur localhost:3101 | Aucun fichier .env copié. Variables Neon, base de données et télémétrie retirées du processus. Données de test locales et simulations sans cloud. |
| Développement local | Démarrage vérifié pendant la campagne | Utilisé pour diagnostic ; les principaux tests locaux ont ensuite utilisé le build de production. |
| Quatre previews Vercel | Branches et commits recensés | Toutes redirigent vers la connexion Vercel. Leur HTTP 200 est celui de la protection, pas une preuve du fonctionnement de Lunidex. |
| Navigateurs | Chromium 149.0.7827.3 | Aucun second moteur opérationnel. Chrome et le navigateur intégré ne constituent pas deux moteurs distincts. Applications natives indisponibles, Mac verrouillé. |

Les versions installées sont Node 22.22.3, Next 16.3.3, React 19.2.3 et Vitest 4.1.11. Les dépendances existantes ont été partagées avec la copie temporaire ; aucun nouvel `npm ci` n’est revendiqué. Preuves : [environnement.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/environnement.json>), [previews-accessibilite.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/previews-accessibilite.json>), [limites-outillage.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/limites-outillage.json>), [audit-runner.py](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/audit-runner.py>).

Le premier build a rencontré un refus réseau pour les polices Google. Le serveur local a aussi rencontré une restriction de liaison de port dans le bac à sable. Les reprises autorisées ont réussi. Ces restrictions de l’environnement d’audit ne sont pas des bugs de Lunidex. Les fichiers PWA générés sont restés dans la copie temporaire.

La télémétrie a été bloquée dans le contexte de production. Les mutations vers l’API de Lunidex ont été bloquées. Les POST GraphQL de PokéAPI nécessaires à la recherche sont des lectures et ont été autorisés après correction du filtre d’audit. Les premières recherches effectuées avec un blocage trop large ont été écartées puis retestées.

### Cartographie et permissions

L’inventaire comporte **59 fichiers de pages, 55 handlers dont 52 sous /api, 81 couples méthode/route API et 100 fichiers de tests**. Chaque fichier de page possède des URL représentatives visitées. La route facultative des scellés inclut ses sous-vues de portefeuille, transactions, analyses, trésorerie et sources.

Les 81 destinations représentatives ont été visitées en français et en anglais, soit 162 observations de rendu. Elles incluent les variantes dynamiques, destinations de menus, profils inexistants, outils secondaires, pages légales, guides, documentation, partage et URL directes. Cet inventaire est exhaustif pour les fichiers découverts à ce commit. Le rendu d’une page personnelle vide ne valide pas son contenu sous un compte connecté.

| Identité ou permission | Vérification effectuée | Validation restante |
|---|---|---|
| Visiteur | Navigation, références publiques, calculs, quiz locaux, restrictions d’ajout, formulaires sans envoi | Aucune identité distante créée |
| Utilisateur connecté | Interfaces de connexion et validations client | Connexion réelle, déconnexion, expiration et renouvellement |
| Propriétaire des données | Contrats et points d’entrée inventoriés | CRUD, rechargement, synchronisation et export serveur |
| Autre utilisateur | Routes de profil/ami et états anonymes/inexistants | Isolation A/B, visibilité, partage et permissions |
| Clé API read | Refus anonyme sans clé et OpenAPI public | Lecture sous clé, refus réel des mutations |
| Clé API read_write | Contrat inventorié | Mutation, ownership, révocation et lecture après écriture |

Aucun rôle administrateur n’a été supposé. Neon est le runtime d’authentification et de données du web ; le dossier Supabase historique ne prouve pas l’usage de Supabase Auth. Les lectures anonymes protégées ont répondu 401 en production. Les réponses 503 locales sans Neon valident l’indisponibilité explicite, pas les permissions entre comptes.

### Parcours et conséquences vérifiés

| Domaine | Exécution réelle notable |
|---|---|
| Navigation | Menus, destinations secondaires mobiles, lien d’évitement, palette globale, focus, Échap, retour navigateur, URL invalides et redirections |
| Pokédex | Recherche par nom, accent et ID, absence de résultat, tri, pagination 20 puis 40, filtres combinés, reset, retour arrière et rechargement |
| Fiches Pokémon | Tous les onglets principaux et secondaires représentatifs, shiny chargé, cris actuel/historique démarrés via le lecteur natif, évolution, forme Alola et retour à l’onglet |
| Outils | Comparaison par lien, ajout et retrait d’ID avec conservation après reload ; tableau des types au clavier ; calculs EV/IV, dégâts, duel et reproduction |
| Jeux | Neuf combinaisons de challenge/mode du quiz ; fin réelle de Marathon, Survie et minuteur ; anti-double réponse ; mini-jeu 404 complet avec collisions, reset, fragments et retour accueil |
| TCG | Recherche stabilisée, extension, tri, pagination 24 puis 48, langues de cartes EN/FR, présentation, filtres avancés, fiche, modale, prix et devise persistante |
| Scellés | Recherche 151, catégorie Display, pagination avec conservation de recherche, absence de résultat, fiche et alias de fiche |
| Compte et formulaires | Champs invalides, mode inscription sans soumission, récupération avec e-mail vide sans requête, jeton absent, import/export local, refus anonymes |
| Contenus et système | Rendus FR/EN, FAQ positive/négative, documentation, 96 sitemaps annoncés, robots, manifest, OpenSearch, llms, ai, worker et hors ligne local |

Quelques valeurs contrôlées : Pikachu niveau 50 et nature neutre produit des IV 30 à 31 avec les statistiques saisies ; les EV testés totalisent 510 avec un plafond de 252 par statistique ; les IV 99 sont ramenés à 31. Le calcul de dégâts passe de 81 à 96 à 120 à 144 selon critique et pluie. Le duel se termine en deux tours sans PV négatifs. La configuration de reproduction testée donne 0,52 % et 192 œufs moyens. Ces résultats sont liés à leurs entrées dans la matrice et ne valident pas toutes les générations ou règles de combat.

Les ajouts personnels restent conditionnés par l’accès cloud. Une partie Nuzlocke n’a pas été créée sans compte. Le défi quotidien n’a pas été lancé. Les comparaisons Pokémon par URL sont publiques ; la comparaison TCG via une liste personnelle n’a pas été validée sous une identité réelle.

### Diagnostics et performance

Les tests ont collecté console, erreurs JavaScript, réponses HTTP, échecs réseau et états intermédiaires. Les erreurs ciblées TCGdex 503 montrent un message de panne, puis des cartes après levée de l’interception. Le formulaire de contact a été testé avec une réponse 503 simulée dans le navigateur local : bouton désactivé, aria-busy, message français et champs conservés. Aucun message n’a été envoyé.

Une latence de 700 ms avant chaque GET TCGdex a été simulée localement. Les trois cartes attendues apparaissent après chargement et restent présentes après reload. Le libellé d’extension incorrect constitue BUG-015. Le test ne simule pas une limitation de débit complète. Un chunk Sentry facultatif en 404 n’a pas empêché l’ouverture de la connexion à 9 puis 18 secondes ; aucune panne globale de synchronisation n’en est déduite.

Le worker local et le cache pages-v3 ont été observés. Un document non encore mis en cache affiche le fallback hors ligne. Après une visite contrôlée et mise en cache, le Pokédex complet se recharge hors ligne. Cela ne valide pas l’installation native, les notifications, les données jamais consultées ou la resynchronisation d’un compte connecté.

Les mesures portent sur trois passages à froid navigateur et trois rechargements à chaud par route et environnement, soit 36 passages. Le cache serveur n’a pas été purgé. Le worker et la télémétrie ont été bloqués pour ces mesures. L’observation LCP dure 2,5 secondes ; il ne s’agit pas de Core Web Vitals terrain ni d’un test de charge.

| Environnement / route | DOM médian froid / chaud | LCP observé médian froid / chaud | Ressources médianes froid / chaud |
|---|---:|---:|---:|
| Production /fr | 359 / 193 ms | 376 / 204 ms | 69 / 66 |
| Production /fr/pokedex | 331 / 241 ms | 368 / 268 ms | 122 / 102 |
| Production /fr/tcg | 335 / 200 ms | 988 / 616 ms | 250 / 90 |
| Local /fr | 229 / 122 ms | 268 / 148 ms | 65 / 65 |
| Local /fr/pokedex | 735 / 327 ms | 804 / 344 ms | 121 / 121 |
| Local /fr/tcg | 207 / 200 ms | 780 / 440 ms | 250 / 112 |

Preuve des mesures : [performances-synthese.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/performances-synthese.json>). Les mesures de rendu initial ne garantissent pas que tous les filtres ou services différés sont prêts.

Le chargement froid TCG a déclenché 220 requêtes distinctes de détail d’extension. Cette observation concorde avec l’enrichissement de toutes les extensions, avec concurrence de 10, dans [src/lib/api/tcg.ts:1796](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/tcg.ts:1796>). Il s’agit d’une cible d’amélioration de performance, pas d’une panne démontrée.

| Contrôle dans la copie isolée | Résultat |
|---|---|
| npm test | 100 fichiers, 474 tests réussis ; aucune validation cloud réelle déduite |
| npm run lint | Réussi |
| npm run typecheck | Réussi |
| npm run seo:check | Réussi |
| npm run build | Réussi après accès réseau nécessaire aux polices |
| TypeScript packages/core | Réussi |

Logs : [vitest.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/vitest.log>), [lint.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/lint.log>), [types.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/types.log>), [seo.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/seo.log>), [build.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/build.log>), [core.log](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/core.log>). Les contrôles de code n’ont pas été utilisés pour remplacer les tests navigateur.

## B. Inventaire des anomalies

P0 désigne un défaut critique ; P1 un parcours majeur bloqué ; P2 un fonctionnement partiellement défaillant ; P3 un défaut mineur. La gravité repose sur l’impact observé, pas sur une hypothèse de cause.

### BUG-001 · P1 · Catalogues de capacités, talents et objets incomplets

**Pages et environnement.** /fr/moves, /en/moves, /fr/abilities et /fr/items, production, visiteur.

1. Ouvrir un catalogue dans une session neuve.
2. Rechercher Tonnerre ou Thunderbolt, Technicien, puis Restes dans leurs catalogues respectifs.
3. Ouvrir directement /fr/moves/thunderbolt, /fr/abilities/technician et /fr/items/leftovers.
4. Dans les capacités, combiner Feu et Spécial.

**Attendu.** Retrouver les entrées existantes et filtrer le catalogue complet.

**Observé.** Les recherches retournent zéro alors que les fiches directes existent. Les listes présentent 48 entrées. Feu + Spécial ne trouve aucune capacité dans ce sous-ensemble.

**Impact.** Recherche de référence inutilisable pour une grande partie des données ; faux états vides et perte de confiance.

**Cause établie.** [src/lib/api/server-cache.ts:38](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/api/server-cache.ts:38>) limite les données initiales à 48. Les pages les placent dans les mêmes clés de cache que les catalogues complets, par exemple [src/app/moves/page.tsx:42](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/app/moves/page.tsx:42>). Le client les considère fraîches pendant 24 heures via [src/lib/query-options.ts:2](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/query-options.ts:2>).

**Correction recommandée.** Distinguer aperçu initial et catalogue complet dans le cache, ou définir explicitement l’incomplétude et charger/paginer les données restantes. Ajouter une régression qui retrouve une entrée située après les 48 premières.

**Preuves.** [references-catalogues-tronques.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/references-catalogues-tronques.json>), [catalogues-reproduction-et-tcg-controles.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/catalogues-reproduction-et-tcg-controles.json>), [capacites-objets-filtres-apercu.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/capacites-objets-filtres-apercu.json>).

### BUG-002 · P1 · Une équipe partagée devient vide pour un visiteur

**Page et environnement.** /fr/team/share?code=25-6-9&lang=fr, production anonyme ; variante EN examinée.

1. Ouvrir le lien partagé dans la session dédiée.
2. Attendre l’initialisation des services, puis vérifier les membres et l’URL.
3. Recharger la destination.

**Attendu.** Consulter Pikachu, Dracaufeu et Tortank depuis un lien public, avec une éventuelle demande de connexion pour enregistrer une copie.

**Observé.** Redirection vers /fr/team, disparition du code et équipe à 0/6. L’attente de 8,5 secondes ne restaure pas les membres.

**Impact.** Le destinataire perd le contenu partagé et le paramètre permettant de le récupérer.

**Cause établie.** L’effet de [src/app/team/page.tsx:109](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/app/team/page.tsx:109>) appelle addToTeam puis supprime les paramètres. Le store refuse les modifications synchronisées sans accès prêt dans [src/store/primedex.ts:393](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/store/primedex.ts:393>). Le chemin de partage ne vérifie pas ce refus avant de consommer le code.

**Correction recommandée.** Rendre la consultation du lien indépendante de la sauvegarde personnelle, conserver les paramètres tant que l’import n’est pas accepté et afficher un succès seulement après application réelle.

**Preuves.** [auth-idle-et-partage-reproduction.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/auth-idle-et-partage-reproduction.json>), [invalides-et-partage.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/invalides-et-partage.json>), [Capture de l’équipe vide](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/equipe-partagee-vide.png>).

### BUG-003 · P1 · Import local annoncé réussi mais perdu au rechargement

**Pages et environnement.** Paramètres/import puis /fr/favorites, copie locale sans Neon. Ce scénario n’a pas été exécuté avec un compte ni en production.

1. Importer [la sauvegarde de test](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/valid-backup.json>) contenant le favori 25.
2. Vérifier la prévisualisation à un favori et confirmer.
3. Naviguer vers Favoris, puis recharger.

**Attendu.** Un import annoncé réussi doit être conservé, ou être refusé avec une explication claire de l’accès requis.

**Observé.** Message de réussite ; un favori en navigation client ; zéro après reload.

**Impact.** L’utilisateur peut croire sa restauration terminée et fermer sa session avant que les données soient enregistrées. Aucune perte de données personnelles réelles n’a été provoquée.

**Cause établie.** [src/components/layout/DataExportImport.tsx:171](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/layout/DataExportImport.tsx:171>) applique l’état et affiche une réussite sans accusé de sauvegarde. [src/lib/supabase/sync-state.ts:341](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/lib/supabase/sync-state.ts:341>) utilise directement setState. La persistance locale de [src/store/primedex.ts:1039](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/store/primedex.ts:1039>) ne conserve pas les favoris.

**Correction recommandée.** Définir le contrat d’import en mode sans cloud : import durable autorisé ou refus explicite. Attendre une sauvegarde confirmée avant le message de succès ; traiter l’état temporaire comme tel.

**Preuves.** [import-consequences.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/import-consequences.json>), [imports-local-validation.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/imports-local-validation.json>), [import-favoris-apres-rechargement.png](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/import-favoris-apres-rechargement.png>).

### BUG-004 · P2 · Import Showdown avec fausse confirmation d’ajout

**Page et environnement.** /fr/team, local isolé sans cloud.

1. Ouvrir l’import Showdown.
2. Importer Pikachu avec Light Ball, Static, nature Timid et deux attaques.
3. Vérifier la prévisualisation, cliquer Add to Team et examiner l’équipe.
4. Recharger.

**Attendu.** Ajouter réellement le Pokémon ou expliquer le refus sans annoncer un ajout.

**Observé.** "Added 1 Pokémon..." et invitation à se connecter simultanées ; équipe à 0/6 avant et après reload.

**Impact.** Confirmation trompeuse et risque de perdre le contenu importé en pensant l’avoir sauvegardé.

**Cause établie.** [src/components/team/ShowdownImportDialog.tsx:81](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/team/ShowdownImportDialog.tsx:81>) incrémente added après addToTeam, dont le refus n’est pas retourné au dialogue.

**Correction recommandée.** Vérifier l’accès avant l’opération et construire la confirmation depuis les membres effectivement ajoutés.

**Preuve.** [showdown-import-et-comparaison.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/showdown-import-et-comparaison.json>).

### BUG-005 · P2 · Les préférences son et sprites animés ne persistent pas

**Page et environnements.** Paramètres du Pokédex, production et local, visiteur.

1. Désactiver le son et activer les sprites animés.
2. Fermer les paramètres et recharger.
3. Contrôler les valeurs, ainsi que le thème et la devise comme témoins.

**Attendu.** Conserver ces préférences locales après reload.

**Observé.** soundEnabled revient à true et animatedSprites à false. Le thème sombre et la devise USD persistent dans les scénarios témoins.

**Impact.** Réglages répétés et préférences de confort non respectées.

**Cause établie.** Les clés sont autorisées comme préférences locales, mais absentes de partialize et du merge de persistance dans [src/store/primedex.ts:1039](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/store/primedex.ts:1039>).

**Correction recommandée.** Persister et réhydrater ces petits réglages avec les autres préférences locales, indépendamment d’un compte.

**Preuves.** [preferences-verification.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/preferences-verification.json>), [preferences-prod-consent-zoom.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/preferences-prod-consent-zoom.json>), [preferences-production-resultat-stable.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/preferences-production-resultat-stable.json>).

### BUG-006 · P2 · Exception d’hydratation sur une fiche de carte TCG

**Pages et environnement.** /fr/tcg/cards/sv03.5-199 et /en/tcg/cards/sv03.5-199, production, accès direct.

1. Ouvrir la fiche dans un contexte dédié.
2. Collecter les erreurs pageerror pendant le rendu.
3. Répéter en FR et EN.

**Attendu.** Rendu et hydratation sans exception React.

**Observé.** Erreur React minifiée 418 dans les deux langues. La fiche reste affichée et utilisable dans les observations, sans crash total.

**Impact.** Régénération du rendu client et risque d’instabilité lors de l’initialisation. Aucun impact supplémentaire n’est affirmé sans preuve.

**Cause.** Le décalage entre HTML serveur et premier rendu client est confirmé par [la documentation officielle de l’erreur React 418](https://react.dev/errors/418). Le champ précis responsable n’est pas établi.

**Correction recommandée.** Reproduire en mode développement, comparer le HTML serveur et le premier rendu client de cette fiche, puis stabiliser les données initiales concernées.

**Preuve.** [Erreurs, piles et contenu FR/EN](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/hydration-carte-reproduction-dediee.json>).

### BUG-007 · P2 · Traductions d’interface incomplètes et clés visibles

**Pages et environnement.** Routes /fr de références, combat, EV/IV, types, Showdown, quiz, comparaison, filtres TCG et 404.

1. Ouvrir les pages françaises et leurs commandes.
2. Terminer une partie Contre la montre et consulter la comparaison.
3. Ouvrir une URL inexistante et les filtres avancés TCG.

**Attendu.** Commandes et messages français cohérents ; aucune clé de traduction brute.

**Observé.** "Items" et commandes anglaises dans les objets, Weather/Terrain dans le combat, phrases anglaises EV/IV et types, import Showdown anglais, 404 et mini-jeu anglais. STATS.OFFENSIVE, STATS.DEFENSIVE et QUIZ.TIME-ATTACK apparaissent comme libellés. Certains chips TCG utilisent Released after, Min price et Illustrator.

**Impact.** Compréhension inégale et résultat de quiz ou catégories de comparaison peu lisibles.

**Cause.** L’origine exacte de chaque traduction absente n’a pas été établie. Les noms des cartes et attaques en anglais lorsque tcgLang=en sont exclus de cette anomalie, de même que les messages natifs du navigateur en-US.

**Correction recommandée.** Compléter les clés manquantes, remplacer les chaînes UI anglaises et contrôler les chemins de fin de partie, modales, erreurs et filtres dans les huit langues.

**Preuves.** [Index des constats et sources originales](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/localisation-constats.json>), [quiz-minuteur-fin.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/quiz-minuteur-fin.json>), [comparaison-liens-invalides-reproduits.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/comparaison-liens-invalides-reproduits.json>), [tcg-date-reset-et-matrice-clavier.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-date-reset-et-matrice-clavier.json>), [shiny-maze-preuve-stable.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/shiny-maze-preuve-stable.json>).

### BUG-008 · P2 · Bouton favori partiellement coupé sur mobile

**Page et environnement.** /fr/pokedex, production, formats 360 × 800 et 390 × 844.

1. Afficher les premières cartes aux deux largeurs.
2. Examiner la rangée des actions et mesurer le bouton favori et son article.
3. Comparer à 768 et 1440 pixels.

**Attendu.** Bouton de 44 pixels entièrement visible dans la carte.

**Observé.** À 360 pixels, l’article se termine à x=167,2 et le bouton à x=191,56. L’overflow hidden coupe environ 24,36 pixels. À 390 pixels, environ 9,36 pixels sont coupés. La géométrie tablette/desktop est complète.

**Impact.** Icône et cible tactiles tronquées. Le clic automatisé a fonctionné sur la portion visible ; l’action n’est pas déclarée totalement inaccessible.

**Cause établie.** La rangée dépasse la largeur disponible et le conteneur la masque.

**Correction recommandée.** Adapter la disposition des actions aux petites cartes, préserver l’intégralité des cibles et vérifier les quatre formats.

**Preuves.** [actions-pokedex-geometrie-quatre-formats.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/actions-pokedex-geometrie-quatre-formats.json>), [pokedex-actions-coupees.png](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/pokedex-actions-coupees.png>), [pokedex-mobile.png](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/pokedex-mobile.png>).

### BUG-009 · P2 · Contrastes insuffisants sur plusieurs écrans

**Pages et conditions.** Combat, objets, EV/IV, carte TCG, types, reproduction et extension TCG en clair ; filtres TCG avancés en sombre.

1. Ouvrir les états documentés dans les preuves.
2. Exécuter axe-core sur les règles WCAG A/AA et inspecter les éléments signalés.
3. Répéter l’analyse sur le dialogue de filtres sombre.

**Attendu.** Contraste requis pour les textes et libellés selon leur taille.

**Observé.** Occurrences signalées en clair : combat 5, objets 153, EV/IV 20, carte 3, types 16, reproduction 5, extension 4. Le dialogue sombre comporte 12 occurrences. Exemples de rapports : 2,53 et 2,25 pour un minimum de 4,5.

**Impact.** Textes difficiles à lire, notamment avec déficience visuelle ou éclairage défavorable. Les occurrences correspondent aux états DOM analysés, pas à autant de bugs indépendants.

**Cause.** Les combinaisons de couleurs/opacité signalées sont établies ; un inventaire exhaustif de tous les tokens et fonds n’a pas été réalisé.

**Correction recommandée.** Ajuster les tokens et opacités pour les thèmes clair/sombre, puis vérifier les textes sur leurs fonds réels. Examiner manuellement les cas axe incomplets.

**Preuves.** [accessibilite-01.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/accessibilite-01.json>), [accessibilite-02.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/accessibilite-02.json>), [accessibilite-filtres-tcg.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/accessibilite-filtres-tcg.json>).

### BUG-010 · P2 · Champs EV/IV sans nom accessible associé

**Page et environnement.** /fr/ev-iv, production, état de calcul analysé.

1. Ouvrir le calculateur.
2. Inspecter le nom accessible du champ niveau et du sélecteur de nature.
3. Exécuter les règles label et select-name d’axe.

**Attendu.** Chaque champ possède un nom accessible correspondant à son libellé visible.

**Observé.** Un champ numérique et un select n’ont pas d’association accessible suffisante. Axe signale label et select-name, chacun sur un élément.

**Impact.** Identification difficile par une technologie d’assistance. Aucun test auditif VoiceOver réel n’est revendiqué.

**Cause établie.** Association manquante dans le DOM observé.

**Correction recommandée.** Relier label/for et id, ou utiliser une association sémantique équivalente, puis contrôler l’ensemble du formulaire.

**Preuve.** [accessibilite-01.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/accessibilite-01.json>).

### BUG-011 · P2 · Hiérarchie ARIA incorrecte du tableau des types

**Page et environnement.** /fr/types, production.

1. Ouvrir la matrice des types.
2. Inspecter les cellules role=gridcell et leurs parents.
3. Exécuter aria-required-parent ; tester séparément Enter et ArrowRight.

**Attendu.** Une structure cohérente de tableau/grille avec les parents requis.

**Observé.** 324 cellules signalées sans parent ARIA requis. La sélection Enter et le déplacement ArrowRight fonctionnent dans le scénario clavier testé.

**Impact.** Structure et relations du tableau mal exposées aux lecteurs d’écran ; le clavier n’est pas déclaré inopérant.

**Cause établie.** Hiérarchie de rôles invalide dans le DOM.

**Correction recommandée.** Choisir une structure table ou grid cohérente, avec row et cellules adaptées, puis vérifier l’annonce des axes et multiplicateurs.

**Preuves.** [accessibilite-02.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/accessibilite-02.json>), [tcg-date-reset-et-matrice-clavier.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-date-reset-et-matrice-clavier.json>).

### BUG-012 · P2 · Doublons d’ID dans une comparaison partagée

**Page et environnement.** /fr/compare?ids=25,25,6,133, production.

1. Ouvrir le lien avec quatre valeurs dont un doublon.
2. Examiner les cartes et les analyses.
3. Répéter l’accès direct.

**Attendu.** Dédupliquer avant la limite de trois Pokémon, ou refuser explicitement le lien invalide.

**Observé.** Pikachu apparaît deux fois, Dracaufeu une fois et Évoli est omis. Les analyses comptent les deux Pikachu.

**Impact.** Comparaison et faiblesses communes biaisées.

**Cause établie.** [src/app/compare/page.tsx:79](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/app/compare/page.tsx:79>) filtre puis applique slice(0,3) sans déduplication.

**Correction recommandée.** Valider des IDs entiers positifs, dédupliquer avant la limite et présenter les références refusées.

**Preuves.** [parametres-liens-limites.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/parametres-liens-limites.json>), [comparaison-liens-invalides-reproduits.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/comparaison-liens-invalides-reproduits.json>).

### BUG-013 · P3 · Référence invalide présentée comme comparaison vide

**Page et environnement.** /fr/compare?ids=9999999, production.

1. Ouvrir le lien.
2. Attendre la requête et sa tentative de reprise, environ 12 secondes.
3. Comparer l’erreur réseau et le message UI.

**Attendu.** Signaler une référence invalide et proposer une récupération.

**Observé.** PokéAPI répond 404, puis l’interface affiche "Aucun Pokémon à comparer" et une invitation à ajouter des Pokémon sans expliquer l’échec.

**Impact.** Le destinataire ne sait pas si le lien est vide, invalide ou si le réseau a échoué.

**Cause établie.** Le rendu vide du comparateur ne distingue pas ce résultat d’une erreur de requête.

**Correction recommandée.** Séparer absence de sélection, ID introuvable et indisponibilité réseau ; conserver l’information permettant de réparer le lien.

**Preuve.** [comparaison-liens-invalides-reproduits.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/comparaison-liens-invalides-reproduits.json>).

### BUG-014 · P2 · Le plafond de taille affiché à 25 m est ignoré

**Page et environnement.** Filtres avancés /fr/pokedex, production.

1. Placer le minimum de taille au maximum du slider.
2. Vérifier l’URL height=25-25 et le libellé 25 à 25 m.
3. Examiner Dracaufeu Gigamax parmi les 18 résultats.
4. Contrôler sa taille dans la réponse de référence publique.

**Attendu.** Respecter la limite affichée, ou indiquer explicitement une borne ouverte "25 m et plus".

**Observé.** Dracaufeu Gigamax est inclus avec une taille source de 280 décimètres, soit 28 m.

**Impact.** Filtre numérique trompeur ; les résultats ne respectent pas l’intervalle annoncé.

**Cause établie.** [src/components/pokemon/PokemonList.tsx:367](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/pokemon/PokemonList.tsx:367>) traite maxH >= 25 comme l’absence de maximum, tandis que l’interface affiche une borne exacte.

**Correction recommandée.** Harmoniser le libellé et le contrat numérique, ou élargir le slider et appliquer la borne réelle.

**Preuves.** [pokedex-toutes-familles-filtres.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/pokedex-toutes-familles-filtres.json>), [filtres-legendaire-taille-verifies.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/filtres-legendaire-taille-verifies.json>).

### BUG-015 · P2 · Mauvais nom d’extension pendant le chargement TCG

**Page et conditions.** /fr/tcg?set=sv03.5&q=charizard, build local identique à la production ; réseau simulé. Le défaut a été reproduit avec deux configurations de délai.

1. Dans un contexte neuf, retarder la lecture de la liste TCGdex /v2/en/sets de huit secondes.
2. Charger le lien ciblant 151 et attendre trois secondes.
3. Examiner les cartes, le chip Extension et le nombre de résultats.
4. Laisser les métadonnées terminer leur chargement.

**Attendu.** Afficher 151, son ID ou un état neutre de chargement, sans substituer une autre extension.

**Observé.** Trois cartes sv03.5 sont correctement affichées et portent 151, mais le chip et le compteur annoncent "30th Classic Collection". Après chargement des métadonnées, les deux libellés deviennent 151.

**Impact.** Résultats temporairement attribués à une mauvaise extension ; confusion lors de l’ouverture d’un lien partagé sur réseau lent.

**Cause établie.** [src/components/tcg/TCGResearchDesk.tsx:193](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/src/components/tcg/TCGResearchDesk.tsx:193>) utilise latestSet puis latestSetFallbackName lorsque les métadonnées de l’extension sélectionnée ne sont pas disponibles.

**Correction recommandée.** Ne pas remplacer le nom d’une extension explicitement sélectionnée par celui de la dernière extension. Charger sa métadonnée ciblée ou afficher un libellé neutre associé à son ID.

**Preuves.** [tcg-latence-simulation-validee.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-latence-simulation-validee.json>), [Reproduction ciblée, état incorrect puis corrigé](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-nom-extension-retarde-reproduction.json>). La production non ralentie affiche correctement 151 après stabilisation ; aucune erreur permanente du catalogue n’est affirmée.

## C. Audit UX/UI

Ces propositions sont distinctes des dysfonctionnements précédents. Leur bénéfice est attendu ; il n’a pas été mesuré par un test utilisateur.

| ID | Observation | Modification proposée | Intérêt et impact attendu |
|---|---|---|---|
| UX-001 | Avant l’initialisation différée, une action personnelle affiche un état de chargement. Après 8,5 s, elle ouvre la connexion. | Rendre l’état d’accès et la demande de connexion disponibles tôt ; différer séparément les services facultatifs. | Éviter que le premier clic ressemble à un refus sans suite. [auth-idle-et-partage-reproduction.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/auth-idle-et-partage-reproduction.json>) |
| UX-002 | Catalogue TCG froid : 220 détails d’extension demandés ; données et métadonnées n’arrivent pas ensemble. | Charger les noms légers immédiatement, enrichir à la demande et suivre les requêtes réellement utiles. | Réduire les requêtes, le délai des filtres et l’exposition au réseau lent. [tcg-reseau-inventaire.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-reseau-inventaire.json>) |
| UX-003 | Les changements de recherche/langue TCG peuvent nécessiter plusieurs secondes ; une observation trop précoce voit encore le chargement. | Indiquer la recherche/langue en cours et différencier résultats précédents et nouveaux résultats. | Faciliter la compréhension du délai et éviter les clics répétés. [tcg-recherches-stabilisees.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-recherches-stabilisees.json>), [tcg-langue-fr-et-fiche.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/tcg-langue-fr-et-fiche.json>) |
| UX-004 | Les filtres de génération incluent des formes régionales plus récentes lorsque leur espèce appartient à la génération choisie. | Expliquer "génération de l’espèce" ou proposer un filtre distinct pour l’apparition de la forme. | Clarifier une règle de produit ambiguë, sans qualifier le comportement actuel de bug. [pokedex-filtres-resultats.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/pokedex-filtres-resultats.json>) |
| UX-005 | Quiz Stats : les valeurs sont ??? avant réponse, mais les barres donnent une information visuelle. | Expliquer la règle et fournir un équivalent accessible du renseignement visuel si ce mode repose sur les barres. | Réduire l’ambiguïté et rendre le défi compréhensible sans perception des graphismes. [quiz-stats-attente.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/quiz-stats-attente.json>) |
| UX-006 | Les fonctionnalités personnelles invitent à se connecter malgré une promesse générale de fonctionnement local. | Préciser quelles données sont consultables/locales et quelles opérations requièrent le cloud, dès l’entrée concernée. | Éviter une attente erronée sur la conservation des collections et équipes. À coordonner avec BUG-002 à BUG-004. |
| UX-007 | Le bouton "Sources" des capacités œuf donne un conseil de groupe d’œufs et un lien externe, sans liste de parents transmetteurs. | Renommer en "Conseil et référence", ou ajouter des parents compatibles et la génération/version concernée. | Donner une réponse plus directe au besoin de transmission. [capacites-oeuf-execution-validee.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/capacites-oeuf-execution-validee.json>) |
| UX-008 | La connexion locale indisponible affiche deux fois le même message sur le démarrage de collection. | Regrouper le message et ajouter une action de reprise explicite. | Améliorer la lisibilité du mode sans cloud. Observation locale uniquement, sans conclure à un défaut de production. [Preuve locale](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/connexion-locale-indisponible.json>) |

Les quatre formats testés sont 360 × 800, 390 × 844, 768 × 1024 et 1440 × 900. Les 324 mesures ne détectent aucun débordement global du document. Elles n’excluent pas une découpe interne comme BUG-008. Les captures de Pokédex, TCG mobile, tableau des types et combat tablette ont été examinées.

Le contrôle à 200 % utilise CSS zoom=2. Il ne remplace pas un test de zoom natif. L’émulation reduced-motion transmet correctement la préférence média ; toutes les animations n’ont pas été évaluées individuellement. Les thèmes clair/sombre et les contrastes sont représentés dans les preuves. Axe a produit 15 analyses, dont un état sombre de filtres. Une absence de violation sur une analyse ne vaut pas certification WCAG, surtout lorsque des contrôles sont incomplets.

Les huit langues ont été testées par navigation accueil vers Pokédex puis reload. FR/EN couvrent les 81 destinations ; ES/DE/IT/JA/KO/ZH couvrent aussi accueil, Pokédex et TCG, soit 18 visites supplémentaires. Les caractères et préfixes observés sont conservés. Cela ne valide pas toutes les traductions de tous les écrans dans les six langues supplémentaires, ni les 17 catalogues de langues des cartes.

## D. Couverture des tests

### Résultats et règles de comptage

La [matrice CSV](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-matrice-couverture.csv>) contient une ligne par scénario explicite. Les quatre statuts sont exclusifs. Un scénario réussi valide seulement son attendu, par exemple un refus 401 anonyme ou un document XML disponible. Un contrôle de rendu, géométrie ou mesure n’est pas une réussite de CRUD.

| Catégorie | Réussi | Échoué | Bloqué | Non exécuté |
|---|---:|---:|---:|---:|
| Rendu direct FR/EN | 160 | 2 | 0 | 0 |
| Géométrie responsive | 324 | 0 | 0 | 0 |
| Langues et maintien du préfixe | 26 | 0 | 0 | 0 |
| Interactions fonctionnelles exécutées | 137 | 18 | 0 | 0 |
| Parcours métier nécessitant des accès | 0 | 0 | 61 | 0 |
| API | 56 | 0 | 41 | 0 |
| Accessibilité | 7 | 8 | 2 | 0 |
| Documents système | 108 | 0 | 0 | 0 |
| Mesures de performance | 36 | 0 | 0 | 0 |
| Environnements et second moteur | 0 | 0 | 5 | 0 |
| Variantes de données/combinaisons | 0 | 0 | 0 | 1 |
| Contrôles automatisés du code | 6 | 0 | 0 | 0 |
| **Total** | **860** | **28** | **109** | **1** |

Les contrôles système comprennent 96 sitemaps annoncés et 12 documents/redirections. Les 56 lectures API comprennent 40 cas locaux généraux, 8 cas publics locaux avec paramètres valides ou volontairement invalides et 8 lectures de production.

| Indicateur | Calcul | Résultat et interprétation |
|---|---|---|
| Couverture d’exécution globale hors contrôles de code | 882 exécutés / 992 lignes | 88,9 % ; les blocs métier et variantes restent dans le dénominateur |
| Couverture fonctionnelle et métier | 155 exécutés / 216 scénarios | 71,8 % ; indicateur plus représentatif des interactions |
| Exécution des scénarios fonctionnels retenus comme réalisables | 155 / 155 | 100 % de ce corpus borné ; 18 échecs inclus |
| Réussite des scénarios fonctionnels exécutés | 137 / 155 | 88,4 % ; ne couvre pas les 61 scénarios bloqués |
| Fichiers de pages avec représentant observé | 59 / 59 | 100 % de cartographie et accès représentatifs, pas 100 % des fonctionnalités connectées |

Les lignes de géométrie et de sitemaps sont nombreuses. Elles ne doivent pas masquer les 61 parcours métier bloqués. La ligne Variantes ne compte pas chaque Pokémon, carte, produit, contenu dynamique ou combinaison de filtres non testé ; le taux global n’est donc pas un taux exhaustif de toutes les données possibles.

### Blocages et préparation de la prochaine campagne

| Périmètre bloqué | Scénarios préparés | Accès ou autorisation nécessaire |
|---|---|---|
| Compte et sessions | Inscription, vérification e-mail, login valide, reset valide, logout, expiration et renouvellement | Deux comptes de test et service d’authentification de bac à sable ; autorisation d’envois de test |
| Données Pokémon personnelles | Favoris, captures, progression, badges, historique, équipe, export, import durable, Nuzlocke | Base jetable avec fixtures ; écritures et suppressions de test autorisées |
| Collection TCG | Albums, possession, quantité, variantes, notes, wishlist, recherches enregistrées, decks et compteurs transversaux | Compte de test, fixtures de cartes/collections/decks ; contrôle après reload et autre onglet |
| Scellés personnels | Positions, coût, transactions, ventes, portefeuille, analyses, trésorerie, sources et export | Portefeuille de test sans transaction réelle ; aucune commande ou achat |
| Amis et profils | Pseudo, visibilité, demandes, acceptation/refus/retrait et lecture A/B | Deux propriétaires et un tiers, consentement aux échanges de test |
| Combat multijoueur | Création/rejointure, mises à jour entre joueurs, spectateur et messages | Salles et comptes de test ; autorisation ciblée des communications |
| Défi quotidien | Lancement, réponses, soumission, anti-rejeu, classement | Bac à sable et autorisation d’écriture des tentatives/résultats |
| API | 18 POST, 9 DELETE, 8 PATCH, 4 PUT, deux GET cron ; clés read/read_write et isolation propriétaire | Requêtes ciblées dans une base jetable, clés temporaires, fixtures A/B ; jamais de cron distant casual |
| Contact | Envoi et réception réels | Destination de test autorisée, aucun message à un tiers |
| PWA | Installation native, permission push, notification, session connectée hors ligne et reprise | Session navigateur native dédiée accessible ; infrastructure de test et permission d’envoi |
| Previews | Quatre environnements recensés | Accès autorisé à la protection Vercel ; validation de version après accès |
| Autre moteur, zoom, lecteur d’écran | WebKit/Firefox, zoom natif 200 %, annonces VoiceOver/NVDA | Outils opérationnels et session native dédiée sans données personnelles |
| Corpus restant | Autres entités, toutes les traductions et combinaisons | Corpus fini et données figées ; campagne dédiée sans charge abusive |

Aucune écriture n’a été réalisée sur un compte distant. Les attentes préparées doivent inclure la lecture après écriture, le rechargement, les compteurs sur les écrans liés, l’absence de doublons, le retour arrière et les conflits entre deux onglets/appareils.

La revue automatique d’approbation a refusé le balayage API avec méthodes de mutation, l’ajout d’une carte en production et le lancement du défi quotidien. Ces actions n’ont pas été exécutées. Le motif portait sur les effets possibles sur les données, tentatives ou services distants dans le cadre sans écriture. Les tests indépendants ont continué. Traces : [api-local-01.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/api-local-01.json>), [gardes-carte-contact-auth.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/gardes-carte-contact-auth.json>), [quiz-quotidien-anonyme-complet.json](</Users/estebandeloge/Documents/GitHub/Site Web/Lunidex/docs/audits/2026-10-02-preuves/quiz-quotidien-anonyme-complet.json>).

### Limites méthodologiques

Les routes dynamiques ont reçu des variantes représentatives et des identifiants invalides. Leurs jeux de données complets et le produit cartésien de tous les paramètres restent non exécutés. Les liens marchands ont été examinés comme destinations, sans achat ni test complet de chaque site tiers.

Les données publiques TCG/PokéAPI évoluent ; prix, dates et totaux restent des observations datées. Les snapshots d’état ne constituent pas des vidéos de chaque interaction. Le manifeste distingue les preuves exploitées, artefacts secondaires et tentatives inconclusives.

Les parcours personnels ne sont pas validés par leurs états vides, leurs tests unitaires, leurs réponses locales 503 ou leurs interfaces de connexion. La persistance inter-appareils et les conflits réels de synchronisation ne sont pas établis. Les interactions de préférences dans un contexte dédié ne prouvent pas le comportement sous un compte connecté.

## E. Plan d’action

### Bugs avérés à corriger

| Ordre | Tickets | Impact et dépendance | Validation attendue après correction |
|---|---|---|---|
| 1 | BUG-001, P1 | Références centrales introuvables ; contrat cache aperçu/complet | Trouver Tonnerre, Technicien et Restes dans les deux langues ; filtres sur données complètes |
| 2 | BUG-002, P1 | Partage d’équipe perdu ; distinguer consultation publique et sauvegarde personnelle | Lien public consultable avec trois membres avant/après reload, sans consommation prématurée du code |
| 3 | BUG-003, P1 ; BUG-004, P2 | Faux succès d’import ; définir le contrat de durabilité et le retour des mutations | Refus clair ou données durablement enregistrées ; aucune confirmation contradictoire |
| 4 | BUG-005, P2 | Préférences non conservées ; persistance locale | Son et sprites conservés, y compris sans compte et après changement de page |
| 5 | BUG-006, P2 | Exception React ; cause précise à diagnostiquer | Aucune erreur418 sur accès direct/reload FR/EN et fiche comparable |
| 6 | BUG-008 à BUG-011, P2 | Actions mobiles et accès aux informations | Cibles entières à360/390 ; contrastes suffisants ; noms et hiérarchie ARIA corrects ; contrôle clavier et lecteur d’écran |
| 7 | BUG-012, BUG-014, BUG-015, P2 ; BUG-013, P3 | Comparaisons, bornes et contexte des résultats | IDs dédupliqués ; erreur explicite ; borne25m cohérente ; nom d’extension exact même avec métadonnées retardées |
| 8 | BUG-007, P2 | Compréhension et localisation | Fin de quiz, comparaison, formulaires, erreurs, modales et404 traduits ; aucune clé brute |

Les tickets d’import et de partage dépendent d’une décision produit sur les données personnelles en mode local sans cloud. La correction ne doit pas contourner l’ownership ou restaurer silencieusement un ancien contrat de persistance. Les corrections de cache et de traduction peuvent avancer indépendamment de l’accès aux comptes de test.

### Risques à confirmer, sans les présenter comme bugs

| ID | Risque non validé | Campagne nécessaire |
|---|---|---|
| RISK-001 | Accès aux données d’un autre propriétaire ou confidentialité des profils | Fixtures A/B/tiers et clés distinctes ; lectures positives/négatives sous identités réelles |
| RISK-002 | Conflits de synchronisation, import durable et multi-onglets/appareils | Écritures concurrentes en bac à sable, coupure réseau, reprise et vérification des versions |
| RISK-003 | Expiration de session, révocation de clé et permissions read/read_write | Comptes et clés temporaires ; contrôle401/403 et absence d’écriture sous read |
| RISK-004 | Défi quotidien, anti-rejeu, records et effets multijoueurs | Tentatives de test autorisées et reprise après interruption, sans classement de production |
| RISK-005 | Données distantes absentes/incohérentes dans d’autres langues ou variantes | Corpus figé de Pokémon, cartes, extensions et produits avec états incomplets |
| RISK-006 | Installation, notifications et accessibilité native | Second moteur, zoom réel, lecteur d’écran et PWA installée dans une session dédiée |

### Améliorations proposées

Planifier UX-001 et UX-002 après la clarification des dépendances d’authentification et de chargement TCG. Associer UX-003 au correctif BUG-015. Traiter UX-006 avec le contrat d’import et de partage. Les explications de génération, quiz Stats et capacités œuf peuvent faire l’objet d’un lot de contenu distinct.

La campagne de correction devra reprendre les scénarios échoués, puis ouvrir les 61 parcours métier et 41 contrôles API actuellement bloqués dans un environnement autorisé. Une nouvelle vérification des seules pages publiques ne suffira pas à déclarer le produit entièrement validé.

## Suivi de mise en œuvre — 2026-10-03

Les changements ci-dessous corrigent les anomalies constatées dans le dépôt local. Ils n’ont pas été déployés. « À reprendre » signifie qu’une validation dépend d’un compte de test, d’un service externe joignable ou d’une nouvelle campagne axe ; aucune réussite n’est présumée pour ces cas.

| Anomalie | Mise en œuvre | Vérification et limite restante |
|---|---|---|
| BUG-001 | Les résultats SSR limités sont marqués périmés pour que le navigateur recharge les catalogues complets. | Dans le build local, les catalogues affichent 800 objets, 937 capacités et 307 talents ; Restes, Tonnerre et Technicien sont retrouvés. |
| BUG-002 | Le lien partagé est rendu en aperçu indépendant de l’équipe enregistrée ; la sauvegarde est une action distincte, proposée après chargement. | Le lien `25-6-9` affiche Pikachu, Dracaufeu et Tortank après ouverture. La sauvegarde synchronisée n’a pas été testée sans compte de test. |
| BUG-003 | Validation de sauvegarde isolée et refus explicite d’importer si la synchronisation n’est pas disponible. | Les tests valident les fichiers pris en charge et rejettent les données incorrectes. L’import durable sous compte reste à reprendre dans un bac à sable. |
| BUG-004 | L’import Showdown vérifie l’accès avant l’ajout et ne compte que les membres effectivement présents après mutation. | Build et tests passent ; l’ajout synchronisé reste à valider avec un compte de test. |
| BUG-005 | Son et sprites animés sont inclus dans la persistance locale, migration et réhydratation. | Dans le navigateur local, les deux réglages ont été modifiés, conservés après rechargement, puis restaurés à leur état initial. |
| BUG-006 | Le rendu du prix utilise la langue d’interface du serveur et un fuseau UTC explicite. | La fiche FR a été ouverte directement dans le build local sans erreur React 418 dans les journaux capturés. La cause précise reste non établie ; la fiche EN et d’autres fuseaux devront être repris. |
| BUG-007 | Clés UI manquantes ajoutées dans les huit langues pour les écrans concernés ; traductions de combat, EV/IV, filtres, quiz, comparaison, équipe et 404 raccordées. | Contrôle navigateur FR : objets, filtres de talents, combat et 404 affichent leurs libellés corrigés. Les huit langues n’ont pas été repassées intégralement après changement. |
| BUG-008 | La grille d’actions des cartes Pokédex est adaptée aux colonnes étroites. | À 360 et 390 px, les boutons mesurés font 44 px et restent entièrement dans leur conteneur. |
| BUG-009 | Contrastes relevés sur les écrans recensés, notamment libellés, résultats TCG, calculs et valeurs colorées par type. | Les modifications compilent. La campagne axe sur les deux thèmes et toutes les pages touchées doit être rejouée avant de déclarer les ratios conformes. |
| BUG-010 | Association `label`/`for` et identifiants ajoutée au niveau et à la nature EV/IV. | Après hydratation, les deux champs sont retrouvés par leur nom accessible dans le navigateur local. Pas de test VoiceOver/NVDA. |
| BUG-011 | La matrice emploie une table HTML avec boutons dans les cellules, sans cellules `gridcell` orphelines. | Inspection DOM locale : une table et zéro `role=gridcell`. Les commandes clavier vérifiées pendant l’audit restent couvertes par ses preuves. |
| BUG-012 | Le parseur commun valide les IDs et déduplique avant la limite de comparaison/équipe. | Tests unitaires ajoutés ; le lien `25,25,6,133` donne trois Pokémon uniques. |
| BUG-013 | La comparaison distingue lien sans ID valide et Pokémon introuvable ; erreur, reprise et effacement sont proposés. | Dans le navigateur local, `ids=foo` et `ids=9999999` montrent une erreur explicite, avec commande de récupération. |
| BUG-014 | Le plafond du curseur représente explicitement `25 m+` et le prédicat accepte uniquement cette borne ouverte. | Tests unitaires ajoutés pour valeurs au-dessus, au-dessous, égales et non finies ; pas de nouvelle campagne axe du filtre. |
| BUG-015 | Le catalogue TCG est trié à partir de son ordre de publication disponible ; un set sélectionné sans métadonnées conserve son propre identifiant au lieu d’hériter du dernier set. | Tests unitaires ajoutés pour l’ordre du manifeste. La simulation réseau lente d’origine n’a pas été rejouée après correction. |

### Vérification après modifications

`npm test` : 103 fichiers et 499 tests réussis. `npm run lint`, `npm run typecheck`, le contrôle TypeScript de `packages/core` et `npm run seo:check` réussissent. `npm run build` réussit dans une copie temporaire sans fichier `.env.local`. Les appels aux données Pokémon pendant la génération n’étaient pas joignables depuis cet environnement ; les routes dynamiques et leurs replis ont toutefois été générés. Le contrôle SEO ne valide pas le sitemap déployé sans `SEO_BASE_URL`.

Les parcours exigeant une session valide, une écriture synchronisée, un tiers ou un autre moteur de navigateur restent bloqués selon les limites décrites plus haut. Aucun compte, collection, équipe synchronisée, achat, message ni donnée de production n’a été modifié.
