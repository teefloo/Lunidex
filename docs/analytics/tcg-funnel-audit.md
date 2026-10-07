# Audit acquisition et activation TCG

Audit du 7 octobre 2026. Le changement concerne la mesure, sans modification du design, du marketing ni des choix, versions, catégories ou interfaces de consentement.

## État initial

La lecture du code révèle une différence importante avec le guide général : `src/lib/supabase/useSupabaseSync.ts` implémente actuellement une collection **remote-owned** dans Neon. Le navigateur ne persiste que les préférences. Une modification optimiste de collection est annulée si le PUT `/api/user-state` échoue. L'authentification et le chargement de l'état distant sont nécessaires avant les mutations.

Tous les événements client passent par `posthog-client.ts` : configuration explicite, SDK opt-in, exclusion `/auth` et `/api`, sanitisation et déduplication de propriétés identiques pendant 750 ms. Les événements produit vérifient aussi `productMeasurement=granted`. Les effets métier ne réagissaient pas à l'octroi du consentement, sauf les bridges. Les bridges optionnels arrivent après au moins six secondes. Les propriétés communes initiales étaient `app_environment`, `app_release`, `app_locale`, plus les propriétés SDK filtrées.

Dans le tableau, « oui » signifie un chemin de code accessible, avec configuration PostHog et consentement produit, et non une preuve qu'une personne l'a utilisé. Les volumes observés sont indiqués séparément. Les champs sont les propriétés métier avant sanitisation.

| Événement existant | Émetteur initial et moment exact | Propriétés initiales | Atteignable / répétition ou limite |
| --- | --- | --- | --- |
| `tcg_start_opened` | `src/app/tcg/start/TCGStartPage.tsx`, effet après montage/hydratation, seulement si attribution URL reconnue | `source`, `detail` pour le slug | Oui avec query source ; entrée directe sans source omise ; une fois/session, consentement accordé après effet perdu |
| `tcg_set_search_used` | même page, première saisie non vide | `source=length_1_3/length_4_8/length_9_plus` | Oui après connexion ; une fois/session et ref de composant |
| `tcg_set_selected` | même page, clic sur lien du set, avant navigation | `source=search/latest_list` | Oui ; pas de set/langue ; chaque clic, dédup SDK 750 ms |
| `tcg_album_opened` | `src/components/tcg/TCGAlbumPage.tsx`, effet si `activation=1` | `source=activation` | Oui ; albums ordinaires omis ; effet remonté après 750 ms peut doubler |
| `tcg_first_value_reached` | même album, effet après première mutation optimiste signalée `owned=true` | aucune | Oui ; pas de confirmation Neon ; ref seulement pour cette instance, une fois/session produit |
| `tcg_activation_completed` | même album, effet après seconde modification owned ou wishlist après première owned | `source=second_owned_card/wishlist` | Oui ; écriture potentiellement annulée ; une fois/session mais activation locale/date réécrite à nouveau |
| `tcg_returned_after_activation` | même album à l'ouverture ordinaire ou après ajout suivant le premier ; helper dans `product-measurement.ts` | `source=day_0_7/day_8_30/day_31_90/day_91_plus`, `detail=album_open/owned_add` | Oui ; marqueur navigateur sans compte ; peut précéder l'effet qui marque l'activation dans cette session |
| `tcg_sync_prompt_shown` | déclaré dans registre, helper et API agrégée | prévu sans propriétés | Aucun appel dans le produit actuel |
| `tcg_sync_prompt_actioned` | déclaré dans registre, helper et API agrégée | prévu `source=create_account/continue_local/dismiss` | Aucun appel dans le produit actuel |
| `tcg_activation_error` | déclaré dans registre, helper et API agrégée | prévu `source=operation`, `detail=error_type` | Aucun appel dans le produit actuel ; les erreurs actuelles passent par `feature_error` |
| `tcg_card_ownership_toggled` | `src/components/tcg/TCGCardItem.tsx`, après action store du bouton ownership | `card_id`, `set_id`, `state`, `surface=tcg_catalog` | Oui ; annonçait la direction prévue, même si refus/no-op/échec ; albums et détail non couverts |
| `tcg_wishlist_toggled` | `src/components/tcg/TCGWishlistContent.tsx`, deux boutons suppression wishlist/suggestions | `card_id`, `state=removed`, `surface` | Oui ; ajout wishlist omis ; avant confirmation sauvegarde |
| `tcg_deck_created` | `src/app/tcg/deck-builder/DeckBuilderClient.tsx`, après `createDeck` renvoyant un ID | `has_custom_name` | Oui ; modification en mémoire, pas preuve de sauvegarde ; chaque création |
| `tcg_deck_deleted` | même fichier, bouton suppression après action store | `result=success` | Oui ; résultat optimiste ; chaque action |
| `tcg_deck_search_used` | même fichier, saisie après debounce 300 ms, longueur >1 | `query_length_bucket` | Oui ; plusieurs recherches légitimes |
| `tcg_deck_card_added` | même fichier, sélection carte ou bouton quantité + après action store | `card_id`, `category`, `basic_energy` | Oui ; action optimiste ; no-op/cap possible ; plusieurs ajouts légitimes |
| `tcg_deck_card_removed` | même fichier, bouton quantité - après action store | `card_id` | Oui ; action optimiste ; plusieurs retraits légitimes |
| `auth_sign_up` | `src/components/auth/AuthModal.tsx`, submit puis résolution de `signUp` | `method=password`, `result=started/success/error`, `error_type` si erreur | Oui ; success signifie création réussie, pas nécessairement session authentifiée ; plusieurs tentatives légitimes |
| `auth_sign_in` | même modal, submit puis résolution de `signIn` qui confirme la session | `method=password`, `result`, `error_type` | Oui ; OAuth absent ; started et success sont deux événements volontairement distincts |
| `auth_oauth_started` | `src/lib/neon/AuthProvider.tsx`, deux implémentations, lancement puis résolution de social sign-in | `method=google/github`, `result=started/success/error`, `error_type` | Émetteur dans le provider mais aucun appel UI actuel à `signInWithOAuth` dans le dépôt ; success initial signifiait seulement lancement redirection ; retour OAuth non instrumenté |
| `auth_password_reset_requested` | AuthModal, demande reset puis résolution | `method=email`, `result`, `error_type` | Oui ; jamais l'adresse ; plusieurs étapes/tentatives légitimes |
| `auth_password_updated` | `src/app/auth/reset-password/page.tsx`, résultat de mise à jour | `result`, `error_type` | Appel présent mais bloqué par exclusion `/auth` ; conservé hors funnel |
| `auth_signed_out` | `src/components/dashboard/AccountCard.tsx`, résolution/rejet de déconnexion | `result=success/error`, `error_type` | Oui ; peut être perdu selon timing reset identité ; hors funnel d'acquisition |
| `navigation_started` | `instrumentation-client.ts`, callback `onRouterTransitionStart` | `from_path`, `to_path`, `navigation_type` | Oui ; chaque transition ; routes/query privées normalisées |
| `pokemon_search_submitted` | `src/components/pokemon/SearchBar.tsx`, debounce 300 ms de saisie utilisateur confirmée | `query_length_bucket` | Oui ; pas de texte recherché ; plusieurs recherches légitimes |
| `pokemon_filter_changed` | `TypeFilter.tsx`, `CaughtFilter.tsx`, `FavoriteToggle.tsx`, action filtre | `filter`, `action` ou `value` | Oui ; plusieurs choix légitimes |
| `pokemon_detail_viewed` | `src/app/pokemon/[name]/PokemonDetailClient.tsx`, effet avec Pokémon chargé | `pokemon_id`, `surface=pokemon_detail` | Oui ; remount possible au-delà de dédup SDK ; hors scope TCG |
| `pokemon_action_toggled` | `src/components/pokemon/PokemonCard.tsx`, actions favorite/compare/team/caught après action store | `action`, `state`, `pokemon_id`, `surface` | Oui ; actions en mémoire ; plusieurs toggles légitimes ; hors scope TCG |
| `pokemon_quiz_started` | registre uniquement | aucune propriété effectivement émise | Aucun appel |
| `anniversary_30_filter_changed` | `src/components/anniversary/Anniversary30CardGrid.tsx`, changement filtre | `filter` | Oui ; chaque changement |
| `anniversary_30_card_toggled` | même fichier, mutation ownership après contrôle avant/après | `owned`, `scope` | Oui ; succès en mémoire, pas confirmation distante ; hors définition d'activation |
| `anniversary_30_migration` | `src/components/anniversary/Anniversary30Tracker.tsx`, migration collection, effet après hydratation/sync ready ou bouton retry utilisateur | `status=completed/partial` | Oui ; effet automatique et retry ; résultat de migration en mémoire, pas preuve du PUT Neon |
| `feature_error` | `src/lib/posthog-client.ts`, exception client ; `src/lib/query-observability.ts`, queries/mutations observées | `feature`, `operation`, `error_type`, éventuellement `kind`, `status` | Oui avec consentement ; erreurs techniques répétées possibles, dédup SDK ; aucun payload métier |

Les événements système complètent ce registre : `$pageview` dans `PostHogConsentBridge.tsx` avec URL sans query/hash et pathname normalisé ; `$identify` dans `PostHogIdentityBridge.tsx` avec identifiant technique du compte et `account_type/app_locale`, sans email/nom ; `$exception` client (`posthog-client.ts`, observabilité, error boundaries) et serveur (`posthog-server.ts`, handlers observés/instrumentation) avec champs techniques filtrés. Le serveur exige le cookie existant de consentement. Performance, exceptions automatiques et replay SDK restent sous le consentement existant et ses masquages. Les événements SDK ne représentent jamais une activation métier.

## Funnel final

Le funnel principal évite d'imposer une nouvelle inscription aux comptes déjà connectés :

`tcg_start_opened → tcg_set_selected → tcg_first_value_reached → tcg_activation_completed`

Le détail campagne est :

`tcg_campaign_landed → tcg_start_opened → tcg_set_selected → tcg_first_card_interacted → tcg_first_value_reached → tcg_activation_completed`

Le parcours réel d'un nouveau compte demande généralement l'authentification **avant** la sélection du set. `auth_sign_up` ou `auth_sign_in`, filtré sur `result=success`, mesure cette étape. Le funnel signup est donc :

`auth_sign_up(success) → tcg_set_selected → tcg_first_value_reached → tcg_activation_completed`

Enfin : `tcg_activation_completed → tcg_returned_after_activation`.

### Définition d'activation

Une carte associée à une collection de set/langue a été ajoutée par une mutation locale et acceptée par le PUT Neon, alors que le snapshot distant accepté précédent ne contenait aucune carte owned, y compris les modèles historiques. La première donnée et l'activation sont les deux jalons du même succès persistant, émis dans cet ordre. L'identifiant du set/la langue sont issus du snapshot accepté, sans transmettre les cartes. Un album ouvert constitue une sélection explicite de set pour les entrées directes.

Aucun clic, wishlist seule, deck, compte créé, simple lecture/hydratation, transfert de données déjà présentes dans le snapshot distant, ajout d'un autre appareil lors d'un conflit, refus, échec réseau ou rollback ne vaut activation. Une importation depuis un ancien stockage navigateur vers un compte distant réellement vide peut constituer une première sauvegarde persistante ; elle n'est pas assimilée à une sélection de set ou interaction humaine et n'entre pas artificiellement dans le funnel acquisition. Les ajouts/removals ownership et wishlist existants reflètent maintenant les sauvegardes confirmées. Les événements deck restent des interactions optimistes et ne participent pas à l'activation.

Un marqueur v2 par compte dans ce navigateur empêche une nouvelle activation après remount ou session ultérieure. Un retour demande le même compte et une nouvelle session d'activité après 30 minutes d'inactivité, avec au minimum 30 minutes depuis activation. Les pageviews et événements consentis entretiennent la session ; une navigation continue ne vaut pas retour. Une ouverture d'album est réévaluée une fois l'identité résolue. L'âge est calculé depuis la première activation, jamais réécrit par les clics.

## Modifications

- `src/lib/tcg-attribution.ts` : parsing/validation source et slug, attribution 30 jours, entrée logique campagne, restauration après reload, choix de set/langue limités et normalisation du chemin.
- `src/lib/product-measurement.ts` : propriétés sémantiques, attribution persistée uniquement avec consentement, réservations pour effets concurrents, génération invalidant les tâches après retrait du consentement/changement de compte, marqueur d'activation par compte, retour session ultérieure, marqueur OAuth limité à 30 minutes. Les compteurs Neon restent indépendants de la configuration facultative PostHog.
- `src/lib/tcg-persistence-measurement.ts` et `src/lib/supabase/useSupabaseSync.ts` : comparaison des snapshots acceptés et de la requête locale, événements après succès PUT uniquement, exclusion des collections historiques et des ajouts apportés par un conflit. La télémétrie ne peut interrompre l'application d'une sauvegarde réussie.
- Bridges analytics et page start/album : entrée directe, consentement accordé sur la page, auth résolue avant `authenticated`, arrivée campagne immédiate, albums ordinaires et nouvelle session identifiée.
- Composants carte/détail/wishlist : première interaction sans identifiant de carte ; suppression des anciens toggles optimistes redondants.
- AuthProvider/AuthModal/client PostHog : OAuth lancé distingué de session confirmée ; marker effacé lors d'une tentative password ; reset identité et attribution à la déconnexion/changement de compte ; succès password marqué authentifié ; identité réessayée après routes `/auth` exclues.
- `src/app/api/analytics/product/route.ts` : validation du cookie de consentement existant ; valeurs `first_persisted_card` et `album_entry` dans les dimensions agrégées. Aucun changement de schéma ni migration.
- `src/lib/posthog-privacy.ts` et client : normalisation de `entry_path`, suppression des `card_id` des événements TCG.
- Tests : attribution, redirect `/go`, persistence, consentement/races/déduplication/OAuth/session/compteurs, SDK.

## Données envoyées

Propriétés communes TCG/auth : `source` parmi `home_cta/catalog/direct/seo/campaign`, `campaign` slug validé ou null, `locale`, `tcg_language` reconnue ou null, `set_id` public validé ou null, `authenticated` boolean, `entry_path` sans query/hash, `tracking_version=2`. Restent les contextes existants `app_environment`, `app_release`, `app_locale` et les propriétés SDK sanitised.

Propriétés spécifiques : `selection_method`, `query_length_bucket`, `surface`, `interaction`, `activation_method=first_persisted_card`, `persistence=neon`, `state`, `action`, `return_age_bucket`, `method`, `result`, `error_type`, `operation`. Les événements deck gardent `has_custom_name`, `category`, `basic_energy` mais aucun nom ni carte individuelle. Pas d'email, nom, contenu de collection, texte de recherche, token ou secret dans les événements métier. Le seul identifiant utilisateur transmis reste l'identifiant technique déjà utilisé par `identify`.

L'attribution est conservée dans le navigateur après consentement, durant 30 jours, et traverse une redirection OAuth dans ce navigateur. Une campagne nouvelle remplace l'attribution ; une navigation interne la conserve. `/go/<slug>` redirige sans cookie et sans capture serveur vers le start localisé avec source et campagne validées. `entry_path=/go/<slug>` est l'entrée logique reconstituée, pas la preuve d'une requête HTTP originale. Sans consentement, aucune attribution analytique n'est mémorisée et aucun événement passé n'est rejoué. Retrait du consentement et changement de compte effacent l'attribution concernée.

Limites : stockage bloqué/effacé, autre navigateur/appareil, changement de domaine et consentement donné après disparition de la query ne permettent pas de reconstruire l'attribution ou le marqueur de retour. Les activations v1 ne sont pas converties en marqueurs v2. Le suivi v2 ne prétend pas prouver la première carte de toute la vie d'un compte qui a effacé sa collection et ses marqueurs. Les slugs de 33 à 40 caractères restent mesurés dans PostHog ; la table agrégée historique Neon limite une dimension à 32, et n'est pas migrée pour cette tâche.

## PostHog

Projet confirmé : Lunidex, `270206`, timezone Europe/Paris. Le catalogue disponible ne contenait aucune définition gouvernée TCG/activation. Le dashboard existant a été réutilisé : [Lunidex — Activation TCG](https://eu.posthog.com/project/270206/dashboard/943017).

| Insight | Opération | Lien |
| --- | --- | --- |
| Acquisition → activation | Mise à jour du funnel existant start→return | [3I7wjcPC](https://eu.posthog.com/project/270206/insights/3I7wjcPC) |
| Campagne → activation | Création | [ztl6w5zB](https://eu.posthog.com/project/270206/insights/ztl6w5zB) |
| Signup → activation | Création, success uniquement | [lQcMQeUR](https://eu.posthog.com/project/270206/insights/lQcMQeUR) |
| Activation → retour | Création | [RlOrjgJG](https://eu.posthog.com/project/270206/insights/RlOrjgJG) |
| Acquisition par campaign | Création, attribution à l'étape d'entrée | [dbrNHbSZ](https://eu.posthog.com/project/270206/insights/dbrNHbSZ) |
| Acquisition par source | Création, attribution à l'étape d'entrée | [0yfnbjKE](https://eu.posthog.com/project/270206/insights/0yfnbjKE) |

Tous ces funnels utilisent `tracking_version=2`, `app_environment=production`, excluent les comptes tests, et gardent un ordre avec événements intermédiaires permis. Fenêtre de conversion de 14 jours, 30 jours pour le retour. La connexion OAuth confirmée utilise `auth_sign_in(success)` ; le signup password utilise `auth_sign_up(success)`. Le produit actuel n'expose pas de bouton OAuth ; aucune fonctionnalité d'authentification n'a été ajoutée.

Les deux nouveaux événements sont définis dans le catalogue, sans les marquer comme vérifiés avant déploiement. Les six queries enregistrées s'exécutent et renvoient « No data recorded for this time period », résultat attendu avant le déploiement.

Les étapes obligatoires sont volontairement limitées dans le funnel principal pour les utilisateurs déjà authentifiés. Voir les [règles PostHog des funnels](https://posthog.com/docs/product-analytics/funnels#how-to-create-a-funnel) et les [paramètres de fenêtre et attribution](https://posthog.com/docs/api/queries#query-parameters).

## Tests

Validation finale : `npm run lint` sans erreur ni warning ; `npm run typecheck` réussi ; `npm test` : 120 fichiers, 596 tests réussis ; `npm run seo:check` réussi ; `npx tsc --project packages/core/tsconfig.json --noEmit` réussi ; `npm run build` avec `--webpack` réussi, 308 pages générées. Le build conserve son warning existant de dépréciation du runtime Edge.

La suite HTTP doit ouvrir un serveur localhost : son premier passage en sandbox a échoué avec `listen EPERM` pour quatre tests d'audit de routes indépendants du tracking. L'exécution autorisée hors sandbox passe. Les résultats finaux sont indiqués dans le compte rendu de livraison.

## Vérification production

Données réelles consultées sur les 30 derniers jours, le 7 octobre 2026, avant tout déploiement de ce changement :

| Événement historique | Volume toutes catégories d'environnement |
| --- | ---: |
| `tcg_start_opened` | 17 |
| `tcg_set_selected` | 45 |
| `tcg_album_opened` | 42 |
| `tcg_first_value_reached` | 49 |
| `tcg_activation_completed` | 35 |
| `tcg_returned_after_activation` | 77 |
| `tcg_card_ownership_toggled` | 9 |
| `tcg_set_search_used` | 8 |
| `auth_sign_up` | 18 |
| `auth_sign_in` | 21 |
| `auth_password_reset_requested` | 2 |

La vérification ciblée `app_environment` trouve 16 starts production avec `source=home_cta`, 34 activations production avec `source=second_owned_card` et une avec `source=wishlist`. Les retours utilisent des buckets de jours comme source. `campaign` n'existe pas dans la taxonomie initiale. Ce sont des observations v1, pas une validation de sauvegardes réelles. Le funnel historique start→set→first-value→activation compte 12→7→6→6 personnes après filtres de comptes test, mais sa conversion n'est pas une mesure fiable de persistance.

Blocage précis pour valider v2 en production : le commit doit être déployé par une action explicitement autorisée, puis un parcours réel consenti doit produire les événements v2. Aucune requête synthétique n'a été envoyée à PostHog pour gonfler les résultats et aucun compte utilisateur n'a été créé pour tester. Aucun push, déploiement ou migration production n'a été exécuté.
