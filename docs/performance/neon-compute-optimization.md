# Optimisation du compute Neon

**Relevé et audit statique : 22 novembre 2026.** Aucun SQL n’a été exécuté sur la base de production et aucune ressource Neon ou OVH n’a été modifiée. Les chiffres Neon ci-dessous proviennent des métadonnées de contrôle en lecture seule ; ils ne sont pas une mesure après correctif.

## Diagnostic

### Mesures disponibles

| Branche | Temps actif Neon | Temps compute | Dernier accès connu | État observé |
| --- | ---: | ---: | --- | --- |
| `main` | 1 522 836 s (423,01 h) | 381 661 s (106,02 CU-h) | 2026-11-21 16:11:15 UTC | Suspendue à 16:13:02 UTC, soit 107 s plus tard |
| `ovh-preproduction` | 59 131 s (16,43 h) | 14 887 s (4,14 CU-h) | 2026-11-18 13:06:59 UTC | Suspendue à 13:12:02 UTC, soit 303 s plus tard |
| `auth-cutover-test` | 0 s | 0 s | — | Branche archivée |

Les deux computes actifs sont fixés à 0,25 CU dans le relevé. Les nombres concordent avec les 106,02 CU-h sur `main` et 4,14 CU-h sur la préproduction rapportés pour ce cycle. `main` était en veille lors de l’inspection : l’auto-suspension fonctionne, mais les compteurs montrent qu’elle n’a pas suffi à maintenir la consommation sous 100 CU-h. Le champ de contrôle `suspend_timeout_seconds` vaut `0` alors que les suspensions observées ont eu lieu ; sa sémantique n’est pas déduite ici.

À 0,25 CU, 50 CU-h correspondent à 200 heures de compute sur un cycle de 30 jours et 100 CU-h à 400 heures. `main` avait déjà consommé 423 heures actives au relevé ; le seuil de 50 CU-h ne peut donc pas être atteint pour ce cycle. Les changements du dépôt ne permettent pas de prévoir si l’activité réelle des prochains cycles sera assez faible pour rester sous ce seuil.

La lecture de la configuration Neon Auth a répondu `GENERIC_QUOTA_EXCEEDED`. La durée de session et la politique de renouvellement effectives de cette branche n’ont donc pas pu être confirmées. Aucune requête `pg_stat_statements`, aucun `EXPLAIN` et aucune requête applicative n’ont été lancés sur `main` : ces diagnostics auraient pu réveiller le compute alors que le quota est dépassé.

### Sources de réveil confirmées dans le code

| Source | Comportement avant correctif | Impact probable | Confiance |
| --- | --- | --- | --- |
| Session navigateur dans `src/lib/neon/AuthProvider.tsx` | Un GET `/api/auth/get-session` au montage, puis toutes les 5 min, même sans session. Les événements `focus`, `visibilitychange` et `primedex:auth-changed` en ajoutent. Les requêtes simultanées étaient mutualisées, pas les événements successifs. | Jusqu’à 12 requêtes supplémentaires par heure et par onglet ouvert. Le proxy désactive le cache de session (`disableCookieCache=true`) et sollicite le service Neon Auth. Le nombre de ces requêtes qui atteignent réellement le compute, en particulier sans cookie, n’a pas été mesuré. | Requête périodique confirmée ; réveil PostgreSQL probable avec session, non mesuré pour les visiteurs anonymes. |
| Page publique d’une collection TCG partagée | `TCGCollectionShowcasePage` rafraîchissait sa requête toutes les 30 s. Chaque GET de `/api/tcg/showcase/[token]` fait une requête SQL de vérification du jeton, puis hydrate les cartes via le cache applicatif TCGdex. | 2 lectures SQL par minute et par page ouverte, assez rapprochées pour empêcher une suspension durant une visite. | Requête et accès DB confirmés ; durée d’activité induite inconnue. |
| Salles de combat | `BattleRoom` interroge `/api/battle/room` toutes les 1,5 s tant que la salle est ouverte et l’onglet visible. Chaque GET exécute `ensureNeonUser`, qui transactionne l’insertion idempotente, la relecture `FOR UPDATE` du tombstone et la mise à jour/projection du profil, puis lit la salle. | Environ 40 GET/minute par salle active, chacun pouvant exécuter ce motif transactionnel avant le SELECT de salle. C’est le motif périodique récurrent le plus coûteux identifié statiquement. | Confirmé dans le code ; volume réel d’utilisation inconnu. Conservé pour ne pas dégrader les mises à jour de jeu et le contrôle d’effacement. |
| Revalidation serveur de session | Les routes sécurisées vérifient le cookie auprès de Neon Auth à chaque requête protégée ; elles exécutent ensuite leurs propres lectures ou mutations SQL. | Une activité normale d’un utilisateur connecté peut réveiller Auth et PostgreSQL. Une mise en cache globale pourrait retarder révocation ou logout. | Chemin d’appel confirmé ; fréquence de production inconnue. |

### Base de données et infrastructure

L’audit statique relève 40 appels à `getNeonClient()` dans 28 fichiers, répartis entre l’état utilisateur, profils/amis/comptes, quiz/classements, combats, API publique, prix et alertes TCG, produits scellés, notifications push, métriques, sitemaps et tâches cron. Il s’agit d’accès à la demande des routes et fonctions concernées ; aucun appel SQL global n’est lancé à l’import de l’application.

`src/lib/neon/server.ts` conserve un seul client `neon()` côté serveur, créé paresseusement par `getNeonClient()`. Le code ne crée pas de pool PostgreSQL explicite ou de connexion transactionnelle longue durée qui épinglerait le compute. Chaque appel SQL exécuté reste toutefois susceptible de réveiller Neon.

Les principaux motifs SQL repérés et les index déclarés dans les migrations pertinentes — principalement `neon/migrations/0001_lunidex_app.sql` et `neon/migrations/0010_tcg_custom_collection_shares.sql` — sont :

- `user_state` et les données personnelles : recherches par `user_id`, clé primaire de la table ; ces réponses restent privées et sans cache public.
- Profils et relations : recherche de handle avec index uniques/publics sur `lower(handle)`, et amitiés indexées par demandeur/destinataire, statut et date.
- Classements et tentatives : index `(date, score DESC)` et index utilisateur/statut/date.
- Historique de prix et alertes : index `(card_id, recorded_at DESC)` et index utilisateur.
- Combats et abonnements push : index des deux participants et de la date des salles ; unicité des endpoints push par utilisateur.
- Showcase public : le hash de jeton est déjà couvert par l’index créé par la contrainte `UNIQUE` de `public.tcg_collection_shares.token_hash` dans `0010_tcg_custom_collection_shares.sql`. La requête joint aussi `user_state` et projette son JSONB complet pour en extraire la collection partagée ; la taille de cette projection et le plan réel restent à vérifier sur une branche autorisée avant toute refonte ou migration.

Ces index sont des candidats appuyés par les formes de requêtes et le schéma, pas par des plans observés en production. Aucun index ni schéma n’a été modifié sans `EXPLAIN` et validation sur branche de test.

Le guide OVH confirme que les timers systemd `metrics-retention` et `tcg-sealed-sync` de production sont désactivés. `/api/healthz` est un contrôle HTTP du processus et ne contacte pas Neon. Les workflows CI ne configurent pas de connexion applicative à Neon. Le workflow de déploiement protégé peut faire un `SELECT 1` en lecture seule lors d’un préflight manuel ; cela peut provoquer un réveil ponctuel. `audit-ovh-resources.yml` contient trois audits planifiés temporaires en novembre 2026 et sonde `/api/auth/get-session` ainsi que quelques routes HTTP ; ce n’est pas un scheduler permanent de tâches SQL. Aucune configuration de cron Vercel ou d’autre moniteur externe n’a été trouvée dans le dépôt ; l’état des dashboards et services externes ne peut pas être vérifié ici.

L’inspection en lecture seule du compte Vercel connecté n’a retourné aucun projet Lunidex ni projet lié au dépôt `teefloo/Lunidex`. Cela ne couvre pas d’autres comptes ou espaces de travail Vercel éventuels.

## Correctifs

- `src/lib/neon/AuthProvider.tsx` : suppression du sondage fixe de 5 min. Le premier état est vérifié au montage uniquement quand l’onglet est visible. La vérification reste déclenchée au focus, au retour de visibilité, à la reconnexion réseau et après un changement explicite d’authentification. Les événements focus/visibilité dans une fenêtre de 250 ms sont dédupliqués.
- Le prochain contrôle d’une session connectée est planifié à partir de `session.expiresAt`, une minute avant l’expiration, seulement pour un onglet visible. Si la date ne se prolonge pas, un contrôle final à l’expiration est permis ; aucune boucle de contrôles immédiats n’est créée. Les timers d’expiration et de retry sont suspendus quand l’onglet devient caché.
- Les erreurs ont au plus trois retries automatiques avec délais exponentiels de 1, 2 et 4 s. En cas d’échec persistant, le hook attend un focus, une reconnexion réseau, un événement d’authentification ou l’action explicite de retry. Une réponse 401 ou une session nulle continue d’effacer l’utilisateur.
- `src/components/tcg/TCGCollectionShowcasePage.tsx` : suppression du polling de 30 s. Le chargement initial, le rafraîchissement au focus/retour sur la page et le bouton manuel après erreur sont conservés. Les réponses restent `private, no-store` ; aucun cache partagé de données de collection n’est introduit.

La documentation Better Auth décrit `disableCookieCache=true` comme un moyen de forcer la revalidation plutôt que de répondre depuis le cache de session local ([gestion de session et cache Better Auth](https://better-auth.com/docs/concepts/session-management)). Le correctif conserve ce contrôle côté serveur et réduit les appels initiés par le navigateur ; il ne change ni la validité ni la politique serveur des sessions.

## Vérification

- `npx vitest run src/lib/neon/AuthProvider.test.ts src/components/tcg/TCGCollectionShowcasePage.test.ts 'src/app/(request-rendered)/tcg/showcase/[token]/page.test.ts'` — **15 tests réussis** ; couvre la session anonyme, l’expiration et la révocation observée au contrôle d’échéance, les onglets cachés et retours rapides, la déduplication, les retries, le logout, l’événement OAuth, l’absence de polling showcase et les métadonnées canonical/hreflang/Open Graph/Twitter.
- `npm test` — **178 fichiers, 1 058 tests réussis**.
- `npm run lint` et `npm run typecheck` — réussis avant et après le build final.
- `npm run seo:check` — source checks réussis ; la validation de l’index sitemap déployé n’a pas été lancée, car `SEO_BASE_URL` n’était pas défini.
- `npm run build` — réussi après les changements finaux ; la sortie comprend `/tcg/showcase/[token]`. Le premier passage a révélé que cette page était hors d’un root layout Next.js. Elle a été déplacée dans le groupe `(request-rendered)`, qui ne change pas l’URL, et le build a ensuite réussi. Le premier typecheck avait aussi chargé d’anciens types `.next/dev/types`. Ce répertoire existait ; seul ce sous-dossier généré a été supprimé. Le contrôle de processus `next dev` n’a pas été possible, car le sandbox a refusé `ps -ax` (`Operation not permitted`). Aucun autre dossier `.next` n’a été nettoyé.
- `npx tsc --project packages/core/tsconfig.json --noEmit` — réussi.
- Les tests d’authentification sont des tests de contrat avec SDK/fetch mockés. Les tests existants du formulaire de connexion couvrent aussi l’initiation de réinitialisation du mot de passe ; aucune session Neon réelle, expiration serveur réelle ou OAuth fournisseur externe n’a été testée, car la configuration Neon était inaccessible avec l’erreur de quota.
- Aucun déploiement ni mesure d’économie après correctif n’a été effectué. Les 106,02 CU-h sont la mesure de consommation initiale du cycle, pas un résultat après changement. La durée de cette tâche ne fournit aucune fenêtre représentative avant/après ; il est impossible d’attribuer ou de mesurer une variation de compute sur cette période.

Le build a généré le changement standard Next.js dans `next-env.d.ts` : ses références passent de `.next/dev/types` à `.next/types`. Ce fichier n’a pas été modifié manuellement et la génération est conservée.

## Estimation et plan de mesure

Pour un onglet resté ouvert sans interaction, le sondage d’authentification passe de 12 requêtes/heure à zéro après le chargement initial, sauf focus/reconnexion/changement d’auth ou le contrôle basé sur l’expiration d’une session. Une page showcase ouverte supprime jusqu’à 120 GET et lectures SQL par heure. Ce sont des volumes de requêtes théoriques ; chaque requête n’équivaut pas à une durée de compute connue. L’économie en CU-h ne peut pas être estimée précisément sans durée d’activité attribuable à ces sources et sans trafic observé avant/après.

Après déploiement autorisé, comparer les compteurs Neon `active_time_seconds` et `compute_time_seconds` par branche chaque jour pendant au moins 7 jours, puis sur un cycle complet de 28 à 30 jours. Noter le volume de visites et de sessions, les états `idle`/`suspended`, `last_active` et les incidents d’auth. Comparer les périodes à trafic similaire et séparer les préflights/déploiements. Utiliser le contrôle HTTP `/api/healthz` pour vérifier l’application sans requête SQL ; ne pas créer de sondes SQL périodiques pour mesurer la veille. Les métriques d’utilisation agrégées ne suffisent pas à attribuer une économie à un endpoint : toute attribution détaillée nécessitera des journaux de requêtes compatibles avec la politique de confidentialité et un accès non destructif.

## Risques résiduels

- La durée réelle des sessions et leur renouvellement géré par Neon restent inconnus. Le contrôle client s’appuie sur le `expiresAt` renvoyé, sans modifier le réglage d’authentification hébergé.
- Après quatre échecs consécutifs (requête initiale et trois retries), aucune boucle n’est maintenue. Une application restée au premier plan ne réessaie qu’à la reconnexion réseau, au focus, après changement d’auth ou via l’action de retry.
- Les requêtes Auth sécurisées, synchronisations, mutations, sitemaps et polling de salle de combat peuvent toujours réveiller le compute selon l’utilisation. Chaque poll de combat peut refaire le contrôle transactionnel d’existence/tombstone via `ensureNeonUser`; il a été préservé pour sa fonction temps réel et le contrôle d’effacement. Une réduction de ce travail nécessite une conception qui garde ces garanties.
- L’auto-suspension a été observée, mais les causes précises des 423 h de compute actif ne peuvent pas être attribuées sans métriques par requête et historique avant/après représentatif. La cible de moins de 50 CU-h dépendra du trafic réel et reste à mesurer.
