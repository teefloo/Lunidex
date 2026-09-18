# PostHog — Lunidex

Ce document décrit la configuration livrée dans le code et les quelques contrôles qui nécessitent encore un accès au projet PostHog. Il ne constitue pas un avis juridique.

## Activation par environnement

Le SDK navigateur et le SDK serveur restent inactifs tant que `NEXT_PUBLIC_POSTHOG_ENABLED` n’est pas égal à `true` et qu’un token public est présent.

Variables publiques à définir par environnement :

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` : token `phc_…` du projet correspondant ;
- `NEXT_PUBLIC_POSTHOG_HOST` : `https://eu.i.posthog.com` pour un projet EU, ou l’host du projet ;
- `NEXT_PUBLIC_POSTHOG_ENABLED=true` uniquement dans l’environnement voulu ;
- `NEXT_PUBLIC_POSTHOG_ENVIRONMENT=development|preview|production` ;
- `NEXT_PUBLIC_APP_RELEASE` : SHA ou version de build ;
- `NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE` : optionnel, sinon `0.10` en production, `0.25` en preview et `1` en développement explicitement activé.

La séparation recommandée est un projet PostHog production et un projet non-production. Le code conserve aussi `app_environment` et `app_release` sur les événements pour filtrer un projet partagé si nécessaire.

## Consentement et identité

Le choix « mesure produit » est versionné en v3 (`2026-09-19`). Les anciens choix sont donc considérés comme obsolètes et l’utilisateur doit choisir à nouveau. Avant ce choix : pas d’événement, pas de cookie/stockage PostHog, pas de replay, pas de Web Vitals PostHog et pas d’erreur serveur PostHog.

Après accord :

- la persistance PostHog passe de l’état inerte à `localStorage+cookie` ;
- l’identifiant anonyme courant est conservé au moment de `identify(user.id)` ;
- seul l’identifiant technique stable du compte et un contexte minimal (`account_type`, langue) sont utilisés ;
- un logout ou un changement de compte exécute `reset({ resetDeviceID: true })` avant de repartir sur une identité anonyme ;
- le cookie `primedex-product-measurement-consent` sert uniquement de garde serveur et ne contient pas d’identifiant utilisateur.

## Taxonomie utile

Les événements métier sont centralisés dans `src/lib/posthog-events.ts` et utilisent `noun_action` :

- navigation : `$pageview`, `navigation_started` ;
- auth : `auth_sign_up`, `auth_sign_in`, `auth_oauth_started`, `auth_password_reset_requested`, `auth_password_updated`, `auth_signed_out` ;
- Pokédex : `pokemon_search_submitted`, `pokemon_filter_changed`, `pokemon_detail_viewed`, `pokemon_action_toggled` ;
- TCG : activation TCG existante, `tcg_card_ownership_toggled`, `tcg_wishlist_toggled`, événements du deck builder ;
- observabilité : `feature_error` et `$exception`.

Les propriétés sont bornées et limitées à l’action, l’état, la source/surface, le type d’erreur, le statut HTTP, les identifiants de cartes/Pokémon, le contexte de route, la langue, l’environnement et la release. Les emails, noms, handles, mots de passe, tokens, cookies, en-têtes, corps et chaînes de requête ne sont pas envoyés.

## Replay, erreurs et performance

Le replay démarre seulement après consentement, est échantillonné, masque les inputs et attributs, masque les sélecteurs `[data-ph-mask]`/`.ph-mask`, bloque `[data-ph-no-capture]`/`.ph-no-capture`, n’enregistre pas les corps/en-têtes réseau et supprime les routes `/auth` et `/api` des captures réseau. Les formulaires d’authentification sont marqués `data-ph-no-capture`.

PostHog reçoit les exceptions frontend capturées par les boundaries et l’autocapture des erreurs non gérées/promesses rejetées, sans autocapture DOM ni erreurs console. Sentry reste conservé pour l’observabilité technique. Les erreurs React Query sont réduites à un événement `feature_error` avec feature/opération/statut/type d’erreur.

Les erreurs de rendu Next et les réponses 5xx des Route Handlers sont envoyées par `posthog-node` uniquement en runtime Node, après vérification du cookie de consentement. Les headers de tracing PostHog permettent de relier, lorsque présents, distinct ID/session/window au backend sans lire le corps de requête. Le serveur utilise `flushAt: 1`, `flushInterval: 0` et un `shutdown` borné pour le mode serverless.

Les Web Vitals LCP, CLS, INP et FCP sont activés après consentement avec un flush différé de 5 secondes. L’attribution est limitée à LCP/INP. Les headers de tracing sont limités au hostname courant.

## Insights enregistrés dans PostHog

Le projet PostHog EU `Lunidex` a été contrôlé en lecture seule puis deux analyses ciblées ont été ajoutées au dashboard existant `Lunidex — Activation TCG` :

1. `TCG starts — volume` (déjà présent) : volume de `tcg_start_opened`.
2. `TCG activation — start to return` : funnel `tcg_start_opened` → `tcg_returned_after_activation`.
3. `Anniversary 30 — engagement` : volume quotidien de `anniversary_30_filter_changed` et `anniversary_30_card_toggled`.

Les deux nouvelles analyses ont été testées immédiatement après leur création. La fenêtre actuelle montre un démarrage TCG mais aucun retour après activation, ainsi que l’activité Anniversary 30 déjà observée ; ces chiffres sont des données historiques du projet, pas une validation de la nouvelle version locale.

Le schéma live PostHog ne contient pas encore les événements ajoutés dans cette branche (`auth_*`, Pokédex, deck builder, `feature_error`, etc.). Ils apparaîtront après activation de `NEXT_PUBLIC_POSTHOG_ENABLED=true` et déploiement d’une release configurée. Le funnel complet TCG pourra alors remplacer ou compléter le funnel court ci-dessus : `tcg_start_opened` → `tcg_set_search_used` → `tcg_set_selected` → `tcg_album_opened` → `tcg_first_value_reached` → `tcg_activation_completed`.

À contrôler après la première release instrumentée : funnel recherche Pokédex, usage des actions par `action`/`state`/`surface`, erreurs `feature_error` par feature/release, Web Vitals par route et release, rétention Session Replay et upload des source maps. Au contrôle live, aucune issue Error Tracking active n’était présente sur les 30 derniers jours et aucun Web Vital n’était encore ingéré.
