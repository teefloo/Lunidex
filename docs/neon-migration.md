# Migration PostgreSQL Supabase vers Neon

## État de la migration

Le projet utilise actuellement Supabase pour plusieurs responsabilités distinctes :

- PostgreSQL et PostgREST avec RLS pour user_state, profils, amis, quiz,
  combats, historique/prix TCG, alertes et abonnements push ;
- Supabase Auth pour les comptes email, OAuth Google, sessions et réinitialisation
  de mot de passe ;
- Supabase Realtime Broadcast/Presence pour les salles de combat ;
- pg_cron pour la rétention des métriques produit ;
- un fichier Edge Function poll-tcg-prices, non déployé actuellement, avec les
  alertes de prix désactivées dans le code ;
- aucun bucket Storage ni objet Storage détecté dans le projet actif.

Neon remplace PostgreSQL, mais pas Auth, Realtime, Storage ou les Edge Functions
de Supabase. La préparation actuelle conserve donc Supabase Auth et Realtime.
Le schéma Neon ne rejoue pas les schémas internes auth, storage, realtime,
graphql_public ou vault, ni les politiques RLS qui dépendent de auth.uid() et
auth.jwt(). Le futur accès Neon doit rester côté serveur, avec vérification du
JWT Supabase et une autorisation équivalente dans les routes/API avant toute
bascule applicative.

La clé publique actuelle utilise un JWT HS256. Neon Data API avec un fournisseur
JWT externe repose sur un JWKS ; ce chemin nécessite une rotation/configuration
de clés séparée et n'est pas un raccourci sûr pour la migration immédiate.

Extensions observées : pgcrypto est requis par le schéma cible ; plpgsql est
fourni nativement par PostgreSQL ; uuid-ossp n'est pas utilisé par les
migrations applicatives ; pg_stat_statements relève de l'observabilité Neon ;
pg_cron et supabase_vault sont des dépendances Supabase à remplacer ou à
laisser sur Supabase.

## Fichiers préparés

- neon/migrations/0001_lunidex_app.sql crée le schéma applicatif Neon, les
  tables, types, contraintes, clés étrangères vers app.users, index, séquence,
  vues et fonctions de projection nécessaires, ainsi que le compteur analytique
  exécutable côté serveur.
- scripts/neon/export-supabase.sh exporte le dump applicatif et les seuls
  identifiants Auth stables requis pour les clés étrangères.
- scripts/neon/import-to-neon.sh applique le schéma, importe les données et
  reconstruit les projections amis. Il ne touche jamais Supabase.
- scripts/neon/verify-migration.sh compare les volumes et vérifie les objets
  essentiels de la cible.
- .env.example documente SUPABASE_DB_URL et NEON_DATABASE_URL, toutes deux
  réservées aux scripts/serveur. .neon-migration/ est ignoré par Git.

Le projet n'utilise ni ORM ni client SQL PostgreSQL direct à ce stade :
@supabase/supabase-js est encore utilisé par le web et le mobile. Les routes
et fonctions clientes doivent donc être migrées vers une API serveur Neon
avant de retirer l'accès aux tables Supabase.

Les RPC suivants restent à réécrire avec un user_id validé côté serveur :
handle_new_user, set_public_profile, send_friend_request,
respond_to_friend_request, get_friend_collection_page,
get_friend_collection_summary, get_friend_decks, quiz_leaderboard_top,
quiz_leaderboard_user_rank et submit_quiz_score.

## Procédure contrôlée

Prérequis : un projet Neon dédié, une base cible vide, une chaîne de connexion
Neon non poolée pour le dump/restauration, et les clients PostgreSQL pg_dump,
pg_restore et psql compatibles avec PostgreSQL 17.

Définir localement les variables sans les écrire dans un fichier suivi par Git :

~~~bash
export SUPABASE_DB_URL='…'
export NEON_DATABASE_URL='…'
~~~

Puis exécuter :

~~~bash
npm run db:neon:export
npm run db:neon:import
npm run db:neon:verify
~~~

Ne pas utiliser la connexion poolée pour pg_dump/pg_restore. Ne pas ajouter
ces variables à NEXT_PUBLIC_*, EXPO_PUBLIC_*, au bundle mobile ou à des logs
CI. L'import est destiné à une cible vide ; il ne contient aucune commande
DROP, TRUNCATE ou suppression de données.

## Validation avant bascule

La comparaison de volumes est nécessaire mais insuffisante. Vérifier ensuite,
sur un environnement canary :

1. connexion utilisateur, session, OAuth et reset de mot de passe via Supabase ;
2. lecture/écriture de user_state, profil public, quiz et leaderboard ;
3. demandes d'amis et projections collection/decks ;
4. création/lecture d'une salle de combat et Broadcast/Presence ;
5. historique des prix TCG et, si réactivées, alertes/push ;
6. contraintes FK, unicité des handles, transitions d'amitié, index et
   séquence tcg_price_history_id_seq ;
7. métriques produit et remplacement de la rétention pg_cron par un scheduler
   de déploiement avant toute réactivation du polling TCG.

Pour limiter l'interruption, conserver Supabase comme source, faire un export
final après gel court des écritures ou mettre en place une réplication logique,
puis effectuer une bascule canary. Une dual-write temporaire n'est sûre qu'après
implémentation et observation des routes concernées ; elle n'est pas activée
par ces scripts.

## Services à conserver ou remplacer

| Fonctionnalité | Décision |
| --- | --- |
| PostgreSQL applicatif | Migrer vers Neon après validation |
| Supabase Auth | Conserver pendant et après la première phase |
| Realtime Broadcast/Presence | Conserver, ou remplacer séparément par un broker temps réel |
| Storage | Rien à migrer dans l'état observé |
| Edge Function TCG | Non déployée ; remplacer par un job Vercel/Neon avant réactivation |
| pg_cron | Reste côté Supabase jusqu'au remplacement contrôlé |
| RLS Supabase | Ne pas copier aveuglément ; reproduire l'autorisation dans l'API serveur |
| RLS/Data API Neon | Envisageable après rotation JWT/JWKS et tests d'isolation |

Les mots de passe et sessions Auth ne sont pas copiés dans Neon. Une suppression
complète de Supabase Auth impliquerait une stratégie distincte de réinscription
ou de reset ; elle n'est pas couverte par cette migration PostgreSQL.

## Retour arrière

Ne supprimer ni le projet Supabase ni ses données. Si le canary Neon échoue :

1. désactiver le flag de lecture/écriture Neon et remettre les routes sur
   Supabase ;
2. arrêter toute dual-write et conserver les journaux d'écarts ;
3. si des écritures ont atteint Neon après la bascule, les réconcilier
   explicitement avant toute nouvelle tentative ;
4. conserver l'export et les métriques de validation pour l'analyse.

Le retour arrière applicatif est réversible ; le retour arrière des données
nécessite une décision de réconciliation pour éviter d'écraser une écriture
valide.
