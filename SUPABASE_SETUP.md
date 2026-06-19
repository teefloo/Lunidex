# Authentification & sauvegarde cloud (Supabase)

Ce projet intègre l'authentification et la persistance des données utilisateur via
**Supabase** (Auth + PostgreSQL + RLS). Tant que les clés ne sont pas renseignées,
l'application fonctionne exactement comme avant (100 % local, IndexedDB) et **aucun
bouton de compte n'apparaît**. Dès que les clés sont présentes, le bouton « Sign in »
s'affiche dans l'en-tête et la synchronisation s'active.

## Ce qui est synchronisé

Tout le snapshot utilisateur (voir `SYNCED_KEYS` dans `src/store/primedex.ts`) :
favoris, Pokémon capturés, équipe, collection / wishlist / notes TCG, recherches
sauvegardées, badges, quiz (high scores, historique, streaks), historique de
navigation, statistiques de visite, et préférences (thème, langue, son).

Stockage : **un seul enregistrement JSONB par utilisateur** dans la table
`public.user_state`, isolé par **Row-Level Security**.

---

## Étape 1 — Créer le projet Supabase

1. Va sur https://supabase.com → **New project** (le plan gratuit suffit).
2. Choisis un nom, un mot de passe de base de données, une région proche.
3. Attends ~2 min que le projet soit provisionné.

## Étape 2 — Récupérer les clés

Dashboard → **Project Settings** → **API** (ou **Data API / API Keys**) :

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> N'utilise **jamais** la clé `service_role` côté client.

## Étape 3 — Renseigner `.env.local`

Décommente et complète les deux lignes dans `.env.local` (à la racine) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Puis **redémarre** le serveur de dev (`npm run dev`) — les variables
`NEXT_PUBLIC_*` sont injectées au build.

## Étape 4 — Créer la table et les politiques RLS

Dashboard → **SQL Editor** → **New query**, colle le contenu de
[`supabase/migrations/0001_user_state.sql`](supabase/migrations/0001_user_state.sql)
et exécute (**Run**).

Ce script crée la table `user_state`, le trigger `updated_at`, active RLS et
ajoute les 4 politiques (select / insert / update / delete) limitant chaque
utilisateur à `auth.uid() = user_id`.

> Avec la CLI Supabase : `supabase db push` applique le même fichier.

## Étape 5 — Configurer l'authentification e-mail

Dashboard → **Authentication** → **Providers** → **Email** : activé par défaut.

- **Confirmation d'e-mail** : activée par défaut. En développement tu peux la
  désactiver (Authentication → Providers → Email → *Confirm email* off) pour
  tester sans boîte mail, ou utiliser les liens du module **Authentication → Logs**.
- **URLs de redirection** : Authentication → **URL Configuration** → ajoute
  `http://localhost:3000` (dev) et l'URL de production dans *Redirect URLs* et
  *Site URL*. Nécessaire pour la confirmation d'e-mail, le reset de mot de passe
  et l'OAuth.

## Étape 6 (optionnel) — OAuth Google / GitHub

Les boutons « Continue with Google / GitHub » sont déjà présents dans le modal.
Pour les activer :

1. Dashboard → **Authentication** → **Providers** → active **Google** et/ou **GitHub**.
2. Crée une app OAuth côté fournisseur (Google Cloud Console / GitHub Developer
   Settings) et renseigne **Client ID** + **Client Secret** dans Supabase.
3. Comme **Authorized redirect URI**, utilise celle affichée par Supabase
   (`https://<ref>.supabase.co/auth/v1/callback`).

Tant qu'un provider n'est pas configuré, son bouton renverra une erreur explicite
(toast) — sans casser le reste.

---

## Comportement local-first & fusion

- **Visiteur non connecté** : tout reste en IndexedDB, comme aujourd'hui.
- **Première connexion** : les données locales sont **fusionnées** avec celles du
  compte (union des collections, max des scores), puis Supabase devient la source
  de vérité. Rien n'est perdu. Logique : `src/lib/supabase/sync-state.ts`
  (`mergeSyncState`).
- **Pendant la session** : chaque changement est repoussé en base (upsert
  debouncé ~1,2 s) — `src/lib/supabase/useSupabaseSync.ts`.
- **Déconnexion** : la sync s'arrête, les données restent disponibles localement.

## Architecture (fichiers clés)

| Fichier | Rôle |
|---|---|
| `supabase/migrations/0001_user_state.sql` | Table `user_state` + trigger + RLS |
| `src/lib/supabase/client.ts` | Client navigateur (singleton, PKCE) |
| `src/lib/supabase/AuthProvider.tsx` | Contexte session + `useAuth()` |
| `src/lib/supabase/sync-state.ts` | Extraction / application / fusion du snapshot |
| `src/lib/supabase/useSupabaseSync.ts` | Chargement au login + push debouncé |
| `src/components/auth/AuthModal.tsx` | Connexion / inscription / OAuth / reset |
| `src/components/auth/AccountMenu.tsx` | Bouton compte dans l'en-tête |
| `src/app/providers.tsx` | Montage de `AuthProvider` + pont de sync |

## Vérification rapide

1. `npm run dev`, ouvre le site → un bouton « Sign in » apparaît dans l'en-tête.
2. Crée un compte, ajoute des favoris / capture des Pokémon.
3. Dashboard Supabase → **Table Editor** → `user_state` : une ligne avec ton
   `user_id` et un `data` JSONB qui se met à jour.
4. Reconnecte-toi depuis un autre navigateur → les données sont restaurées.
