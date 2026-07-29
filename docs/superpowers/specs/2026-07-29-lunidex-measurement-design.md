# Lunidex — mesure minimale produit, performance et erreurs

**Statut :** validé pour spécification ; aucune implémentation ni migration dans ce document.

## 1. Décision et objectifs

Lunidex mesure trois finalités séparées, sans croisement de données :

| Finalité | Outil | Rôle |
| --- | --- | --- |
| Audience | Vercel Web Analytics | Pages et référents, après normalisation des URLs. |
| Performance | Vercel Speed Insights | Core Web Vitals sur les routes publiques. |
| Produit | Supabase | Compteurs journaliers agrégés du funnel TCG, après consentement. |

Le stockage de collection (IndexedDB, cookie TCG nécessaire et synchronisation) est strictement fonctionnel. Il ne doit alimenter aucune mesure d’audience ou produit.

Les chiffres du funnel ne couvrent que les personnes ayant consenti. Ils sont partiels et possiblement biaisés : ils détectent des frictions fortes et des régressions, pas la conversion parfaite de tous les visiteurs ni une rétention cross-device.

## 2. Architecture et flux de données

```text
Navigateur
 ├─ Vercel Analytics + beforeSend ───→ Vercel : audience, URL normalisée
 ├─ Vercel Speed Insights ───────────→ Vercel : Web Vitals
 └─ mesure produit
      ├─ consentement absent/refusé : aucun appel analytics Supabase
      └─ consentement accordé
           → POST même origine /api/analytics/product
           → validation et anti-abus
           → client Supabase serveur à clé secrète
           → RPC analytics.increment_daily_metric
           → analytics.daily_metrics : compteurs seulement
```

L’endpoint ne lit pas `user_state`, n’utilise pas une session comme identité, ne fait aucune jointure avec la collection et ne journalise pas de corps de requête. Le navigateur n’accède ni à la table ni à la RPC et ne connaît aucune clé secrète.

## 3. Consentement et stockage local

### 3.1 Catégories

Le bandeau existant doit proposer des catégories distinctes :

1. **Strictement nécessaire** — toujours actif : collection locale, sécurité, langue et mémorisation du choix de consentement.
2. **Audience et performance Vercel** — présentée séparément de la mesure produit. Sa base légale et l’exigence éventuelle de consentement doivent être confirmées juridiquement.
3. **Mesure produit** — désactivée avant un choix explicite.

« Accepter » et « Refuser » la mesure produit ont le même niveau visuel et sont accessibles au premier niveau du panneau. « Personnaliser » permet le même choix. Un lien « Gérer mes préférences » est disponible dans le footer et les pages Cookies/Vie privée.

Le choix est versionné dans le stockage local :

```ts
{ version: 2, audiencePerformance: 'granted' | 'denied' | 'unset',
  productMeasurement: 'granted' | 'denied' | 'unset' }
```

`unset` ou `denied` interdit tout appel produit vers Supabase. Passer à `denied` arrête immédiatement les futurs envois et efface seulement les marqueurs locaux de mesure ; cela ne modifie jamais la collection.

Jusqu’à l’analyse juridique documentée d’une éventuelle exemption, la mesure produit persistante est considérée comme soumise à consentement. Cette spécification ne donne pas d’avis juridique.

### 3.2 Visiteur, session et retour

Aucun identifiant visiteur, compte, UUID, cookie, IP ou user-agent n’est envoyé à Supabase. Après consentement, le navigateur conserve seulement :

- dans `sessionStorage` : un nonce de session aléatoire local et les jalons déjà émis ;
- dans le stockage local : `product_measurement_activated: true` et la date locale de première activation, sans identifiant.

Une nouvelle session commence à la première interaction mesurée après plus de 30 minutes d’inactivité mesurée, ou lorsque le `sessionStorage` précédent a disparu. La première action collection d’une session nouvelle, si le marqueur d’activation local existe, émet un compteur de retour unique avec une tranche de délai. Le retour concerne donc le même navigateur/appareil seulement.

## 4. Événements autorisés

Un jalon est dédupliqué une fois par session. Une action réussie peut être comptée à chaque action. Aucun événement n’est émis avant consentement, après une annulation, ou lorsqu’une mutation n’a pas réussi.

| Événement | Déclencheur | `propertyA` | `propertyB` |
| --- | --- | --- | --- |
| `tcg_start_opened` | Rendu de `/tcg/start` terminé | `home_cta`, `catalog`, `direct`, `seo` | — |
| `tcg_set_search_used` | Première recherche d’extension non vide de la session | `length_1_3`, `length_4_8`, `length_9_plus` | — |
| `tcg_set_selected` | Extension choisie avec succès | `search`, `latest_list` | — |
| `tcg_album_opened` | Album sélectionné rendu | `activation`, `collection` | — |
| `tcg_first_value_reached` | Première carte ajoutée et compteur post-ajout visible dans la même session | — | — |
| `tcg_activation_completed` | Après première valeur : seconde carte ou wishlist ajoutée | `second_owned_card`, `wishlist` | — |
| `tcg_sync_prompt_shown` | Bannière de synchronisation rendue après activation | — | — |
| `tcg_sync_prompt_actioned` | Action explicite sur la bannière | `create_account`, `continue_local`, `dismiss` | — |
| `tcg_returned_after_activation` | Première action collection d’une session ultérieure | `day_1_7`, `day_8_30`, `day_31_90`, `day_91_plus` | `owned_add`, `owned_remove`, `album_open`, `wishlist_open` |
| `tcg_activation_error` | Erreur récupérable empêchant une étape | `start_load`, `set_load`, `album_load`, `collection_mutation`, `progress_render`, `wishlist_mutation` | `network`, `upstream_5xx`, `client_validation`, `unknown` |

La première valeur reste strictement « une carte ajoutée **et** le compteur exact rendu ». L’activation reste une seconde carte ou une wishlist ajoutée après cette première valeur, dans la même session.

### Données interdites

Aucun champ, URL, log ou propriété ne peut contenir : recherche brute ; ID ou nom de carte, extension ou Pokémon ; contenu ou taille exacte de collection, wishlist, note ou deck ; e-mail ; profil, handle ou UUID Supabase ; URL d’authentification ; paramètre de requête ; IP ; user-agent ; cookie ; jeton ; identifiant persistant ; horodatage individuel.

## 5. Contrat de l’endpoint

**Route future :** `POST /api/analytics/product`.

Corps JSON maximal de 512 octets :

```json
{ "event": "tcg_activation_completed", "propertyA": "wishlist" }
```

- `event` est obligatoire et appartient exactement au tableau ci-dessus.
- `propertyA` et `propertyB` sont admises uniquement pour l’événement correspondant. Toute clé inconnue, objet, tableau, valeur vide ou chaîne de plus de 32 caractères est rejeté.
- Seuls `POST` et `Content-Type: application/json` sont acceptés.
- L’origine de production doit être explicitement autorisée. `Sec-Fetch-Site` doit être `same-origin` ou `same-site` ; l’absence de Fetch Metadata est refusée.
- Réponses : `204` succès, `400` contrat invalide, `403` origine/Fetch Metadata invalide, `413` corps trop grand, `429` limite de débit, `503` indisponibilité Supabase sans détail interne.
- La limite de débit est 30 requêtes/minute et 200/jour par clé éphémère d’infrastructure, sans conserver ni réutiliser l’IP. Son mécanisme concret sera arrêté à l’implémentation sans fournisseur payant.
- Les corps reçus ne sont jamais écrits dans les logs. L’endpoint ne s’auto-instrumente pas afin d’éviter une boucle d’erreurs.

## 6. Schéma SQL

Le schéma `analytics` est exclu de la Data API. `PUBLIC`, `anon` et `authenticated` n’ont ni usage du schéma, ni privilège sur ses objets. Seul le code serveur à clé secrète peut appeler la fonction.

```sql
create schema if not exists analytics;
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to service_role;

create table analytics.daily_metrics (
  metric_date date not null,
  event_name text not null,
  property_a text not null default '',
  property_b text not null default '',
  total bigint not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (metric_date, event_name, property_a, property_b),
  check (event_name in (
    'tcg_start_opened', 'tcg_set_search_used', 'tcg_set_selected',
    'tcg_album_opened', 'tcg_first_value_reached',
    'tcg_activation_completed', 'tcg_sync_prompt_shown',
    'tcg_sync_prompt_actioned', 'tcg_returned_after_activation',
    'tcg_activation_error'
  )),
  check (char_length(property_a) <= 32 and char_length(property_b) <= 32)
);

alter table analytics.daily_metrics enable row level security;
revoke all on analytics.daily_metrics from public, anon, authenticated;
grant select, insert, update, delete on analytics.daily_metrics to service_role;

create or replace function analytics.increment_daily_metric(
  p_event_name text, p_property_a text default '', p_property_b text default ''
) returns void
language plpgsql
security definer
set search_path = analytics, pg_temp
as $$
begin
  insert into analytics.daily_metrics (metric_date, event_name, property_a, property_b, total)
  values (current_date, p_event_name, coalesce(p_property_a, ''), coalesce(p_property_b, ''), 1)
  on conflict (metric_date, event_name, property_a, property_b)
  do update set total = analytics.daily_metrics.total + 1, updated_at = now();
end;
$$;

revoke all on function analytics.increment_daily_metric(text, text, text)
  from public, anon, authenticated;
grant execute on function analytics.increment_daily_metric(text, text, text)
  to service_role;
```

L’endpoint applique la liste fermée de propriétés ; la RPC doit répéter cette validation lors de l’implémentation. L’incrément est atomique par `INSERT … ON CONFLICT DO UPDATE`. Une lecture suivie d’une écriture est interdite.

Une vue non exposée `analytics.weekly_funnel` regroupe les sept derniers jours UTC par événement et propriétés. Elle est lisible par le seul rôle serveur et depuis le SQL Editor ; aucun dashboard complexe n’est construit.

```sql
select event_name, property_a, property_b, sum(total) as total
from analytics.daily_metrics
where metric_date >= current_date - 6
group by event_name, property_a, property_b
order by event_name, property_a, property_b;
```

Les ratios `first_value / start_opened` et `activation_completed / first_value` sont des ratios de compteurs consentis, non des conversions universelles.

## 7. Rétention et suppression

- Toute ligne dont `metric_date < current_date - 90` est supprimée chaque jour.
- La purge est une tâche `pg_cron` créée dans la migration. Sa disponibilité et son exécution réussie sont prérequis à l’activation ; après échecs répétés, la collecte produit est désactivée jusqu’à correction.
- Aucun événement brut, table de session, consentement serveur ou IP n’est conservé.
- Une demande individuelle ne peut pas être rapprochée d’un agrégat sans identifiant. Cette limite est expliquée dans les pages légales ; le retrait efface immédiatement les marqueurs locaux.

## 8. Vercel : filtrage audience et performance

Seuls `@vercel/analytics` et `@vercel/speed-insights` sont installés. Vercel Analytics sert à l’audience, pas au funnel : aucun événement personnalisé Vercel n’est prévu.

`Analytics.beforeSend` doit :

1. supprimer tous les paramètres de requête ;
2. retourner `null` pour `/auth`, `/auth/*`, `/api/*` et toute route de redirection de connexion ;
3. remplacer `/u/<handle>` par `/u/[handle]` ;
4. remplacer les segments d’ami par `/friends/[friendId]` ;
5. ne jamais reconstruire une URL à partir d’une valeur utilisateur.

Speed Insights ne couvre que les routes publiques de produit ; auth et API sont exclues lorsque le mécanisme de filtrage de la version installée le permet. Des tests capturent les requêtes Vercel pour vérifier qu’aucun e-mail, jeton, handle, paramètre ou URL originale ne sort du navigateur.

## 9. Erreurs et alertes

Les notifications Vercel de build/déploiement restent actives : elles constituent la voie durable minimale pour les échecs de livraison. Les erreurs produit sont lues dans la requête hebdomadaire ; la vérification manuelle quotidienne des logs Vercel n’est pas une solution durable.

Investigation requise sur 24 h si au moins 20 tentatives consenties et l’un des seuils suivants est atteint :

- `tcg_activation_error >= 5` ;
- une même étape atteint 20 % des ouvertures pertinentes ;
- des ouvertures existent mais première valeur ou activation est nulle.

Aucune alerte runtime 5xx payante n’est ajoutée au lancement. Les erreurs TCG récupérables sont catégorisées sans message brut ni stack trace.

## 10. Sécurité et tests avant activation

### Sécurité

- RLS, grants minimaux, schéma hors Data API et RPC uniquement serveur.
- Client Supabase serveur distinct à clé secrète, sans session utilisateur propagée ; aucune clé dans `NEXT_PUBLIC_*`, bundle ou logs.
- Contrat fermé, limites de taille/débit, origine et Fetch Metadata validés avant l’écriture.
- Aucune migration ne modifie `user_state`, Auth, les tables de collection ni leurs politiques.

### Tests

1. Unitaires : événements et propriétés autorisés/interdits, limites, consentement et déduplication de session.
2. Endpoint : `400`, `403`, `413`, `429`, `503`, origine hostile et Fetch Metadata absent.
3. Base : incréments concurrents atomiques, absence d’accès anon/authenticated, purge 90 jours et lecture hebdomadaire.
4. Parcours : première valeur uniquement après compteur visible ; activation uniquement après première valeur ; un retour par nouvelle session.
5. Confidentialité : capture des requêtes Vercel/Supabase et assertion d’absence de toute donnée interdite.

## 11. Modifications Vie privée et Cookies

Avant activation, mettre à jour toutes les traductions pour :

- séparer stockage nécessaire, audience/performance Vercel et mesure produit Supabase ;
- nommer Vercel et Supabase, leur rôle, catégories de données et documents contractuels applicables ;
- préciser que Vercel reçoit des pages normalisées et Supabase des compteurs agrégés seulement après opt-in produit ;
- indiquer la rétention 90 jours, l’absence d’événements bruts/identifiants, la limite même appareil et le biais de consentement ;
- expliquer acceptation, refus et modification ultérieure ;
- remplacer l’affirmation actuelle « aucun analytics » une fois Vercel activé.

Les actions sont localisées, accessibles et symétriques. Le code de mesure produit ne peut pas être chargé ou déclenché avant le choix.

## 12. Retour arrière

1. **Produit :** désactiver le déclencheur client et l’endpoint ; la collection reste intacte. La purge continue jusqu’au vidage des agrégats, ou une purge administrative documentée supprime la table.
2. **Audience/performance :** retirer les composants Vercel puis désactiver les produits dans Vercel. Aucun changement Supabase n’est nécessaire.
3. **Retrait individuel :** cesser les envois et supprimer les marqueurs locaux, sans toucher à la collection.

Un retour arrière ne doit jamais exposer de clé, affaiblir la CSP, exiger un compte ou empêcher l’usage local de Lunidex.

## 13. Hors périmètre

- Fournisseur analytics tiers payant, BI, export événementiel ou suivi cross-device.
- Profilage, publicité, reciblage, A/B testing ou rapprochement avec un compte.
- Instrumentation mobile.
- Dépendance, migration, changement CSP ou implémentation avant validation explicite de cette spécification.

## 14. Références à revalider lors de l’implémentation

- Vercel Web Analytics : `beforeSend` et rédaction d’URL.
- Vercel Speed Insights : filtrage de route et échantillonnage de la version installée.
- Supabase : schéma non exposé, grants/RLS, clé secrète serveur et disponibilité de `pg_cron`.

Les versions et limites de plan seront revérifiées avant mise en œuvre ; elles ne changent pas les règles de minimisation de ce document.
